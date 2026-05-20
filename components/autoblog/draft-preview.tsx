'use client'

import ReactMarkdown from 'react-markdown'
import type { AutoblogRun } from '@/lib/types/autoblog'

interface DraftPreviewProps {
  draft: AutoblogRun
  editedMarkdown: string | null
  onPublish: () => void
  onEdit: () => void
  onReject: () => void
}

export function DraftPreview({
  draft,
  editedMarkdown,
  onPublish,
  onEdit,
  onReject,
}: DraftPreviewProps) {
  const markdown = editedMarkdown ?? draft.draft_markdown ?? ''
  const seo = draft.seo_metadata

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Action bar */}
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
        <button onClick={onPublish} className="btn-primary btn-sm">
          Publish
        </button>
        <button onClick={onEdit} className="btn-secondary btn-sm">
          Edit
        </button>
        <button
          onClick={onReject}
          className="btn-sm"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--sovereign)',
            cursor: 'pointer',
            fontFamily: 'var(--body-font)',
            fontSize: 12,
            fontWeight: 500,
            padding: '6px 8px',
          }}
        >
          Reject
        </button>

        <span style={{ flex: 1 }} />

        {/* Meta badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {seo?.primaryKeyword && (
            <span className="badge badge-jade" title="Primary keyword">
              {seo.primaryKeyword}
            </span>
          )}
          {seo?.schemaType && (
            <span className="badge badge-info">
              {seo.schemaType}
            </span>
          )}
          {draft.quality_score != null && (
            <span
              className={`badge ${draft.quality_score >= 4 ? 'badge-success' : draft.quality_score >= 2.5 ? 'badge-warning' : 'badge-sovereign'}`}
            >
              {draft.quality_score.toFixed(1)}/5
            </span>
          )}
          {draft.closing_date && (
            <span className="badge badge-neutral" title="Closing date">
              Closes {new Date(draft.closing_date).toLocaleDateString('en-CA')}
            </span>
          )}
        </div>
      </div>

      {/* Markdown body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px',
        }}
      >
        {markdown ? (
          <div
            style={{
              maxWidth: 720,
              color: 'var(--text-body)',
              lineHeight: 1.7,
            }}
            className="prose-autoblog"
          >
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
            No draft content available.
          </p>
        )}
      </div>
    </div>
  )
}
