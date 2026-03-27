/** Finance transactions — list + create */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { appendAuditLog } from '@/lib/audit/log'

export async function GET(request: NextRequest) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const url = new URL(request.url)
  const type = url.searchParams.get('type') ?? ''
  const category = url.searchParams.get('category') ?? ''
  const vendor = url.searchParams.get('vendor') ?? ''
  const from = url.searchParams.get('from') ?? ''
  const to = url.searchParams.get('to') ?? ''
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
  const pageSize = 50

  let query = supabase
    .from('finance_transactions')
    .select('*', { count: 'exact' })
    .order('transaction_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (type) query = query.eq('type', type)
  if (category) query = query.eq('category', category)
  if (vendor) query = query.ilike('vendor', `%${vendor}%`)
  if (from) query = query.gte('transaction_date', from)
  if (to) query = query.lte('transaction_date', to)

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

  const type = 'type' in body && typeof body.type === 'string' ? body.type : ''
  const category = 'category' in body && typeof body.category === 'string' ? body.category : ''
  const amount = 'amount' in body ? Number(body.amount) : 0

  if (!type || !['income', 'expense'].includes(type)) {
    return NextResponse.json({ error: 'type must be income or expense' }, { status: 400 })
  }
  if (!category) return NextResponse.json({ error: 'category is required' }, { status: 400 })
  if (!amount || amount <= 0) return NextResponse.json({ error: 'amount must be positive' }, { status: 400 })

  const { data: tx, error } = await supabase
    .from('finance_transactions')
    .insert({
      type,
      category,
      amount,
      vendor: 'vendor' in body && typeof body.vendor === 'string' ? body.vendor : null,
      description: 'description' in body && typeof body.description === 'string' ? body.description : null,
      currency: 'currency' in body && typeof body.currency === 'string' ? body.currency : 'CAD',
      recurring: 'recurring' in body ? Boolean(body.recurring) : false,
      recurring_interval: 'recurring_interval' in body && typeof body.recurring_interval === 'string' ? body.recurring_interval : null,
      invoice_url: 'invoice_url' in body && typeof body.invoice_url === 'string' ? body.invoice_url : null,
      transaction_date: 'transaction_date' in body && typeof body.transaction_date === 'string' ? body.transaction_date : new Date().toISOString().slice(0, 10),
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'finance-transaction-created',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'finance',
    resource_id: tx.id,
    metadata: { type, category, amount, vendor: tx.vendor },
  })

  return NextResponse.json(tx, { status: 201 })
}
