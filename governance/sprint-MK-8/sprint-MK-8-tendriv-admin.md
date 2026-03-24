# Sprint MK-8 — tendriv-admin: Blog CMS + Analytics + CRM Intelligence

---

## Manifest

```
sprint:               MK-8
theme:                tendriv-admin — Content, Analytics, CRM, Intelligence
status:               PLANNING
ordering_constraint:  MK-7 VERIFIED (both repos) — required before dispatch
date_created:         2026-03-24
repo:                 Project_Tendriv-Admin
interface_contract:   governance/sprint-MK-8/SPRINT-MK-8-INTERFACE-CONTRACT.md
```

---

## Scope

Sprint MK-8 delivers the full tendriv-admin portal: a sovereign blog CMS with SEO authoring, content calendar, taxonomy engine, and gated content; a GA4-aligned analytics layer with UTM management, per-post attribution dashboards, and funnel visualisation; CRM enhancements adding lead scoring, contact enrichment, content attribution, and ABM account mapping; and an AI intelligence layer with content gap briefs, predictive lead scoring, sovereignty controls, and a SOC2-ready immutable audit log.

All compute stays on Vercel `yul1`. All data stays in Supabase `ca-central-1` (`epremgahbzjnlpzaqdcj`). No US-hosted analytics pipelines. CASL compliance enforced throughout.

---

## Ordering Constraint

MK-7 MUST be VERIFIED (both repos) before any MK-8 task is dispatched.

---

## Task Inventory

| Task ID | Name | Layer | Priority | Deps |
|---------|------|-------|----------|------|
| **MK8-CMS-001** | Blog post schema + Zod types | Layer 3/Migration | High | MK-7 VERIFIED |
| **MK8-CMS-002** | Rich editor with front-matter panel | Layer 1 | High | MK8-CMS-001 |
| **MK8-CMS-003** | Content calendar + status workflow | Layer 1 | High | MK8-CMS-001 |
| **MK8-CMS-004** | Taxonomy engine (tags, topics, buyer stage) | Layer 3/Migration + Layer 1 | Medium | MK8-CMS-001 |
| **MK8-CMS-005** | JSON-LD schema markup generator | Layer 2 | Medium | MK8-CMS-001 |
| **MK8-CMS-006** | Gated content + CASL lead capture | Layer 2 + Layer 1 | High | MK8-CMS-001, MK8-CRM-001 |
| **MK8-CMS-007** | Multi-channel publish router | Layer 2 | Medium | MK8-CMS-001 |
| **MK8-CMS-008** | Content version control + approval audit | Layer 3/Migration + Layer 2 | High | MK8-CMS-001 |
| **MK8-ANL-001** | UTM builder + campaign tracking table | Layer 3/Migration + Layer 1 | High | MK-7 VERIFIED |
| **MK8-ANL-002** | GA4 custom event schema + server-side tagging | Layer 2 | High | MK8-ANL-001 |
| **MK8-ANL-003** | Per-post analytics dashboard | Layer 1 | Medium | MK8-ANL-001, MK8-CMS-001 |
| **MK8-ANL-004** | Funnel visualisation (blog → demo → contract) | Layer 1 | Medium | MK8-ANL-001, MK8-CRM-001 |
| **MK8-CRM-001** | Lead scoring engine + score table | Layer 3/Migration + Layer 2 | High | MK-7 VERIFIED |
| **MK8-CRM-002** | Content-to-contact attribution (first + last touch) | Layer 2 | High | MK8-CRM-001, MK8-CMS-001 |
| **MK8-CRM-003** | ABM account map (ministry + agency grouping) | Layer 3/Migration + Layer 1 | Medium | MK8-CRM-001 |
| **MK8-INT-001** | AI content brief generator | Layer 2 | Medium | MK8-CMS-001 |
| **MK8-INT-002** | Predictive lead score cron + model | Layer 2/Cron | Medium | MK8-CRM-001, MK8-ANL-001 |
| **MK8-INT-003** | Immutable audit log + SOC2 event trail | Layer 3/Migration + Layer 2 | High | MK-7 VERIFIED |

---

## Dispatch Order

```
Phase 1 — Schema + Types Foundation (sequential):
  MK8-CMS-001    Blog post schema + types
  MK8-ANL-001    UTM + campaign tracking table
  MK8-CRM-001    Lead scoring engine + score table
  MK8-INT-003    Immutable audit log schema

Phase 2 — Core CMS + Analytics (parallel after Phase 1):
  MK8-CMS-002    Rich editor
  MK8-CMS-003    Content calendar
  MK8-CMS-004    Taxonomy engine
  MK8-ANL-002    GA4 server-side tagging
  MK8-ANL-003    Per-post analytics dashboard

Phase 3 — CRM + Attribution + Intelligence (parallel after Phase 2):
  MK8-CMS-005    JSON-LD schema markup
  MK8-CMS-006    Gated content + CASL capture
  MK8-CMS-007    Multi-channel publish router
  MK8-CMS-008    Version control + approval audit
  MK8-ANL-004    Funnel visualisation
  MK8-CRM-002    Content-to-contact attribution
  MK8-CRM-003    ABM account map
  MK8-INT-001    AI content brief generator
  MK8-INT-002    Predictive lead score cron
```

---

## Technical Artifacts

