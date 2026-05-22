# Feature & state-machine diagrams — Admin

Documents every shipped feature in this repo as a Mermaid diagram and
every state-bearing entity as a state diagram with a transition table.

## How to read these

GitHub renders fenced ` ```mermaid ` blocks natively, so every `.md`
here is browsable directly in the PR/file view.

| Diagram kind | When used |
|---|---|
| `journey` | A persona walking through a UX flow (steps + satisfaction) |
| `flowchart` | UI ↔ API ↔ DB call graph for a feature |
| `sequenceDiagram` | A pipeline (cron / SSE / multi-actor) |
| `stateDiagram-v2` | Lifecycle of a status-bearing row in Supabase |

## Layout

- [`architecture.md`](./architecture.md) — cross-repo system map
  (admin ↔ external Autoblog engine, admin ↔ marketing webhooks,
  shared Supabase tables, cron schedule).
- `features/*.md` — one per feature.
- `state-machines/*.md` — one per Supabase table with a `status`-like
  column. Each pairs the diagram with a transition table that cites
  the migration line and the TS/Zod source-of-truth, so a reviewer
  can spot drift on the spot.

## Feature index

| Feature | Routes | Diagram |
|---|---|---|
| Autoblog | `(dashboard)/autoblog`, `api/autoblog/*` | [features/autoblog.md](./features/autoblog.md) |
| Content (CMS) | `(dashboard)/posts`, `api/marketing/posts/*` | [features/content-cms.md](./features/content-cms.md) |
| CRM / outreach | `(dashboard)/crm`, `api/admin/crm/*`, `api/admin/psib-match`, `api/admin/geo-match` | [features/crm-outreach.md](./features/crm-outreach.md) |
| Sales pipeline | `(dashboard)/sales`, `api/sales/deals/*` | [features/sales-pipeline.md](./features/sales-pipeline.md) |
| Finance & billing | `(dashboard)/finance/*`, `api/finance/*` | [features/finance.md](./features/finance.md) |
| Feedback | `(dashboard)/feedback`, `api/feedback/*` | [features/feedback.md](./features/feedback.md) |
| Audit log | `(dashboard)/audit`, `lib/audit/log.ts` | [features/audit-log.md](./features/audit-log.md) |
| System health | `(dashboard)/system-health`, `api/drains/*` | [features/system-health.md](./features/system-health.md) |
| Settings / RBAC | `(dashboard)/settings/*`, `lib/auth/roles.ts` | [features/settings-rbac.md](./features/settings-rbac.md) |
| Analytics & scoring | `(dashboard)/analytics/*`, `api/marketing/{events,attribution,score,utms}` | [features/analytics-marketing.md](./features/analytics-marketing.md) |

## State-machine index

| Entity | States | Diagram |
|---|---|---|
| `autoblog_runs` | running → completed \| published \| failed \| rejected \| timeout | [state-machines/autoblog-runs.md](./state-machines/autoblog-runs.md) |
| `blog_posts` | draft → review → approved → published \| archived | [state-machines/blog-posts.md](./state-machines/blog-posts.md) |
| `blog_post_versions` | change_type classifier (auto-save\|manual-save\|status-change\|approval\|restore) | [state-machines/blog-post-versions.md](./state-machines/blog-post-versions.md) |
| `outreach_contacts` | prospect → contacted → replied → demo → converted \| unsubscribed | [state-machines/outreach-contacts.md](./state-machines/outreach-contacts.md) |
| `deals` | lead → qualified → proposal → negotiation → won \| lost | [state-machines/deals.md](./state-machines/deals.md) |
| `feedback` | new → reviewed → in-progress → resolved \| wont-fix \| duplicate | [state-machines/feedback.md](./state-machines/feedback.md) |
| `billing_accounts` | trial → active \| paused \| cancelled | [state-machines/billing-accounts.md](./state-machines/billing-accounts.md) |
| `customers` | trial → active \| paused \| churned | [state-machines/customers.md](./state-machines/customers.md) |
| `linkedin_drafts` | pending → posted | [state-machines/linkedin-drafts.md](./state-machines/linkedin-drafts.md) |

## Drift-prevention discipline

Each `state-machines/*.md` carries a **Source of truth** block listing
(a) the migration file + line declaring the CHECK constraint and
(b) the TS/Zod union or Zod schema that mirrors it.

When you add a state value, update *both* and update the diagram in
the same PR. A follow-up `scripts/check-state-drift.ts` will parse
these docs and fail CI on mismatch — the doc structure here is
designed for that script.
