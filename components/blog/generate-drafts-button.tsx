'use client'

/** Manual trigger for the blog draft generation pipeline.
 *  Calls POST /api/blog/enqueue which:
 *    1. Inserts blog_posts rows with status='queued' for active topics
 *       that don't already have an in-flight post
 *    2. Fires off the worker so the user sees a draft sooner
 *
 *  The button returns immediately — actual generation happens in the
 *  background. Refresh /posts to see drafts move from queued → generating
 *  → review.
 */

import { useState } from 'react'

interface EnqueueResponse {
  enqueued: number
  posts?: { id: string; slug: string; title: string }[]
  message?: string
  error?: string
}

export function GenerateDraftsButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [message, setMessage] = useState('')

  async function handleClick() {
    if (status === 'loading') return
    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/blog/enqueue', { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as EnqueueResponse

      if (!res.ok) {
        setStatus('err')
        setMessage(data.error ?? `Error ${res.status}`)
        return
      }

      setStatus('ok')
      if (data.enqueued > 0 && data.posts) {
        const titles = data.posts.map((p) => p.title).join(', ')
        setMessage(`Queued ${data.enqueued} draft(s): ${titles}. Check /posts in a minute.`)
      } else {
        setMessage(data.message ?? 'No new drafts queued — all topics already have in-flight posts.')
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
        {status === 'loading' ? 'Queueing...' : 'Generate drafts now'}
      </button>
      {message && (
        <span className={`text-body-sm ${status === 'err' ? 'text-[var(--status-danger)]' : 'text-[var(--status-success)]'}`}>
          {message}
        </span>
      )}
    </div>
  )
}
