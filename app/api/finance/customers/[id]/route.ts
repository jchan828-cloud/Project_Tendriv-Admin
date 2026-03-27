/** Customers — update + delete */

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

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const b = body as Record<string, unknown>
  for (const key of ['name', 'email', 'tier_id', 'status', 'acquisition_channel', 'notes']) {
    if (key in b && typeof b[key] === 'string') updates[key] = b[key]
  }
  if ('mrr' in body) updates.mrr = Number(body.mrr) || 0
  if ('acquisition_cost' in body) updates.acquisition_cost = Number(body.acquisition_cost) || 0
  if ('first_payment_date' in body) updates.first_payment_date = body.first_payment_date
  if ('churn_date' in body) updates.churn_date = body.churn_date

  const { data, error } = await supabase.from('customers').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'customer-updated',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'customer',
    resource_id: id,
  })

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'customer-deleted',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'customer',
    resource_id: id,
  })

  return NextResponse.json({ success: true })
}
