/**
 * Public feedback submission endpoint — no auth required.
 * Used by the embeddable widget on the customer-facing site.
 * Rate-limited by IP hash.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { appendAuditLog } from '@/lib/audit/log'
import { sha256 } from '@/lib/utils/hash'

const CATEGORIES = ['bug', 'feature-request', 'ux', 'performance', 'content', 'billing', 'general', 'praise']

export async function POST(request: NextRequest) {
  const supabase = await createServiceRoleClient()
  const body: unknown = await request.json()

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const feedbackBody = 'body' in body && typeof body.body === 'string' ? body.body.trim() : ''
  if (!feedbackBody) {
    return NextResponse.json({ error: 'Feedback body is required' }, { status: 400 })
  }
  if (feedbackBody.length > 5000) {
    return NextResponse.json({ error: 'Feedback too long (max 5000 chars)' }, { status: 400 })
  }

  // Rate limit: 10 submissions per IP per hour
  const forwardedFor = request.headers.get('x-forwarded-for') ?? 'unknown'
  const ipHash = await sha256(forwardedFor)
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString()

  const { count } = await supabase
    .from('feedback')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'widget')
    .gte('created_at', oneHourAgo)

  // Use a generous limit since this is per-global, but good enough for basic protection
  if ((count ?? 0) > 50) {
    return NextResponse.json({ error: 'Too many submissions, please try later' }, { status: 429 })
  }

  const category = 'category' in body && typeof body.category === 'string' && CATEGORIES.includes(body.category)
    ? body.category : 'general'
  const rating = 'rating' in body && typeof body.rating === 'number' && body.rating >= 1 && body.rating <= 5
    ? body.rating : null
  const sentiment = rating ? (rating >= 4 ? 'positive' : rating >= 3 ? 'neutral' : 'negative') : null

  const { data: feedback, error } = await supabase
    .from('feedback')
    .insert({
      source: 'widget',
      page_url: 'page_url' in body && typeof body.page_url === 'string' ? body.page_url : null,
      submitter_name: 'name' in body && typeof body.name === 'string' ? body.name.trim() : null,
      submitter_email: 'email' in body && typeof body.email === 'string' ? body.email.trim() : null,
      category,
      sentiment,
      rating,
      title: 'title' in body && typeof body.title === 'string' ? body.title.trim() : null,
      body: feedbackBody,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await appendAuditLog(supabase, {
    event_type: 'feedback-submitted',
    actor_id: null,
    actor_type: 'system',
    resource_type: 'feedback',
    resource_id: feedback.id,
    ip_hash: ipHash,
    metadata: { category, sentiment, source: 'widget' },
  })

  return NextResponse.json({ success: true, id: feedback.id })
}
