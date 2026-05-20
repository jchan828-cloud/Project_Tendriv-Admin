'use client'

import { useEffect, useState } from 'react'
import type { AutoblogRun } from '@/lib/types/autoblog'

function useElapsed(since: string): string {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    function update() {
      const secs = Math.floor((Date.now() - new Date(since).getTime()) / 1000)
      if (secs < 60) {
        setElapsed(`${secs}s`)
      } else {
        setElapsed(`${Math.floor(secs / 60)}m ${secs % 60}s`)
      }
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [since])

  return elapsed
}

interface ActiveRunBannerProps {
  run: AutoblogRun
  onViewLive: () => void
}

export function ActiveRunBanner({ run, onViewLive }: ActiveRunBannerProps) {
  const elapsed = useElapsed(run.created_at)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderRadius: 8,
        backgroundColor: 'var(--status-warning-bg)',
        border: '1px solid var(--amber-bg)',
        marginBottom: 16,
      }}
    >
      {/* Pulsing dot */}
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: 'var(--status-warning)',
          flexShrink: 0,
          animation: 'pulse 2s infinite',
        }}
      />

      <span
        className="text-label-sm"
        style={{ color: 'var(--status-warning)', flexShrink: 0 }}
      >
        Workflow running…
      </span>

      <span
        style={{
          fontFamily: 'var(--mono-font)',
          fontSize: 12,
          color: 'var(--text-muted)',
          flexShrink: 0,
        }}
      >
        {elapsed}
      </span>

      <span style={{ flex: 1 }} />

      <button
        onClick={onViewLive}
        className="btn-secondary btn-sm"
        style={{ flexShrink: 0 }}
      >
        View live
      </button>
    </div>
  )
}
