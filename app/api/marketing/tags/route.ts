/** MK8-CMS-004: Tags — list + create */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { TagCreateSchema } from '@/lib/types/cms'
import { appendAuditLog } from '@/lib/audit/log'

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export async function GET(request: NextRequest) {
  const supabase = await createServiceRoleClient()
  const q = new URL(request.url).searchParams.get('q') ?? ''

  let query = supabase.from('blog_tags').select('*').order('name')
  if (q) query = query.ilike('name', `%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const body: unknown = await request.json()
  const parsed = TagCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const name = parsed.data.name.trim()
  if (!name) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })

  const { data, error } = await supabase
    .from('blog_tags')
    .upsert({ name, slug: slugify(name) }, { onConflict: 'name' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'tag-created',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'tag',
    resource_id: data.id,
  })

  return NextResponse.json(data, { status: 201 })
}
