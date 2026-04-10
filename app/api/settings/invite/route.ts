import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/roles'

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const record = await getUserRole(supabase, user.id)
  if (record.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { email, role, modules } = body as { email: string; role: string; modules: string[] }
  if (!email || !role || !modules?.length) {
    return NextResponse.json({ success: false, error: 'email, role and modules are required' }, { status: 400 })
  }

  const service = await createServiceRoleClient()

  const { data: invited, error: inviteErr } = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.tendriv.ca'}/auth/callback`,
  })

  if (inviteErr) return NextResponse.json({ success: false, error: inviteErr.message }, { status: 400 })

  await service.from('user_roles').upsert(
    { user_id: invited.user.id, role, modules },
    { onConflict: 'user_id' }
  )

  return NextResponse.json({ success: true, data: { userId: invited.user.id } })
}
