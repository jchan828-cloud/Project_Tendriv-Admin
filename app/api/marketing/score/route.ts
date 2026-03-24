/** MK8-CRM-001: Lead score computation endpoint */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { computeScore } from '@/lib/scoring/engine'
import { appendAuditLog } from '@/lib/audit/log'
import { ScoreRequestSchema } from '@/lib/types/scoring'

export async function POST(request: NextRequest) {
  const supabase = await createServiceRoleClient()

  const body: unknown = await request.json()
  const parsed = ScoreRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 })
  }

  const { contact_id } = parsed.data

  // Fetch contact
  const { data: contact, error: contactErr } = await supabase
    .from('outreach_contacts')
    .select('*')
    .eq('id', contact_id)
    .single()

  if (contactErr || !contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  // Fetch activity log
  const { data: activities } = await supabase
    .from('outreach_activity_log')
    .select('*')
    .eq('contact_id', contact_id)
    .order('occurred_at', { ascending: false })

  // Fetch content attributions
  const { data: attributions } = await supabase
    .from('content_attribution')
    .select('*')
    .eq('contact_id', contact_id)

  const { score, breakdown } = computeScore(
    contact,
    activities ?? [],
    attributions ?? []
  )

  // Upsert lead score
  await supabase
    .from('lead_scores')
    .upsert({
      contact_id,
      score,
      score_breakdown: breakdown,
      scored_at: new Date().toISOString(),
      scoring_version: 'v1',
    }, { onConflict: 'contact_id' })

  await appendAuditLog(supabase, {
    event_type: 'contact-score-computed',
    actor_id: null,
    actor_type: 'system',
    resource_type: 'score',
    resource_id: contact_id,
    metadata: { score, breakdown },
  })

  return NextResponse.json({ score, breakdown })
}
