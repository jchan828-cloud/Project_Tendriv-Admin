# Cross-repo architecture

How the admin app connects to the external Autoblog engine, the
marketing site, and the shared Supabase project.

## System map

```mermaid
flowchart LR
    subgraph Admin["Project_Tendriv-Admin (Vercel · yul1)"]
        A_UI["(dashboard)/* UI"]
        A_API["app/api/*"]
        A_LIB["lib/autoblog/proxy.ts"]
        A_CRON["psib-match 08:00 UTC<br/>geo-match 10:00 UTC<br/>score/cron 06:00 UTC"]
    end

    subgraph Marketing["Project_Tendriv-Marketing (Vercel · yul1)"]
        M_UI["(marketing)/* pages"]
        M_API["app/api/marketing/*"]
        M_CRON["scout-bridge 02:00<br/>scout-preview-bridge */4h<br/>topic-radar 08:00<br/>town-crier 09:00<br/>pir-generator Sat 12:00<br/>monitor-digest Mon 13:00"]
    end

    subgraph Engine["Autoblog Engine (external · rfp-blog.vercel.app)"]
        E_API["/runs · /stream · /publish"]
        E_DB[("autoblog_runs<br/>autoblog_settings")]
    end

    subgraph Supabase["Shared Supabase project"]
        S_BLOG[("blog_posts<br/>blog_drafts<br/>blog_pipeline_topics")]
        S_CRM[("outreach_contacts<br/>outreach_matches<br/>scout_notices")]
        S_OBS[("audit_log<br/>log_drain_events")]
    end

    A_UI --> A_API
    A_API --> A_LIB
    A_LIB -- "x-autoblog-key + SSE" --> E_API
    E_API --> E_DB

    A_API -- "read/write" --> S_BLOG
    A_API -- "read/write" --> S_CRM
    A_API -- "append-only" --> S_OBS

    A_CRON --> A_API
    M_CRON --> M_API

    M_API -- "publishes content-approval / content-notify webhooks" --> A_API
    A_API -- "POST /api/marketing/content-approval<br/>POST /api/marketing/content-notify" --> M_API

    M_API --> S_BLOG
    M_API --> S_CRM
```

## Cross-system contracts (drift-prone)

| Boundary | Owner of truth | Mirror in this repo | Risk |
|---|---|---|---|
| `autoblog_runs.status` | external engine DB CHECK (not in `supabase/migrations/`) | `lib/types/autoblog.ts:6` (`AutoblogRunStatus`) | Engine adds a value → admin badge component falls through to default; engine renames `timeout` → admin proxy keeps reading old key silently. **No CI guard today.** |
| `blog_drafts.status` webhook | marketing repo migration `20260320_003_blog_drafts.sql:13` | admin's webhook caller (Autoblog publish path) | Admin POSTs `status='approved'` to `/api/marketing/content-approval` — if marketing renames the value, the webhook 200s on insert with a stale key. |
| `outreach_contacts.status` | admin migration `20260321000000_outreach_crm.sql:13` | shared with marketing's `/api/marketing/monitor-subscribe` writes | Marketing inserts a contact without setting `pipeline` → CHECK fails at INSERT time (good); but value changes to `status` would silently break the CRM list. |
| `blog_pipeline_topics` rows | marketing's pipeline migration | admin's Autoblog reads via `api/marketing/topics` | Column adds in either repo break the consumer until types are regenerated. |

## Cron schedule (this repo)

`vercel.json` declares three crons:

| Path | UTC | Purpose |
|---|---|---|
| `/api/admin/psib-match` | 08:00 daily | Match PSIB tender notices to CRM contacts |
| `/api/admin/geo-match` | 10:00 daily | Match GEO notices to CRM contacts |
| `/api/marketing/score/cron` | 06:00 daily | Recompute lead scores against buyer-stage signals |

## Engine boundary (`lib/autoblog/proxy.ts`)

```mermaid
sequenceDiagram
    participant UI as Autoblog UI
    participant API as app/api/autoblog/*
    participant Proxy as lib/autoblog/proxy.ts
    participant Engine as Autoblog engine
    UI->>API: trigger / runs / stream / publish
    API->>Proxy: proxyToEngine(path, init)
    Proxy->>Engine: fetch(ENGINE_URL + path, headers: x-autoblog-key)
    alt fetch throws
        Proxy-->>API: throw EngineUnreachableError
        API-->>UI: 502 { error: "engine_unreachable" }
    else 2xx/4xx/5xx response
        Engine-->>Proxy: Response (status passed through)
        Proxy-->>API: Response
        API-->>UI: stream / JSON
    end
```

`EngineUnreachableError` is defined at `lib/autoblog/proxy.ts:4` and
wraps only network-layer failures — HTTP error responses are passed
through. UI components should branch on `error.name === 'EngineUnreachableError'`
to render the "engine offline" empty state instead of treating it as
a 500.
