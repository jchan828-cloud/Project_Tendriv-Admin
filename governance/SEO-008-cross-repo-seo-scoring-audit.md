# SEO-008: Cross-Repo SEO & Scoring Engine Audit

> **Date:** 2026-04-12 | **Status:** IMPLEMENTED & MERGED  
> **Repos:** `Project_Tendriv-Admin` (this repo) + `Project_Tendriv-Marketing`  
> **Admin PRs:** #5 (merged) | **Marketing PRs:** #30 (merged)  
> **Migration:** `20260412000001_blog_gate_asset_ids.sql` (applied)

---

## Purpose

A cross-repo audit to close SEO and digital marketing blind spots between the admin platform (scoring engine, CMS, attribution) and the marketing site (rendering, event tracking, technical SEO). The goal was to ensure the marketing site's blog engagement data feeds the admin scoring engine, and that the content-upgrade gating model works end-to-end.

---

## What Was Changed in This Repo

### 1. Scoring Engine (`lib/scoring/engine.ts`)

**New signals:**

| Signal | Points | Condition | Multiplier |
|--------|--------|-----------|------------|
| `post_view` | 2 base | On blog page load | buyer_stage (awareness 1x, consideration 1.5x, decision 2x) |
| `cta_click` | 6 flat | Article CTA clicked | None |
| `time_on_page` | 3 flat | ≥120 seconds on page | None |
| `scroll_depth` | 2 flat | ≥75% scroll depth | None |
| `gate_submit` | 8 flat | Gate form submitted (unchanged) | None |

**buyer_stage multiplier** — applied to `post_view` only. The multiplier is read from `event_metadata.buyer_stage` on activity log entries. The marketing site sends this based on the blog post's `buyer_stage` column.

**`extractBuyerStage()`** helper function extracts the multiplier from event metadata. Returns 1.0 if no buyer_stage present.

**Eligible provinces** — expanded from 4 (ON, QC, BC, AB) to all 13 Canadian provinces/territories. All contacts with a Canadian province now receive +5 firmographic points.

### 2. Content-Upgrade Gate Model

**New column:** `blog_posts.gate_asset_ids text[] DEFAULT '{}'`

This enables a two-tier gating model:
- **Content-upgrade gate** (new, recommended): Post body stays fully crawlable. Only bonus downloadable assets require a gate form. Controlled by `gate_asset_ids`.
- **Full-post gate** (legacy): Entire post hidden behind a gate form. Controlled by `is_gated=true`.

**Valid template IDs** (enum-validated in Zod schemas):
- `tbips-checklist` — TBIPS Compliance Checklist
- `bid-no-bid-framework` — Bid/No-Bid Decision Framework
- `psib-roadmap` — PSIB Procurement Roadmap

**CMS UI** (`components/cms/gate-config.tsx`):
- Checkbox list for selecting bonus assets
- Clear UX distinction between content-upgrade (recommended) and legacy full-post gate
- Warning on legacy gate: "This blocks search engine indexing"

### 3. Attribution Fixes

**Gate route** (`app/api/marketing/gate/route.ts`):
- Now accepts gate submissions when `gate_asset_ids` is non-empty, even if `is_gated=false`
- Records **assist-touch** attribution when a contact interacts with a post that isn't their first touch

**UTM route** (`app/api/marketing/utms/[code]/route.ts`):
- Resolves contacts via IP hash matching against prior `gate_submit` events in `marketing_events`
- Records `resolved_contact_id` on `utm_clicks`
- Creates assist-touch attribution when a resolved contact clicks a UTM linked to a post

### 4. CMS Types (`lib/types/cms.ts`)

- `BlogPost.gate_asset_ids: string[]` — with JSDoc
- `BlogPostInsertSchema` and `BlogPostUpdateSchema` both validate `gate_asset_ids` against the template ID enum

---

## Cross-Repo Integration Contract

### Events API (`POST /api/marketing/events`)

The marketing site sends events to this endpoint. Expected payload:

```typescript
// Array of 1-100 events
[{
  event_type: 'post_view' | 'scroll_depth' | 'time_on_page' | 'cta_click' | 'gate_submit' | ...,
  session_id: string,       // UUID from localStorage
  post_id?: string,         // optional, blog post UUID
  metadata?: {
    buyer_stage?: 'awareness' | 'consideration' | 'decision',
    slug?: string,
    seconds?: number,        // for time_on_page
    depth?: number,          // for scroll_depth (25|50|75|100)
    button_text?: string,    // for cta_click
    cta_type?: string,       // for cta_click
  }
}]
```

### Gate Template API (`POST /api/marketing/gate/template`)

The marketing site proxies gate form submissions through its own `/api/marketing/gate/template` endpoint, which forwards server-to-server to this admin endpoint.

### Blog Post Data Contract

The marketing site's Supabase queries SELECT these columns from `blog_posts`:

```
id, title, slug, content, excerpt, buyer_stage, published_at, updated_at,
canonical_url, gate_asset_ids, is_gated, blog_post_tags(blog_tags(slug))
```

All columns have safe defaults if null/missing.

### JSON-LD API (`GET /api/marketing/posts/[id]/jsonld`)

Available but **not currently consumed** by the marketing site. The marketing site generates JSON-LD locally via `lib/blog/schema-markup.ts`. Consider switching to admin API for posts with `jsonld_override` set (FAQPage, HowTo schemas).

---

## What Future Agents Need to Know

1. **Scoring tuning is intentional.** The post_view base points (2) and multiplier values (1x/1.5x/2x) were deliberated. Don't change them without understanding the scoring math — the content engagement cap is 30 points total.

2. **Template IDs are enum-validated.** Adding a new downloadable template requires updating THREE places:
   - `lib/types/cms.ts` — `BlogPostInsertSchema` and `BlogPostUpdateSchema` enum arrays
   - `lib/types/gate-template.ts` — `TEMPLATE_IDS` array and `TEMPLATE_URL_ENV` mapping
   - Marketing repo: `components/blog/blog-asset-gate.tsx` — `ASSET_TITLES` mapping

3. **Events flow two ways.** Blog engagement events go to both PostHog (client-side) AND this admin API (via `admin-events.ts` in the marketing repo). The scoring engine reads from the admin API path only. PostHog is for dashboards and funnels.

4. **Attribution uses IP hash matching.** The UTM route resolves contacts by matching `sha256(x-forwarded-for)` against prior `gate_submit` event session IDs. This is a probabilistic match — it works for the same-device, same-network scenario but won't track across devices or VPN changes.

5. **The `gate_asset_ids` column is a text array**, not a junction table. This was a deliberate simplicity trade-off — only 3 template IDs exist and the set is unlikely to grow rapidly. If it does, migrate to a junction table.

6. **`is_gated` (legacy) vs `gate_asset_ids` (new):**
   - `is_gated=true` hides the full post behind a gate — bad for SEO
   - `gate_asset_ids` keeps the post visible, only gating bonus downloads — good for SEO
   - If both are set, the marketing site gives `gate_asset_ids` precedence (body stays visible)
   - The admin CMS UI now warns editors that legacy gating blocks indexing
