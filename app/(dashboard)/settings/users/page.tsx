import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/roles'
import { InviteForm } from '@/components/settings/invite-form'
import { UserRoleEditor } from '@/components/settings/user-role-editor'

export default async function UsersPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const record = await getUserRole(supabase, user.id)
  if (record.role !== 'admin') redirect('/settings/profile')

  const service = await createServiceRoleClient()
  const { data: { users } } = await service.auth.admin.listUsers({ perPage: 200 })

  const { data: roleRows } = await service
    .from('user_roles')
    .select('user_id, role, modules')

  const roleMap = new Map((roleRows ?? []).map((r) => [r.user_id, r]))

  const tableUsers = users.map((u) => ({
    id: u.id,
    email: u.email ?? '(no email)',
    createdAt: u.created_at,
    lastSignIn: u.last_sign_in_at,
    role: roleMap.get(u.id)?.role ?? 'admin',
    modules: roleMap.get(u.id)?.modules ?? ['content', 'analytics', 'crm', 'system'],
    isCurrentUser: u.id === user.id,
  }))

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="text-heading-lg">Users</h1>
        <p className="text-body-sm" style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
          Manage who has access to this portal and what they can see.
        </p>
      </div>

      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div className="section-label" style={{ marginBottom: '14px' }}>Invite user</div>
        <InviteForm />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
              <th className="section-label px-4 py-3 text-left">Email</th>
              <th className="section-label px-4 py-3 text-left">Role</th>
              <th className="section-label px-4 py-3 text-left">Modules</th>
              <th className="section-label px-4 py-3 text-left">Joined</th>
              <th className="section-label px-4 py-3 text-left">Last sign-in</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tableUsers.map((u) => (
              <UserRoleEditor key={u.id} user={u} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
