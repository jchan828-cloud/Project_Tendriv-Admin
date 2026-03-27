/** Feedback — update status, priority, assignment, notes */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { appendAuditLog } from '@/lib/audit/log'

interface RouteContext { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const body: unknown = await request.json()

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof b.status === 'string') {
    updates.status = b.status
    if (b.status === 'resolved') updates.resolved_at = new Date().toISOString()
  }
  if (typeof b.priority === 'string') updates.priority = b.priority
  if (typeof b.internal_notes === 'string') updates.internal_notes = b.internal_notes
  if (typeof b.assigned_to === 'string') updates.assigned_to = b.assigned_to
  if (typeof b.category === 'string') updates.category = b.category
  if (typeof b.sentiment === 'string') updates.sentiment = b.sentiment

  const { data, error } = await supabase
    .from('feedback')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'feedback-updated',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'feedback',
    resource_id: id,
    metadata: updates,
  })

  return NextResponse.json(data)
}
