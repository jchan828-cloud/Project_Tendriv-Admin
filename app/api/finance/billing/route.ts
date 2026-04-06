/** Billing accounts — list + create */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { appendAuditLog } from '@/lib/audit/log'

export async function GET() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('billing_accounts')
    .select('*')
    .order('service_name')

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

  const serviceName = 'service_name' in body && typeof body.service_name === 'string' ? body.service_name.trim() : ''
  if (!serviceName) return NextResponse.json({ error: 'service_name is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('billing_accounts')
    .insert({
      service_name: serviceName,
      billing_email: 'billing_email' in body && typeof body.billing_email === 'string' ? body.billing_email : null,
      plan_name: 'plan_name' in body && typeof body.plan_name === 'string' ? body.plan_name : null,
      monthly_cost: 'monthly_cost' in body ? Number(body.monthly_cost) || 0 : 0,
      currency: 'currency' in body && typeof body.currency === 'string' ? body.currency : 'CAD',
      billing_cycle: 'billing_cycle' in body && typeof body.billing_cycle === 'string' ? body.billing_cycle : 'monthly',
      next_billing_date: 'next_billing_date' in body && typeof body.next_billing_date === 'string' ? body.next_billing_date : null,
      status: 'status' in body && typeof body.status === 'string' ? body.status : 'active',
      dashboard_url: 'dashboard_url' in body && typeof body.dashboard_url === 'string' ? body.dashboard_url : null,
      notes: 'notes' in body && typeof body.notes === 'string' ? body.notes : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'billing-account-created',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'billing',
    resource_id: data.id,
    metadata: { service_name: serviceName },
  })

  return NextResponse.json(data, { status: 201 })
}
