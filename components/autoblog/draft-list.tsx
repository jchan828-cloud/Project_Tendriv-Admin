'use client'

import type { AutoblogRun } from '@/lib/types/autoblog'

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface DraftListProps {
  drafts: AutoblogRun[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function DraftList({ drafts, selectedId, onSelect }: DraftListProps) {
  if (drafts.length === 0) {
    return (
      <div
        style={{
          width: 320,
          flexShrink: 0,
          padding: '32px 16px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          borderRight: '1px solid var(--border)',
        }}
      >
        <p className="text-body-sm">No drafts pending review.</p>
      </div>
    )
  }

  return (
    <div
      style={{
        width: 320,
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {drafts.map((draft) => {
        const isSelected = draft.id === selectedId
        return (
          <button
            key={draft.id}
            onClick={() => onSelect(draft.id)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '14px 16px',
              background: isSelected ? 'var(--surface-active)' : 'transparent',
              borderLeft: isSelected
                ? '3px solid var(--jade)'
                : '3px solid transparent',
              borderBottom: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              transition: 'background var(--duration-fast) ease',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-hover)'
            }}
            onMouseLeave={(e) => {
              if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = ''
            }}
          >
            {/* Headline */}
            <p
              className="text-label-sm"
              style={{
                color: 'var(--text-heading)',
                marginBottom: 6,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {draft.headline ?? draft.tender_id ?? draft.run_id}
            </p>

            {/* Meta row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {draft.content_type && (
                <span className="badge badge-neutral">
                  {draft.content_type}
                </span>
              )}
              {draft.word_count != null && (
                <span
                  style={{
                    fontFamily: 'var(--mono-font)',
                    fontSize: 10,
                    color: 'var(--text-muted)',
                  }}
                >
                  {draft.word_count.toLocaleString()} w
                </span>
              )}
              {draft.quality_score != null && (
                <span
                  style={{
                    fontFamily: 'var(--mono-font)',
                    fontSize: 10,
                    color: 'var(--status-success)',
                  }}
                >
                  {draft.quality_score.toFixed(1)}/5
                </span>
              )}
              <span
                style={{
                  fontFamily: 'var(--mono-font)',
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  marginLeft: 'auto',
                }}
              >
                {relativeTime(draft.created_at)}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
