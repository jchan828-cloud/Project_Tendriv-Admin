/** MK8-INT-001: AI content brief generator */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json()
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const topic = 'topic' in body && typeof body.topic === 'string' ? body.topic : ''
  const keywords = 'keywords' in body && Array.isArray(body.keywords)
    ? body.keywords.filter((k): k is string => typeof k === 'string')
    : []
  const buyerStage = 'buyer_stage' in body && typeof body.buyer_stage === 'string' ? body.buyer_stage : 'awareness'

  if (!topic) {
    return NextResponse.json({ error: 'topic is required' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const prompt = [
    'You are a B2G (business-to-government) content strategist for Canadian public-sector procurement.',
    `Generate a detailed content brief for the following topic: "${topic}"`,
    keywords.length > 0 ? `Target keywords: ${keywords.join(', ')}` : '',
    `Buyer stage: ${buyerStage}`,
    '',
    'The brief must include:',
    '1. Suggested title (max 70 chars)',
    '2. Meta description (max 160 chars)',
    '3. Target audience description',
    '4. Key messages (3-5 bullet points)',
    '5. Recommended structure (H2 outline with brief descriptions)',
    '6. Suggested CTAs',
    '7. Internal linking opportunities',
    '8. SEO recommendations',
    '',
    'Format your response as JSON with keys: title, meta_description, target_audience, key_messages, structure, ctas, internal_links, seo_recommendations.',
    'Do not include any personally identifiable information.',
  ].filter(Boolean).join('\n')

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Anthropic API error: ${res.status}`, details: text }, { status: 502 })
    }

    const data: unknown = await res.json()
    let briefText = ''
    if (data && typeof data === 'object' && 'content' in data && Array.isArray(data.content)) {
      const textBlock = data.content.find(
        (block: unknown) => block && typeof block === 'object' && 'type' in block && block.type === 'text'
      )
      if (textBlock && typeof textBlock === 'object' && 'text' in textBlock) {
        briefText = String(textBlock.text)
      }
    }

    let brief: unknown
    try {
      const cleaned = briefText.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
      brief = JSON.parse(cleaned)
    } catch {
      brief = { raw: briefText }
    }

    return NextResponse.json({ brief })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
