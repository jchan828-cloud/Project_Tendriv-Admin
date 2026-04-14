/** Retry a failed blog post.
 *  Flips status from 'failed' back to 'queued' so the worker picks it up.
 *  Triggered by the "Retry" button in the admin posts UI.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()

  // Only allow retry on 'failed' rows so we never accidentally re-queue
  // something already in review/published.
  const { data, error } = await supabase
    .from('blog_posts')
    .update({
      status: 'queued',
      generation_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'failed')
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Post not found or not in failed state' },
      { status: 404 },
    )
  }

  // Kick the worker
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const origin = new URL(_req.url).origin
    void fetch(`${origin}/api/blog/worker`, {
      method: 'POST',
      headers: { 'x-cron-secret': cronSecret },
    }).catch(() => { /* worker will pick it up on next cron tick */ })
  }

  return NextResponse.json({ success: true })
}
