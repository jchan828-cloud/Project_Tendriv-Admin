'use client'

import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import type { ReviewQueueItem } from '@/lib/types/autoblog'
import { callReviewAction } from '@/lib/autoblog/review-client'

// The approval surface: marketing blog_posts in 'review', enriched with the
// engine run (scores, cost) via slug == published_slug. Promote flips the post
// live on tendriv.ca; Reject archives it and recycles the pillar topic.

interface ApprovalsTabProps {
  initialItems: ReviewQueueItem[]
  queueWarning?: string | null
}

export function ApprovalsTab({ initialItems, queueWarning }: ApprovalsTabProps) {
  const [items, setItems] = useState<ReviewQueueItem[]>(initialItems)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    initialItems[0]?.post.slug ?? null
  )
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(queueWarning ?? null)

  const selected = items.find((i) => i.post.slug === selectedSlug) ?? null

  const removeItem = useCallback(
    (slug: string) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.post.slug !== slug)
        setSelectedSlug((cur) => (cur === slug ? next[0]?.post.slug ?? null : cur))
        return next
      })
    },
    []
  )

  const act = useCallback(
    async (action: 'promote' | 'reject') => {
      if (!selected || busy) return
      const slug = selected.post.slug
      setBusy(true)
      setNotice(null)
      const outcome = await callReviewAction(action, slug)
      if (outcome.status === 'conflict') {
        removeItem(slug)
        setNotice('Already actioned by another reviewer — removed from queue.')
      } else if (outcome.status === 'error') {
        setNotice(outcome.message)
      } else {
        removeItem(slug)
        if (outcome.status === 'partial') setNotice(outcome.message)
      }
      setBusy(false)
    },
    [selected, busy, removeItem]
  )

  if (items.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 240,
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p className="text-heading-sm" style={{ marginBottom: 8 }}>
            Nothing awaiting approval
          </p>
          <p className="text-body-sm">
            Drafts in review on the marketing site will appear here for Promote / Reject.
          </p>
          {notice && (
            <p className="text-body-sm" style={{ marginTop: 8, color: 'var(--sovereign)' }}>
              {notice}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="card"
      style={{
        padding: 0,
        display: 'flex',
        height: 'calc(100vh - 220px)',
        minHeight: 400,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {notice && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--sovereign-pale)',
            border: '1px solid var(--sovereign-border)',
            color: 'var(--sovereign)',
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: 13,
            zIndex: 10,
            maxWidth: '80%',
          }}
        >
          {notice}
        </div>
      )}

      {/* Left: queue list */}
      <div
        style={{
          width: 300,
          flexShrink: 0,
          borderRight: '1px solid var(--border)',
          overflowY: 'auto',
        }}
      >
        {items.map((item) => {
          const isSelected = item.post.slug === selectedSlug
          return (
            <button
              key={item.post.slug}
              onClick={() => {
                setSelectedSlug(item.post.slug)
                setNotice(null)
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '14px 16px',
                background: isSelected ? 'var(--surface-sidebar)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                borderLeft: isSelected
                  ? '3px solid var(--tab-active-border)'
                  : '3px solid transparent',
                cursor: 'pointer',
              }}
            >
              <p
                className="text-body-sm"
                style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: 6 }}
              >
                {item.post.title}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {item.post.content_type && (
                  <span className="badge badge-info">{item.post.content_type}</span>
                )}
                {item.run?.quality_score != null && (
                  <span
                    className={`badge ${item.run.quality_score >= 4 ? 'badge-success' : item.run.quality_score >= 2.5 ? 'badge-warning' : 'badge-sovereign'}`}
                  >
                    {Number(item.run.quality_score).toFixed(2)}/5
                  </span>
                )}
                {item.post.created_at && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(item.post.created_at).toLocaleDateString('en-CA')}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Right: preview + actions */}
      {selected ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
              backgroundColor: 'var(--surface-sidebar)',
            }}
          >
            <button
              onClick={() => act('promote')}
              disabled={busy}
              className="btn-primary btn-sm"
            >
              {busy ? 'Working…' : 'Promote'}
            </button>
            <button
              onClick={() => act('reject')}
              disabled={busy}
              className="btn-sm"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--sovereign)',
                cursor: busy ? 'default' : 'pointer',
                fontFamily: 'var(--body-font)',
                fontSize: 12,
                fontWeight: 500,
                padding: '6px 8px',
              }}
            >
              Reject
            </button>

            <span style={{ flex: 1 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {selected.run?.workflow_type && (
                <span className="badge badge-neutral">{selected.run.workflow_type}</span>
              )}
              {selected.run?.quality_score != null && (
                <span
                  className={`badge ${selected.run.quality_score >= 4 ? 'badge-success' : selected.run.quality_score >= 2.5 ? 'badge-warning' : 'badge-sovereign'}`}
                  title="Quality score"
                >
                  {Number(selected.run.quality_score).toFixed(2)}/5
                </span>
              )}
              {selected.run?.estimated_cost != null && (
                <span className="badge badge-neutral" title="Estimated generation cost">
                  ${Number(selected.run.estimated_cost).toFixed(2)}
                </span>
              )}
              {selected.post.word_count != null && (
                <span className="badge badge-neutral">{selected.post.word_count} words</span>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
            {!selected.run && (
              <p
                className="text-body-sm"
                style={{ color: 'var(--text-muted)', marginBottom: 16 }}
              >
                No engine run matched this post — scores and cost unavailable.
              </p>
            )}
            {selected.post.content ? (
              <div
                style={{ maxWidth: 720, color: 'var(--text-body)', lineHeight: 1.7 }}
                className="prose-autoblog"
              >
                <ReactMarkdown>{selected.post.content}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
                No content available.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <p className="text-body-sm">Select a post to review.</p>
        </div>
      )}
    </div>
  )
}
