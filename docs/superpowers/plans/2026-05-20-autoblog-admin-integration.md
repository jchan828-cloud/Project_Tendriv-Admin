# Autoblog Admin Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the autoblog WDK workflow into the Tendriv-Admin dashboard, replacing the old blog pipeline and drafts pages with a single tabbed Autoblog page.

**Architecture:** Thin Admin Shell — admin gets a tabbed UI page + API proxy routes. Workflow engine stays on rfp-blog.vercel.app. Both share the same Supabase project.

**Tech Stack:** Next.js 15, React 19, Supabase SSR, Tailwind CSS 3.4, Lucide icons, react-markdown (new dependency), EventSource API for SSE.

**Spec:** `docs/superpowers/specs/2026-05-20-autoblog-admin-integration-design.md`

---

## File Structure

### New files (admin repo — D:\Repositories\Project_Tendriv-Admin)

```
lib/types/autoblog.ts                        — TypeScript types
lib/autoblog/proxy.ts                        — Shared proxy helper with auth header
lib/autoblog/constants.ts                    — Persona mapping, status labels

app/api/autoblog/trigger/route.ts            — POST: proxy workflow start
app/api/autoblog/stream/[runId]/route.ts     — GET: SSE proxy
app/api/autoblog/runs/route.ts               — GET: query autoblog_runs
app/api/autoblog/run/[runId]/route.ts        — GET: proxy run status
app/api/autoblog/publish/route.ts            — POST: publish draft to blog_posts
app/api/autoblog/review/route.ts             — POST: proxy WDK hook resume
app/api/autoblog/health/route.ts             — GET: health check proxy
app/api/autoblog/settings/route.ts           — GET/POST: settings CRUD

app/(dashboard)/autoblog/page.tsx            — Server component: loads data
components/autoblog/autoblog-page.tsx         — Client component: tab state
components/autoblog/dashboard-tab.tsx         — Run history + active run
components/autoblog/review-tab.tsx            — Split panel review
components/autoblog/settings-tab.tsx          — Settings form
components/autoblog/run-history-table.tsx     — Table component
components/autoblog/active-run-banner.tsx     — Live run status
components/autoblog/live-stream-panel.tsx     — SSE event display
components/autoblog/draft-list.tsx            — Left panel list
components/autoblog/draft-preview.tsx         — Right panel preview + actions
components/autoblog/draft-editor.tsx          — Markdown edit mode
components/autoblog/status-badge.tsx          — Status pill component
```

### Modified files (admin repo)

```
components/layout/sidebar.tsx                — Replace nav items
package.json                                 — Add react-markdown
```

### New files (rfp-blog repo — D:\Repositories\RFP-Blog\rfp-blog)

```
app/api/autoblog-health/route.ts             — GET: health endpoint
lib/auth-guard.ts                            — API key validation helper
```

### Modified files (rfp-blog repo)

```
workflows/autoblog.ts                        — Write draft data to autoblog_runs on completion
workflows/lib/db.ts                          — Add updateRunWithDraft() function
app/api/autoblog/route.ts                    — Add API key validation
app/api/autoblog/cron/route.ts               — Read autoblog_settings, respect schedule
app/api/autoblog-readable/[runId]/route.ts   — Add API key validation
app/api/autoblog-run/[runId]/route.ts        — Add API key validation
app/api/autoblog-review/route.ts             — Add API key validation
```

### Files to remove (admin repo — after integration verified)

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

## Task 1: Database Migration — autoblog_settings Table + autoblog_runs Columns

**Files:**
- Supabase migration (via MCP tool)

- [ ] **Step 1: Create autoblog_settings table**

Run via Supabase MCP:
```sql
CREATE TABLE autoblog_settings (
  id            INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled       BOOLEAN NOT NULL DEFAULT false,
  frequency     TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'every_2_days', 'weekly')),
  run_time_utc  TEXT NOT NULL DEFAULT '11:00',
  posts_per_run INTEGER NOT NULL DEFAULT 1 CHECK (posts_per_run BETWEEN 1 AND 5),
  target_persona TEXT NOT NULL DEFAULT 'bid-manager',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO autoblog_settings (id) VALUES (1);
```

