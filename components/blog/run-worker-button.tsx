'use client'

import { useState } from 'react'

export function RunWorkerButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [message, setMessage] = useState('')

  async function handleClick() {
    if (status === 'loading') return
    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/blog/worker', { method: 'POST' })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setStatus('err')
        setMessage(data.error ?? `Error ${res.status}`)
        return
      }

      setStatus('ok')
      if (data.success) {
        setMessage(`Drafted "${data.post?.slug ?? 'post'}" (${data.post?.word_count ?? '?'} words)`)
      } else {
        setMessage(data.message ?? 'No queued posts to process.')
      }
    } catch {
      setStatus('err')
      setMessage('Failed to reach the server.')
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={status === 'loading'}
        className="btn-secondary btn-sm"
      >
        {status === 'loading' ? 'Drafting...' : 'Run worker'}
      </button>
      {message && (
        <span className={`text-body-sm ${status === 'err' ? 'text-[var(--status-danger)]' : 'text-[var(--text-muted)]'}`}>
          {message}
        </span>
      )}
    </div>
  )
}
