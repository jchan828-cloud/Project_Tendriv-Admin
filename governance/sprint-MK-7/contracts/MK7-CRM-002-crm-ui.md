---
task_id: MK7-CRM-002
name: CRM Contact List + Pipeline UI
layer: Layer 1
repo: Project_Tendriv-Admin
priority: Medium
depends_on: [MK7-CRM-001, MK7-PSIB-001]
interface_contract: Project_Tendriv-Marketing/governance/sprint-MK-7/SPRINT-MK-7-INTERFACE-CONTRACT.md
---

# MK7-CRM-002 — CRM Contact List + Pipeline UI

## Objective

Build dashboard pages for viewing and managing outreach contacts. Follows the
existing Admin UI patterns (DraftTable style: gray-50 bg, minimal table, pill
status badges, filter buttons).

## Deliverables

### 1. Contact List Page: `app/(dashboard)/crm/page.tsx`

Server component that:
- Fetches all contacts from `outreach_contacts` via `createServiceRoleClient()`
- Renders `ContactTable` component
- Supports filtering by pipeline ('psib', 'geo', 'manual', 'All')
- Supports filtering by status ('prospect', 'contacted', 'replied', 'demo', 'converted', 'unsubscribed')
- Shows: business_name, province, pipeline, status, last_activity_at
- Link to detail page

### 2. Contact Detail Page: `app/(dashboard)/crm/[id]/page.tsx`

Server component that:
- Fetches single contact + activity log + matches
- Shows contact fields (business_name, email, website, province, UNSPSC categories)
- Shows CASL consent info
- Shows activity timeline (from `outreach_activity_log`)
- Shows matched tenders (from `outreach_matches`)
- Status update action (change contact status)

### 3. Components

- `components/crm/contact-table.tsx` — Client component with filter state
- `components/crm/contact-detail.tsx` — Contact info display
- `components/crm/activity-timeline.tsx` — Activity log timeline

### 4. Navigation Update

Update `app/(dashboard)/layout.tsx` to add CRM nav link alongside Drafts.

## Acceptance Criteria

- [ ] `/crm` renders contact list with filters
- [ ] `/crm/[id]` renders contact detail with activity + matches
- [ ] Filters work for pipeline and status
- [ ] Activity timeline shows events chronologically
- [ ] Dashboard nav includes CRM link
- [ ] Follows existing UI patterns (DraftTable style)
- [ ] No inline styles (Rule 10)
- [ ] Zero `any`, zero `as` assertions
- [ ] tsc --noEmit passes
- [ ] npm run build passes
