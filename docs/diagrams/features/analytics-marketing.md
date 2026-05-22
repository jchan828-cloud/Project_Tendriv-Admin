# Analytics & marketing scoring

Event ingest from the marketing site, UTM short-link tracking,
content attribution, and the daily lead-score cron.

## Entry points

- UI: `app/(dashboard)/analytics/`, `analytics/funnel`,
  `analytics/agencies`, `analytics/utms`
- API: `app/api/marketing/events/route.ts`,
  `app/api/marketing/attribution/route.ts`,
  `app/api/marketing/score/route.ts`,
  `app/api/marketing/score/cron/route.ts` (06:00 UTC daily),
  `app/api/marketing/utms/route.ts`,
  `app/api/marketing/utms/[code]/route.ts`,
  `app/api/marketing/brief/route.ts`

## Event → attribution → score

```mermaid
flowchart LR
    subgraph Marketing site
        Visitor[Visitor]
    end
    Visitor -->|page view| EV[POST api/marketing/events]
    Visitor -->|UTM click| UC[GET api/marketing/utms/[code]<br/>redirect to destination]
    EV --> ME[(marketing_events)]
    UC --> UCT[(utm_clicks)]

    subgraph Resolution
        UCT -. cookie / session join .-> AT[POST api/marketing/attribution]
    end
    AT --> CA[(content_attribution<br/>touch_type=first/last/assist)]

    subgraph Daily cron 06:00
        CRON[api/marketing/score/cron]
    end
    CRON --> CA
    CRON --> ME
    CRON --> SC[UPSERT lead_scores<br/>score 0-100, scoring_version]
```

## UTM short-link click

```mermaid
sequenceDiagram
    participant Browser
    participant API as api/marketing/utms/[code]
    participant DB as utm_campaigns + utm_clicks
    participant Dest as destination_url

    Browser->>API: GET /api/marketing/utms/abc123
    API->>DB: SELECT FROM utm_campaigns WHERE short_code='abc123'
    API->>DB: INSERT utm_clicks (utm_id, ip_hash, referrer)
    API->>DB: UPDATE utm_campaigns SET click_count = click_count+1
    API-->>Browser: 302 → destination_url
```

## Tables touched

| Table | Read | Write |
|---|:-:|:-:|
| `marketing_events` | ✓ | ✓ |
| `utm_campaigns` | ✓ | ✓ |
| `utm_clicks` | ✓ | ✓ |
| `content_attribution` | ✓ | ✓ |
| `lead_scores` | ✓ | ✓ (cron) |
| `outreach_contacts` | ✓ | — (resolves visitor → contact) |
| `blog_posts` | ✓ | — |
