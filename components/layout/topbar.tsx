'use client'

/** Shell topbar — wordmark, region badge, user email, logout */

import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { GlobalSearch } from './global-search'

interface TopbarProps {
  email: string | undefined
}

export function Topbar({ email }: TopbarProps) {
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

  return (
    <div className="topbar">
      <div className="flex items-center gap-4">
        <span className="wordmark">tendriv</span>
        <span className="topbar-label">marketing portal</span>
      </div>
      <div className="flex items-center gap-3">
        <GlobalSearch />
        <span className="topbar-region">ca-central-1</span>
        <span className="topbar-email">{email}</span>
        <button onClick={handleLogout} className="topbar-logout">
          Logout
        </button>
      </div>
    </div>
  )
}
