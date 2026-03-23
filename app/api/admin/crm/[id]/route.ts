import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status } = await req.json()
  const service = await createServiceRoleClient()
  const { error } = await service
    .from('outreach_contacts')
    .update({ status, last_activity_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await service.from('outreach_activity_log').insert({
    contact_id: id,
    event_type: `status_${status}`,
    occurred_at: new Date().toISOString(),
  })

  return NextResponse.json({ success: true })
}
