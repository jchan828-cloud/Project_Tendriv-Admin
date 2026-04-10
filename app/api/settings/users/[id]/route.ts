import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/roles'

async function requireAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const record = await getUserRole(supabase, user.id)
  return record.role === 'admin' ? user : null
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireAdmin()
  if (!caller) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { role, modules } = await req.json() as { role: string; modules: string[] }

  const service = await createServiceRoleClient()
  await service.from('user_roles').upsert(
    { user_id: id, role, modules, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireAdmin()
  if (!caller) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  if (id === caller.id) {
    return NextResponse.json({ success: false, error: 'Cannot revoke your own access' }, { status: 400 })
  }

  const service = await createServiceRoleClient()
  await service.from('user_roles').delete().eq('user_id', id)
  await service.auth.admin.deleteUser(id)

  return NextResponse.json({ success: true })
}