```
supabase/migrations/20260324000001_blog_posts.sql             — MK8-CMS-001
supabase/migrations/20260324000002_blog_taxonomy.sql          — MK8-CMS-004
supabase/migrations/20260324000003_blog_versions.sql          — MK8-CMS-008
supabase/migrations/20260324000004_utm_campaigns.sql          — MK8-ANL-001
supabase/migrations/20260324000005_lead_scores.sql            — MK8-CRM-001
supabase/migrations/20260324000006_abm_accounts.sql           — MK8-CRM-003
supabase/migrations/20260324000007_audit_log.sql              — MK8-INT-003
lib/types/cms.ts                                              — MK8-CMS-001
lib/types/analytics.ts                                        — MK8-ANL-001
lib/types/scoring.ts                                          — MK8-CRM-001
lib/types/audit.ts                                            — MK8-INT-003
lib/cms/jsonld.ts                                             — MK8-CMS-005
lib/cms/publish-router.ts                                     — MK8-CMS-007
lib/scoring/engine.ts                                         — MK8-CRM-001
lib/scoring/predictive.ts                                     — MK8-INT-002
app/api/marketing/posts/route.ts                              — MK8-CMS-001
app/api/marketing/posts/[id]/route.ts                         — MK8-CMS-001
app/api/marketing/posts/[id]/publish/route.ts                 — MK8-CMS-007
app/api/marketing/posts/[id]/versions/route.ts                — MK8-CMS-008
app/api/marketing/gate/route.ts                               — MK8-CMS-006
app/api/marketing/events/route.ts                             — MK8-ANL-002
app/api/marketing/utms/route.ts                               — MK8-ANL-001
app/api/marketing/score/route.ts                              — MK8-CRM-001
app/api/marketing/score/cron/route.ts                         — MK8-INT-002
app/api/marketing/brief/route.ts                              — MK8-INT-001
app/(dashboard)/posts/page.tsx                                — MK8-CMS-003
app/(dashboard)/posts/[id]/page.tsx                           — MK8-CMS-002
app/(dashboard)/posts/[id]/versions/page.tsx                  — MK8-CMS-008
app/(dashboard)/analytics/page.tsx                            — MK8-ANL-003
app/(dashboard)/analytics/funnel/page.tsx                     — MK8-ANL-004
app/(dashboard)/crm/scoring/page.tsx                          — MK8-CRM-001
app/(dashboard)/crm/accounts/page.tsx                         — MK8-CRM-003
components/cms/post-editor.tsx                                — MK8-CMS-002
components/cms/frontmatter-panel.tsx                          — MK8-CMS-002
components/cms/calendar-board.tsx                             — MK8-CMS-003
components/cms/taxonomy-selector.tsx                          — MK8-CMS-004
components/cms/gate-config.tsx                                — MK8-CMS-006
components/cms/version-timeline.tsx                           — MK8-CMS-008
components/analytics/post-stats-card.tsx                      — MK8-ANL-003
components/analytics/funnel-chart.tsx                         — MK8-ANL-004
components/analytics/utm-builder.tsx                          — MK8-ANL-001
components/crm/score-badge.tsx                                — MK8-CRM-001
components/crm/attribution-panel.tsx                          — MK8-CRM-002
components/crm/account-map.tsx                                — MK8-CRM-003
```

---

## Constitution Rules In Force

| Rule | Description |
|------|-------------|
| Rule 3 | No Edge Runtime |
| Rule 7 | service_role in Admin server components + API routes only |
| Rule 8 | Zod schemas in lib/types/ only |
| Rule 9 | No `any`, no `as`, no `@ts-ignore` |
| Rule 10 | Tailwind only — no inline style={{}} |
| MK6-CRON | x-vercel-cron header on all cron routes |
| MK8-AUDIT | Every state-changing API route MUST append to audit_log before returning |
| MK8-CASL | Every lead capture MUST record casl_consent_method + casl_consent_date + casl_consent_source |

---

## Sovereignty Assertions

| Service | Usage | Sovereignty Status |
|---------|-------|-------------------|
| Vercel yul1 | All compute | Enforced |
| Supabase ca-central-1 | All data (epremgahbzjnlpzaqdcj) | Enforced |
| Cyberimpact | Email dispatch | Canadian-hosted |
| GA4 (server-side) | Analytics events via proxy | Proxied — no raw client GA4 calls |
| Anthropic API | AI content briefs | Acceptable — no PII transmitted |

---

---

# TASK CONTRACTS

---

## MK8-CMS-001 — Blog Post Schema + Zod Types

```
task_id:    MK8-CMS-001
layer:      Layer 3 / Migration
priority:   High
depends_on: MK-7 VERIFIED
```

### Objective

Create the foundational `blog_posts` table and all TypeScript/Zod types for the CMS layer. This is the schema contract all other CMS tasks depend on. Must be dispatched and verified before any other MK8-CMS-* task.

### Deliverables

**1. SQL Migration: `supabase/migrations/20260324000001_blog_posts.sql`**

Table: `blog_posts`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| title | text NOT NULL | |
| slug | text NOT NULL UNIQUE | |
| content | text | Markdown body |
| excerpt | text | Max 300 chars |
| meta_description | text | Max 160 chars |
| canonical_url | text | |
| og_image_url | text | |
| target_keyword | text | Primary SEO keyword |
| secondary_keywords | text[] | |
| buyer_stage | text | 'awareness' / 'consideration' / 'decision' |
| content_type | text | 'blog' / 'case-study' / 'guide' / 'whitepaper' |
| status | text | 'draft' / 'review' / 'approved' / 'published' / 'archived' |
| is_gated | boolean | default false |
| gate_cta | text | CTA label for gate form |
| author_id | uuid FK → auth.users | |
| reviewer_id | uuid FK → auth.users | nullable |
| reviewer_notes | text | nullable |
| published_at | timestamptz | nullable |
| scheduled_at | timestamptz | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |
| generated_by | text | 'human' / 'ai-assisted' |
| word_count | integer | computed on insert/update via trigger |
| reading_time_minutes | integer | computed: word_count / 200 |

- RLS enabled (deny-all for anon key; service_role bypasses)
- Index on `status`, `buyer_stage`, `published_at DESC`
- Trigger: `set_updated_at` on UPDATE

**2. TypeScript Types: `lib/types/cms.ts`**

```typescript
export type BuyerStage = 'awareness' | 'consideration' | 'decision'
export type ContentType = 'blog' | 'case-study' | 'guide' | 'whitepaper'
export type PostStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived'

export interface BlogPost {
  id: string
  title: string
  slug: string
  content: string | null
  excerpt: string | null
  meta_description: string | null
  canonical_url: string | null
  og_image_url: string | null
  target_keyword: string | null
  secondary_keywords: string[]
  buyer_stage: BuyerStage
  content_type: ContentType
  status: PostStatus
  is_gated: boolean
  gate_cta: string | null
  author_id: string
  reviewer_id: string | null
  reviewer_notes: string | null
  published_at: string | null
  scheduled_at: string | null
  created_at: string
  updated_at: string
  generated_by: 'human' | 'ai-assisted'
  word_count: number
  reading_time_minutes: number
}

export type BlogPostInsert = Omit<BlogPost, 'id' | 'created_at' | 'updated_at' | 'word_count' | 'reading_time_minutes'>
export type BlogPostUpdate = Partial<BlogPostInsert>
```

