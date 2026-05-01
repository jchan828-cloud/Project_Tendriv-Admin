import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/roles'
import Link from 'next/link'

export default async function SettingsLayout({ children }: { readonly children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const record = user ? await getUserRole(supabase, user.id) : null

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 24 }}>
        Settings
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 32, alignItems: 'start' }}>
        {/* Left rail nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <SettingsNavItem href="/settings/profile" label="Profile" />
          {record?.role === 'admin' && (
            <SettingsNavItem href="/settings/users" label="Users" />
          )}
          <span
            style={{
              padding: '6px 10px', fontSize: 13, color: 'var(--text-muted)',
              borderRadius: 5, cursor: 'default', opacity: 0.5,
            }}
          >
            Notifications
          </span>
        </nav>
        {/* Page content */}
        <div style={{ minWidth: 0 }}>{children}</div>
      </div>
    </div>
  )
}

function SettingsNavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="nav-item"
      style={{ fontSize: 13 }}
    >
      <span className="nav-dot" />
      {label}
    </Link>
  )
}
