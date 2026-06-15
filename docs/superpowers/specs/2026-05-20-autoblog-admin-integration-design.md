# Autoblog Admin Integration — Design Spec

## Overview

Integrate the autoblog WDK workflow (running on rfp-blog.vercel.app) into the Tendriv-Admin dashboard (admin.tendriv.ca), fully replacing the old `/blog/pipeline` topic-queue approach and the `/drafts` page.

**Architecture**: Thin Admin Shell — the admin gets one new page (`/autoblog`) with three tabs (Dashboard, Review Queue, Settings). All heavy lifting stays on rfp-blog.vercel.app. Admin's API routes are thin proxies that forward to rfp-blog and relay SSE streams. Both share the same Supabase project (tendriv-marketing, `epremgahbzjnlpzaqdcj`).

**What gets replaced**: The sidebar items "Blog pipeline" (`/blog/pipeline`) and "Drafts" (`/drafts`) are removed and replaced with a single "Autoblog" item (`/autoblog`). The old components in `components/blog/` and `components/drafts/` become dead code.

---

## Decision Log

| Decision | Choice | Reason |
|----------|--------|--------|
| API pattern | Proxy through admin's `/api/autoblog/*` | Hides rfp-blog URL, avoids CORS, central auth |
| Trigger model | Admin-controlled schedule + manual | Full control from one UI |
| Review flow | Review & publish in admin | Single workflow, no context switching |
| Navigation | Single "Autoblog" page with tabs | Simpler than multi-page, user preference |
| Time display | Mountain Time (MT) with UTC under the hood | User's timezone |
| Posts per run | 1–5 selector | User requirement |

---

## Navigation Changes

### Sidebar (`components/layout/sidebar.tsx`)

In the `content` section of `allSections`, remove:
- `{ label: 'Drafts', href: '/drafts' }`
- `{ label: 'Blog pipeline', href: '/blog/pipeline' }`

Add:
- `{ label: 'Autoblog', href: '/autoblog' }`

The `isActive` function already handles prefix matching for `/autoblog` via the existing `pathname.startsWith(href + '/')` logic, but since this is a single-page with query params (not sub-routes), the exact match `href === pathname` handles it.

---

## Page: `/autoblog`

**Route**: `app/(dashboard)/autoblog/page.tsx` (server component)

The page loads initial data server-side (run history, pending drafts, settings) and renders a client component that manages tab state via `?tab=` search param.

### Tab 1: Dashboard (default)

**Data source**: `autoblog_runs` table via Supabase (direct query from admin, not proxied).

**Components**:
- **Active run banner**: Shown when any row in `autoblog_runs` has `status = 'running'`. Shows stage name, tender title, elapsed time. "View live" expands an inline SSE stream panel.
- **Run history table**: Columns — Tender, Status, Started, Duration, Action. Status badges reflect the live run-status set `{running, completed, failed, timeout}`: Running (amber), Completed (green), Failed (red), Timed out (muted) (reconciled 2026-06-15 vs live DB CHECK constraint). Whether a completed run was published is derived from `blog_posts`, not from the run status.
- **"Run Now" button**: `POST /api/autoblog/trigger` → proxies to rfp-blog → returns `{ runId }`. Button shows loading state, then the active run banner appears.
- **Live stream panel**: When expanded, connects to `GET /api/autoblog/stream/[runId]` (SSE proxy). Shows real-time workflow events as they arrive — stage transitions, tender selection, research findings, draft progress. Auto-scrolling log-style display.

### Tab 2: Review Queue

**Data source**: `autoblog_runs` where `status = 'completed'` and `published_slug IS NULL` (draft ready but not yet published).

**Layout**: Split panel — draft list on left (320px), preview + actions on right.

**Left panel** (draft list):
- Each item shows: headline (from `autoblog_runs.headline`), content type, word count, quality score, generation timestamp.
- Selected item has jade left border highlight.
- Click switches the right panel preview.

**Right panel** (preview + actions):
- **Action bar**: Publish (jade primary), Edit (secondary), Discard (danger outline).
- **Meta badges**: Primary keyword, schema type, E-E-A-T score, closing date countdown.
- **Markdown preview**: Rendered HTML from the draft markdown stored in `autoblog_runs.draft_markdown`.
- **Edit mode**: Clicking "Edit" swaps preview for a textarea with the raw markdown. "Save" persists back to `autoblog_runs.draft_markdown`. "Cancel" reverts.
- **Publish action**: `POST /api/autoblog/publish` with `{ runId, markdown, headline, slug }`. This creates the blog post with `blog_posts.status = 'published'` (details in API section) and sets `autoblog_runs.published_slug`. The run status stays `completed` — `published` is not a valid run status (reconciled 2026-06-15 vs live DB CHECK constraint).