**3. Zod Schema: `lib/types/cms.ts` (continued)**

Zod schemas for API request validation — PostStatus, BuyerStage, ContentType, BlogPostInsert, BlogPostUpdate.

### Acceptance Criteria

- [ ] Migration produces `blog_posts` table with all columns
- [ ] RLS enabled
- [ ] `set_updated_at` trigger fires on UPDATE
- [ ] `word_count` and `reading_time_minutes` computed correctly
- [ ] All TypeScript types match SQL schema 1:1
- [ ] Zod schemas for Insert + Update validate correctly
- [ ] Zero `any`, zero `as`
- [ ] `tsc --noEmit` passes

---

## MK8-CMS-002 — Rich Editor with Front-matter Panel

```
task_id:    MK8-CMS-002
layer:      Layer 1
priority:   High
depends_on: MK8-CMS-001
```

### Objective

Build the primary post authoring UI: a split-pane editor with a live Markdown preview on the right and a structured front-matter panel on the left. The editor is the workhorse of the CMS — it must feel fast, clean, and structured.

### Deliverables

**1. Page: `app/(dashboard)/posts/[id]/page.tsx`**

Server component that:
- Fetches post by ID via `createServiceRoleClient()`
- Passes post to `PostEditor` client component
- Handles create (id = 'new') and edit modes

**2. Component: `components/cms/post-editor.tsx`**

Client component with:
- Left pane: `FrontmatterPanel` (structured fields)
- Right pane: Markdown textarea with live word count and reading time display
- Preview toggle: renders Markdown to HTML for review
- Auto-save on debounce (1500ms) via PATCH `/api/marketing/posts/[id]`
- Save status indicator (saving / saved / error)
- Submit for review button (sets status → 'review')

**3. Component: `components/cms/frontmatter-panel.tsx`**

Structured fields (all wired to post state):
- Title (text input, character count)
- Slug (auto-generated from title, editable)
- Meta description (textarea, 160-char limit with counter)
- Target keyword (text input)
- Secondary keywords (tag input, comma-separated)
- Buyer stage (select: awareness / consideration / decision)
- Content type (select: blog / case-study / guide / whitepaper)
- OG image URL (text input)
- Scheduled publish date (datetime-local input)
- Is gated (toggle)
- Gate CTA label (text input, shown when is_gated = true)

**4. API Routes**

- `app/api/marketing/posts/route.ts` — POST (create new post)
- `app/api/marketing/posts/[id]/route.ts` — GET / PATCH / DELETE

### Acceptance Criteria

- [ ] `/posts/new` creates a new post record
- [ ] `/posts/[id]` loads existing post with all fields populated
- [ ] Auto-save fires after 1500ms debounce with visual indicator
- [ ] Slug auto-generates from title (lowercase, hyphenated)
- [ ] Meta description shows live character count (red when > 160)
- [ ] Word count and reading time update on every keystroke
- [ ] Submit for review transitions status to 'review'
- [ ] All API routes append to `audit_log`
- [ ] No inline styles, no `any`, no `as`
- [ ] `tsc --noEmit` passes, `npm run build` passes

---

## MK8-CMS-003 — Content Calendar + Status Workflow

```
task_id:    MK8-CMS-003
layer:      Layer 1
priority:   High
depends_on: MK8-CMS-001
```

### Objective

Build a content calendar board showing all posts across their status workflow stages. Marketing teams need a visual pipeline view — who is working on what, what is scheduled, what is overdue for review.

### Deliverables

**1. Page: `app/(dashboard)/posts/page.tsx`**

Server component that:
- Fetches all posts ordered by `updated_at DESC`
- Renders `CalendarBoard` client component
- Shows summary counts per status as pill badges at the top

**2. Component: `components/cms/calendar-board.tsx`**

Client component with two views (toggled):

*Kanban view* — columns for draft / review / approved / published / archived. Each card shows: title, buyer_stage badge, content_type badge, target_keyword, author, updated_at. Click navigates to editor.

*List view* — table matching existing DraftTable style. Columns: title, status badge, buyer_stage, scheduled_at, word_count, updated_at. Filters by status and buyer_stage.

*Scheduled strip* — a horizontal strip above the board showing posts with `scheduled_at` set, sorted chronologically.

### Acceptance Criteria

- [ ] Kanban and list views both render
- [ ] View toggle persists across navigation via `localStorage`
- [ ] Scheduled strip shows upcoming posts in date order
- [ ] Filter by status and buyer_stage works in list view
- [ ] Status badge colours consistent with existing pill styles
- [ ] No inline styles, no `any`, no `as`
- [ ] `tsc --noEmit` and `npm run build` pass

---

## MK8-CMS-004 — Taxonomy Engine

```
task_id:    MK8-CMS-004
layer:      Layer 3/Migration + Layer 1
priority:   Medium
depends_on: MK8-CMS-001
```

### Objective

Create a flexible tag and topic taxonomy that can be applied to posts, enabling content clustering and navigation by topic for SEO.

### Deliverables

**1. SQL Migration: `supabase/migrations/20260324000002_blog_taxonomy.sql`**

- `blog_tags` table: id, name (unique), slug (unique), description, created_at
- `blog_topics` table: id, name (unique), slug (unique), description, parent_id (self-referencing FK), created_at
- `blog_post_tags` join table: post_id FK, tag_id FK, PRIMARY KEY (post_id, tag_id)
- `blog_post_topics` join table: post_id FK, topic_id FK, PRIMARY KEY (post_id, topic_id)
- RLS enabled on all four tables

**2. Types: `lib/types/cms.ts` (additions)**

`BlogTag`, `BlogTopic`, `BlogPostTag`, `BlogPostTopic` interfaces.

