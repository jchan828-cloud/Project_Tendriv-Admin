/** MK8-CMS-007: Template download gate (public — no auth) */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { appendAuditLog } from '@/lib/audit/log'
import { GateTemplateSchema, TEMPLATE_URL_ENV } from '@/lib/types/gate-template'
import { sha256 } from '@/lib/utils/hash'

export async function POST(request: NextRequest) {
  const supabase = await createServiceRoleClient()
  const body: unknown = await request.json()
  const parsed = GateTemplateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
  }

  const { name, email, organisation, template_id } = parsed.data

  // Rate limit: 5 template-download per ip_hash per hour
  const forwardedFor = request.headers.get('x-forwarded-for') ?? 'unknown'
  const ipHash = await sha256(forwardedFor)
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString()

  const { count: recentCount } = await supabase
    .from('marketing_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'template_download')
    .eq('session_id', ipHash)
    .gte('occurred_at', oneHourAgo)

  if ((recentCount ?? 0) > 5) {
    return NextResponse.json(
      { error: 'Too many submissions' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    )
  }

  const consentSource = `${process.env.NEXT_PUBLIC_MARKETING_URL ?? 'https://tendriv.ca'}/resources`

  // Upsert contact — don't downgrade status
  const { data: contact } = await supabase
    .from('outreach_contacts')
    .upsert(
      {
        business_name: organisation,
        contact_email: email,
        pipeline: 'manual',
        status: 'prospect',
        casl_consent_method: 'express',
        casl_consent_date: new Date().toISOString(),
        casl_consent_source: consentSource,
      },
      { onConflict: 'business_name,province' }
    )
    .select('id')
    .single()

  const contactId = contact?.id

  if (contactId) {
    await supabase.from('outreach_activity_log').insert({
      contact_id: contactId,
      event_type: 'clicked',
      event_metadata: { event_type: 'template-download', template_id, name },
    })
  }

  // Log marketing event
  await supabase.from('marketing_events').insert({
    event_type: 'template_download',
    session_id: ipHash,
    metadata: { template_id, name, email: '***', organisation },
  })

  await appendAuditLog(supabase, {
    event_type: 'template-download',
    actor_id: null,
    actor_type: 'system',
    resource_type: 'template',
    resource_id: template_id,
    ip_hash: ipHash,
  })

  const downloadUrl = process.env[TEMPLATE_URL_ENV[template_id]] ?? null

  return NextResponse.json({ success: true, download_url: downloadUrl })
}
