'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Menu } from 'lucide-react'
import { GlobalSearch } from './global-search'
import type { UserRole } from '@/lib/auth/roles'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  analyst: 'Analyst',
  'crm-manager': 'CRM manager',
}

interface MobileTopbarProps {
  readonly email: string | undefined
  readonly role?: UserRole
  readonly onMenuClick: () => void
}

export function MobileTopbar({ email, role, onMenuClick }: MobileTopbarProps) {
  const router = useRouter()
  const detailsRef = useRef<HTMLDetailsElement>(null)

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = detailsRef.current
      if (el?.open && !el.contains(e.target as Node)) el.open = false
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  return (
    <div className="topbar">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
        >
          <Menu size={18} />
        </button>
        <span className="wordmark">tendriv</span>
      </div>
      <details ref={detailsRef} className="relative">
        <summary
          className="-mr-1 flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
          aria-label="More"
        >
          <span aria-hidden className="text-lg leading-none">⋯</span>
        </summary>
        <div className="absolute right-0 top-full z-50 mt-1 flex w-72 flex-col gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-card-solid)] p-3 shadow-lg">
          <GlobalSearch />
          {email && (
            <div className="flex items-center justify-between gap-2">
              <span className="topbar-email truncate" title={email}>{email}</span>
              {role && <span className="badge-neutral topbar-role flex-shrink-0">{ROLE_LABELS[role]}</span>}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="topbar-region">ca-central-1</span>
            <button onClick={handleLogout} className="topbar-logout">Sign out</button>
          </div>
        </div>
      </details>
    </div>
  )
}
