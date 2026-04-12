/** MK8-ANL-001: UTM redirect + click tracking (public — no auth) */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { appendAuditLog } from '@/lib/audit/log'
import { sha256 } from '@/lib/utils/hash'

interface RouteContext {
  params: Promise<{ code: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { code } = await context.params
  const supabase = await createServiceRoleClient()

  const { data: utm, error } = await supabase
    .from('utm_campaigns')
    .select('*')
    .eq('short_code', code)
    .single()

  if (error || !utm) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  }

  // Atomically increment click count
  await supabase
    .from('utm_campaigns')
    .update({ click_count: utm.click_count + 1 })
    .eq('id', utm.id)

  // Log click with hashed IP
  const forwardedFor = request.headers.get('x-forwarded-for') ?? 'unknown'
  const ipHash = await sha256(forwardedFor)
  const userAgentHash = await sha256(request.headers.get('user-agent') ?? 'unknown')

  // Attempt to resolve contact: check if this IP hash previously submitted a gate form.
  // The gate route uses the same sha256(x-forwarded-for) as session_id on gate_submit events.
  let resolvedContactId: string | null = null
  const { data: priorGateEvent } = await supabase
    .from('marketing_events')
    .select('metadata')
    .eq('event_type', 'gate_submit')
    .eq('session_id', ipHash)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .single()

  if (priorGateEvent?.metadata && typeof priorGateEvent.metadata === 'object') {
    const gateMeta = priorGateEvent.metadata as Record<string, unknown>
    const org = 'organisation' in gateMeta ? String(gateMeta.organisation) : null
    if (org) {
      const { data: contact } = await supabase
        .from('outreach_contacts')
        .select('id')
        .eq('business_name', org)
        .limit(1)
        .single()
      resolvedContactId = contact?.id ?? null
    }
  }

  await supabase.from('utm_clicks').insert({
    utm_id: utm.id,
    ip_hash: ipHash,
    referrer: request.headers.get('referer') ?? null,
    user_agent_hash: userAgentHash,
    resolved_contact_id: resolvedContactId,
  })

  // If we resolved a contact and the UTM is linked to a post, record an assist touch
  if (resolvedContactId && utm.post_id) {
    await supabase.from('content_attribution').upsert(
      {
        contact_id: resolvedContactId,
        post_id: utm.post_id,
        touch_type: 'assist',
        touched_at: new Date().toISOString(),
      },
      { onConflict: 'contact_id,post_id,touch_type' }
    )
  }

  await appendAuditLog(supabase, {
    event_type: 'utm-click',
    actor_id: null,
    actor_type: 'system',
    resource_type: 'utm',
    resource_id: utm.id,
    ip_hash: ipHash,
  })

  return NextResponse.redirect(utm.full_url, 302)
}