Expected: Table created with one default row.

- [ ] **Step 2: Add new columns to autoblog_runs**

```sql
ALTER TABLE autoblog_runs
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS draft_markdown TEXT,
  ADD COLUMN IF NOT EXISTS seo_metadata JSONB,
  ADD COLUMN IF NOT EXISTS word_count INTEGER,
  ADD COLUMN IF NOT EXISTS content_type TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
```

Expected: 6 new nullable columns added.

- [ ] **Step 3: Verify both tables**

Query `autoblog_settings` — should return 1 row with defaults. Query `autoblog_runs` columns — should include the 6 new columns.

- [ ] **Step 4: Commit (no code files to commit — migration is in Supabase)**

---

## Task 2: rfp-blog — API Key Validation + Health Endpoint

**Files:**
- Create: `D:\Repositories\RFP-Blog\rfp-blog\lib\auth-guard.ts`
- Create: `D:\Repositories\RFP-Blog\rfp-blog\app\api\autoblog-health\route.ts`
- Modify: `D:\Repositories\RFP-Blog\rfp-blog\app\api\autoblog\route.ts`
- Modify: `D:\Repositories\RFP-Blog\rfp-blog\app\api\autoblog-readable\[runId]\route.ts`
- Modify: `D:\Repositories\RFP-Blog\rfp-blog\app\api\autoblog-run\[runId]\route.ts`
- Modify: `D:\Repositories\RFP-Blog\rfp-blog\app\api\autoblog-review\route.ts`

- [ ] **Step 1: Create auth-guard helper**

```typescript
// lib/auth-guard.ts
import { NextResponse } from "next/server";

export function validateApiKey(request: Request): NextResponse | null {
  const key = request.headers.get("x-autoblog-key");
  if (!process.env.AUTOBLOG_API_KEY) return null; // No key configured = open (dev mode)
  if (key !== process.env.AUTOBLOG_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
```

- [ ] **Step 2: Create health endpoint**

```typescript
// app/api/autoblog-health/route.ts
export async function GET() {
  return Response.json({ ok: true, timestamp: new Date().toISOString() });
}
```

- [ ] **Step 3: Add auth guard to existing endpoints**

Add to the top of each handler in `autoblog/route.ts`, `autoblog-readable/[runId]/route.ts`, `autoblog-run/[runId]/route.ts`, `autoblog-review/route.ts`:

```typescript
import { validateApiKey } from "@/lib/auth-guard";

// Inside handler:
const authError = validateApiKey(request);
if (authError) return authError;
```

The cron route (`autoblog/cron/route.ts`) keeps using `CRON_SECRET` — no change.

- [ ] **Step 4: Run tests**

Run: `cd D:\Repositories\RFP-Blog\rfp-blog && npx vitest run`
Expected: All 23 tests pass (auth guard is no-op when AUTOBLOG_API_KEY not set).

- [ ] **Step 5: Commit**

```bash
git add lib/auth-guard.ts app/api/autoblog-health/route.ts app/api/autoblog/route.ts app/api/autoblog-readable/ app/api/autoblog-run/ app/api/autoblog-review/route.ts
git commit -m "feat: add API key validation and health endpoint for admin integration"
```

---

## Task 3: rfp-blog — Write Draft Data to autoblog_runs on Completion

**Files:**
- Modify: `D:\Repositories\RFP-Blog\rfp-blog\workflows\lib\db.ts`
- Modify: `D:\Repositories\RFP-Blog\rfp-blog\workflows\autoblog.ts`

- [ ] **Step 1: Add updateRunWithDraft function to db.ts**

```typescript
export async function updateRunWithDraft(runId: string, data: {
  headline: string;
  draft_markdown: string;
  seo_metadata: Record<string, unknown>;
  word_count: number;
  content_type: string;
}): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from("autoblog_runs")
    .update(data)
    .eq("run_id", runId);
  if (error) throw error;
}
```

- [ ] **Step 2: Call updateRunWithDraft in autoblog.ts**

In the `runPipeline` function, after `scoreQuality()` completes and before the auto-approve check, add a step to persist draft data:

