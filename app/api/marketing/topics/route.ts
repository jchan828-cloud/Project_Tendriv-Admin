/** MK8-CMS-004: Topics — list + create */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { TopicCreateSchema } from '@/lib/types/cms'
import { appendAuditLog } from '@/lib/audit/log'

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export async function GET() {
  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase.from('blog_topics').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createServiceRoleClient()
  const body: unknown = await request.json()
  const parsed = TopicCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
  }

  const name = parsed.data.name.trim()
  if (!name) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })

  const { data, error } = await supabase
    .from('blog_topics')
    .insert({ name, slug: slugify(name), parent_id: parsed.data.parent_id ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'topic-created',
    actor_id: null,
    actor_type: 'system',
    resource_type: 'topic',
    resource_id: data.id,
  })

  return NextResponse.json(data, { status: 201 })
}
