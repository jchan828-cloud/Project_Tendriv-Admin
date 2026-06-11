/** MK8-ANL-001: UTM campaigns — list + create */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireContentAccess } from '@/lib/autoblog/auth'
import { UtmCampaignInsertSchema } from '@/lib/types/analytics'
import { appendAuditLog } from '@/lib/audit/log'
import { generateShortCode } from '@/lib/utils/short-code'

export async function GET() {
  const auth = await requireContentAccess()
  if (auth instanceof NextResponse) return auth

  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('utm_campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await requireContentAccess()
  if (auth instanceof NextResponse) return auth

  const supabase = await createServiceRoleClient()
  const body: unknown = await request.json()
  const parsed = UtmCampaignInsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
  }

  const d = parsed.data
  const params = new URLSearchParams({
    utm_source: d.utm_source,
    utm_medium: d.utm_medium,
    utm_campaign: d.utm_campaign,
    ...(d.utm_term ? { utm_term: d.utm_term } : {}),
    ...(d.utm_content ? { utm_content: d.utm_content } : {}),
  })
  const fullUrl = `${d.destination_url}${d.destination_url.includes('?') ? '&' : '?'}${params.toString()}`
  const shortCode = generateShortCode(8)

  const { data: utm, error } = await supabase
    .from('utm_campaigns')
    .insert({
      ...d,
      full_url: fullUrl,
      short_code: shortCode,
      created_by: auth.userId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'utm-created',
    actor_id: auth.userId,
    actor_type: 'user',
    resource_type: 'utm',
    resource_id: utm.id,
    metadata: { short_code: shortCode },
  })

  return NextResponse.json(utm, { status: 201 })
}