```typescript
// After quality scoring, before publish decision
await persistDraftData(runId, mergedDraft, brief, seo);
```

Add the helper step:

```typescript
async function persistDraftData(
  runId: string,
  markdown: string,
  brief: ContentBrief,
  seo: SeoResearch
): Promise<void> {
  "use step";
  await updateRunWithDraft(runId, {
    headline: brief.headline,
    draft_markdown: markdown,
    seo_metadata: {
      primaryKeyword: seo.primaryKeyword,
      secondaryKeywords: seo.secondaryKeywords,
      targetSlug: seo.targetSlug,
      schemaType: brief.schemaType,
      contentSilo: seo.contentSilo,
      metaTitle: brief.metaTitle,
      metaDescription: brief.metaDescription,
    },
    word_count: markdown.split(/\s+/).length,
    content_type: brief.contentType,
  });
}
```

Import `updateRunWithDraft` from `@/workflows/lib/db`.

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add workflows/lib/db.ts workflows/autoblog.ts
git commit -m "feat: persist draft data to autoblog_runs for admin review queue"
```

---

## Task 4: rfp-blog — Cron Reads autoblog_settings

**Files:**
- Modify: `D:\Repositories\RFP-Blog\rfp-blog\workflows\lib\db.ts`
- Modify: `D:\Repositories\RFP-Blog\rfp-blog\app\api\autoblog\cron\route.ts`

- [ ] **Step 1: Add fetchAutoblogSettings to db.ts**

```typescript
export interface AutoblogSettings {
  enabled: boolean;
  frequency: string;
  run_time_utc: string;
  posts_per_run: number;
  target_persona: string;
}

export async function fetchAutoblogSettings(): Promise<AutoblogSettings | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("autoblog_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) return null;
  return data;
}
```

- [ ] **Step 2: Update cron route to respect settings**

Read the existing cron route first, then modify it to:
1. Fetch `autoblog_settings`.
2. If `enabled = false`, return `{ skipped: true, reason: 'disabled' }`.
3. Check frequency against last run's `created_at`.
4. Loop `posts_per_run` times, starting a workflow for each.

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 4: Commit and deploy rfp-blog**

```bash
git add workflows/lib/db.ts app/api/autoblog/cron/route.ts
git commit -m "feat: cron respects autoblog_settings for schedule and persona"
```

Deploy: `git push origin master` (triggers Vercel deploy).

- [ ] **Step 5: Set AUTOBLOG_API_KEY env var on rfp-blog Vercel project**

Generate a random key and set it via Vercel dashboard or CLI.

---

## Task 5: Admin — Types, Proxy Helper, and Dependencies

**Files:**
- Create: `D:\Repositories\Project_Tendriv-Admin\lib\types\autoblog.ts`
- Create: `D:\Repositories\Project_Tendriv-Admin\lib\autoblog\proxy.ts`
- Create: `D:\Repositories\Project_Tendriv-Admin\lib\autoblog\constants.ts`
- Modify: `D:\Repositories\Project_Tendriv-Admin\package.json`

- [ ] **Step 1: Install react-markdown**

```bash
cd D:\Repositories\Project_Tendriv-Admin && npm install react-markdown
```

- [ ] **Step 2: Create autoblog types**

```typescript
// lib/types/autoblog.ts
export interface AutoblogRun {
  id: string;
  run_id: string;
  tender_id: string;
  status: 'running' | 'completed' | 'published' | 'failed' | 'rejected' | 'timeout';
  target_persona: string;
  closing_date: string;
  published_slug: string | null;
  quality_score: number | null;
  total_tokens: number | null;
  estimated_cost: number | null;
  headline: string | null;
  draft_markdown: string | null;
  seo_metadata: SeoMetadata | null;
  word_count: number | null;
  content_type: string | null;
  created_at: string;
  completed_at: string | null;
  published_at: string | null;
}

export interface SeoMetadata {
  primaryKeyword: string;
  secondaryKeywords: string[];
  targetSlug: string;
  schemaType: string;
  contentSilo: string;
  metaTitle: string;
  metaDescription: string;
}

export interface AutoblogSettings {
  id: number;
  enabled: boolean;
  frequency: 'daily' | 'every_2_days' | 'weekly';
  run_time_utc: string;
  posts_per_run: number;
  target_persona: string;
  updated_at: string;
}

