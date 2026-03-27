/** Feedback — authenticated list + manual create */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { appendAuditLog } from '@/lib/audit/log'

export async function GET(request: NextRequest) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const url = new URL(request.url)
  const status = url.searchParams.get('status') ?? ''
  const category = url.searchParams.get('category') ?? ''
  const sentiment = url.searchParams.get('sentiment') ?? ''
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
  const pageSize = 30

  let query = supabase
    .from('feedback')
    .select('*, feedback_responses(id, body, is_public, created_at)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (status) query = query.eq('status', status)
  if (category) query = query.eq('category', category)
  if (sentiment) query = query.eq('sentiment', sentiment)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count })
}

export async function POST(request: NextRequest) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const body: unknown = await request.json()

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const feedbackBody = 'body' in body && typeof body.body === 'string' ? body.body.trim() : ''
  if (!feedbackBody) return NextResponse.json({ error: 'body is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('feedback')
    .insert({
      source: 'source' in body && typeof body.source === 'string' ? body.source : 'manual',
      category: 'category' in body && typeof body.category === 'string' ? body.category : 'general',
      sentiment: 'sentiment' in body && typeof body.sentiment === 'string' ? body.sentiment : null,
      rating: 'rating' in body && typeof body.rating === 'number' ? body.rating : null,
      title: 'title' in body && typeof body.title === 'string' ? body.title : null,
      body: feedbackBody,
      submitter_name: 'submitter_name' in body && typeof body.submitter_name === 'string' ? body.submitter_name : null,
      submitter_email: 'submitter_email' in body && typeof body.submitter_email === 'string' ? body.submitter_email : null,
      customer_id: 'customer_id' in body && typeof body.customer_id === 'string' ? body.customer_id : null,
      priority: 'priority' in body && typeof body.priority === 'string' ? body.priority : 'medium',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'feedback-submitted',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'feedback',
    resource_id: data.id,
    metadata: { source: 'manual' },
  })

  return NextResponse.json(data, { status: 201 })
}
