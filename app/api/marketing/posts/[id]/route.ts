/** MK8-CMS-002: Blog post — get, patch, delete */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireContentAccess } from '@/lib/autoblog/auth'
import { BlogPostUpdateSchema } from '@/lib/types/cms'
import { appendAuditLog } from '@/lib/audit/log'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireContentAccess()
  if (auth instanceof NextResponse) return auth

  const { id } = await context.params
  const supabase = await createServiceRoleClient()

  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(post)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireContentAccess()
  if (auth instanceof NextResponse) return auth

  const { id } = await context.params
  const supabase = await createServiceRoleClient()
  const body: unknown = await request.json()
  const parsed = BlogPostUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
  }

  const { data: post, error } = await supabase
    .from('blog_posts')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error || !post) return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 })

  const eventType = parsed.data.status ? 'post-status-changed' : 'post-updated'
  await appendAuditLog(supabase, {
    event_type: eventType,
    actor_id: auth.userId,
    actor_type: 'user',
    resource_type: 'post',
    resource_id: id,
    metadata: parsed.data.status ? { new_status: parsed.data.status } : undefined,
  })

  return NextResponse.json(post)
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireContentAccess()
  if (auth instanceof NextResponse) return auth

  const { id } = await context.params
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'post-updated',
    actor_id: auth.userId,
    actor_type: 'user',
    resource_type: 'post',
    resource_id: id,
    metadata: { action: 'deleted' },
  })

  return NextResponse.json({ success: true })
}
