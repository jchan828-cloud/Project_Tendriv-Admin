# Blog Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/blog/pipeline` admin page that lets editors manage the `blog_pipeline_topics` queue and the `blog_settings` generation config (both Supabase tables owned by the marketing pipeline).

> **Important:** `blog_topics` is an existing taxonomy/category table (`name, slug, description, parent_id`) linked to `blog_posts` via `blog_post_topics`. Do not touch it. The pipeline queue uses the distinct name `blog_pipeline_topics`.

**Architecture:** Server Component page reads both tables at render time. Three interactive Client Components handle mutations via Server Actions — no new API routes. The `content` section of the sidebar gets a new "Blog settings" nav item. All Supabase writes use `createServiceRoleClient()` (same pattern as the drafts desk).

**Tech Stack:** Next.js 15 App Router, React 19, Server Actions, Supabase service-role client, Tailwind + existing design tokens (badge, btn-primary, input-base, etc.), TypeScript.

**Verification strategy:** No test framework. Use `npm run typecheck` after every task and `npm run build` as the final gate before marking complete.

---

## File Map

| Status | File | Role |
|---|---|---|
| **Create** | `lib/types/blog-settings.ts` | `BlogPipelineTopic` and `BlogSettings` type definitions |
| **Create** | `lib/actions/blog-settings.ts` | Server Actions: upsertTopic, setTopicActive, deleteTopic, saveSettings |
| **Create** | `components/blog/generation-settings-form.tsx` | `'use client'` — blogs_per_day number input + save |
| **Create** | `components/blog/add-topic-form.tsx` | `'use client'` — new topic form (title, source, source_url, relevance, tier) |
| **Create** | `components/blog/topic-table.tsx` | `'use client'` — topic rows with inline edit, active toggle, delete |
| **Create** | `app/(dashboard)/blog/pipeline/page.tsx` | Server Component — auth guard, data fetch, layout |
| Modify | `components/layout/sidebar.tsx` | Add "Blog pipeline" → `/blog/pipeline` to content section |

---

## Task 1: Type definitions

**Files:**
- Create: `lib/types/blog-settings.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/types/blog-settings.ts

export type BlogPipelineTopic = {
  id: string
  title: string
  source: string
  source_url: string
  relevance: number
  tier: 'enterprise' | 'smb' | 'psib'
  active: boolean
  created_at: string
}

export type BlogSettings = {
  id: 1
  blogs_per_day: number
  updated_at: string
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: no errors related to blog-settings.ts

- [ ] **Step 3: Commit**

```bash
git add lib/types/blog-settings.ts
git commit -m "feat(blog-settings): add BlogPipelineTopic and BlogSettings types"
```

---

## Task 2: Server Actions

**Files:**
- Create: `lib/actions/blog-settings.ts`

- [ ] **Step 1: Create the server actions file**

```typescript
// lib/actions/blog-settings.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { BlogPipelineTopic } from '@/lib/types/blog-settings'