export interface AutoblogEvent {
  type: string;
  [key: string]: unknown;
}
```

- [ ] **Step 3: Create proxy helper**

```typescript
// lib/autoblog/proxy.ts
const ENGINE_URL = process.env.AUTOBLOG_ENGINE_URL ?? 'https://rfp-blog.vercel.app';
const API_KEY = process.env.AUTOBLOG_API_KEY ?? '';

export async function proxyToEngine(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${ENGINE_URL}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'x-autoblog-key': API_KEY,
      'Content-Type': 'application/json',
    },
  });
}

export function getEngineUrl(): string {
  return ENGINE_URL;
}
```

- [ ] **Step 4: Create constants**

```typescript
// lib/autoblog/constants.ts
export const PERSONA_OPTIONS = [
  { value: 'bid-manager', label: 'Bid Manager — experienced procurement professional preparing proposals' },
  { value: 'business-owner', label: 'Business Owner — SMB owner exploring government contracts for the first time' },
  { value: 'procurement-officer', label: 'Procurement Officer — government buyer researching supplier landscape' },
] as const;

export const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'every_2_days', label: 'Every 2 days' },
  { value: 'weekly', label: 'Weekly' },
] as const;

export const STATUS_CONFIG = {
  running: { label: 'Running', color: 'var(--status-warning)', bg: 'var(--status-warning-bg)' },
  completed: { label: 'Completed', color: 'var(--status-success)', bg: 'var(--status-success-bg)' },
  published: { label: 'Published', color: 'var(--status-success)', bg: 'var(--status-success-bg)' },
  failed: { label: 'Failed', color: 'var(--sovereign)', bg: 'var(--sovereign-pale)' },
  rejected: { label: 'Rejected', color: 'var(--sovereign)', bg: 'var(--sovereign-pale)' },
  timeout: { label: 'Timed out', color: 'var(--text-muted)', bg: 'var(--surface-badge)' },
} as const;
```

- [ ] **Step 5: Commit**

```bash
git add lib/types/autoblog.ts lib/autoblog/proxy.ts lib/autoblog/constants.ts package.json package-lock.json
git commit -m "feat: add autoblog types, proxy helper, and constants"
```

---

## Task 6: Admin — API Routes

**Files:**
- Create: `app/api/autoblog/trigger/route.ts`
- Create: `app/api/autoblog/stream/[runId]/route.ts`
- Create: `app/api/autoblog/runs/route.ts`
- Create: `app/api/autoblog/run/[runId]/route.ts`
- Create: `app/api/autoblog/publish/route.ts`
- Create: `app/api/autoblog/review/route.ts`
- Create: `app/api/autoblog/health/route.ts`
- Create: `app/api/autoblog/settings/route.ts`

- [ ] **Step 1: Create auth guard helper for admin routes**

Each route needs to verify the user is logged in and has `content` module access. Create a shared helper:

```typescript
// lib/autoblog/auth.ts
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function requireContentAccess(): Promise<{ userId: string } | NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Note: middleware.ts handles module-based page access, but API routes bypass middleware.
  // For API routes, check the user's profile for 'content' module access.
  // Read the user's role/modules from the profiles table or user_metadata.
  // If the user lacks 'content' module access, return 403.
  // Check how existing admin pages verify module access (see lib/auth/roles.ts).
  return { userId: user.id };
}
```

- [ ] **Step 2: Create trigger route**

```typescript
// app/api/autoblog/trigger/route.ts
import { NextResponse } from 'next/server';
import { proxyToEngine } from '@/lib/autoblog/proxy';
import { requireContentAccess } from '@/lib/autoblog/auth';

