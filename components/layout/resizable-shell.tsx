'use client'

import { useState, useEffect } from 'react'
import { Group, Panel, Separator, useDefaultLayout, usePanelCallbackRef, type PanelSize } from 'react-resizable-panels'

const groupStyle = { height: '100%' }

interface ResizableShellProps {
  readonly sidebar: React.ReactNode
  readonly children: React.ReactNode
}

export function ResizableShell({ sidebar, children }: ResizableShellProps) {
  const [sidebarRef, setSidebarRef] = usePanelCallbackRef()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({ id: 'tendriv-shell-v2' })

  useEffect(() => {
    setMounted(true)
  }, [])

  function handleToggle() {
    if (collapsed) {
      sidebarRef?.expand()
    } else {
      sidebarRef?.collapse()
    }
  }

  function handleSidebarResize(panelSize: PanelSize) {
    setCollapsed(panelSize.asPercentage === 0)
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
          minSize="11%"
          maxSize="28%"
          collapsible
          collapsedSize="0%"
          onResize={handleSidebarResize}
        >
          {sidebar}
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
