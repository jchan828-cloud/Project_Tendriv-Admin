---
task_id: MK7-PSIB-004
name: Cyberimpact PSIB Campaign Sequence
layer: Layer 2
repo: Project_Tendriv-Admin
priority: Medium
depends_on: [MK7-PSIB-001, MK7-CRM-001]
interface_contract: Project_Tendriv-Marketing/governance/sprint-MK-7/SPRINT-MK-7-INTERFACE-CONTRACT.md
---

# MK7-PSIB-004 — Cyberimpact PSIB Campaign Sequence

## Objective

Build an API route that triggers the 3-email PSIB outreach drip campaign via
Cyberimpact API. Sends personalized emails to IBD contacts in the `monitor-psib`
group. All emails are CASL-compliant with unsubscribe mechanism.

## Deliverables

### API Route: `app/api/admin/psib-campaign/route.ts`

- Method: POST
- Auth: OAuth (authenticated admin user via Supabase session)
- Response: `{ success: true, queued: number }`

### Logic

1. Verify admin authentication
2. Fetch eligible contacts from `outreach_contacts` where:
   - `pipeline = 'psib'`
   - `status = 'prospect'` (not yet contacted)
   - CASL consent fields populated
3. For each contact, determine which email step to send based on `outreach_activity_log`
4. Queue emails via Cyberimpact API:
   - Add contact to `monitor-psib` group if not already a member
   - Trigger appropriate email template
5. Log activity in `outreach_activity_log` with `event_type = 'sent'`
6. Update contact `status` from 'prospect' to 'contacted'
7. Return count of queued emails

### Email Sequence (from Interface Contract Section 5)

**Email 1 (Day 0):** "There are federal contracts reserved for your business right now"
**Email 2 (Day 5):** "[N] PSIB set-aside tenders active this week in your category"
**Email 3 (Day 12):** "How to respond to a PSIB tender — a step-by-step guide"

### Environment Variables Required

- `CYBERIMPACT_API_KEY` — Cyberimpact API authentication
- `CYBERIMPACT_GROUP_IDS` — JSON map including `monitor-psib` group ID

## Acceptance Criteria

- [ ] POST /api/admin/psib-campaign returns `{ success: true, queued: N }`
- [ ] Admin auth validated via Supabase session
- [ ] Activity logged in `outreach_activity_log`
- [ ] Contact status updated to 'contacted'
- [ ] CASL consent verified before sending
- [ ] Zero `any`, zero `as` assertions
- [ ] tsc --noEmit passes
