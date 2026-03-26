/** Global search — queries posts, contacts, and audit logs */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'

interface SearchResult {
  type: 'post' | 'contact' | 'audit'
  id: string
  title: string
  subtitle?: string
  href: string
}

export async function GET(request: NextRequest) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ results: [] })

  const supabase = await createServiceRoleClient()
  const results: SearchResult[] = []

  // Search posts
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, status, slug')
    .or(`title.ilike.%${q}%,slug.ilike.%${q}%`)
    .limit(5)

  for (const p of posts ?? []) {
    results.push({
      type: 'post',
      id: p.id,
      title: p.title,
      subtitle: p.status,
      href: `/posts/${p.id}`,
    })
  }

  // Search contacts
  const { data: contacts } = await supabase
    .from('outreach_contacts')
    .select('id, business_name, contact_email, pipeline')
    .or(`business_name.ilike.%${q}%,contact_email.ilike.%${q}%`)
    .limit(5)

  for (const c of contacts ?? []) {
    results.push({
      type: 'contact',
      id: c.id,
      title: c.business_name,
      subtitle: `${c.pipeline} · ${c.contact_email ?? ''}`,
      href: `/crm/${c.id}`,
    })
  }

  // Search audit log by event_type
  const { data: auditRows } = await supabase
    .from('audit_log')
    .select('id, event_type, resource_type, resource_id, created_at')
    .ilike('event_type', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(5)

  for (const a of auditRows ?? []) {
    results.push({
      type: 'audit',
      id: a.id,
      title: a.event_type,
      subtitle: `${a.resource_type}/${a.resource_id?.slice(0, 8)}`,
      href: '/audit',
    })
  }

  return NextResponse.json({ results })
}
