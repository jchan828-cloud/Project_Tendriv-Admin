/** Feedback response — add a reply to feedback */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'

interface RouteContext { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const body: unknown = await request.json()

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const responseBody = 'body' in body && typeof body.body === 'string' ? body.body.trim() : ''
  if (!responseBody) return NextResponse.json({ error: 'body is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('feedback_responses')
    .insert({
      feedback_id: id,
      author_id: user.id,
      body: responseBody,
      is_public: 'is_public' in body ? Boolean(body.is_public) : false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update feedback status to reviewed if still new
  await supabase
    .from('feedback')
    .update({ status: 'reviewed', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'new')

  return NextResponse.json(data, { status: 201 })
}
