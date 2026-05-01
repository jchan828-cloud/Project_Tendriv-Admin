import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/roles'
import { ProfileClient } from '@/components/settings/profile-client'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  editor: 'Editor',
  analyst: 'Analyst',
  'crm-manager': 'CRM manager',
}

const MODULE_LABELS: Record<string, string> = {
  content: 'Content', analytics: 'Analytics', crm: 'CRM',
  sales: 'Sales', finance: 'Finance', feedback: 'Feedback', system: 'System',
}

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const record = user ? await getUserRole(supabase, user.id) : null

  const memberSince = user?.created_at
    ? new Date(user.created_at).toISOString().slice(0, 10)
    : null
  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? ''

  return (
    <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Account — static, server-rendered */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div className="section-label" style={{ marginBottom: 16 }}>Account</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <KvRow label="Email">
            <span style={{ fontFamily: 'var(--mono-font)', fontSize: 13 }}>{user?.email ?? '—'}</span>
          </KvRow>
          <KvRow label="Role">
            <span className="badge-neutral">
              {ROLE_LABELS[record?.role ?? ''] ?? record?.role ?? '—'}
            </span>
          </KvRow>
          <KvRow label="Modules">
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {(record?.modules ?? []).map((m) => (
                <span key={m} className="badge-neutral">{MODULE_LABELS[m] ?? m}</span>
              ))}
            </div>
          </KvRow>
          {memberSince && (
            <KvRow label="Member since">
              <span style={{ fontFamily: 'var(--mono-font)', fontSize: 13, color: 'var(--text-muted)' }}>
                {memberSince}
              </span>
            </KvRow>
          )}
        </div>
      </div>

      {/* Interactive sections — client component */}
      <ProfileClient initialDisplayName={displayName} />
    </div>
  )
}

function KvRow({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <span style={{
        width: 100, flexShrink: 0, fontSize: 11, color: 'var(--text-label)',
        fontFamily: 'var(--mono-font)', textTransform: 'uppercase',
        letterSpacing: '0.08em', paddingTop: 2,
      }}>
        {label}
      </span>
      {children}
    </div>
  )
}
