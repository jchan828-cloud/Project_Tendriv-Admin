/** Blog topic enqueue.
 *
 *  Reads the active topics from blog_pipeline_topics, picks the top N
 *  (where N = blog_settings.blogs_per_day) that don't already have an
 *  in-flight post, and inserts blog_posts rows with status='queued'.
 *
 *  The cron triggers this daily. It is intentionally fast (<1s) and
 *  cannot fail in interesting ways — all the slow/risky work is done
 *  by the worker, decoupled from the cron schedule.
 *
 *  Triggered by:
 *    - Vercel cron daily at 13:00 UTC (9 AM ET)
 *    - Manually by the "Generate drafts now" button
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/blog/claude-prompt'

const TIER_TO_STAGE: Record<string, 'awareness' | 'consideration' | 'decision'> = {
  psib: 'awareness',
  smb: 'consideration',
  enterprise: 'decision',
}

/** Statuses that mean a post is in-flight for a given topic — don't re-enqueue. */
const ACTIVE_STATUSES = ['queued', 'generating', 'review', 'approved', 'scheduled']

interface EnqueueOptions {
  /** If provided, override blogs_per_day from settings. */
  count?: number
  /** If provided, only enqueue these specific topic IDs. */
  topicIds?: string[]
}

async function authorize(req: NextRequest): Promise<boolean> {
  // Vercel cron header bypasses auth
  if (req.headers.get('x-vercel-cron') === '1') return true

  // Otherwise require an authenticated user (manual trigger from admin UI)
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  return user !== null
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Optional body controls (manual trigger may pass count override)
  let opts: EnqueueOptions = {}
  const bodyText = await req.text()
  if (bodyText.trim()) {
    try { opts = JSON.parse(bodyText) as EnqueueOptions } catch { /* ignore */ }
  }

  const supabase = await createServiceRoleClient()

  // 1. Get blogs_per_day setting (or use override)
  let count = opts.count
  if (count === undefined) {
    const { data: settings } = await supabase
      .from('blog_settings')
      .select('blogs_per_day')
      .eq('id', 1)
      .single()
    count = settings?.blogs_per_day ?? 1
  }

  // 2. Get active topics ordered by relevance
  let topicsQuery = supabase
    .from('blog_pipeline_topics')
    .select('id, title, source, source_url, relevance, tier')
    .eq('active', true)
    .order('relevance', { ascending: false })

  if (opts.topicIds && opts.topicIds.length > 0) {
    topicsQuery = topicsQuery.in('id', opts.topicIds)
  }

  const { data: topics, error: topicsError } = await topicsQuery
  if (topicsError) {
    return NextResponse.json({ error: topicsError.message }, { status: 500 })
  }
  if (!topics || topics.length === 0) {
    return NextResponse.json({ enqueued: 0, message: 'no active topics' })
  }

  // 3. Find topics already in-flight
  const { data: inFlight } = await supabase
    .from('blog_posts')
    .select('topic_id')
    .in('status', ACTIVE_STATUSES)
    .not('topic_id', 'is', null)

  const busy = new Set((inFlight ?? []).map((p) => p.topic_id))
  const candidates = topics.filter((t) => !busy.has(t.id))

  if (candidates.length === 0) {
    return NextResponse.json({
      enqueued: 0,
      message: 'all active topics already have in-flight posts',
    })
  }

  const toEnqueue = candidates.slice(0, count)

  // 4. Insert queued rows
  const now = Date.now()
  const rows = toEnqueue.map((topic) => ({
    title: topic.title,
    slug: `${slugify(topic.title)}-${now}`,
    status: 'queued' as const,
    topic_id: topic.id,
    buyer_stage: TIER_TO_STAGE[topic.tier] ?? null,
    content_type: 'blog' as const,
    generated_by: 'ai-assisted' as const,
  }))

  const { data: inserted, error: insertError } = await supabase
    .from('blog_posts')
    .insert(rows)
    .select('id, slug, title')

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // 5. Kick the worker (fire-and-forget) so the user sees a draft sooner
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const origin = req.nextUrl.origin
    void fetch(`${origin}/api/blog/worker`, {
      method: 'POST',
      headers: { 'x-cron-secret': cronSecret },
    }).catch(() => { /* worker will pick it up on next cron tick */ })
  }

  return NextResponse.json({
    enqueued: inserted?.length ?? 0,
    posts: inserted ?? [],
  })
}
