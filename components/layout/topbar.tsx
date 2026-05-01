'use client'

import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { GlobalSearch } from './global-search'
import type { UserRole } from '@/lib/auth/roles'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  analyst: 'Analyst',
  'crm-manager': 'CRM manager',
}

interface TopbarProps {
  email: string | undefined
  role?: UserRole
}

export function Topbar({ email, role }: TopbarProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const truncatedEmail = email && email.length > 24 ? email.slice(0, 24) + '…' : email

  return (
    <div className="topbar">
      <div className="flex items-center gap-4">
        <span className="wordmark">tendriv</span>
        <span className="topbar-label">admin portal</span>
      </div>
      <div className="flex items-center gap-3">
        <GlobalSearch />
        <span className="topbar-region">ca-central-1</span>
        <span className="topbar-email" title={email}>{truncatedEmail}</span>
        {role && (
          <span className="badge-neutral topbar-role">{ROLE_LABELS[role]}</span>
        )}
        <button onClick={handleLogout} className="topbar-logout">
          Sign out
        </button>
      </div>
    </div>
  )
}
