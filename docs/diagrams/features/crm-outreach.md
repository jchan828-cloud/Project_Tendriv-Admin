# CRM / Outreach

Prospect lifecycle for PSIB (Procurement Strategy for Indigenous
Business) and GEO (geographic) outbound pipelines, plus an ABM
(account-based marketing) account view.

## Entry points

- UI: `app/(dashboard)/crm/`, `app/(dashboard)/crm/[id]/`,
  `app/(dashboard)/crm/accounts/`, `app/(dashboard)/crm/geo/`
- API: `app/api/admin/crm/`, `app/api/admin/crm/[id]/`,
  `app/api/admin/crm/accounts/`, `app/api/admin/crm/accounts/[id]/`
- Match crons: `app/api/admin/psib-match/route.ts` (08:00 UTC daily),
  `app/api/admin/geo-match/route.ts` (10:00 UTC daily)
- Campaign senders: `app/api/admin/psib-campaign/route.ts`,
  `app/api/admin/geo-campaign/route.ts`

## Prospect journey

```mermaid
journey
    title CRM prospect lifecycle
    section Discovery
      Cron pulls procurement notices: 5: psib-match, geo-match
      Match contact ↔ notice by UNSPSC: 5: System
      Insert outreach_matches: 5: System
    section First touch
      Send sequence step 1 email: 4: System
      status: prospect → contacted: 5: System
    section Engagement
      Open / click recorded: 3: CyberImpact webhook
      Reply received: 5: Sales
      status: contacted → replied: 5: Sales
    section Qualify
      Book demo: 5: Sales
      status: replied → demo: 5: Sales
    section Outcome
      Closed-won → status=converted: 5: Sales
      Opt-out → status=unsubscribed: 1: System
```

## Match cron pipeline

```mermaid
sequenceDiagram
    participant Cron as Vercel cron
    participant Match as api/admin/{psib,geo}-match
    participant DB as Supabase
    participant Campaign as api/admin/{psib,geo}-campaign

    Cron->>Match: GET (08:00 / 10:00 UTC)
    Match->>DB: SELECT scout_notices WHERE is_psib (or region match)
    Match->>DB: SELECT outreach_contacts WHERE pipeline = 'psib' (or 'geo')
    Match->>Match: Score on UNSPSC + province
    Match->>DB: INSERT outreach_matches (unique contact_id+notice_id)
    Match-->>Cron: { matched: N }

    Note over Campaign: Triggered manually from CRM UI
    Campaign->>DB: SELECT unsent matches
    Campaign->>Campaign: Render sequence template
    Campaign->>DB: INSERT outreach_activity_log (event_type='sent')
    Campaign->>DB: UPDATE outreach_contacts SET status='contacted'
```

## Tables touched

| Table | Read | Write |
|---|:-:|:-:|
| `outreach_contacts` | ✓ | ✓ |
| `outreach_sequences` | ✓ | — |
| `outreach_activity_log` | ✓ | ✓ (append-only events) |
| `outreach_matches` | ✓ | ✓ |
| `scout_notices` | ✓ | — (read-only; marketing repo owns writes) |
| `abm_accounts` | ✓ | ✓ |
| `abm_account_contacts` | ✓ | ✓ |
| `lead_scores` | ✓ | — (written by `api/marketing/score/cron`) |

## See also

- [`state-machines/outreach-contacts.md`](../state-machines/outreach-contacts.md)
- [`analytics-marketing.md`](./analytics-marketing.md) for the lead-score cron
