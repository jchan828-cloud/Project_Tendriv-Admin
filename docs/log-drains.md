# Log drains

This repo exposes two ingest endpoints that receive batched platform logs and
persist them to the `log_drain_events` table (append-only, `yul1`-region
Supabase).

| Source   | Endpoint                  | Auth                                         |
| -------- | ------------------------- | -------------------------------------------- |
| Vercel   | `POST /api/drains/vercel` | `x-vercel-signature` HMAC-SHA1 of raw body   |
| Supabase | `POST /api/drains/supabase` | `Authorization: Bearer $SUPABASE_LOG_DRAIN_TOKEN` |

Both routes run on the Node.js runtime, accept optional gzip
(`content-encoding: gzip`), and return `{ ok: true, count }` on success.

## 1. Provision secrets

```bash
openssl rand -hex 32   # → VERCEL_LOG_DRAIN_SECRET
openssl rand -hex 32   # → SUPABASE_LOG_DRAIN_TOKEN
```

Add both to Vercel Project Settings → Environment Variables for Production
and Preview, and to your local `.env.local`.

## 2. Configure the Vercel drain

Either via the dashboard (Project → Settings → Drains → Add drain) or the API:

```bash
curl -X POST https://api.vercel.com/v1/drains \
  -H "authorization: Bearer $VERCEL_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "name": "tendriv-admin logs",
    "projects": "some",
    "projectIds": ["<your-project-id>"],
    "schemas": { "log": {} },
    "delivery": {
      "type": "http",
      "endpoint": "https://<admin-host>/api/drains/vercel",
      "encoding": "json",
      "compression": "none",
      "secret": "'"$VERCEL_LOG_DRAIN_SECRET"'"
    }
  }'
```

Only `schemas.log` is consumed today. Traces / speed-insights / analytics /
ai-gateway schemas can be added later without code changes, but they will land
in the same table so keep them off unless you want them there.

## 3. Configure the Supabase drain

Dashboard → Project Settings → Log Drains → **Add destination** → Generic
HTTP endpoint:

- **URL:** `https://<admin-host>/api/drains/supabase`
- **Headers:** `Authorization: Bearer <SUPABASE_LOG_DRAIN_TOKEN>`
- **Gzip:** either setting works; the endpoint handles both.

Supabase batches up to 250 events or 1 second, whichever hits first.

## 4. Verify end-to-end

```sql
select source, count(*), max(received_at)
from log_drain_events
group by source;
```

You should see rows appear within a minute of saving each drain.

## Querying

The full vendor payload is preserved in `payload jsonb`. The top-level columns
(`event_timestamp`, `severity`, `project_id`, `message`) are best-effort
extracts for quick filtering — fall back to `payload` for anything missing.

```sql
-- Errors from Vercel in the last hour
select event_timestamp, project_id, message
from log_drain_events
where source = 'vercel'
  and severity in ('error','fatal')
  and received_at > now() - interval '1 hour'
order by received_at desc;

-- Supabase auth events
select received_at, payload
from log_drain_events
where source = 'supabase'
  and payload -> 'metadata' ->> 'service' = 'auth'
order by received_at desc
limit 50;
```

The table is immutable (`UPDATE`/`DELETE` are no-ops via rewrite rules). If you
need to prune, drop and recreate it in a new migration — don't try to delete
rows.
