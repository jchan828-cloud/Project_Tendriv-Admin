/** MK8-ANL-002: Marketing event ingestion + GA4 proxy */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { MarketingEventBatchSchema } from '@/lib/types/analytics'

export async function POST(request: NextRequest) {
  const supabase = await createServiceRoleClient()
  const body: unknown = await request.json()
  const parsed = MarketingEventBatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
  }

  const events = parsed.data
  const sessionId = events[0]?.session_id

  // Rate limit: 100 events per session per 60 seconds
  if (sessionId) {
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()
    const { count } = await supabase
      .from('marketing_events')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .gte('occurred_at', oneMinuteAgo)

    if ((count ?? 0) >= 100) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }
  }

  // Insert all events to marketing_events
  const { error: insertError } = await supabase
    .from('marketing_events')
    .insert(events.map((e) => ({
      event_type: e.event_type,
      post_id: e.post_id ?? null,
      session_id: e.session_id,
      metadata: e.metadata ?? null,
    })))

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Forward non-PII events to GA4 Measurement Protocol
  // CRITICAL: gate_submit events MUST NOT be forwarded (they contain PII)
  const ga4Events = events.filter((e) => e.event_type !== 'gate_submit')

  if (ga4Events.length > 0 && process.env.GA4_MEASUREMENT_ID && process.env.GA4_API_SECRET) {
    const ga4Payload = {
      client_id: sessionId,
      events: ga4Events.map((e) => ({
        name: e.event_type,
        params: {
          post_id: e.post_id ?? undefined,
          ...(e.metadata && typeof e.metadata === 'object' ? e.metadata : {}),
        },
      })),
    }

    try {
      await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA4_MEASUREMENT_ID}&api_secret=${process.env.GA4_API_SECRET}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ga4Payload),
        }
      )
    } catch (err) {
      console.error('[ga4] forward failed:', err)
    }
  }

  return NextResponse.json({ accepted: events.length })
}
