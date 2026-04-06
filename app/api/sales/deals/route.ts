/** Deals — list + create */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { appendAuditLog } from '@/lib/audit/log'

export async function GET(request: NextRequest) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const url = new URL(request.url)
  const stage = url.searchParams.get('stage') ?? ''

  let query = supabase
    .from('deals')
    .select('*, outreach_contacts(business_name, contact_email), abm_accounts(name)')
    .order('updated_at', { ascending: false })

  if (stage) query = query.eq('stage', stage)

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

  const title = 'title' in body && typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  const { data: deal, error } = await supabase
    .from('deals')
    .insert({
      title,
      value: 'value' in body ? Number(body.value) || 0 : 0,
      stage: 'stage' in body && typeof body.stage === 'string' ? body.stage : 'lead',
      contact_id: 'contact_id' in body && typeof body.contact_id === 'string' ? body.contact_id : null,
      account_id: 'account_id' in body && typeof body.account_id === 'string' ? body.account_id : null,
      notes: 'notes' in body && typeof body.notes === 'string' ? body.notes : null,
      expected_close_date: 'expected_close_date' in body && typeof body.expected_close_date === 'string' ? body.expected_close_date : null,
      owner_id: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'deal-created',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'deal',
    resource_id: deal.id,
  })

  return NextResponse.json(deal, { status: 201 })
}
