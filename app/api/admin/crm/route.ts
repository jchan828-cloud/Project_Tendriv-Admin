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
  const business_name = typeof b.business_name === 'string' ? b.business_name.trim() : ''
  if (!business_name) return NextResponse.json({ error: 'business_name is required' }, { status: 400 })

  const supabase = await createServiceRoleClient()
  const { data: contact, error } = await supabase
    .from('outreach_contacts')
    .insert({
      business_name,
      contact_email: typeof b.contact_email === 'string' && b.contact_email ? b.contact_email.trim() : null,
      status: typeof b.status === 'string' ? b.status : 'prospect',
      pipeline: typeof b.pipeline === 'string' ? b.pipeline : 'manual',
      province: typeof b.province === 'string' && b.province ? b.province : null,
      contact_website: typeof b.contact_website === 'string' && b.contact_website ? b.contact_website.trim() : null,
      notes: typeof b.notes === 'string' && b.notes ? b.notes.trim() : null,
      casl_consent_date: typeof b.casl_consent_date === 'string' && b.casl_consent_date ? b.casl_consent_date : null,
      casl_consent_method: typeof b.casl_consent_method === 'string' && b.casl_consent_method ? b.casl_consent_method : null,
      casl_consent_source: typeof b.casl_consent_source === 'string' && b.casl_consent_source ? b.casl_consent_source : null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'contact-created',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'contact',
    resource_id: contact.id,
    metadata: { business_name },
  })

  return NextResponse.json(contact, { status: 201 })
}
