'use client'

import { useEffect, useRef } from 'react'

interface MobileDrawerProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly children: React.ReactNode
}

/** Off-canvas left drawer for nav at <md. Closes on backdrop tap, Escape,
 *  or when an internal link is clicked (nav handled via event delegation). */
export function MobileDrawer({ open, onClose, children }: MobileDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  function handlePanelClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target.closest('a')) onClose()
  }

  return (
    <div
      className={`md:hidden fixed inset-0 z-50 transition-opacity ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-black/40"
      />
      <div
        ref={panelRef}
        onClick={handlePanelClick}
        className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-[var(--surface-sidebar)] shadow-xl transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  )
}