**3. Component: `components/cms/taxonomy-selector.tsx`**

Client component used inside `FrontmatterPanel`:
- Tag input with autocomplete from existing tags (create on enter if new)
- Topic picker with hierarchical tree (parent > child topics)
- Selected tags and topics render as removable pills

**4. API Routes**

- `app/api/marketing/tags/route.ts` — GET (list) / POST (create)
- `app/api/marketing/topics/route.ts` — GET (list) / POST (create)
- `app/api/marketing/posts/[id]/tags/route.ts` — PUT (replace all tags for post)
- `app/api/marketing/posts/[id]/topics/route.ts` — PUT (replace all topics for post)

### Acceptance Criteria

- [ ] All 4 tables created with RLS enabled
- [ ] Tag autocomplete queries existing tags
- [ ] New tags created on-the-fly and associated with post
- [ ] Topic tree renders parent > child hierarchy
- [ ] Selected taxonomy persists on save
- [ ] No `any`, no `as`, `tsc --noEmit` passes

---

## MK8-CMS-005 — JSON-LD Schema Markup Generator

```
task_id:    MK8-CMS-005
layer:      Layer 2
priority:   Medium
depends_on: MK8-CMS-001
```

### Objective

Auto-generate structured data markup (JSON-LD) for every published post. This is critical for procurement-related content to earn rich results in Google — FAQ, HowTo, and Article schema types are most relevant.

### Deliverables

**1. Library: `lib/cms/jsonld.ts`**

Pure functions (no I/O):
- `generateArticleSchema(post: BlogPost): string` — returns JSON-LD `<script>` tag string for Article type
- `generateFaqSchema(post: BlogPost, faqs: Faq[]): string` — FAQPage schema
- `generateHowToSchema(post: BlogPost, steps: HowToStep[]): string` — HowTo schema
- `inferSchemaType(post: BlogPost): 'Article' | 'FAQPage' | 'HowTo'` — heuristic based on title/keyword patterns

Types `Faq` and `HowToStep` defined in `lib/types/cms.ts`.

**2. API Route: `app/api/marketing/posts/[id]/jsonld/route.ts`**

- GET: returns generated JSON-LD for a post
- POST: accepts custom FAQs or HowTo steps, stores as `jsonld_override` JSONB on `blog_posts` table (requires migration addition)

**3. Front-matter panel addition**

JSON-LD preview section in `FrontmatterPanel` showing the generated script tag output (read-only, collapsible).

### Acceptance Criteria

- [ ] `generateArticleSchema` produces valid JSON-LD with publisher, datePublished, author
- [ ] `inferSchemaType` returns FAQPage for posts with "FAQ" in title or target_keyword
- [ ] Schema preview renders in front-matter panel
- [ ] All functions are pure and unit-testable
- [ ] No `any`, no `as`, `tsc --noEmit` passes

---

## MK8-CMS-006 — Gated Content + CASL Lead Capture

```
task_id:    MK8-CMS-006
layer:      Layer 2 + Layer 1
priority:   High
depends_on: MK8-CMS-001, MK8-CRM-001
```

### Objective

When a post has `is_gated = true`, visitors must submit a form (name, email, organisation) to reveal the full content. The form submission creates or updates an `outreach_contacts` record with full CASL consent fields and fires a lead scoring event.

### Deliverables

**1. API Route: `app/api/marketing/gate/route.ts`**

POST endpoint (public — no auth required):
- Validates request body: name, email, organisation, source_post_id
- Upserts `outreach_contacts` record:
  - Sets `casl_consent_method = 'express'`
  - Sets `casl_consent_date = now()`
  - Sets `casl_consent_source = canonical URL of post`
  - Sets `pipeline = 'content-gate'`
  - Sets `status = 'prospect'`
- Logs to `outreach_activity_log`: event_type = 'gate-submit', metadata = { post_id, post_title }
- Logs to `content_attribution`: first_touch_post_id if contact has no prior attribution record
- Appends to `audit_log`
- Returns `{ success: true, token: string }` — short-lived signed token (JWT, 1h TTL) client stores in sessionStorage to unlock gated content on reload

**2. Component: `components/cms/gate-config.tsx`**

Used in `FrontmatterPanel` when `is_gated = true`:
- CTA label input
- Preview of the gate form as it appears to visitors
- Conversion stats (total gate submissions for this post) — fetched from activity log count

### Acceptance Criteria

- [ ] POST /api/marketing/gate creates contact with CASL fields populated
- [ ] Duplicate email on same post upserts (does not create duplicate contact)
- [ ] `casl_consent_source` is the canonical URL of the source post
- [ ] JWT token returned and validated on subsequent requests
- [ ] `audit_log` entry created for every gate submission
- [ ] Rate-limited: max 5 submissions per IP per hour (use Vercel KV or in-memory with TTL)
- [ ] No `any`, no `as`, `tsc --noEmit` passes

---

## MK8-CMS-007 — Multi-Channel Publish Router

```
task_id:    MK8-CMS-007
layer:      Layer 2
priority:   Medium
depends_on: MK8-CMS-001
```

### Objective

When a post is published, fan out to configured channels: the public blog URL, a Cyberimpact email campaign draft, and a LinkedIn post draft. The router is channel-agnostic — channels are registered via config, not hardcoded.

### Deliverables

**1. Library: `lib/cms/publish-router.ts`**

```typescript
export type PublishChannel = 'blog' | 'cyberimpact' | 'linkedin-draft'

export interface ChannelResult {
  channel: PublishChannel
  success: boolean
  externalId: string | null
  error: string | null
}

export async function publishToChannels(
  post: BlogPost,
  channels: PublishChannel[]
): Promise<ChannelResult[]>
```

Channel implementations:
- `blog`: sets `published_at = now()`, `status = 'published'` on the post record
- `cyberimpact`: creates a campaign draft via Cyberimpact API using post title + excerpt + canonical URL
- `linkedin-draft`: writes a `linkedin_drafts` record (new table) with suggested copy derived from post excerpt

**2. Migration addition**

`linkedin_drafts` table: id, post_id FK, copy text, status ('pending' / 'posted'), created_at.

