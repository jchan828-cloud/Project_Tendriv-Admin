---
sprint: MK-7
folder: governance/sprint-MK-7
theme: PSIB Indigenous Business Pipeline + Sovereign CRM (Admin Tasks)
status: VERIFIED
ordering_constraint: MK-6 VERIFIED (required before dispatch)
date_created: 2026-03-21
repo: Project_Tendriv-Admin
interface_contract_source: Project_Tendriv-Marketing/governance/sprint-MK-7/SPRINT-MK-7-INTERFACE-CONTRACT.md
briefing_sources:
  - Project_Tendriv-Marketing/governance/sprint-MK-7/manifest.md (master manifest)
  - Project_Tendriv-Marketing/governance/sprint-MK-7/SPRINT-MK-7-INTERFACE-CONTRACT.md (types, schema, API)
superseded_by: []
---

# Sprint MK-7 — Admin Tasks: PSIB Pipeline + Sovereign CRM

## Scope

This manifest covers the 5 Admin-repo tasks from Sprint MK-7. The master
manifest and interface contract live in Project_Tendriv-Marketing. All type
definitions, database schema, API contracts, and CASL compliance requirements
are authoritative from that interface contract.

## Ordering Constraint

MK-6 MUST be VERIFIED before any MK-7 task is dispatched.
Marketing repo MK-7 tasks are VERIFIED_WITH_NOTES (2026-03-21).

## Task Inventory

| Task ID | Name | Layer | Priority | Deps |
|---------|------|-------|----------|------|
| **MK7-CRM-001** | Sovereign CRM schema: `outreach_contacts`, `outreach_sequences`, `outreach_activity_log` + types | Layer 3/Migration | High | MK-6 VERIFIED |
| **MK7-PSIB-001** | IBD scraper → `outreach_contacts` table in marketing Supabase | Layer 3/Script | High | MK7-CRM-001 |
| **MK7-PSIB-002** | PSIB tender matcher — IBD category x `scout_notices.is_psib` → `outreach_matches` | Layer 2/Cron | Medium | MK7-PSIB-001, MK7-CRM-001 |
| **MK7-CRM-002** | CRM contact list + pipeline UI in Admin dashboard | Layer 1 | Medium | MK7-CRM-001, MK7-PSIB-001 |
| **MK7-PSIB-004** | Cyberimpact PSIB campaign sequence (3-email drip, CASL-compliant) | Layer 2 | Medium | MK7-PSIB-001, MK7-CRM-001 |

## Dispatch Order

```
Phase 1 — Schema + Types Foundation:
  MK7-CRM-001    Sovereign CRM schema (migration + lib/types/crm.ts)

Phase 2 — Data Population:
  MK7-PSIB-001   IBD scraper → outreach_contacts

Phase 3 — Matching + Campaign + UI (parallel after Phase 2):
  MK7-PSIB-002   PSIB tender matcher (cron route)
  MK7-CRM-002    CRM contact list UI
  MK7-PSIB-004   Cyberimpact PSIB 3-email campaign
```

## Technical Artifacts

```
supabase/migrations/20260321000000_outreach_crm.sql   — MK7-CRM-001
lib/types/crm.ts                                       — MK7-CRM-001
scripts/ibd-scraper.ts                                 — MK7-PSIB-001
app/api/admin/psib-match/route.ts                      — MK7-PSIB-002
app/api/admin/psib-campaign/route.ts                   — MK7-PSIB-004
app/(dashboard)/crm/page.tsx                           — MK7-CRM-002
app/(dashboard)/crm/[id]/page.tsx                      — MK7-CRM-002
components/crm/contact-table.tsx                       — MK7-CRM-002
components/crm/contact-detail.tsx                      — MK7-CRM-002
```

## Constitution Rules In Force

| Rule | Description |
|------|-------------|
| Rule 3 | No Edge Runtime |
| Rule 7 | service_role allowed in Admin server components and API routes (marketing Supabase only) |
| Rule 8 | Zod schemas in lib/types/ only |
| Rule 9 | No `any`, no `as`, no `@ts-ignore` |
| Rule 10 | Tailwind only — no inline style={{}} |
| MK6-CRON | x-vercel-cron on all cron routes |

## Sovereignty Assertions

| Service | Usage | Sovereignty Status |
|---------|-------|-------------------|
| Vercel yul1 | All compute | Enforced |
| Supabase ca-central-1 | All data (`epremgahbzjnlpzaqdcj`) | Enforced |
| Cyberimpact | PSIB email campaign | Canadian-hosted |
| IBD (sac-isc.gc.ca) | Contact data source | Canadian government — public |