export async function POST() {
  const auth = await requireContentAccess();
  if (auth instanceof NextResponse) return auth;

  const res = await proxyToEngine('/api/autoblog', { method: 'POST' });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

- [ ] **Step 3: Create SSE stream proxy route**

```typescript
// app/api/autoblog/stream/[runId]/route.ts
import { NextRequest } from 'next/server';
import { proxyToEngine } from '@/lib/autoblog/proxy';
import { requireContentAccess } from '@/lib/autoblog/auth';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requireContentAccess();
  if (auth instanceof NextResponse) return auth;

  const { runId } = await params;
  const res = await proxyToEngine(`/api/autoblog-readable/${runId}`);

  if (!res.ok || !res.body) {
    return NextResponse.json({ error: 'Stream not available' }, { status: res.status });
  }

  return new Response(res.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

- [ ] **Step 4: Create runs list route**

```typescript
// app/api/autoblog/runs/route.ts
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireContentAccess } from '@/lib/autoblog/auth';

export async function GET() {
  const auth = await requireContentAccess();
  if (auth instanceof NextResponse) return auth;

  const supabase = await createServiceRoleClient();
  const { data, error } = await supabase
    .from('autoblog_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 5: Create run status proxy, publish, review, health, settings routes**

Follow the same pattern as above. Each route:
- Calls `requireContentAccess()` first
- Either proxies to rfp-blog (trigger, stream, run status, review, health) or queries Supabase directly (runs, publish, settings)

The publish route (`POST /api/autoblog/publish`) is the most complex:
1. Read `{ runId, markdown }` from body (markdown may be edited by the reviewer)
2. Fetch run data from `autoblog_runs` (headline, seo_metadata, content_type, completed_at)
3. Insert into `blog_posts`:
   - `title` = headline
   - `slug` = seo_metadata.targetSlug
   - `content` = markdown (from body, may differ from draft_markdown if edited)
   - `excerpt` = first 160 chars of markdown (strip markdown syntax)
   - `meta_description` = seo_metadata.metaDescription
   - `target_keyword` = seo_metadata.primaryKeyword
   - `secondary_keywords` = seo_metadata.secondaryKeywords (text[])
   - `content_type` = content_type
   - `status` = 'published'
   - `generated_by` = 'autoblog'
   - `word_count` = markdown.split(/\s+/).length
   - `jsonld_override` = build from seo_metadata.schemaType (see spec)
   - `published_at` = now()
   - `generated_at` = completed_at
4. Update `autoblog_runs`: status='published', published_slug, published_at=now()
5. Return `{ ok: true, slug }`

The settings route handles both GET (read current) and POST (upsert).

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd D:\Repositories\Project_Tendriv-Admin && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add app/api/autoblog/ lib/autoblog/auth.ts
git commit -m "feat: add autoblog API routes (proxy + direct Supabase)"
```

---

## Task 7: Admin — Sidebar Navigation Update

**Files:**
- Modify: `D:\Repositories\Project_Tendriv-Admin\components\layout\sidebar.tsx`

- [ ] **Step 1: Update content section nav items**

In `allSections`, in the `content` section, replace:
```typescript
{ label: 'Drafts', href: '/drafts' },
// and
{ label: 'Blog pipeline', href: '/blog/pipeline' },
```

With:
```typescript
{ label: 'Autoblog', href: '/autoblog' },
```

Keep Posts, Calendar, and Media unchanged.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat: replace Blog pipeline + Drafts with Autoblog in sidebar"
```

---

## Task 8: Admin — UI Components (Status Badge + Run History Table)

**Files:**
- Create: `D:\Repositories\Project_Tendriv-Admin\components\autoblog\status-badge.tsx`
- Create: `D:\Repositories\Project_Tendriv-Admin\components\autoblog\run-history-table.tsx`

- [ ] **Step 1: Create StatusBadge component**

Small pill showing run status with color from `STATUS_CONFIG`. Uses Tendriv design tokens.

- [ ] **Step 2: Create RunHistoryTable component**

Table with columns: Tender (headline), Status (badge), Started (relative time), Duration, Action (contextual link). Props: `runs: AutoblogRun[]`, `onStreamClick: (runId: string) => void`.

- [ ] **Step 3: Verify TypeScript compiles**

- [ ] **Step 4: Commit**

```bash
git add components/autoblog/status-badge.tsx components/autoblog/run-history-table.tsx
git commit -m "feat: add StatusBadge and RunHistoryTable components"
```

---

## Task 9: Admin — Dashboard Tab (Active Run Banner + Live Stream)

**Files:**
- Create: `D:\Repositories\Project_Tendriv-Admin\components\autoblog\active-run-banner.tsx`
- Create: `D:\Repositories\Project_Tendriv-Admin\components\autoblog\live-stream-panel.tsx`
- Create: `D:\Repositories\Project_Tendriv-Admin\components\autoblog\dashboard-tab.tsx`

- [ ] **Step 1: Create ActiveRunBanner**

Shows when any run has `status = 'running'`. Displays: pulsing green dot, stage info, tender title, elapsed time, "View live" toggle.

- [ ] **Step 2: Create LiveStreamPanel**

Connects to `/api/autoblog/stream/${runId}` via `EventSource`. Parses SSE `data:` lines as JSON. Renders events in a scrollable log. Auto-scrolls to bottom. Shows events like stage transitions, tender selection, quality scores.

- [ ] **Step 3: Create DashboardTab**

Composes: ActiveRunBanner (if running) + "Run Now" button + RunHistoryTable. The "Run Now" button calls `POST /api/autoblog/trigger`, shows loading state, then polls `/api/autoblog/runs` to update the table.

- [ ] **Step 4: Verify TypeScript compiles**

- [ ] **Step 5: Commit**

```bash
git add components/autoblog/active-run-banner.tsx components/autoblog/live-stream-panel.tsx components/autoblog/dashboard-tab.tsx
git commit -m "feat: add Dashboard tab with live stream and run history"
```

---

## Task 10: Admin — Review Tab (Draft List + Preview + Editor)

**Files:**
- Create: `D:\Repositories\Project_Tendriv-Admin\components\autoblog\draft-list.tsx`
- Create: `D:\Repositories\Project_Tendriv-Admin\components\autoblog\draft-preview.tsx`
- Create: `D:\Repositories\Project_Tendriv-Admin\components\autoblog\draft-editor.tsx`
- Create: `D:\Repositories\Project_Tendriv-Admin\components\autoblog\review-tab.tsx`

- [ ] **Step 1: Create DraftList**

Left panel (320px). Lists runs where `status = 'completed'` and `published_slug IS NULL`. Each item shows headline, content_type, word_count, quality_score, created_at. Selected item has jade left border. Props: `drafts: AutoblogRun[]`, `selectedId: string | null`, `onSelect: (id: string) => void`.

- [ ] **Step 2: Create DraftPreview**

Right panel. Shows action bar (Publish, Edit, Discard), meta badges (keyword, schema, score, closing date), and rendered markdown via `react-markdown`. Props: `draft: AutoblogRun`, `onPublish`, `onEdit`, `onDiscard`.

- [ ] **Step 3: Create DraftEditor**

Replaces preview when editing. Textarea with raw markdown. Save and Cancel buttons. Edits are held in local React state (not persisted to DB on every save) — the edited markdown is passed to the Publish action. "Save" commits the local edit and returns to preview mode showing the edited version. "Cancel" discards local edits and reverts to the original `draft_markdown`.

- [ ] **Step 4: Create ReviewTab**

Composes DraftList + DraftPreview/DraftEditor in a split layout. Manages selected draft state, edit mode toggle. Empty state when no drafts pending.

- [ ] **Step 5: Verify TypeScript compiles**

- [ ] **Step 6: Commit**

```bash
git add components/autoblog/draft-list.tsx components/autoblog/draft-preview.tsx components/autoblog/draft-editor.tsx components/autoblog/review-tab.tsx
git commit -m "feat: add Review Queue tab with split-panel draft review"
```

---

## Task 11: Admin — Settings Tab

**Files:**
- Create: `D:\Repositories\Project_Tendriv-Admin\components\autoblog\settings-tab.tsx`

- [ ] **Step 1: Create SettingsTab**

Form with:
- Toggle: auto-generate on/off
- Frequency: pill selector (daily/every 2 days/weekly)
- Run time: time input, display in MT, convert to/from UTC
- Posts per run: pill selector 1-5
- Persona: dropdown from `PERSONA_OPTIONS`
- Engine status: ping `/api/autoblog/health` on mount
- Save button: POST to `/api/autoblog/settings`

Load initial values via GET `/api/autoblog/settings` on mount. Show toast/message on save success.

- [ ] **Step 2: Handle Mountain Time conversion**

UTC offset for Mountain Time: -7 (MDT) or -6 (MST). Use `Intl.DateTimeFormat` with `timeZone: 'America/Edmonton'` for display. Store UTC in DB.

- [ ] **Step 3: Verify TypeScript compiles**

- [ ] **Step 4: Commit**

```bash
git add components/autoblog/settings-tab.tsx
git commit -m "feat: add Settings tab with schedule and persona config"
```

---

## Task 12: Admin — Page Assembly (Server + Client Components)

**Files:**
- Create: `D:\Repositories\Project_Tendriv-Admin\app\(dashboard)\autoblog\page.tsx`
- Create: `D:\Repositories\Project_Tendriv-Admin\components\autoblog\autoblog-page.tsx`

- [ ] **Step 1: Create server component page**

```typescript
// app/(dashboard)/autoblog/page.tsx
import { redirect } from 'next/navigation';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { AutoblogPage } from '@/components/autoblog/autoblog-page';
import type { AutoblogRun, AutoblogSettings } from '@/lib/types/autoblog';

export default async function AutoblogServerPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = await createServiceRoleClient();

  const [{ data: runs }, { data: settings }] = await Promise.all([
    service.from('autoblog_runs').select('*').order('created_at', { ascending: false }).limit(50),
    service.from('autoblog_settings').select('*').eq('id', 1).single(),
  ]);

  return (
    <AutoblogPage
      initialRuns={(runs ?? []) as AutoblogRun[]}
      initialSettings={settings as AutoblogSettings | null}
    />
  );
}
```

- [ ] **Step 2: Create client component shell**

`AutoblogPage` manages tab state via `useSearchParams`. Renders tab bar + active tab content. Props: `initialRuns`, `initialSettings`.

- [ ] **Step 3: Verify the page loads**

Start dev server: `npm run dev`. Navigate to `http://localhost:3000/autoblog`. Expect: tabbed page renders with initial data from Supabase.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/autoblog/page.tsx components/autoblog/autoblog-page.tsx
git commit -m "feat: assemble Autoblog page with server data loading and tab shell"
```

---

## Task 13: Admin — Environment Variables + Deploy

**Files:**
- Vercel environment config

- [ ] **Step 1: Set environment variables on admin Vercel project**

```
AUTOBLOG_ENGINE_URL=https://rfp-blog.vercel.app
AUTOBLOG_API_KEY=<same key set on rfp-blog>
```

- [ ] **Step 2: Deploy admin**

```bash
cd D:\Repositories\Project_Tendriv-Admin && git push origin main
```

- [ ] **Step 3: Verify end-to-end**

1. Open admin.tendriv.ca/autoblog
2. Check Dashboard tab loads with run history
3. Click "Run Now" — verify run starts and live stream works
4. Switch to Review Queue — verify completed drafts appear
5. Test Settings — save settings and verify they persist
6. Test publish flow — publish a draft and verify it appears in /posts

---

## Task 14: Admin — Remove Old Blog Pipeline + Drafts Pages

**Files:**
- Delete: `app/(dashboard)/blog/pipeline/page.tsx`
- Delete: `app/(dashboard)/drafts/page.tsx`
- Delete: `components/blog/topic-table.tsx`
- Delete: `components/blog/generation-settings-form.tsx`
- Delete: `components/blog/add-topic-form.tsx`
- Delete: `components/blog/generate-drafts-button.tsx`
- Delete: `components/drafts/draft-table.tsx`
- Delete: `components/drafts/draft-actions.tsx`
- Delete: `components/drafts/copy-mdx-button.tsx`
- Delete: `lib/types/blog-settings.ts`

- [ ] **Step 1: Delete old files**

Remove all files listed above.

- [ ] **Step 2: Check for remaining imports**

Grep for any imports of the deleted files/types. Fix any broken references.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old blog pipeline and drafts pages (replaced by Autoblog)"
```

- [ ] **Step 5: Deploy and verify**

Push and verify admin.tendriv.ca still works. Old routes `/blog/pipeline` and `/drafts` should 404.
