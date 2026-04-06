/** MK8-CMS-008: Post versions — list + create */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { appendAuditLog } from '@/lib/audit/log'

interface RouteContext {
  params: Promise<{ id: string }>
}

function extractContentText(content: unknown): string {
  if (typeof content === 'string') return content
  if (typeof content === 'object' && content !== null) {
    if ('content' in content && typeof (content as Record<string, unknown>).content === 'string') {
      return (content as Record<string, unknown>).content as string
    }
    // Fallback: serialize the object for comparison
    return JSON.stringify(content)
  }
  return ''
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const supabase = await createServiceRoleClient()
  const url = new URL(request.url)
  const v1 = url.searchParams.get('v1')
  const v2 = url.searchParams.get('v2')

  // Diff mode
  if (v1 && v2) {
    const { data: versions } = await supabase
      .from('blog_post_versions')
      .select('version_number, content')
      .eq('post_id', id)
      .in('version_number', [parseInt(v1, 10), parseInt(v2, 10)])

    if (!versions || versions.length < 2) {
      return NextResponse.json({ error: 'Versions not found' }, { status: 404 })
    }

    const older = versions.find((v) => v.version_number === parseInt(v1, 10))
    const newer = versions.find((v) => v.version_number === parseInt(v2, 10))

    if (!older || !newer) {
      return NextResponse.json({ error: 'Versions not found' }, { status: 404 })
    }

    const oldContent = extractContentText(older.content)
    const newContent = extractContentText(newer.content)

    const oldLines = oldContent.split('\n')
    const newLines = newContent.split('\n')

    const additions = newLines.filter((line) => !oldLines.includes(line))
    const removals = oldLines.filter((line) => !newLines.includes(line))

    return NextResponse.json({ additions, removals })
  }

  // List mode — no full content
  const { data, error } = await supabase
    .from('blog_post_versions')
    .select('id, version_number, change_type, changed_by, created_at')
    .eq('post_id', id)
    .order('version_number', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()

  const supabase = await createServiceRoleClient()
  const body: unknown = await request.json()

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const changeType = 'change_type' in body && typeof body.change_type === 'string' ? body.change_type : 'auto-save'
  const content = 'content' in body ? body.content : {}

  // Auto-increment version number
  const { data: maxRow } = await supabase
    .from('blog_post_versions')
    .select('version_number')
    .eq('post_id', id)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = (maxRow?.version_number ?? 0) + 1

  const { data, error } = await supabase
    .from('blog_post_versions')
    .insert({
      post_id: id,
      version_number: nextVersion,
      content,
      changed_by: user?.id ?? null,
      change_type: changeType,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'post-version-created',
    actor_id: user?.id ?? null,
    actor_type: 'user',
    resource_type: 'version',
    resource_id: data.id,
    metadata: { post_id: id, version_number: nextVersion, change_type: changeType },
  })

  return NextResponse.json(data, { status: 201 })
}
