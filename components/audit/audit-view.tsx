'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ScrollText } from 'lucide-react'

type AuditEntry = {
  id: string
  event_type: string
  actor_id: string | null
  actor_type: string
  resource_type: string
  resource_id: string
  metadata: Record<string, unknown> | null
  ip_hash: string | null
  occurred_at: string
}

const ACTOR_BADGE: Record<string, string> = {
  user: 'badge-neutral',
  cron: 'badge-info',
  system: 'badge-warning',
  'api-key': 'badge-purple',
}

const ACTOR_LABEL: Record<string, string> = {
  user: 'USER',
  cron: 'CRON',
  system: 'SYSTEM',
  'api-key': 'API-KEY',
}

const RANGE_OPTIONS = [
  { value: '1h', label: '1 hour' },
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
]

const ACTOR_TYPES = ['user', 'cron', 'system', 'api-key']

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
}

interface AuditViewProps {
  entries: AuditEntry[]
  count: number
  page: number
  totalPages: number
  range: string
  actorFilter: string
  resourceFilter: string
}

export function AuditView({
  entries, count, page, totalPages, range, actorFilter, resourceFilter,
}: AuditViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function navigate(overrides: Record<string, string | undefined>) {
    const params: Record<string, string> = {}
    if (range !== '24h') params.range = range
    if (actorFilter) params.actor_type = actorFilter
    if (resourceFilter) params.resource_type = resourceFilter
    if (page > 1) params.page = String(page)
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === '') delete params[k]
      else params[k] = v
    }
    const qs = new URLSearchParams(params).toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const hasFilters = actorFilter || resourceFilter || range !== '24h'

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="text-heading-xl" style={{ marginBottom: 4 }}>Audit log</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Immutable record of every administrative action.
          </p>
        </div>
        <button className="btn-ghost">Export CSV</button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', position: 'sticky', top: 49, background: 'var(--surface-root)', zIndex: 10, paddingBottom: 12, paddingTop: 4 }}>
        {/* Time range */}
        <div style={{ display: 'flex', border: '0.5px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => navigate({ range: opt.value === '24h' ? undefined : opt.value, page: undefined })}
              style={{
                padding: '5px 12px', fontSize: 11, border: 'none', cursor: 'pointer',
                background: range === opt.value ? 'var(--jade)' : 'transparent',
                color: range === opt.value ? '#fff' : 'var(--text-muted)',
                fontFamily: 'var(--mono-font)',
                transition: 'background var(--duration-fast) ease',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Actor type chips */}
        <div style={{ display: 'flex', gap: 4 }}>
          {ACTOR_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => navigate({ actor_type: actorFilter === t ? undefined : t, page: undefined })}
              className={actorFilter === t ? 'btn-secondary btn-sm' : 'btn-ghost btn-sm'}
              style={{
                fontFamily: 'var(--mono-font)', fontSize: 10,
                ...(actorFilter === t ? { background: 'var(--jade-pale)', borderColor: 'var(--jade-20)' } : {}),
              }}
            >
              {ACTOR_LABEL[t]}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button
            className="btn-ghost btn-sm"
            onClick={() => navigate({ range: undefined, actor_type: undefined, resource_type: undefined, page: undefined })}
            style={{ color: 'var(--text-muted)' }}
          >
            Reset to last 24h
          </button>
        )}
      </div>

      {/* Empty state */}
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <ScrollText size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 8 }}>
            No events match these filters.
          </h2>
          <p style={{ fontSize: 13, marginBottom: 20 }}>Try widening the time range or clearing actor filters.</p>
          <button
            className="btn-ghost"
            onClick={() => navigate({ range: undefined, actor_type: undefined, resource_type: undefined, page: undefined })}
          >
            Reset to last 24h
          </button>
        </div>
      ) : (
        <>
          {/* Table */}
          <div style={{ overflowX: 'auto', border: '0.5px solid var(--border)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--surface-sidebar)', borderBottom: '0.5px solid var(--border)' }}>
                  {['Time', 'Actor type', 'Event', 'Resource', 'ID', 'IP'].map((h) => (
                    <th key={h} style={{
                      padding: '8px 14px', textAlign: 'left', fontWeight: 500,
                      color: 'var(--text-label)', whiteSpace: 'nowrap',
                      fontFamily: 'var(--mono-font)', fontSize: 10, letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <>
                    <tr
                      key={entry.id}
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      style={{
                        borderBottom: expandedId === entry.id ? 'none' : '0.5px solid var(--border)',
                        cursor: entry.metadata ? 'pointer' : 'default',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
                    >
                      <td style={{ padding: '9px 14px', fontFamily: 'var(--mono-font)', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                        {formatTimestamp(entry.occurred_at)}
                      </td>
                      <td style={{ padding: '9px 14px' }}>
                        <span className={ACTOR_BADGE[entry.actor_type] ?? 'badge-neutral'} style={{ fontSize: 10, fontFamily: 'var(--mono-font)' }}>
                          {ACTOR_LABEL[entry.actor_type] ?? entry.actor_type}
                        </span>
                      </td>
                      <td style={{ padding: '9px 14px', color: 'var(--text-body)' }}>
                        {entry.event_type}
                      </td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{ fontFamily: 'var(--mono-font)', color: 'var(--text-muted)' }}>
                          {entry.resource_type}
                        </span>
                      </td>
                      <td style={{ padding: '9px 14px', maxWidth: 140 }}>
                        <span
                          style={{ fontFamily: 'var(--mono-font)', fontSize: 11, color: 'var(--text-muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={entry.resource_id}
                        >
                          {entry.resource_id.slice(0, 8)}…
                        </span>
                      </td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{ fontFamily: 'var(--mono-font)', fontSize: 11, color: 'var(--text-muted)' }}
                          title={entry.ip_hash ?? undefined}>
                          {entry.ip_hash ? entry.ip_hash.slice(0, 8) + '…' : '—'}
                        </span>
                      </td>
                    </tr>
                    {expandedId === entry.id && entry.metadata && (
                      <tr key={`${entry.id}-meta`} style={{ borderBottom: '0.5px solid var(--border)' }}>
                        <td colSpan={6} style={{ padding: '0 14px 12px 14px', background: 'var(--surface-sidebar)' }}>
                          <pre style={{
                            fontFamily: 'var(--mono-font)', fontSize: 11,
                            color: 'var(--text-muted)', whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all', margin: 0, padding: '10px 14px',
                            background: 'var(--surface-root)', borderRadius: 6,
                            border: '0.5px solid var(--border)',
                          }}>
                            {JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <span style={{ fontFamily: 'var(--mono-font)', fontSize: 11, color: 'var(--text-muted)' }}>
              Page {page} of {totalPages} · {count.toLocaleString()} events
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className="btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => navigate({ page: String(page - 1) })}
              >
                Prev
              </button>
              <button
                className="btn-ghost btn-sm"
                disabled={page >= totalPages}
                onClick={() => navigate({ page: String(page + 1) })}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
