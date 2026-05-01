import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { appendAuditLog } from '@/lib/audit/log'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body: unknown = await req.json()
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const patch: Record<string, unknown> = {}

  if (typeof b.name === 'string' && b.name.trim()) patch.name = b.name.trim()
  if (typeof b.organisation_type === 'string') patch.organisation_type = b.organisation_type
  if ('province' in b) patch.province = typeof b.province === 'string' && b.province ? b.province : null
  if ('annual_procurement_value_cad' in b) {
    patch.annual_procurement_value_cad = b.annual_procurement_value_cad != null ? Number(b.annual_procurement_value_cad) || null : null
  }
  if ('naics_codes' in b) {
    patch.naics_codes = Array.isArray(b.naics_codes)
      ? (b.naics_codes as unknown[]).filter((c): c is string => typeof c === 'string')
      : typeof b.naics_codes === 'string'
        ? b.naics_codes.split(',').map((s: string) => s.trim()).filter(Boolean)
        : []
  }

  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('abm_accounts').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'account-updated',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'contact',
    resource_id: id,
  })

  return NextResponse.json({ success: true })
}
