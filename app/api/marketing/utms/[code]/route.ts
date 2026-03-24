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

  await supabase.from('utm_clicks').insert({
    utm_id: utm.id,
    ip_hash: ipHash,
    referrer: request.headers.get('referer') ?? null,
    user_agent_hash: userAgentHash,
  })

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