### Tab 3: Settings

**Data source**: `autoblog_settings` table (new, single-row config).

**Fields**:
- **Auto-generate toggle**: Boolean on/off.
- **Frequency**: `daily` | `every_2_days` | `weekly`. Pill selector UI.
- **Run time**: Time picker, displayed in Mountain Time. Stored as UTC in DB. Shows "Next run: [date] at [time] MT ([UTC time] UTC)".
- **Posts per run**: 1–5 pill selector.
- **Target persona**: Dropdown — "Bid Manager", "Business Owner", "Procurement Officer".
- **Workflow engine status**: Read-only indicator. Pings `GET /api/autoblog/health` which proxies to rfp-blog. Shows green dot + "Connected" or red dot + "Unreachable".
- **Save button**: `POST /api/autoblog/settings` upserts the row.

---

## API Routes (Admin)

All routes live under `app/api/autoblog/` in the admin repo. They use `createServiceRoleClient()` for Supabase access and authenticate the user via the session cookie before proxying.

### Shared: Auth guard

Every API route checks for a valid Supabase session and that the user has `content` module access. Returns 401 if not authenticated, 403 if not authorized.

### `POST /api/autoblog/trigger`

Proxies to rfp-blog:
1. `POST https://rfp-blog.vercel.app/api/autoblog` → `{ runId }`
2. Returns `{ runId }` to the client.

Uses `AUTOBLOG_ENGINE_URL` env var (defaults to `https://rfp-blog.vercel.app`). Includes a shared secret header `x-autoblog-key` for auth between the two services.

### `GET /api/autoblog/stream/[runId]`

SSE proxy:
1. Fetches `GET ${AUTOBLOG_ENGINE_URL}/api/autoblog-readable/${runId}`
2. Pipes the SSE stream through to the admin client.
3. Sets appropriate SSE headers (`Content-Type: text/event-stream`, etc.).

### `GET /api/autoblog/runs`

Direct Supabase query (no proxy needed — shared DB):
1. Queries `autoblog_runs` ordered by `created_at DESC`, limit 50.
2. Returns array of run objects.

### `GET /api/autoblog/run/[runId]`

Proxies to rfp-blog:
1. `GET ${AUTOBLOG_ENGINE_URL}/api/autoblog-run/${runId}`
2. Returns run status object.

### `POST /api/autoblog/publish`

Publishes a draft:
1. Reads `runId` from body.
2. Fetches the draft data from `autoblog_runs` (markdown, headline, slug, SEO metadata).
3. Inserts a new row in `blog_posts` (the existing published posts table) with `status = 'published'`.
4. Updates `autoblog_runs` row: `published_slug = slug`, `published_at = now()`. The run `status` is left at `completed` — `published` is not a valid run status (reconciled 2026-06-15 vs live DB CHECK constraint).
5. Returns `{ ok: true, slug }`.

### `POST /api/autoblog/review`

Proxies human review decisions to rfp-blog's WDK hook resume endpoint. This is used when the workflow is paused at the human review gate (quality gate step emits an `awaiting_review` event with a hook token). The admin UI's live stream panel or review queue calls this to resume the workflow.

1. `POST ${AUTOBLOG_ENGINE_URL}/api/autoblog-review` with `{ token, decision, edits }`.
2. `decision` must be `"approve"`, `"revise"`, or `"reject"`.
3. Returns `{ ok: true }`.

### `GET /api/autoblog/health`

Health check:
1. `GET ${AUTOBLOG_ENGINE_URL}/api/autoblog-run/health` — a new lightweight GET endpoint on rfp-blog that returns `{ ok: true }` (see rfp-blog changes below).
2. Returns `{ ok: true, latency: <ms> }` or `{ ok: false, error: <message> }`.

### `GET /api/autoblog/settings`

Direct Supabase query:
1. Reads the single row from `autoblog_settings`.
2. Returns settings object.

### `POST /api/autoblog/settings`

Direct Supabase upsert:
1. Validates the body (enabled, frequency, run_time_utc, posts_per_run, target_persona).
2. Upserts into `autoblog_settings` (id = 1, single-row pattern).
3. Returns `{ ok: true }`.

---

## Database Changes

### New table: `autoblog_settings`

