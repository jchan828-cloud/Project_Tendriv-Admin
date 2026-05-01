import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

type Body = Record<string, unknown>

function str(b: Body, key: string): string | undefined {
  const v = b[key]
  return typeof v === 'string' ? v.trim() : undefined
}
function nullable(b: Body, key: string): string | null | undefined {
  if (!(key in b)) return undefined
  const v = b[key]
  return typeof v === 'string' && v ? v.trim() : null
}

function buildPatch(b: Body): Record<string, unknown> {
  const p: Record<string, unknown> = {}
  const name = str(b, 'business_name'); if (name !== undefined) p.business_name = name
  const email = nullable(b, 'contact_email'); if (email !== undefined) p.contact_email = email
  const status = str(b, 'status'); if (status !== undefined) p.status = status
  const pipeline = str(b, 'pipeline'); if (pipeline !== undefined) p.pipeline = pipeline
  const province = nullable(b, 'province'); if (province !== undefined) p.province = province
  const website = nullable(b, 'contact_website'); if (website !== undefined) p.contact_website = website
  const notes = nullable(b, 'notes'); if (notes !== undefined) p.notes = notes
  const caslDate = nullable(b, 'casl_consent_date'); if (caslDate !== undefined) p.casl_consent_date = caslDate
  const caslMethod = nullable(b, 'casl_consent_method'); if (caslMethod !== undefined) p.casl_consent_method = caslMethod
  const caslSource = nullable(b, 'casl_consent_source'); if (caslSource !== undefined) p.casl_consent_source = caslSource
  return p
}

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
  const service = await createServiceRoleClient()

  // Status-only update (from inline status change)
  if (Object.keys(b).length === 1 && 'status' in b) {
    const status = b.status as string
    const { error } = await service
      .from('outreach_contacts')
      .update({ status, last_activity_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await service.from('outreach_activity_log').insert({
      contact_id: id,
      event_type: `status_${status}`,
      occurred_at: new Date().toISOString(),
    })
    return NextResponse.json({ success: true })
  }

  // Full contact edit
  const { error } = await service.from('outreach_contacts').update(buildPatch(b)).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
