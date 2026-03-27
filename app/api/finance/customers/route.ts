/** Customers — list + create */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { appendAuditLog } from '@/lib/audit/log'

export async function GET(request: NextRequest) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const url = new URL(request.url)
  const tier = url.searchParams.get('tier') ?? ''
  const status = url.searchParams.get('status') ?? ''

  let query = supabase
    .from('customers')
    .select('*, customer_tiers(name, monthly_price)')
    .order('created_at', { ascending: false })

  if (tier) query = query.eq('tier_id', tier)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
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

  const name = 'name' in body && typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('customers')
    .insert({
      name,
      email: 'email' in body && typeof body.email === 'string' ? body.email : null,
      tier_id: 'tier_id' in body && typeof body.tier_id === 'string' ? body.tier_id : null,
      mrr: 'mrr' in body ? Number(body.mrr) || 0 : 0,
      acquisition_channel: 'acquisition_channel' in body && typeof body.acquisition_channel === 'string' ? body.acquisition_channel : null,
      acquisition_cost: 'acquisition_cost' in body ? Number(body.acquisition_cost) || 0 : 0,
      first_payment_date: 'first_payment_date' in body && typeof body.first_payment_date === 'string' ? body.first_payment_date : null,
      notes: 'notes' in body && typeof body.notes === 'string' ? body.notes : null,
    })
    .select('*, customer_tiers(name, monthly_price)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'customer-created',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'customer',
    resource_id: data.id,
  })

  return NextResponse.json(data, { status: 201 })
}
