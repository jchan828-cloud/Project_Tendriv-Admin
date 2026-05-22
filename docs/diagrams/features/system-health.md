# System health

Admin-only observability dashboard fed by Vercel + Supabase log
drains.

## Entry points

- UI: `app/(dashboard)/system-health/`
- Webhooks: `app/api/drains/vercel/route.ts`,
  `app/api/drains/supabase/route.ts`
- Schema: `supabase/migrations/20260417000001_log_drain_events.sql`
- Docs: `docs/log-drains.md`

## Ingest → dashboard flow

```mermaid
sequenceDiagram
    participant Vercel as Vercel platform
    participant Supabase as Supabase platform
    participant DrainV as api/drains/vercel
    participant DrainS as api/drains/supabase
    participant DB as log_drain_events
    participant UI as (dashboard)/system-health

    Vercel->>DrainV: POST batched log events
    DrainV->>DB: INSERT (source='vercel', severity, payload)
    Supabase->>DrainS: POST batched log events
    DrainS->>DB: INSERT (source='supabase', severity, payload)

    Note over DB: append-only<br/>(no_update / no_delete rules)

    UI->>DB: SELECT FROM log_drain_events ORDER BY received_at DESC
    DB-->>UI: rolling buffer
    UI->>UI: group by severity, source, time bucket
```

## Immutability guard

Same pattern as `audit_log`: the migration installs `no_update` and
`no_delete` rules, so log retention/rotation must happen via
scheduled `TRUNCATE` (not yet wired) or partition pruning.

## Tables touched

| Table | Read | Write |
|---|:-:|:-:|
| `log_drain_events` | ✓ (UI) | ✓ (webhooks only) |
