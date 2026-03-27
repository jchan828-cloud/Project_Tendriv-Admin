/** Billing accounts — update + delete */

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
  if ('service_name' in body && typeof body.service_name === 'string') updates.service_name = body.service_name
  if ('billing_email' in body && typeof body.billing_email === 'string') updates.billing_email = body.billing_email
  if ('plan_name' in body && typeof body.plan_name === 'string') updates.plan_name = body.plan_name
  if ('monthly_cost' in body) updates.monthly_cost = Number(body.monthly_cost) || 0
  if ('billing_cycle' in body) updates.billing_cycle = body.billing_cycle
  if ('next_billing_date' in body) updates.next_billing_date = body.next_billing_date
  if ('status' in body && typeof body.status === 'string') updates.status = body.status
  if ('dashboard_url' in body) updates.dashboard_url = body.dashboard_url
  if ('notes' in body) updates.notes = body.notes

  const { data, error } = await supabase
    .from('billing_accounts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'billing-account-updated',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'billing',
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
  const { error } = await supabase.from('billing_accounts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'billing-account-deleted',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'billing',
    resource_id: id,
  })

  return NextResponse.json({ success: true })
}
