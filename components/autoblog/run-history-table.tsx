'use client'

import { ExternalLink } from 'lucide-react'
import { StatusBadge } from './status-badge'
import type { AutoblogRun } from '@/lib/types/autoblog'

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function duration(created_at: string, completed_at: string | null): string {
  if (!completed_at) return '—'
  const secs = Math.round((new Date(completed_at).getTime() - new Date(created_at).getTime()) / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

interface RunHistoryTableProps {
  runs: AutoblogRun[]
  onSelectRun?: (runId: string) => void
}

export function RunHistoryTable({ runs, onSelectRun }: RunHistoryTableProps) {
  if (runs.length === 0) {
    return (
      <div
        className="card"
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}
      >
        <p className="text-body-sm">No runs yet. Trigger your first run above.</p>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr
            style={{
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--surface-sidebar)',
            }}
          >
            {['Tender', 'Status', 'Started', 'Duration', 'Score'].map((col) => (
              <th
                key={col}
                style={{
                  padding: '10px 16px',
                  textAlign: 'left',
                  fontFamily: 'var(--mono-font)',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--text-label)',
                  fontWeight: 500,
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((run, i) => (
            <tr
              key={run.id}
              onClick={() => onSelectRun?.(run.run_id)}
              style={{
                borderBottom: i < runs.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                cursor: onSelectRun ? 'pointer' : 'default',
                transition: 'background-color var(--duration-fast) ease',
              }}
              onMouseEnter={(e) => {
                if (onSelectRun) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-hover)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = ''
              }}
            >
              <td style={{ padding: '12px 16px', color: 'var(--text-heading)', maxWidth: 280 }}>
                <span
                  style={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={run.headline ?? run.tender_id}
                >
                  {run.headline
                    ? run.headline.length > 60
                      ? run.headline.slice(0, 60) + '…'
                      : run.headline
                    : run.tender_id.slice(0, 12) + '…'}
                </span>
              </td>
              <td style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StatusBadge status={run.status} />
                  {run.published_slug && (
                    <span title={`Published: ${run.published_slug}`} style={{ display: 'inline-flex', flexShrink: 0 }}>
                      <ExternalLink size={12} style={{ color: 'var(--text-muted)' }} />
                    </span>
                  )}
                </div>
              </td>
              <td
                style={{
                  padding: '12px 16px',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--mono-font)',
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                }}
              >
                {relativeTime(run.created_at)}
              </td>
              <td
                style={{
                  padding: '12px 16px',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--mono-font)',
                  fontSize: 12,
                }}
              >
                {duration(run.created_at, run.completed_at)}
              </td>
              <td
                style={{
                  padding: '12px 16px',
                  color: run.quality_score != null ? 'var(--text-body)' : 'var(--text-muted)',
                  fontFamily: 'var(--mono-font)',
                  fontSize: 12,
                }}
              >
                {run.quality_score != null ? `${run.quality_score.toFixed(1)}/5` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
