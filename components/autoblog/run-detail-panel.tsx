'use client'

import { X, ExternalLink, Clock, Zap, DollarSign, FileText, BarChart3, Tag } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { StatusBadge } from './status-badge'
import type { AutoblogRun } from '@/lib/types/autoblog'

interface RunDetailPanelProps {
  run: AutoblogRun
  onClose: () => void
  onViewLive?: () => void
  onGoToReview?: () => void
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function duration(created_at: string, completed_at: string | null): string {
  if (!completed_at) return '—'
  const secs = Math.round(
    (new Date(completed_at).getTime() - new Date(created_at).getTime()) / 1000
  )
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  const rem = secs % 60
  return `${mins}m ${rem}s`
}

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0' }}>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span
        style={{
          fontSize: 12,
          fontFamily: 'var(--mono-font)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--text-label)',
          flexShrink: 0,
          width: 100,
          marginTop: 1,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13, color: 'var(--text-body)', flex: 1, wordBreak: 'break-word' }}>
        {children}
      </span>
    </div>
  )
}

export function RunDetailPanel({ run, onClose, onViewLive, onGoToReview }: RunDetailPanelProps) {
  const seo = run.seo_metadata

  const isRunning = run.status === 'running'
  const isPublished = run.status === 'published' || (run.status === 'completed' && !!run.published_slug)
  const isPendingReview = run.status === 'completed' && !run.published_slug

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 12, 16, 0.5)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 50,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 620,
          height: '100%',
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          animation: 'slideInRight 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--surface-sidebar)',
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              className="text-heading-sm"
              style={{
                margin: 0,
                marginBottom: 6,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {run.headline ?? run.tender_id}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusBadge status={run.status} />
              {isPublished && run.published_slug && (
                <a
                  href={`/blog/${run.published_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    color: 'var(--link)',
                    textDecoration: 'none',
                  }}
                >
                  View post <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost btn-sm"
            style={{ padding: '4px 6px', flexShrink: 0 }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Quick actions */}
          {(isRunning || isPendingReview) && (
            <div style={{ marginBottom: 16 }}>
              {isRunning && onViewLive && (
                <button
                  onClick={onViewLive}
                  className="btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Zap size={13} /> Watch live
                </button>
              )}
              {isPendingReview && onGoToReview && (
                <button
                  onClick={onGoToReview}
                  className="btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <FileText size={13} /> Review &amp; publish
                </button>
              )}
            </div>
          )}

          {/* Metadata section */}
          <div
            style={{
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: 12,
              marginBottom: 16,
            }}
          >
            <MetaRow icon={<Clock size={14} />} label="Started">
              {formatDate(run.created_at)}
            </MetaRow>
            {run.completed_at && (
              <MetaRow icon={<Clock size={14} />} label="Duration">
                {duration(run.created_at, run.completed_at)}
              </MetaRow>
            )}
            <MetaRow icon={<Tag size={14} />} label="Persona">
              {run.target_persona}
            </MetaRow>
            {run.closing_date && (
              <MetaRow icon={<Clock size={14} />} label="Closes">
                {new Date(run.closing_date).toLocaleDateString('en-CA')}
              </MetaRow>
            )}
            {run.quality_score != null && (
              <MetaRow icon={<BarChart3 size={14} />} label="Quality">
                <span
                  style={{
                    fontFamily: 'var(--mono-font)',
                    fontWeight: 600,
                    color:
                      run.quality_score >= 4
                        ? 'var(--status-success)'
                        : run.quality_score >= 2.5
                          ? 'var(--status-warning)'
                          : 'var(--sovereign)',
                  }}
                >
                  {run.quality_score.toFixed(1)}/5
                </span>
              </MetaRow>
            )}
            {run.total_tokens != null && (
              <MetaRow icon={<Zap size={14} />} label="Tokens">
                {run.total_tokens.toLocaleString()}
              </MetaRow>
            )}
            {run.estimated_cost != null && (
              <MetaRow icon={<DollarSign size={14} />} label="Cost">
                ${run.estimated_cost.toFixed(4)}
              </MetaRow>
            )}
            {run.word_count != null && (
              <MetaRow icon={<FileText size={14} />} label="Words">
                {run.word_count.toLocaleString()}
              </MetaRow>
            )}
          </div>

          {/* SEO section */}
          {seo && (
            <div
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: 16,
                marginBottom: 16,
              }}
            >
              <h4
                className="text-label-sm"
                style={{
                  color: 'var(--text-heading)',
                  marginBottom: 10,
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                SEO Metadata
              </h4>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="badge badge-jade">{seo.primaryKeyword}</span>
                  {seo.schemaType && (
                    <span className="badge badge-info">{seo.schemaType}</span>
                  )}
                  {seo.contentSilo && (
                    <span className="badge badge-neutral">{seo.contentSilo}</span>
                  )}
                </div>
                {seo.metaTitle && (
                  <div style={{ color: 'var(--text-body)', marginTop: 4 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Meta title: </span>
                    {seo.metaTitle}
                  </div>
                )}
                {seo.metaDescription && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5 }}>
                    {seo.metaDescription}
                  </div>
                )}
                {seo.secondaryKeywords?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                    {seo.secondaryKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="badge badge-neutral"
                        style={{ fontSize: 11 }}
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Draft content preview */}
          {run.draft_markdown && (
            <div>
              <h4
                className="text-label-sm"
                style={{
                  color: 'var(--text-heading)',
                  marginBottom: 10,
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Content Preview
              </h4>
              <div
                style={{
                  color: 'var(--text-body)',
                  lineHeight: 1.7,
                  maxHeight: 400,
                  overflowY: 'auto',
                  padding: '12px 16px',
                  backgroundColor: 'var(--surface-sidebar)',
                  borderRadius: 6,
                  border: '1px solid var(--border-subtle)',
                }}
                className="prose-autoblog"
              >
                <ReactMarkdown>{run.draft_markdown}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Run IDs for debugging */}
          <div
            style={{
              marginTop: 20,
              padding: '8px 0',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: 11,
              fontFamily: 'var(--mono-font)',
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span>run: {run.run_id}</span>
            <span>tender: {run.tender_id}</span>
            {run.published_slug && <span>slug: {run.published_slug}</span>}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
