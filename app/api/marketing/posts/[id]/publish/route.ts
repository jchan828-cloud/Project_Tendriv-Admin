/** MK8-CMS-007: Multi-channel publish endpoint */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { publishToChannels } from '@/lib/cms/publish-router'
import { appendAuditLog } from '@/lib/audit/log'
import { PublishRequestSchema } from '@/lib/types/publish'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const body: unknown = await request.json()
  const parsed = PublishRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
  }

  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const results = await publishToChannels(supabase, post, parsed.data.channels)

  await appendAuditLog(supabase, {
    event_type: 'post-published',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'publish',
    resource_id: id,
    metadata: { channels: parsed.data.channels, results },
  })

  return NextResponse.json(results)
}