**3. API Route: `app/api/marketing/posts/[id]/publish/route.ts`**

POST: accepts `{ channels: PublishChannel[] }`, calls `publishToChannels`, returns `ChannelResult[]`.

**4. UI integration**

Publish button in `PostEditor` opens a channel selector modal (checkboxes: Blog, Cyberimpact email, LinkedIn draft) before confirming publish.

### Acceptance Criteria

- [ ] Blog channel sets `published_at` and `status = 'published'`
- [ ] Cyberimpact channel creates a draft campaign (does not send)
- [ ] LinkedIn draft writes to `linkedin_drafts` table
- [ ] Each channel result logged to `audit_log`
- [ ] Failed channels do not block successful channels (parallel, catch per-channel)
- [ ] No `any`, no `as`, `tsc --noEmit` passes

---

## MK8-CMS-008 — Content Version Control + Approval Audit

```
task_id:    MK8-CMS-008
layer:      Layer 3/Migration + Layer 2
priority:   High
depends_on: MK8-CMS-001
```

### Objective

Every save of a post creates an immutable version snapshot. Approvers can diff any two versions. The approval chain (submitted → reviewed → approved) is auditable for SOC2.

### Deliverables

**1. SQL Migration: `supabase/migrations/20260324000003_blog_versions.sql`**

`blog_post_versions` table:
- id, post_id FK, version_number (integer, auto-increment per post), content snapshot (JSONB — full BlogPost row), changed_by FK → auth.users, change_type ('auto-save' / 'manual-save' / 'status-change' / 'approval'), created_at
- Index on (post_id, version_number DESC)

**2. API Route: `app/api/marketing/posts/[id]/versions/route.ts`**

- GET: returns version list (id, version_number, change_type, changed_by, created_at) — no full content
- GET `?v1=N&v2=M`: returns diff of content field between two versions (line-level diff as structured JSON)

**3. Page: `app/(dashboard)/posts/[id]/versions/page.tsx`**

Server component rendering `VersionTimeline` component.

**4. Component: `components/cms/version-timeline.tsx`**

- Chronological list of versions with change_type badge and changed_by
- Click to expand shows content diff (additions in green, removals in red)
- "Restore this version" button triggers PATCH on post with version content

**5. Auto-snapshot trigger**

In `PostEditor` auto-save handler: after successful PATCH, POST to `/api/marketing/posts/[id]/versions` to snapshot. Version type = 'auto-save'. On explicit save button: 'manual-save'. On status change: 'status-change'.

### Acceptance Criteria

- [ ] Every save creates a version record
- [ ] Version list page renders all versions with correct metadata
- [ ] Diff endpoint returns structured diff, not raw text
- [ ] Restore triggers correctly and creates a new 'restore' version entry
- [ ] RLS enabled on `blog_post_versions`
- [ ] No `any`, no `as`, `tsc --noEmit` passes

---

## MK8-ANL-001 — UTM Builder + Campaign Tracking Table

```
task_id:    MK8-ANL-001
layer:      Layer 3/Migration + Layer 1
priority:   High
depends_on: MK-7 VERIFIED
```

### Objective

Create a sovereign UTM parameter management system. Every URL published by the marketing team — blog posts, email campaigns, social links — gets a tracked UTM appended and stored. This enables campaign attribution entirely within our Supabase instance, not dependent on GA4 for first-party attribution data.

### Deliverables

**1. SQL Migration: `supabase/migrations/20260324000004_utm_campaigns.sql`**

`utm_campaigns` table:
- id, name, utm_source, utm_medium, utm_campaign, utm_term, utm_content, destination_url, full_url (computed), short_code (unique, 8 chars), click_count (integer default 0), post_id FK (nullable), created_by FK, created_at

`utm_clicks` table:
- id, utm_id FK, clicked_at, ip_hash (SHA-256, not raw IP), referrer, user_agent_hash, resolved_contact_id FK (nullable — populated async if email match found)

**2. Types: `lib/types/analytics.ts`**

`UtmCampaign`, `UtmClick` interfaces. `UtmCampaignInsert` Zod schema.

**3. Component: `components/analytics/utm-builder.tsx`**

Client component used in post editor and standalone `/utm` dashboard:
- Form: source / medium / campaign / term / content / destination URL
- Live preview of assembled UTM URL
- Copy to clipboard button
- "Save campaign" creates record via POST `/api/marketing/utms`
- Table of existing campaigns for this post with click counts

**4. API Routes**

- `app/api/marketing/utms/route.ts` — GET (list) / POST (create)
- `app/api/marketing/utms/[code]/route.ts` — GET (redirect + click log, public)

### Acceptance Criteria

- [ ] UTM URL assembles correctly from all parameters
- [ ] Short code generated and unique
- [ ] Click log records ip_hash (never raw IP) and clicked_at
- [ ] Click count increments atomically
- [ ] Campaign linked to post_id when created from editor
- [ ] No `any`, no `as`, `tsc --noEmit` passes

---

## MK8-ANL-002 — GA4 Custom Event Schema + Server-Side Tagging

```
task_id:    MK8-ANL-002
layer:      Layer 2
priority:   High
depends_on: MK8-ANL-001
```

### Objective

Define the canonical set of GA4 custom events for the marketing site and implement server-side event forwarding via the Measurement Protocol. Client-side GA4 should only fire anonymous engagement events. All personally-identifiable events (form submits, gate fills) route through our server-side proxy, keeping PII out of GA4.

### Deliverables

**1. Event Schema: `lib/types/analytics.ts` (additions)**

```typescript
export type MarketingEventType =
  | 'page_view'
  | 'scroll_depth'        // { depth: 25 | 50 | 75 | 100 }
  | 'time_on_page'        // { seconds: number }
  | 'cta_click'           // { cta_id: string, cta_label: string }
  | 'gate_submit'         // { post_id: string } — server-side only
  | 'internal_search'     // { query: string }
  | 'post_view'           // { post_id: string, post_slug: string }
  | 'utm_click'           // { utm_code: string }

export interface MarketingEvent {
  event_type: MarketingEventType
  post_id: string | null
  session_id: string       // anonymous UUID from cookie
  metadata: Record<string, unknown>
  occurred_at: string
}
```