```sql
CREATE TABLE autoblog_settings (
  id          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled     BOOLEAN NOT NULL DEFAULT false,
  frequency   TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'every_2_days', 'weekly')),
  run_time_utc TEXT NOT NULL DEFAULT '11:00',
  posts_per_run INTEGER NOT NULL DEFAULT 1 CHECK (posts_per_run BETWEEN 1 AND 5),
  target_persona TEXT NOT NULL DEFAULT 'bid-manager',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Single-row table with CHECK constraint on id to enforce exactly one config row.

### Existing table: `autoblog_runs` (current schema)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | auto-generated |
| run_id | TEXT NOT NULL | WDK workflow run ID |
| tender_id | TEXT NOT NULL | scout_notices.id |
| status | TEXT NOT NULL | `'running'` default. Live CHECK values: running, completed, failed, timeout (reconciled 2026-06-15 vs live DB CHECK constraint) |
| target_persona | TEXT NOT NULL | e.g. 'bid-manager' |
| closing_date | DATE NOT NULL | tender closing date |
| published_slug | TEXT NULL | set on publish |
| quality_score | NUMERIC NULL | E-E-A-T score |
| total_tokens | INTEGER NULL | token usage |
| estimated_cost | NUMERIC NULL | cost estimate |
| created_at | TIMESTAMPTZ | default now() |
| completed_at | TIMESTAMPTZ NULL | when workflow finished |

**New columns to add:**

- `headline TEXT` — the generated article headline (populated by quality gate step)
- `draft_markdown TEXT` — the full draft markdown content
- `seo_metadata JSONB` — `{ primaryKeyword, secondaryKeywords, targetSlug, schemaType, contentSilo, metaTitle, metaDescription }`
- `word_count INTEGER` — generated article word count
- `content_type TEXT` — tender-analysis, how-to, glossary, sector-report
- `published_at TIMESTAMPTZ` — when the draft was published (null until publish)

The `status` column does NOT gain a `published` value (reconciled 2026-06-15 vs
live DB CHECK constraint). The live CHECK allows exactly `{running, completed,
failed, timeout}`. Publishing updates `blog_posts.status`, not the run status;
the run remains `completed`. Writing `published` to `autoblog_runs.status`
throws.

### Existing table: `blog_posts` (publish target)

The publish action inserts into this table. Required columns for autoblog publishing:

| Column | Value Source |
|--------|-------------|
| title | `autoblog_runs.headline` |
| slug | `autoblog_runs.seo_metadata->>'targetSlug'` |
| content | `autoblog_runs.draft_markdown` |
| excerpt | First 160 chars of draft |
| meta_description | `autoblog_runs.seo_metadata->>'metaDescription'` |
| target_keyword | `autoblog_runs.seo_metadata->>'primaryKeyword'` |
| secondary_keywords | `autoblog_runs.seo_metadata->>'secondaryKeywords'` (array) |
| content_type | `autoblog_runs.content_type` |
| status | `'published'` |
| generated_by | `'autoblog'` |
| word_count | `autoblog_runs.word_count` |
| jsonld_override | Built from `autoblog_runs.seo_metadata->>'schemaType'` |
| published_at | `now()` |
| generated_at | `autoblog_runs.completed_at` |

Other columns (`author_id`, `reviewer_id`, `is_gated`, etc.) are nullable and left as defaults.

### Persona value mapping

The `target_persona` column and Settings UI use kebab-case values internally. The UI displays human-readable labels:

| Stored value | Display label |
|-------------|---------------|
| `bid-manager` | Bid Manager — experienced procurement professional preparing proposals |
| `business-owner` | Business Owner — SMB owner exploring government contracts for the first time |
| `procurement-officer` | Procurement Officer — government buyer researching supplier landscape |

### Cron changes on rfp-blog

The existing `api/autoblog/cron/route.ts` needs to read `autoblog_settings` before executing:
1. Fetch `autoblog_settings` row.
2. If `enabled = false`, return early.
3. Check frequency against last run timestamp.
4. If schedule says run, execute `posts_per_run` times with the configured `target_persona`.

---

## Environment Variables

### Admin (admin.tendriv.ca)

- `AUTOBLOG_ENGINE_URL` — rfp-blog base URL (e.g., `https://rfp-blog.vercel.app`)
- `AUTOBLOG_API_KEY` — shared secret for authenticating proxy requests to rfp-blog

### rfp-blog (rfp-blog.vercel.app)

- `AUTOBLOG_API_KEY` — same shared secret, validated on incoming requests from admin

---

## Auth & Security

- All admin API routes require a valid Supabase auth session (cookie-based via `@supabase/ssr`).
- The user must have the `content` module in their role to access autoblog features.
- Proxy requests from admin to rfp-blog include `x-autoblog-key: ${AUTOBLOG_API_KEY}` header.
- rfp-blog validates this header on all endpoints (new middleware or per-route check).
- The rfp-blog URL is never exposed to the browser — all communication goes through admin's API routes.

---

## File Structure (New/Modified in Admin)