// Create or update a topic.
// Pass id=null to insert; pass id=string to update.
export async function upsertTopic(
  id: string | null,
  data: Omit<BlogPipelineTopic, 'id' | 'created_at' | 'active'>
): Promise<{ error: string | null }> {
  const supabase = await createServiceRoleClient()
  if (id) {
    const { error } = await supabase
      .from('blog_pipeline_topics')
      .update({ ...data })
      .eq('id', id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('blog_pipeline_topics')
      .insert({ ...data, active: true })
    if (error) return { error: error.message }
  }
  revalidatePath('/blog/pipeline')
  return { error: null }
}

export async function setTopicActive(id: string, active: boolean): Promise<{ error: string | null }> {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('blog_pipeline_topics')
    .update({ active })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/blog/pipeline')
  return { error: null }
}

export async function deleteTopic(id: string): Promise<{ error: string | null }> {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('blog_pipeline_topics')
    .delete()
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/blog/pipeline')
  return { error: null }
}

export async function saveSettings(blogs_per_day: number): Promise<{ error: string | null }> {
  if (blogs_per_day < 1 || blogs_per_day > 5) return { error: 'blogs_per_day must be 1–5' }
  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('blog_settings')
    .upsert({ id: 1, blogs_per_day, updated_at: new Date().toISOString() })
  if (error) return { error: error.message }
  revalidatePath('/blog/pipeline')
  return { error: null }
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/actions/blog-settings.ts
git commit -m "feat(blog-settings): add server actions for topic CRUD and settings save"
```

---

## Task 3: Generation Settings form

**Files:**
- Create: `components/blog/generation-settings-form.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/blog/generation-settings-form.tsx
'use client'

import { useState, useTransition } from 'react'
import { saveSettings } from '@/lib/actions/blog-settings'

export function GenerationSettingsForm({ initialValue }: { initialValue: number }) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await saveSettings(value)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    })
  }

  return (
    <div className="card p-4 flex items-center gap-4">
      <label className="text-label-sm text-[var(--text-muted)]" htmlFor="blogs-per-day">
        Blogs per day
      </label>
      <input
        id="blogs-per-day"
        type="number"
        min={1}
        max={5}
        value={value}
        onChange={e => setValue(Number(e.target.value))}
        className="input-base w-20"
      />
      <button
        onClick={handleSave}
        disabled={isPending}
        className={`btn-primary btn-sm ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
      </button>
      {error && <p className="text-body-sm text-[var(--sovereign)]">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/blog/generation-settings-form.tsx
git commit -m "feat(blog-settings): add GenerationSettingsForm component"
```

---

## Task 4: Add Topic form

**Files:**
- Create: `components/blog/add-topic-form.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/blog/add-topic-form.tsx
'use client'

import { useState, useTransition } from 'react'
import { upsertTopic } from '@/lib/actions/blog-settings'

const TIERS = ['enterprise', 'smb', 'psib'] as const

const EMPTY = { title: '', source: '', source_url: '', relevance: 0.5, tier: 'smb' as const }

export function AddTopicForm() {
  const [form, setForm] = useState(EMPTY)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!form.title.trim() || !form.source.trim() || !form.source_url.trim()) {
      setError('Title, source, and source URL are required')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await upsertTopic(null, form)
      if (result.error) {
        setError(result.error)
      } else {
        setForm(EMPTY)
        setOpen(false)
      }
    })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost btn-sm">
        + Add topic
      </button>
    )
  }

  return (
    <div className="card p-4 space-y-3">
      <h3 className="text-label-sm text-[var(--text-muted)]">New topic</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-label-sm text-[var(--text-muted)]">Title</label>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="input-base w-full mt-1"
            placeholder="IT Professional Services"
          />
        </div>
        <div>
          <label className="text-label-sm text-[var(--text-muted)]">Source</label>
          <input
            value={form.source}
            onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
            className="input-base w-full mt-1"
            placeholder="CanadaBuys"
          />
        </div>
        <div>
          <label className="text-label-sm text-[var(--text-muted)]">Source URL</label>
          <input
            value={form.source_url}
            onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))}
            className="input-base w-full mt-1"
            placeholder="https://canadabuys.canada.ca/..."
          />
        </div>
        <div>
          <label className="text-label-sm text-[var(--text-muted)]">Relevance (0–1)</label>
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={form.relevance}
            onChange={e => setForm(f => ({ ...f, relevance: parseFloat(e.target.value) }))}
            className="input-base w-full mt-1"
          />
        </div>
        <div>
          <label className="text-label-sm text-[var(--text-muted)]">Tier</label>
          <select
            value={form.tier}
            onChange={e => setForm(f => ({ ...f, tier: e.target.value as typeof form.tier }))}
            className="input-base w-full mt-1"
          >
            {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      {error && <p className="text-body-sm text-[var(--sovereign)]">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={isPending} className={`btn-primary btn-sm ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
          {isPending ? 'Adding…' : 'Add topic'}
        </button>
        <button onClick={() => { setOpen(false); setError(null) }} className="btn-ghost btn-sm">Cancel</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/blog/add-topic-form.tsx
git commit -m "feat(blog-settings): add AddTopicForm component"
```

---

## Task 5: Topic table (inline edit, toggle, delete)

**Files:**
- Create: `components/blog/topic-table.tsx`

- [ ] **Step 1: Create the component**

This is the most complex component — it owns per-row edit state, the active toggle, and delete with confirmation.

```tsx
// components/blog/topic-table.tsx
'use client'

import { useState, useTransition } from 'react'
import { upsertTopic, setTopicActive, deleteTopic } from '@/lib/actions/blog-settings'
import type { BlogPipelineTopic } from '@/lib/types/blog-settings'

const TIERS = ['enterprise', 'smb', 'psib'] as const

const TIER_BADGE: Record<string, string> = {
  enterprise: 'badge badge-info',
  smb: 'badge badge-warning',
  psib: 'badge badge-purple',
}

function TopicRow({ topic }: { topic: BlogPipelineTopic }) {
  const [editing, setEditing] = useState(false)
  const [relevance, setRelevance] = useState(topic.relevance)
  const [tier, setTier] = useState(topic.tier)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSaveEdit() {
    setError(null)
    startTransition(async () => {
      const result = await upsertTopic(topic.id, {
        title: topic.title,
        source: topic.source,
        source_url: topic.source_url,
        relevance,
        tier,
      })
      if (result.error) { setError(result.error); return }
      setEditing(false)
    })
  }

  function handleToggle() {
    startTransition(async () => {
      await setTopicActive(topic.id, !topic.active)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteTopic(topic.id)
    })
  }

  return (
    <tr className={`border-b ${!topic.active ? 'opacity-50' : ''}`}>
      <td className="py-2 pr-4 text-body-sm font-medium">{topic.title}</td>
      <td className="py-2 pr-4">
        {editing ? (
          <select
            value={tier}
            onChange={e => setTier(e.target.value as BlogPipelineTopic['tier'])}
            className="input-base text-xs py-0.5"
          >
            {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        ) : (
          <span className={TIER_BADGE[topic.tier] ?? 'badge'}>{topic.tier}</span>
        )}
      </td>
      <td className="py-2 pr-4">
        {editing ? (
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={relevance}
            onChange={e => setRelevance(parseFloat(e.target.value))}
            className="input-base w-20 text-xs py-0.5"
          />
        ) : (
          <span className="text-mono-xs text-[var(--text-muted)]">{topic.relevance.toFixed(2)}</span>
        )}
      </td>
      <td className="py-2 pr-4">
        <span className="text-mono-xs text-[var(--text-muted)] truncate max-w-[160px] block">{topic.source}</span>
      </td>
      <td className="py-2 text-right space-x-2 whitespace-nowrap">
        {error && <span className="text-xs text-[var(--sovereign)] mr-2">{error}</span>}
        {editing ? (
          <>
            <button onClick={handleSaveEdit} disabled={isPending} className="btn-primary btn-sm">
              {isPending ? '…' : 'Save'}
            </button>
            <button onClick={() => { setEditing(false); setRelevance(topic.relevance); setTier(topic.tier) }} className="btn-ghost btn-sm">
              Cancel
            </button>
          </>
        ) : confirmDelete ? (
          <>
            <span className="text-xs text-[var(--sovereign)]">Delete?</span>
            <button onClick={handleDelete} disabled={isPending} className="btn-danger btn-sm">
              {isPending ? '…' : 'Confirm'}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="btn-ghost btn-sm">Cancel</button>
          </>
        ) : (
          <>
            <button onClick={handleToggle} disabled={isPending} className="btn-ghost btn-sm">
              {topic.active ? 'Disable' : 'Enable'}
            </button>
            <button onClick={() => setEditing(true)} className="btn-ghost btn-sm">Edit</button>
            <button onClick={() => setConfirmDelete(true)} className="btn-danger btn-sm">Delete</button>
          </>
        )}
      </td>
    </tr>
  )
}

export function TopicTable({ topics }: { topics: BlogPipelineTopic[] }) {
  if (topics.length === 0) {
    return <p className="text-body-sm text-[var(--text-muted)] py-4">No topics yet. Add one below.</p>
  }
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b text-xs text-[var(--text-muted)]">
          <th className="pb-2 pr-4">Title</th>
          <th className="pb-2 pr-4">Tier</th>
          <th className="pb-2 pr-4">Relevance</th>
          <th className="pb-2 pr-4">Source</th>
          <th className="pb-2 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {topics.map(topic => <TopicRow key={topic.id} topic={topic} />)}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/blog/topic-table.tsx
git commit -m "feat(blog-settings): add TopicTable with inline edit, toggle, and delete"
```

---

## Task 6: Settings page (Server Component)

**Files:**
- Create: `app/(dashboard)/blog/pipeline/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// app/(dashboard)/blog/pipeline/page.tsx
import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { TopicTable } from '@/components/blog/topic-table'
import { AddTopicForm } from '@/components/blog/add-topic-form'
import { GenerationSettingsForm } from '@/components/blog/generation-settings-form'
import type { BlogPipelineTopic, BlogSettings } from '@/lib/types/blog-settings'

export default async function BlogSettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = await createServiceRoleClient()

  const [{ data: topics }, { data: settings }] = await Promise.all([
    service
      .from('blog_pipeline_topics')
      .select('*')
      .order('relevance', { ascending: false }),
    service
      .from('blog_settings')
      .select('*')
      .eq('id', 1)
      .single(),
  ])

  const allTopics: BlogPipelineTopic[] = (topics as BlogPipelineTopic[]) ?? []
  const blogsPerDay = (settings as BlogSettings | null)?.blogs_per_day ?? 1

  return (
    <div className="space-y-8">
      <h1 className="text-heading-md">Blog pipeline</h1>

      <section>
        <h2 className="text-heading-sm mb-4">Generation settings</h2>
        <GenerationSettingsForm initialValue={blogsPerDay} />
      </section>

      <section>
        <h2 className="text-heading-sm mb-4">Topic queue</h2>
        <p className="text-body-sm text-[var(--text-muted)] mb-4">
          Topics ordered by relevance — the cron generates drafts from the top of this list. Disabled topics are skipped.
        </p>
        <TopicTable topics={allTopics} />
        <div className="mt-4">
          <AddTopicForm />
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/blog/pipeline/page.tsx"
git commit -m "feat(blog-settings): add Blog Settings server component page"
```

---

## Task 7: Wire up sidebar nav

**Files:**
- Modify: `components/layout/sidebar.tsx`

The `content` section currently has: Blog posts, New post, Calendar, Media library. Add "Blog settings" as the last item in that section.

- [ ] **Step 1: Add nav item to content section**

In [components/layout/sidebar.tsx](components/layout/sidebar.tsx), find the `content` section's `items` array and append the new entry:

Old:
```typescript
  {
    key: 'content',
    title: 'Content',
    items: [
      { label: 'Blog posts', href: '/posts' },
      { label: 'New post', href: '/posts/new' },
      { label: 'Calendar', href: '/posts/calendar' },
      { label: 'Media library', href: '/media' },
    ],
  },
```

New:
```typescript
  {
    key: 'content',
    title: 'Content',
    items: [
      { label: 'Blog posts', href: '/posts' },
      { label: 'New post', href: '/posts/new' },
      { label: 'Calendar', href: '/posts/calendar' },
      { label: 'Media library', href: '/media' },
      { label: 'Blog pipeline', href: '/blog/pipeline' },
    ],
  },
```

- [ ] **Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Final build gate**

Run: `npm run build`
Expected: Build completes with no errors

- [ ] **Step 4: Commit**

```bash
git add components/layout/sidebar.tsx
git commit -m "feat(blog-settings): add Blog pipeline nav item to content sidebar section"
```

---

## Dependency note

**This page depends on the marketing-side migration being deployed first.** If `blog_pipeline_topics` or `blog_settings` tables don't exist in Supabase, the page will 500. The page is safe to deploy ahead of the migration — it will just fail at runtime — but only test against a database that has the migration applied.

The `blog_settings` migration seeds the singleton row (`id=1`) on creation, so `saveSettings` can safely upsert it. If testing against a manually-migrated dev database where the seed was skipped, run: `insert into blog_settings (id, blogs_per_day) values (1, 1);`