**2. Events table: migration addition to `20260324000004_utm_campaigns.sql`**

`marketing_events` table: id, event_type, post_id FK nullable, session_id, metadata JSONB, occurred_at.

**3. API Route: `app/api/marketing/events/route.ts`**

POST — accepts `MarketingEvent[]` (batch), validates with Zod, inserts to `marketing_events`, forwards non-PII events to GA4 Measurement Protocol. Rate-limited: 100 events per session per minute.

**4. Client snippet guidance**

Document in `lib/analytics/README.md` the exact `gtag()` calls the public marketing site should fire for scroll depth and CTA clicks, pointing to the server-side proxy for gated events.

### Acceptance Criteria

- [ ] All event types validated by Zod before insert
- [ ] `gate_submit` events never forwarded to GA4 (PII risk)
- [ ] Measurement Protocol call fires for `page_view`, `cta_click`, `scroll_depth`
- [ ] Rate limit enforced
- [ ] `marketing_events` table in ca-central-1
- [ ] No `any`, no `as`, `tsc --noEmit` passes

---

## MK8-ANL-003 — Per-Post Analytics Dashboard

```
task_id:    MK8-ANL-003
layer:      Layer 1
priority:   Medium
depends_on: MK8-ANL-001, MK8-CMS-001
```

### Objective

Every post in the editor has an analytics panel showing its performance: views, scroll depth distribution, CTA click rate, UTM traffic breakdown, and — most importantly — how many CRM contacts this post has touched (first-touch and last-touch counts).

### Deliverables

**1. Page: `app/(dashboard)/analytics/page.tsx`**

Server component. Aggregates top-10 posts by views in last 30 days. Renders `PostStatsCard` grid.

**2. Component: `components/analytics/post-stats-card.tsx`**

Per-post stats card showing:
- Total views (last 7d / 30d / all time toggle)
- Avg scroll depth %
- CTA click rate (clicks / views)
- Top UTM sources (top 3 with counts)
- CRM contacts touched (first-touch count + last-touch count)
- Gated form conversion rate (submissions / views) — only if `is_gated = true`

All data fetched from `marketing_events` + `utm_clicks` + `content_attribution` tables via server component queries.

**3. Integration into PostEditor**

Stats card embedded as a collapsible panel at the bottom of `/posts/[id]` page.

### Acceptance Criteria

- [ ] Stats card renders with correct aggregations
- [ ] Time range toggle (7d / 30d / all) updates all metrics
- [ ] CRM contact count correctly joins to `content_attribution` table
- [ ] Empty state renders cleanly for new posts with no data
- [ ] No inline styles, no `any`, no `as`
- [ ] `tsc --noEmit` and `npm run build` pass

---

## MK8-ANL-004 — Funnel Visualisation

```
task_id:    MK8-ANL-004
layer:      Layer 1
priority:   Medium
depends_on: MK8-ANL-001, MK8-CRM-001
```

### Objective

A funnel dashboard showing the aggregate path from content consumption to closed contracts. This is the board-level proof that content marketing generates revenue.

### Deliverables

**1. Page: `app/(dashboard)/analytics/funnel/page.tsx`**

Server component rendering `FunnelChart` with data aggregated from:
- `marketing_events` (unique sessions with post_view events)
- `outreach_contacts` (contacts with content_attribution set)
- `outreach_contacts` filtered by status = 'demo'
- `outreach_contacts` filtered by status = 'converted'

**2. Component: `components/analytics/funnel-chart.tsx`**

Four-stage horizontal funnel:
- Stage 1: Content readers (unique sessions with ≥1 post_view)
- Stage 2: Identified leads (contacts with content first-touch)
- Stage 3: Demo requests (contacts status = 'demo')
- Stage 4: Converted (contacts status = 'converted')

Each stage shows: count, conversion rate from previous stage, and top 3 posts contributing to that stage.

**3. Date range filter**

30d / 90d / 12m / all time. Server-side: date filter passed as searchParam, data re-fetched from Supabase.

### Acceptance Criteria

- [ ] All four stages aggregate correctly
- [ ] Conversion rates calculate correctly (not capped at 100%)
- [ ] Top contributing posts listed per stage
- [ ] Date filter works via server-side re-fetch
- [ ] No `any`, no `as`, `tsc --noEmit` passes

---

## MK8-CRM-001 — Lead Scoring Engine + Score Table

```
task_id:    MK8-CRM-001
layer:      Layer 3/Migration + Layer 2
priority:   High
depends_on: MK-7 VERIFIED
```

### Objective

Build a rules-based lead scoring engine that computes a numeric score (0–100) for every `outreach_contacts` record based on content engagement signals, email activity, and firmographic data. Score is stored and indexed for pipeline prioritisation.

### Deliverables

**1. SQL Migration: `supabase/migrations/20260324000005_lead_scores.sql`**

`lead_scores` table:
- id, contact_id FK UNIQUE, score (integer 0–100), score_breakdown JSONB, scored_at, scoring_version text

`content_attribution` table:
- id, contact_id FK, post_id FK, touch_type ('first' / 'last' / 'assist'), touched_at
- UNIQUE on (contact_id, post_id, touch_type)

**2. Library: `lib/scoring/engine.ts`**

```typescript
export interface ScoreBreakdown {
  content_engagement: number   // max 30 — post views, scroll depth, gate fills
  email_engagement: number     // max 25 — opens, clicks, replies
  firmographic: number         // max 25 — PSIB eligibility, province, NAICS match
  recency: number              // max 20 — days since last activity (inverse)
}

export function computeScore(
  contact: OutreachContact,
  activityLog: OutreachActivityEvent[],
  contentTouches: ContentAttribution[]
): { score: number; breakdown: ScoreBreakdown }
```

Scoring rules documented inline as constants — no magic numbers.

**3. API Route: `app/api/marketing/score/route.ts`**

POST `{ contact_id: string }` — computes and upserts score. Returns score + breakdown.

**4. Component: `components/crm/score-badge.tsx`**

Pill badge: green (70–100), amber (40–69), red (0–39). Shows score number. Used in contact list and detail pages.

