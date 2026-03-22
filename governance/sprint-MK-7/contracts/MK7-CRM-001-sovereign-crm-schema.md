---
task_id: MK7-CRM-001
name: Sovereign CRM Schema + Types
layer: Layer 3/Migration
repo: Project_Tendriv-Admin
priority: High
depends_on: [MK-6 VERIFIED]
interface_contract: Project_Tendriv-Marketing/governance/sprint-MK-7/SPRINT-MK-7-INTERFACE-CONTRACT.md
---

# MK7-CRM-001 — Sovereign CRM Schema + Types

## Objective

Create the foundational database schema and TypeScript types for the sovereign
CRM system. All contact data stays in Supabase `epremgahbzjnlpzaqdcj` (ca-central-1).
No third-party CRM, no US-hosted contact data.

## Deliverables

### 1. SQL Migration: `supabase/migrations/20260321000000_outreach_crm.sql`

Tables to create (schema defined in interface contract Section 2):

- `outreach_contacts` — CRM contact records with CASL consent fields
  - RLS enabled
  - Indexes on `pipeline`, `status`
- `outreach_sequences` — Email sequence templates
  - Unique constraint on `(pipeline, step)`
- `outreach_activity_log` — Event log (sent, opened, replied, bounced)
  - FK to `outreach_contacts(id)` with CASCADE delete
  - FK to `outreach_sequences(id)`
  - Index on `contact_id`
- `outreach_matches` — PSIB tender-contact matches
  - FK to `outreach_contacts(id)` with CASCADE delete
  - FK to `scout_notices(id)` with CASCADE delete
  - Unique constraint on `(contact_id, notice_id)`

### 2. TypeScript Types: `lib/types/crm.ts`

Types as defined in interface contract Section 1:
- `OutreachContact`
- `OutreachSequence`
- `OutreachMatch`
- `OutreachActivityEvent` (for activity log event types)

## Acceptance Criteria

- [ ] Migration SQL is valid and matches interface contract exactly
- [ ] RLS enabled on `outreach_contacts`
- [ ] All FK constraints and indexes present
- [ ] TypeScript types match the SQL schema 1:1
- [ ] CASL consent fields (`casl_consent_method`, `casl_consent_date`, `casl_consent_source`) present on `outreach_contacts`
- [ ] Zero `any`, zero `as` assertions
- [ ] tsc --noEmit passes after adding types

## Constitution Rules

- Rule 8: Types in lib/types/ only
- Rule 9: No `any`, no `as`, no `@ts-ignore`
- Sovereignty: All data in `epremgahbzjnlpzaqdcj` (ca-central-1)
