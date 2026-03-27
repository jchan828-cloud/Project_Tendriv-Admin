/** Finance transactions — update + delete */

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
  if ('type' in body && typeof body.type === 'string') updates.type = body.type
  if ('category' in body && typeof body.category === 'string') updates.category = body.category
  if ('vendor' in body && typeof body.vendor === 'string') updates.vendor = body.vendor
  if ('description' in body && typeof body.description === 'string') updates.description = body.description
  if ('amount' in body) updates.amount = Number(body.amount)
  if ('recurring' in body) updates.recurring = Boolean(body.recurring)
  if ('recurring_interval' in body) updates.recurring_interval = body.recurring_interval
  if ('invoice_url' in body) updates.invoice_url = body.invoice_url
  if ('transaction_date' in body) updates.transaction_date = body.transaction_date

  const { data, error } = await supabase
    .from('finance_transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'finance-transaction-updated',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'finance',
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
  const { error } = await supabase.from('finance_transactions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'finance-transaction-deleted',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'finance',
    resource_id: id,
  })

  return NextResponse.json({ success: true })
}