### Acceptance Criteria

- [ ] `computeScore` is a pure function with no side effects
- [ ] Score always between 0 and 100
- [ ] `score_breakdown` JSONB stores all four sub-scores
- [ ] `score_badge` renders correct colour tier
- [ ] API route appends to `audit_log`
- [ ] No `any`, no `as`, `tsc --noEmit` passes

---

## MK8-CRM-002 — Content-to-Contact Attribution

```
task_id:    MK8-CRM-002
layer:      Layer 2
priority:   High
depends_on: MK8-CRM-001, MK8-CMS-001
```

### Objective

Wire the attribution model: when a contact engages with content (gate submit, UTM click resolved to a known email), record first-touch and last-touch attribution. Surface this in the contact detail view and the post analytics panel.

### Deliverables

**1. Attribution logic in `app/api/marketing/gate/route.ts` (MK8-CMS-006 addition)**

On gate submit:
- If no `content_attribution` record exists for this contact: INSERT with `touch_type = 'first'`
- Always UPSERT with `touch_type = 'last'` (updates touched_at)
- INSERT with `touch_type = 'assist'` if contact already has a 'first' from a different post

**2. Attribution logic in UTM click resolution**

In `app/api/marketing/utms/[code]/route.ts`: when a UTM click is resolved to a known contact (via email match on the session), same first/last/assist logic applies.

**3. Component: `components/crm/attribution-panel.tsx`**

Used in `contact-detail.tsx`:
- First-touch post: title, date, buyer_stage
- Last-touch post: title, date, buyer_stage
- Assist touches: list of posts that contributed
- Days from first touch to current status

### Acceptance Criteria

- [ ] First-touch is never overwritten once set
- [ ] Last-touch always reflects the most recent content interaction
- [ ] Attribution panel renders correctly in contact detail view
- [ ] Post stats card correctly counts first-touch and last-touch contacts
- [ ] No `any`, no `as`, `tsc --noEmit` passes

---

## MK8-CRM-003 — ABM Account Map

```
task_id:    MK8-CRM-003
layer:      Layer 3/Migration + Layer 1
priority:   Medium
depends_on: MK8-CRM-001
```

### Objective

Group individual contacts into accounts (government ministries, agencies, Crown corporations, enterprise organisations) for account-based marketing. One account may have multiple contacts at different pipeline stages.

### Deliverables

**1. SQL Migration: `supabase/migrations/20260324000006_abm_accounts.sql`**

`abm_accounts` table:
- id, name, organisation_type ('ministry' / 'agency' / 'crown-corp' / 'enterprise' / 'indigenous-org'), province, naics_codes text[], website, annual_procurement_value_cad bigint nullable, notes, created_at, updated_at

`abm_account_contacts` join table:
- account_id FK, contact_id FK, role text nullable, PRIMARY KEY (account_id, contact_id)

**2. Types + Zod: `lib/types/scoring.ts` (additions)**

`AbmAccount`, `AbmAccountContact` interfaces.

**3. Page: `app/(dashboard)/crm/accounts/page.tsx`**

Server component listing accounts with:
- Account name + org type badge
- Contact count
- Highest lead score among contacts
- Pipeline coverage (which stages are represented among contacts)
- Total content touches across all contacts

**4. Component: `components/crm/account-map.tsx`**

Account detail view showing all contacts in a mini-pipeline matrix: rows = contacts, columns = pipeline stages, cell filled if contact is at that stage.

### Acceptance Criteria

- [ ] Accounts table created with RLS enabled
- [ ] Account list page renders with correct aggregations
- [ ] Pipeline matrix renders correctly
- [ ] Contact can belong to multiple accounts (join table)
- [ ] No `any`, no `as`, `tsc --noEmit` passes

---

## MK8-INT-001 — AI Content Brief Generator

```
task_id:    MK8-INT-001
layer:      Layer 2
priority:   Medium
depends_on: MK8-CMS-001
```

### Objective

An admin-triggered API route that calls the Anthropic API to generate a structured content brief for a new post: target keyword, suggested headline options, outline, suggested internal links, buyer stage recommendation, and estimated competitive difficulty.

### Deliverables

**1. API Route: `app/api/marketing/brief/route.ts`**

POST `{ keyword: string, content_type: ContentType, context?: string }`:
- Calls Anthropic API (`claude-sonnet-4-20250514`, max_tokens 1500)
- System prompt establishes Tendriv's procurement-focused niche
- Returns structured brief as `ContentBrief` type (defined in `lib/types/cms.ts`)

```typescript
export interface ContentBrief {
  keyword: string
  headline_options: string[]       // 3 options
  meta_description_suggestion: string
  outline: OutlineSection[]
  buyer_stage_recommendation: BuyerStage
  suggested_internal_links: string[] // slugs of existing published posts
  competitive_notes: string
}
```

**2. UI integration**

"Generate brief" button in `PostEditor` (only shown when content is empty):
- Opens a modal: keyword input + context textarea
- On submit calls `/api/marketing/brief`
- Renders returned brief as a structured preview
- "Use this outline" button populates the editor content with the outline as Markdown

**3. No PII rule**

Brief generation prompt must never include contact data, email addresses, or any data from `outreach_contacts`. Only content metadata (keyword, content_type, existing post slugs).

### Acceptance Criteria

- [ ] API returns valid `ContentBrief` JSON (Zod-validated before returning)
- [ ] No PII in prompt (enforced by type constraints — prompt only accepts `keyword` and `context` strings)
- [ ] "Use this outline" correctly formats outline as Markdown headings
- [ ] API call appended to `audit_log` with event_type = 'ai-brief-generated' and keyword (no prompt content)
- [ ] No `any`, no `as`, `tsc --noEmit` passes

---

## MK8-INT-002 — Predictive Lead Score Cron

```
task_id:    MK8-INT-002
layer:      Layer 2 / Cron
priority:   Medium
depends_on: MK8-CRM-001, MK8-ANL-001
```

### Objective

A nightly cron job that re-scores all contacts using the latest activity data and updates their `lead_scores` record. Contacts whose score changes by ≥10 points are flagged in the activity log.

