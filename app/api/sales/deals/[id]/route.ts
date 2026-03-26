/** Deals — update (stage change, details) */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { appendAuditLog } from '@/lib/audit/log'

interface RouteContext {
  params: Promise<{ id: string }>
}

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

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if ('stage' in body && typeof body.stage === 'string') {
    updates.stage = body.stage
    if (body.stage === 'won' || body.stage === 'lost') {
      updates.closed_at = new Date().toISOString()
    }
  }
  if ('title' in body && typeof body.title === 'string') updates.title = body.title
  if ('value' in body) updates.value = Number(body.value) || 0
  if ('notes' in body && typeof body.notes === 'string') updates.notes = body.notes
  if ('expected_close_date' in body) updates.expected_close_date = body.expected_close_date

  const { data, error } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'deal-updated',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'deal',
    resource_id: id,
    metadata: updates,
  })

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('deals').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'deal-deleted',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'deal',
    resource_id: id,
  })

  return NextResponse.json({ success: true })
}
