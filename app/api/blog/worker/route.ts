/** Blog generation worker.
 *
 *  Picks ONE queued blog post via the claim_next_blog_post() RPC,
 *  generates content via Claude, writes it back, and marks the post
 *  for human review. On any failure the post is marked 'failed' with
 *  the error message stored in generation_error so it's visible in the
 *  admin UI and retryable from there.
 *
 *  Triggered by:
 *    - Vercel cron every minute (vercel.json)
 *    - The "Generate drafts now" button (after enqueue fires)
 *    - Manual retry of a failed post (after status flips back to 'queued')
 *
 *  Runs ONE post per invocation so a single Claude call comfortably
 *  fits within the 60s function timeout. Multiple workers can run
 *  concurrently — claim_next_blog_post uses FOR UPDATE SKIP LOCKED.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { callClaudeMessages } from '@/lib/blog/claude-call'
import { buildBlogPrompt, calculateReadingMinutes, countWords } from '@/lib/blog/claude-prompt'

export const maxDuration = 60

const TIER_TO_STAGE: Record<string, 'awareness' | 'consideration' | 'decision'> = {
  psib: 'awareness',
  smb: 'consideration',
  enterprise: 'decision',
}

interface ClaimedPost {
  id: string
  title: string
  slug: string
  buyer_stage: string | null
  topic_id: string | null
  generation_attempts: number
}

function authorize(req: NextRequest, cronSecret: string | undefined): boolean {
  if (!cronSecret) return false
  if (req.headers.get('authorization') === `Bearer ${cronSecret}`) return true
  if (req.headers.get('x-cron-secret') === cronSecret) return true
  return false
}

async function handler(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!authorize(req, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceRoleClient()

  // 1. Atomically claim the oldest queued post
  const { data: claimedRaw, error: claimError } = await supabase
    .rpc('claim_next_blog_post')

  if (claimError) {
    return NextResponse.json({ error: `claim failed: ${claimError.message}` }, { status: 500 })
  }

  const claimed = (claimedRaw ?? []) as ClaimedPost[]
  const post = claimed[0]
  if (!post) {
    return NextResponse.json({ message: 'queue empty' })
  }

  // 2. Look up the topic for prompt context
  if (!post.topic_id) {
    await markFailed(supabase, post.id, 'post has no topic_id — cannot build prompt')
    return NextResponse.json({ error: 'no topic_id' }, { status: 400 })
  }

  const { data: topic, error: topicError } = await supabase
    .from('blog_pipeline_topics')
    .select('title, source, source_url, tier')
    .eq('id', post.topic_id)
    .single()

  if (topicError || !topic) {
    await markFailed(supabase, post.id, `topic ${post.topic_id} not found`)
    return NextResponse.json({ error: 'topic not found' }, { status: 404 })
  }

  // 3. Generate via Claude
  const { system, user } = buildBlogPrompt({
    title: topic.title,
    source: topic.source,
    sourceUrl: topic.source_url,
    tier: topic.tier,
  })

  const result = await callClaudeMessages(system, user)

  if (!result.text) {
    const reason = result.errorBody
      ? `Claude API error (${result.status}): ${result.errorBody.slice(0, 500)}`
      : `Claude returned no text (status ${result.status})`
    await markFailed(supabase, post.id, reason)
    return NextResponse.json({ error: reason }, { status: 502 })
  }

  // 4. Write the content + flip to 'review'
  const wordCount = countWords(result.text)
  const readingTime = calculateReadingMinutes(result.text)

  const { error: updateError } = await supabase
    .from('blog_posts')
    .update({
      content: result.text,
      status: 'review',
      generated_at: new Date().toISOString(),
      generation_error: null,
      word_count: wordCount,
      reading_time_minutes: readingTime,
      generated_by: 'ai-assisted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', post.id)

  if (updateError) {
    await markFailed(supabase, post.id, `db write failed: ${updateError.message}`)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    post: { id: post.id, slug: post.slug, word_count: wordCount },
  })
}

async function markFailed(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  postId: string,
  error: string,
) {
  await supabase
    .from('blog_posts')
    .update({
      status: 'failed',
      generation_error: error,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
}

export { handler as GET, handler as POST }
