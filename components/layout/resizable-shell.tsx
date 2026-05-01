'use client'

import { useState, useEffect } from 'react'
import { Group, Panel, Separator, useDefaultLayout, usePanelCallbackRef, type PanelSize } from 'react-resizable-panels'
import { Sidebar } from '@/components/layout/sidebar'
import type { ModuleKey, UserRole } from '@/lib/auth/roles'

const groupStyle = { height: '100%' }

/** Sidebar is in icon-rail mode when its percentage width is at or below this threshold. */
const ICON_RAIL_THRESHOLD = 6

interface ResizableShellProps {
  readonly modules?: ModuleKey[]
  readonly role?: UserRole
  readonly children: React.ReactNode
}

export function ResizableShell({ modules, role, children }: ResizableShellProps) {
  const [sidebarRef, setSidebarRef] = usePanelCallbackRef()
  const [collapsed, setCollapsed] = useState(false)
  const [iconRail, setIconRail] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({ id: 'tendriv-shell-v2' })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) {
        setIconRail(true)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  function handleToggle() {
    if (collapsed) {
      sidebarRef?.expand()
    } else {
      sidebarRef?.collapse()
    }
  }

  function handleSidebarResize(panelSize: PanelSize) {
    const pct = panelSize.asPercentage
    setCollapsed(pct === 0)
    setIconRail(pct > 0 && pct <= ICON_RAIL_THRESHOLD)
  }

  return (
    <div className="shell-resizable" style={{ visibility: mounted ? 'visible' : 'hidden' }}>
      <Group
        orientation="horizontal"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
        style={groupStyle}
      >
        <Panel
          id="sidebar"
          panelRef={setSidebarRef}
          defaultSize="15%"
          minSize="4%"
          maxSize="28%"
          collapsible
          collapsedSize="0%"
          onResize={handleSidebarResize}
        >
          <Sidebar modules={modules} role={role} iconRail={iconRail} />
        </Panel>

        <Separator className="shell-resize-handle">
          <div className="shell-resize-dots">
            <span />
            <span />
            <span />
          </div>
        </Separator>

        <Panel>
          <div className="shell-main-wrapper">
            <button
              className="shell-toggle"
              onClick={handleToggle}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              type="button"
            >
              {collapsed ? '›' : '‹'}
            </button>
            <main className="shell-main">{children}</main>
          </div>
        </Panel>
      </Group>
    </div>
  )
}
