'use client'

import { STATUS_CONFIG } from '@/lib/autoblog/constants'
import type { AutoblogRun } from '@/lib/types/autoblog'

export function StatusBadge({ status }: { status: AutoblogRun['status'] }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.failed
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '2px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 500,
        color: config.color,
        backgroundColor: config.bg,
      }}
    >
      {status === 'running' && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: config.color,
            animation: 'pulse 2s infinite',
          }}
        />
      )}
      {config.label}
    </span>
  )
}
