/** MK8-CRM-002: Content attribution API — list attributions for a contact */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const contactId = url.searchParams.get('contact_id')
  if (!contactId) return NextResponse.json({ error: 'contact_id required' }, { status: 400 })

  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('content_attribution')
    .select('id, post_id, touch_type, touched_at, blog_posts(title)')
    .eq('contact_id', contactId)
    .order('touched_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const mapped = (data ?? []).map((row) => {
    const bp = row.blog_posts
    const postTitle = bp && typeof bp === 'object' && 'title' in bp ? String(bp.title) : null
    return {
      id: row.id,
      post_id: row.post_id,
      touch_type: row.touch_type,
      touched_at: row.touched_at,
      post_title: postTitle,
    }
  })

  return NextResponse.json(mapped)
}
