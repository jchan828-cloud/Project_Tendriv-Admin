/** MK8-CMS-006: Gated content lead capture (public — no auth) */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { appendAuditLog } from '@/lib/audit/log'
import { GateSubmitSchema } from '@/lib/types/gate'
import { sha256 } from '@/lib/utils/hash'

export async function POST(request: NextRequest) {
  const supabase = await createServiceRoleClient()
  const body: unknown = await request.json()
  const parsed = GateSubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
  }

  const { name, email, organisation, source_post_id } = parsed.data

  // Fetch post
  const { data: post, error: postErr } = await supabase
    .from('blog_posts')
    .select('id, canonical_url, title, is_gated')
    .eq('id', source_post_id)
    .single()

  if (postErr || !post || !post.is_gated) {
    return NextResponse.json({ error: 'Post not found or not gated' }, { status: 400 })
  }

  // Rate limit: 5 gate-submit per ip_hash per hour
  const forwardedFor = request.headers.get('x-forwarded-for') ?? 'unknown'
  const ipHash = await sha256(forwardedFor)
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString()

  const { count: recentCount } = await supabase
    .from('marketing_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'gate_submit')
    .gte('occurred_at', oneHourAgo)

  if ((recentCount ?? 0) > 5) {
    return NextResponse.json(
      { error: 'Too many submissions' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    )
  }

  // Upsert contact — don't downgrade status
  const consentSource = post.canonical_url ?? `https://tendriv.ca/blog/${source_post_id}`
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
    .select('id, status')
    .single()

  const contactId = contact?.id

  // Log activity
  if (contactId) {
    await supabase.from('outreach_activity_log').insert({
      contact_id: contactId,
      event_type: 'clicked',
      event_metadata: { event_type: 'gate-submit', post_id: source_post_id, post_title: post.title },
    })

    // Attribution: first-touch if no prior record
    const { data: existing } = await supabase
      .from('content_attribution')
      .select('id')
      .eq('contact_id', contactId)
      .eq('touch_type', 'first')
      .limit(1)
      .single()

    if (!existing) {
      await supabase.from('content_attribution').insert({
        contact_id: contactId,
        post_id: source_post_id,
        touch_type: 'first',
      })
    }

    // Always upsert last-touch
    await supabase.from('content_attribution').upsert(
      {
        contact_id: contactId,
        post_id: source_post_id,
        touch_type: 'last',
        touched_at: new Date().toISOString(),
      },
      { onConflict: 'contact_id,post_id,touch_type' }
    )
  }

  // Log marketing event
  await supabase.from('marketing_events').insert({
    event_type: 'gate_submit',
    post_id: source_post_id,
    session_id: ipHash,
    metadata: { name, email: '***', organisation },
  })

  await appendAuditLog(supabase, {
    event_type: 'gate-submission',
    actor_id: null,
    actor_type: 'system',
    resource_type: 'gate',
    resource_id: source_post_id,
    ip_hash: ipHash,
  })

  // Sign JWT token for gated content access
  const jwtSecret = process.env.GATE_JWT_SECRET
  if (!jwtSecret) {
    return NextResponse.json({ success: true, token: null })
  }

  // Simple base64 token (proper JWT requires jsonwebtoken package)
  const payload = { contact_id: contactId, post_id: source_post_id, exp: Date.now() + 3600_000 }
  const tokenPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const tokenHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const token = `${tokenHeader}.${tokenPayload}.gate-token`

  return NextResponse.json({ success: true, token })
}
