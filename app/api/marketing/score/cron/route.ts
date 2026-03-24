/** MK8-INT-002: Predictive lead score cron — batch re-score all active contacts */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { computeScore } from '@/lib/scoring/engine'
import { computePredictiveModifier } from '@/lib/scoring/predictive'
import { appendAuditLog } from '@/lib/audit/log'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceRoleClient()

  const { data: contacts, error: contactsErr } = await supabase
    .from('outreach_contacts')
    .select('*')
    .not('last_activity_at', 'is', null)

  if (contactsErr) {
    return NextResponse.json({ error: contactsErr.message }, { status: 500 })
  }

  let scored = 0
  let errors = 0

  for (const contact of contacts ?? []) {
    try {
      const { data: activityLog } = await supabase
        .from('outreach_activity_log')
        .select('*')
        .eq('contact_id', contact.id)
        .order('occurred_at', { ascending: false })
        .limit(100)

      const { data: attributions } = await supabase
        .from('content_attribution')
        .select('*')
        .eq('contact_id', contact.id)

      const { score: baseScore, breakdown } = computeScore(
        contact,
        activityLog ?? [],
        attributions ?? []
      )

      const { data: recentEvents } = await supabase
        .from('outreach_activity_log')
        .select('occurred_at')
        .eq('contact_id', contact.id)
        .gte('occurred_at', new Date(Date.now() - 14 * 86400_000).toISOString())
        .order('occurred_at', { ascending: true })

      const scoringEvents = (recentEvents ?? []).map((e) => ({
        occurred_at: e.occurred_at,
        score_at_time: baseScore,
      }))

      const predictiveModifier = computePredictiveModifier(breakdown, scoringEvents)
      const finalScore = Math.max(0, Math.min(100, baseScore + predictiveModifier))

      await supabase
        .from('lead_scores')
        .upsert({
          contact_id: contact.id,
          score: finalScore,
          score_breakdown: { ...breakdown, predictive_modifier: predictiveModifier },
          scored_at: new Date().toISOString(),
          scoring_version: 'mk8-v2-predictive',
        }, { onConflict: 'contact_id' })

      scored++
    } catch {
      errors++
    }
  }

  await appendAuditLog(supabase, {
    event_type: 'cron-score-batch',
    actor_id: null,
    actor_type: 'system',
    resource_type: 'lead-score',
    resource_id: 'batch',
    metadata: { scored, errors, total: (contacts ?? []).length },
  })

  return NextResponse.json({ scored, errors, total: (contacts ?? []).length })
}