```
app/(dashboard)/autoblog/
  page.tsx                          ← Server component: loads data, renders AutoblogPage

app/api/autoblog/
  trigger/route.ts                  ← POST: proxy to rfp-blog start
  stream/[runId]/route.ts           ← GET: SSE proxy
  runs/route.ts                     ← GET: query autoblog_runs
  run/[runId]/route.ts              ← GET: proxy run status
  publish/route.ts                  ← POST: publish draft
  review/route.ts                   ← POST: proxy review decision
  health/route.ts                   ← GET: health check proxy
  settings/route.ts                 ← GET/POST: settings CRUD

components/autoblog/
  autoblog-page.tsx                 ← Client component: tab management, state
  dashboard-tab.tsx                 ← Run history table + active run banner
  review-tab.tsx                    ← Split panel: draft list + preview
  settings-tab.tsx                  ← Settings form
  run-history-table.tsx             ← Table component for runs
  active-run-banner.tsx             ← Live run status banner
  live-stream-panel.tsx             ← SSE event stream display
  draft-list.tsx                    ← Left panel draft list
  draft-preview.tsx                 ← Right panel markdown preview + actions
  draft-editor.tsx                  ← Markdown edit mode
  status-badge.tsx                  ← Colored status pill (Running/Completed/Failed/Timeout — reconciled 2026-06-15 vs live DB CHECK constraint)

lib/types/autoblog.ts               ← TypeScript types for autoblog
lib/autoblog/proxy.ts               ← Shared proxy helper (fetch with auth header)
```

### Files to remove (dead code from old pipeline)

```
app/(dashboard)/blog/pipeline/page.tsx
app/(dashboard)/drafts/page.tsx
components/blog/topic-table.tsx
components/blog/generation-settings-form.tsx
components/blog/add-topic-form.tsx
components/blog/generate-drafts-button.tsx
components/drafts/draft-table.tsx
components/drafts/draft-actions.tsx
components/drafts/copy-mdx-button.tsx
lib/types/blog-settings.ts
```

---

## Component Design Notes

- All components use the existing Tendriv design tokens (`var(--jade)`, `var(--surface-card-solid)`, etc.) and utility classes from `globals.css`.
- No new dependencies needed — the admin already has everything required (Supabase client, Lucide icons, React).
- The markdown preview in the Review tab can use a lightweight markdown renderer. Check if the admin already has one; if not, add `react-markdown` (~30KB).
- The SSE stream panel uses native `EventSource` API in the browser, no library needed.
- Tab state uses `useSearchParams()` from `next/navigation` for bookmarkable tabs.

---

## rfp-blog Changes (Separate Deployment)

These changes are deployed to rfp-blog.vercel.app independently. They should be done first since the admin depends on them.

### New: Health endpoint

Add `app/api/autoblog-health/route.ts`:
```
GET /api/autoblog-health → { ok: true, timestamp: <ISO string> }
```

### New: API key validation

All existing endpoints (autoblog, autoblog-readable, autoblog-run, autoblog-review) gain middleware or per-route checks that validate the `x-autoblog-key` header matches `AUTOBLOG_API_KEY` env var. Returns 401 if missing/invalid. The cron route uses `CRON_SECRET` as before.

### Modified: Cron route reads `autoblog_settings`

The existing `api/autoblog/cron/route.ts` is updated to:
1. Read `autoblog_settings` from Supabase.
2. If `enabled = false`, return `{ skipped: true, reason: 'disabled' }`.
3. Check `frequency` against `autoblog_runs.created_at` of the last run.
4. If not due, return `{ skipped: true, reason: 'not_due' }`.
5. Loop `posts_per_run` times, calling `start(autoblogWorkflow, [])` each time.
6. Pass `target_persona` from settings to the workflow.

### Modified: Workflow writes new columns

The autoblog workflow's quality gate step needs to write `headline`, `draft_markdown`, `seo_metadata`, `word_count`, and `content_type` to `autoblog_runs` when the run completes.

---

## Testing Strategy

- **API routes**: Unit test each proxy route with mocked fetch calls to rfp-blog.
- **Components**: Test tab switching, form validation, button states.
- **Integration**: Manual E2E — trigger a run from admin, watch the live stream, review the draft, publish it, verify it appears in `/posts`.
- **Auth**: Verify unauthenticated requests return 401, unauthorized (wrong module) return 403.

---

## Rollout Plan

1. Add `autoblog_settings` table via Supabase migration.
2. Add new columns to `autoblog_runs` (if not present).
3. Add `AUTOBLOG_ENGINE_URL` and `AUTOBLOG_API_KEY` env vars to both deployments.
4. Add API key validation middleware to rfp-blog.
5. Build admin API routes and components.
6. Update sidebar navigation.
7. Deploy admin. Verify end-to-end.
8. Remove old blog pipeline and drafts pages/components.
9. Update rfp-blog cron to read `autoblog_settings`.
