import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/roles'
import { PasswordForm } from '@/components/settings/password-form'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Owner / Admin',
  editor: 'Editor',
  analyst: 'Analyst',
  'crm-manager': 'CRM Manager',
}

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const record = user ? await getUserRole(supabase, user.id) : null

  return (
    <div style={{ maxWidth: '480px' }}>
      <h1 className="text-heading-lg" style={{ marginBottom: '24px' }}>Profile</h1>

      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div className="section-label" style={{ marginBottom: '14px' }}>Account</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div className="text-mono-xs" style={{ color: 'var(--text-label)', marginBottom: '3px' }}>Email</div>
            <div className="text-body-sm">{user?.email}</div>
          </div>
          <div>
            <div className="text-mono-xs" style={{ color: 'var(--text-label)', marginBottom: '5px' }}>Role</div>
            <span className="badge badge-jade">{ROLE_LABELS[record?.role ?? ''] ?? record?.role ?? '—'}</span>
          </div>
          <div>
            <div className="text-mono-xs" style={{ color: 'var(--text-label)', marginBottom: '5px' }}>Module access</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {record?.modules.map((m) => (
                <span key={m} className="badge badge-neutral">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '20px' }}>
        <div className="section-label" style={{ marginBottom: '14px' }}>Change password</div>
        <PasswordForm />
      </div>
    </div>
  )
}
