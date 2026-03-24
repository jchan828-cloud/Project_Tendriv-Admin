/** MK8-CMS-004: Post tags — replace all */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { appendAuditLog } from '@/lib/audit/log'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createServiceRoleClient()
  const body: unknown = await request.json()

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Expected array of tag_ids' }, { status: 400 })
  }

  // Delete existing and insert new
  await supabase.from('blog_post_tags').delete().eq('post_id', id)

  if (body.length > 0) {
    const rows = body.map((tag_id: string) => ({ post_id: id, tag_id }))
    const { error } = await supabase.from('blog_post_tags').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await appendAuditLog(supabase, {
    event_type: 'post-tags-updated',
    actor_id: null,
    actor_type: 'system',
    resource_type: 'post',
    resource_id: id,
    metadata: { tag_count: body.length },
  })

  return NextResponse.json({ success: true })
}
