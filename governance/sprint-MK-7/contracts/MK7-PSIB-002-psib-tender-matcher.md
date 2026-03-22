---
task_id: MK7-PSIB-002
name: PSIB Tender Matcher
layer: Layer 2/Cron
repo: Project_Tendriv-Admin
priority: Medium
depends_on: [MK7-PSIB-001, MK7-CRM-001]
interface_contract: Project_Tendriv-Marketing/governance/sprint-MK-7/SPRINT-MK-7-INTERFACE-CONTRACT.md
---

# MK7-PSIB-002 — PSIB Tender Matcher

## Objective

Build a cron-triggered API route that matches IBD contacts from `outreach_contacts`
against active PSIB set-aside tenders in `scout_notices` by UNSPSC category overlap,
producing `outreach_matches` records for campaign targeting.

## Deliverables

### API Route: `app/api/admin/psib-match/route.ts`

- Method: POST
- Auth: `x-vercel-cron` header (CRON_SECRET validation)
- Response: `{ success: true, matched: number }`

### Logic

1. Fetch all `outreach_contacts` where `pipeline = 'psib'` and `status != 'unsubscribed'`
2. Fetch all `scout_notices` where `is_psib = true` and `closing_date > now()`
3. For each contact, find notices whose UNSPSC codes overlap with contact's `unspsc_categories`
4. Calculate `match_score` based on category overlap strength
5. Upsert into `outreach_matches` (unique on `contact_id + notice_id`)
6. Return count of new matches

### Cron Configuration

Add to `vercel.json`:
```json
{
  "crons": [{ "path": "/api/admin/psib-match", "schedule": "0 8 * * *" }]
}
```

## Acceptance Criteria

- [ ] POST /api/admin/psib-match returns `{ success: true, matched: N }`
- [ ] x-vercel-cron header validated via CRON_SECRET
- [ ] Matches inserted into `outreach_matches` with correct FKs
- [ ] Idempotent — unique constraint prevents duplicate matches
- [ ] vercel.json updated with cron schedule
- [ ] Zero `any`, zero `as` assertions
- [ ] tsc --noEmit passes
