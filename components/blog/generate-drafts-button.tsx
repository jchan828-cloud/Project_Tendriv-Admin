'use client'

/** Manual trigger for the blog draft generation pipeline.
 *  Calls POST /api/admin/generate-drafts which proxies to
 *  the marketing site's blog-writer cron endpoint.
 */

import { useState } from 'react'

export function GenerateDraftsButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [message, setMessage] = useState('')

  async function handleClick() {
    if (status === 'loading') return
    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/admin/generate-drafts', { method: 'POST' })
      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        const drafted = data?.data?.drafted ?? []
        setStatus('ok')
        setMessage(
          drafted.length > 0
            ? `Generated ${drafted.length} draft(s): ${drafted.join(', ')}`
            : 'No new drafts generated — all topics may already have drafts.',
        )
      } else {
        setStatus('err')
        setMessage(data.error ?? `Error ${res.status}`)
      }
    } catch {
      setStatus('err')
      setMessage('Failed to reach the server.')
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleClick}
        disabled={status === 'loading'}
        className="btn-primary btn-sm"
      >
        {status === 'loading' ? 'Generating...' : 'Generate drafts now'}
      </button>
      {message && (
        <span className={`text-body-sm ${status === 'err' ? 'text-[var(--status-danger)]' : 'text-[var(--status-success)]'}`}>
          {message}
        </span>
      )}
    </div>
  )
}
