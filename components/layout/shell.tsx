'use client'

import { useState } from 'react'
import { Topbar } from './topbar'
import { MobileTopbar } from './mobile-topbar'
import { MobileDrawer } from './mobile-drawer'
import { ResizableShell } from './resizable-shell'
import { Sidebar } from './sidebar'
import type { ModuleKey, UserRole } from '@/lib/auth/roles'

interface ShellProps {
  readonly email: string | undefined
  readonly role?: UserRole
  readonly modules?: ModuleKey[]
  readonly children: React.ReactNode
}

/** Two layouts share the same flex-column .shell parent via display:contents:
 *  desktop chrome (Topbar + ResizableShell) at md+, mobile chrome at <md.
 *  Children render in both subtrees so the active layout can mount the page;
 *  CSS hides the inactive subtree (no JS viewport detection, no hydration flicker). */
export function Shell({ email, role, modules, children }: ShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* Desktop chrome (md+) */}
      <div className="hidden md:contents">
        <Topbar email={email} role={role} />
        <ResizableShell modules={modules} role={role}>
          {children}
        </ResizableShell>
      </div>

      {/* Mobile chrome (<md) */}
      <div className="contents md:hidden">
        <MobileTopbar email={email} role={role} onMenuClick={() => setDrawerOpen(true)} />
        <main className="shell-main-mobile">{children}</main>
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Sidebar modules={modules} role={role} iconRail={false} />
      </MobileDrawer>
    </>
  )
}