### Deliverables

**1. Library: `lib/scoring/predictive.ts`**

```typescript
export async function rescoreAllContacts(supabase: SupabaseClient): Promise<{
  processed: number
  updated: number
  flagged: number
}>
```

Logic:
- Fetches all contacts in batches of 100
- Calls `computeScore` from `lib/scoring/engine.ts`
- Upserts `lead_scores` record
- If score delta ≥ 10: inserts `outreach_activity_log` entry with `event_type = 'score-change'` and metadata `{ old_score, new_score, delta }`

**2. API Route: `app/api/marketing/score/cron/route.ts`**

- Auth: `x-vercel-cron` header validation
- Calls `rescoreAllContacts`
- Appends summary to `audit_log`
- Returns `{ processed, updated, flagged }`

**3. Vercel cron schedule**

In `vercel.json`: `{ "path": "/api/marketing/score/cron", "schedule": "0 3 * * *" }` (03:00 UTC = 23:00 ET)

### Acceptance Criteria

- [ ] Cron route validates `x-vercel-cron` header
- [ ] Processes contacts in batches (no single query returning all contacts unbounded)
- [ ] Score-change flag fires correctly for ≥10 point delta
- [ ] Summary logged to `audit_log`
- [ ] Vercel cron config present in `vercel.json`
- [ ] No `any`, no `as`, `tsc --noEmit` passes

---

## MK8-INT-003 — Immutable Audit Log + SOC2 Event Trail

```
task_id:    MK8-INT-003
layer:      Layer 3/Migration + Layer 2
priority:   High
depends_on: MK-7 VERIFIED
```

### Objective

A tamper-evident, append-only audit log for all state-changing operations across the tendriv-admin portal. This table is the primary evidence artefact for SOC2 Type II and ISO 27001 audits. No row may be updated or deleted — enforced at the database level.

### Deliverables

**1. SQL Migration: `supabase/migrations/20260324000007_audit_log.sql`**

`audit_log` table:
- id uuid PK default gen_random_uuid()
- event_type text NOT NULL (enum-like: see list below)
- actor_id uuid nullable (FK → auth.users — nullable for system/cron events)
- actor_type text ('user' / 'cron' / 'system' / 'api-key')
- resource_type text NOT NULL ('post' / 'contact' / 'utm' / 'gate' / 'score' / 'publish' / 'ai-brief' / 'version')
- resource_id text NOT NULL
- metadata JSONB
- ip_hash text nullable (SHA-256 of IP, never raw IP)
- occurred_at timestamptz default now() NOT NULL

Row-level security:
- RLS enabled
- INSERT allowed for service_role only
- UPDATE: REVOKED for ALL (including service_role) — enforced via `RULE` that raises exception
- DELETE: REVOKED for ALL — enforced via `RULE` that raises exception

Immutability enforcement:
```sql
CREATE RULE no_update_audit_log AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE no_delete_audit_log AS ON DELETE TO audit_log DO INSTEAD NOTHING;
```

**Event type catalogue:**

| event_type | Triggered by |
|------------|--------------|
| post-created | MK8-CMS-002 |
| post-updated | MK8-CMS-002 |
| post-status-changed | MK8-CMS-002/003 |
| post-published | MK8-CMS-007 |
| post-version-restored | MK8-CMS-008 |
| gate-submission | MK8-CMS-006 |
| utm-created | MK8-ANL-001 |
| utm-click | MK8-ANL-001 |
| contact-score-computed | MK8-CRM-001 |
| score-change-flagged | MK8-INT-002 |
| ai-brief-generated | MK8-INT-001 |
| publish-channel-routed | MK8-CMS-007 |

**2. Library: `lib/audit/log.ts`**

```typescript
export interface AuditEntry {
  event_type: AuditEventType
  actor_id: string | null
  actor_type: 'user' | 'cron' | 'system' | 'api-key'
  resource_type: AuditResourceType
  resource_id: string
  metadata?: Record<string, unknown>
  ip_hash?: string
}

export async function appendAuditLog(
  supabase: SupabaseClient,
  entry: AuditEntry
): Promise<void>
```

All state-changing API routes MUST call `appendAuditLog` before returning. This is a constitution rule (MK8-AUDIT).

**3. Admin UI: Audit log viewer**

`app/(dashboard)/audit/page.tsx` — server component, paginated table of audit entries (50 per page), filterable by event_type and resource_type. Read-only. No edit or delete UI exposed.

### Acceptance Criteria

- [ ] `audit_log` table has UPDATE and DELETE rules that prevent modification
- [ ] RLS denies anon key INSERT
- [ ] `appendAuditLog` function handles errors gracefully (never throws — logs to console but does not block the originating request)
- [ ] Audit viewer page renders paginated entries
- [ ] Filter by event_type and resource_type works
- [ ] ip_hash is SHA-256, never raw IP
- [ ] No `any`, no `as`, `tsc --noEmit` passes
- [ ] `npm run build` passes

---

## Sovereignty Verification Checklist (Sprint Gate)

| Check | Requirement |
|-------|-------------|
| V-1 | `tsc --noEmit` exits 0 |
| V-2 | `npm run build` exits 0 |
| V-3 | All new tables have RLS enabled |
| V-4 | Zero `as` assertions in all sprint files |
| V-5 | Zero inline Zod schemas in `app/` |
| V-6 | No Edge Runtime declarations |
| V-7 | No `service_role` references outside `lib/supabase/server.ts` |
| V-8 | `middleware.ts` ≤ 30 lines |
| V-9 | `vercel.json` regions: `["yul1"]` |
| V-10 | All cron routes validate `x-vercel-cron` header |
| V-11 | `audit_log` UPDATE and DELETE rules confirmed present |
| V-12 | No raw IPs stored anywhere — `ip_hash` columns only |
| V-13 | No Anthropic API calls include PII (contact data) |
| V-14 | Supabase project confirms `ca-central-1` region |
| V-15 | Zero hardcoded hex colours in sprint components |
| V-16 | Zero `style={{}}` inline styles |

---

*Sprint MK-8 — tendriv-admin*
*Project_Tendriv-Admin | Generated 2026-03-24*
