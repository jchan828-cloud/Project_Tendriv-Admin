import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { appendAuditLog } from '@/lib/audit/log'

export async function POST(request: NextRequest) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json()
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const name = typeof b.name === 'string' ? b.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const naics = Array.isArray(b.naics_codes)
    ? (b.naics_codes as unknown[]).filter((c): c is string => typeof c === 'string')
    : typeof b.naics_codes === 'string' && b.naics_codes
      ? b.naics_codes.split(',').map((s: string) => s.trim()).filter(Boolean)
      : []

  const supabase = await createServiceRoleClient()
  const { data: account, error } = await supabase
    .from('abm_accounts')
    .insert({
      name,
      organisation_type: typeof b.organisation_type === 'string' ? b.organisation_type : 'enterprise',
      province: typeof b.province === 'string' && b.province ? b.province : null,
      naics_codes: naics,
      annual_procurement_value_cad: b.annual_procurement_value_cad != null ? Number(b.annual_procurement_value_cad) || null : null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'account-created',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'contact',
    resource_id: account.id,
    metadata: { name },
  })

  return NextResponse.json(account, { status: 201 })
}
