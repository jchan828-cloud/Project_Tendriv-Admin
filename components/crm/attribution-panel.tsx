'use client'

/** MK8-CRM-002: Content attribution panel — displays touch history for a contact */

import { useState, useEffect } from 'react'

interface Attribution {
  id: string
  post_id: string
  touch_type: string
  touched_at: string
  post_title: string | null
}

interface AttributionPanelProps {
  contactId: string
}

const touchLabel: Record<string, string> = {
  first: 'First Touch',
  last: 'Last Touch',
  assist: 'Assist',
}

const touchBadge: Record<string, string> = {
  first: 'badge badge-jade',
  last: 'badge badge-blue',
  assist: 'badge badge-neutral',
}

export function AttributionPanel({ contactId }: AttributionPanelProps) {
  const [attributions, setAttributions] = useState<Attribution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/marketing/attribution?contact_id=${encodeURIComponent(contactId)}`)
        if (res.ok) {
          const data = await res.json()
          setAttributions(data)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [contactId])

  if (loading) return <div className="text-[var(--text-muted)] text-sm">Loading attributions…</div>
  if (attributions.length === 0) return <div className="text-[var(--text-muted)] text-sm">No content attributions yet.</div>

  return (
    <div className="space-y-2">
      <h3 className="text-label-sm">Content Attribution</h3>
      <div className="divide-y divide-[var(--border)]">
        {attributions.map((a) => (
          <div key={a.id} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className={touchBadge[a.touch_type] ?? 'badge badge-neutral'}>
                {touchLabel[a.touch_type] ?? a.touch_type}
              </span>
              <span className="text-sm truncate max-w-[200px]">{a.post_title ?? a.post_id}</span>
            </div>
            <span className="text-mono-xs text-[var(--text-muted)]">
              {new Date(a.touched_at).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
