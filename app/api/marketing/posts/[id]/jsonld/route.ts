/** MK8-CMS-005: JSON-LD endpoint — get generated, post override */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { inferSchemaType, generateArticleSchema, generateFaqSchema, generateHowToSchema } from '@/lib/cms/jsonld'
import { appendAuditLog } from '@/lib/audit/log'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createServiceRoleClient()

  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const schemaType = inferSchemaType(post)
  let jsonld: string
  if (schemaType === 'Article') jsonld = generateArticleSchema(post)
  else if (schemaType === 'FAQPage') jsonld = generateFaqSchema(post, [])
  else jsonld = generateHowToSchema(post, [])

  return NextResponse.json({ schema_type: schemaType, jsonld })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createServiceRoleClient()
  const body: unknown = await request.json()

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { data: post, error: fetchErr } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const faqs = 'faqs' in body && Array.isArray(body.faqs) ? body.faqs : []
  const steps = 'steps' in body && Array.isArray(body.steps) ? body.steps : []

  const schemaType = inferSchemaType(post)
  let jsonld: string
  if (schemaType === 'FAQPage') jsonld = generateFaqSchema(post, faqs)
  else if (schemaType === 'HowTo') jsonld = generateHowToSchema(post, steps)
  else jsonld = generateArticleSchema(post)

  await supabase
    .from('blog_posts')
    .update({ jsonld_override: JSON.parse(jsonld) })
    .eq('id', id)

  await appendAuditLog(supabase, {
    event_type: 'post-jsonld-updated',
    actor_id: null,
    actor_type: 'system',
    resource_type: 'post',
    resource_id: id,
    metadata: { schema_type: schemaType },
  })

  return NextResponse.json({ schema_type: schemaType, jsonld })
}
