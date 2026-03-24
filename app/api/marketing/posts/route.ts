/** MK8-CMS-002: Blog posts — list + create */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { BlogPostInsertSchema } from '@/lib/types/cms'
import { appendAuditLog } from '@/lib/audit/log'

export async function GET(request: NextRequest) {
  const supabase = await createServiceRoleClient()
  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
  const status = url.searchParams.get('status') ?? ''
  const buyer_stage = url.searchParams.get('buyer_stage') ?? ''
  const pageSize = 50

  let query = supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (status) query = query.eq('status', status)
  if (buyer_stage) query = query.eq('buyer_stage', buyer_stage)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count })
}

export async function POST(request: NextRequest) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const body: unknown = await request.json()
  const parsed = BlogPostInsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
  }

  const { data: post, error } = await supabase
    .from('blog_posts')
    .insert({ ...parsed.data, author_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'post-created',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'post',
    resource_id: post.id,
  })

  return NextResponse.json(post, { status: 201 })
}
