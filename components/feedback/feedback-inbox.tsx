'use client'

import { useState, useMemo } from 'react'
import { MessageSquare, SearchX, Flame, AlertTriangle, Circle, MinusCircle, Smile, Meh, Frown } from 'lucide-react'

type FeedbackItem = {
  id: string
  source: string
  category: string
  sentiment: string | null
  rating: number | null
  priority: string
  status: string
  body: string
  title: string | null
  submitter_email: string | null
  submitter_name: string | null
  created_at: string
}

type Counts = {
  open: number
  critical: number
  fromCustomers: number
  avgRating: string | null
}

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

function PriorityIcon({ priority }: { priority: string }) {
  if (priority === 'critical') return <Flame size={14} style={{ color: 'var(--status-danger)', flexShrink: 0 }} />
  if (priority === 'high') return <AlertTriangle size={14} style={{ color: 'var(--status-warning)', flexShrink: 0 }} />
  if (priority === 'medium') return <Circle size={13} style={{ color: 'var(--text-heading)', flexShrink: 0 }} />
  return <MinusCircle size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
}

function SentimentIcon({ sentiment }: { sentiment: string | null }) {
  if (sentiment === 'positive') return <Smile size={13} style={{ color: 'var(--status-success)' }} />
  if (sentiment === 'neutral') return <Meh size={13} style={{ color: 'var(--text-muted)' }} />
  if (sentiment === 'negative') return <Frown size={13} style={{ color: 'var(--status-danger)' }} />
  return null
}

const STATUS_BADGE: Record<string, string> = {
  new: 'badge-jade',
  reviewed: 'badge-info',
  'in-progress': 'badge-warning',
  resolved: 'badge-success',
  'wont-fix': 'badge-neutral',
  duplicate: 'badge-neutral',
}
const STATUS_LABEL: Record<string, string> = {
  new: 'New', reviewed: 'Reviewed', 'in-progress': 'In progress',
  resolved: 'Resolved', 'wont-fix': "Won't fix", duplicate: 'Duplicate',
}
const SOURCE_LABEL: Record<string, string> = {
  widget: 'Widget', email: 'Email', 'in-app': 'In-app',
  support: 'Support', survey: 'Survey', manual: 'Manual',
}
const CATEGORY_LABEL: Record<string, string> = {
  bug: 'Bug', 'feature-request': 'Feature request', ux: 'UX',
  performance: 'Performance', content: 'Content', billing: 'Billing',
  general: 'General', praise: 'Praise',
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const DEFAULT_STATUSES = ['new', 'reviewed', 'in-progress']

interface FeedbackInboxProps {
  items: FeedbackItem[]
  counts: Counts
}

export function FeedbackInbox({ items, counts }: FeedbackInboxProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>(DEFAULT_STATUSES)
  const [sourceFilter, setSourceFilter] = useState<string[]>([])
  const [priorityFilter, setPriorityFilter] = useState<string[]>([])
  const [selected, setSelected] = useState<FeedbackItem | null>(null)

  const filtered = useMemo(() => {
    let result = items
    if (statusFilter.length > 0) result = result.filter((f) => statusFilter.includes(f.status))
    if (sourceFilter.length > 0) result = result.filter((f) => sourceFilter.includes(f.source))
    if (priorityFilter.length > 0) result = result.filter((f) => priorityFilter.includes(f.priority))
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((f) =>
        f.body.toLowerCase().includes(q) ||
        f.submitter_email?.toLowerCase().includes(q) ||
        f.title?.toLowerCase().includes(q)
      )
    }
    return [...result].sort((a, b) =>
      (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [items, statusFilter, sourceFilter, priorityFilter, search])

  const hasFilters = search || sourceFilter.length > 0 || priorityFilter.length > 0 ||
    statusFilter.join(',') !== DEFAULT_STATUSES.join(',')

  function clearFilters() {
    setSearch('')
    setStatusFilter(DEFAULT_STATUSES)
    setSourceFilter([])
    setPriorityFilter([])
  }

  function toggle<T extends string>(arr: T[], val: T, set: (v: T[]) => void) {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="text-heading-xl" style={{ marginBottom: 4 }}>Feedback</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Inbound signals from customers and prospects.</p>
        </div>
        <button className="btn-ghost">Export CSV</button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input-base"
          placeholder="Search by content…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 240, minWidth: 180 }}
        />
        {/* Status */}
        {['new', 'reviewed', 'in-progress', 'resolved', 'wont-fix', 'duplicate'].map((s) => (
          <button
            key={s}
            onClick={() => toggle(statusFilter, s, setStatusFilter)}
            className={statusFilter.includes(s) ? 'btn-secondary btn-sm' : 'btn-ghost btn-sm'}
            style={statusFilter.includes(s) ? { background: 'var(--jade-pale)', borderColor: 'var(--jade-20)' } : {}}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
        {/* Priority */}
        {['critical', 'high', 'medium', 'low'].map((p) => (
          <button
            key={p}
            onClick={() => toggle(priorityFilter, p, setPriorityFilter)}
            className={priorityFilter.includes(p) ? 'btn-secondary btn-sm' : 'btn-ghost btn-sm'}
            style={priorityFilter.includes(p) ? { background: 'var(--jade-pale)', borderColor: 'var(--jade-20)' } : {}}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
        {hasFilters && (
          <button className="btn-ghost btn-sm" onClick={clearFilters} style={{ color: 'var(--text-muted)' }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Counts strip */}
      <div style={{ fontFamily: 'var(--mono-font)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        {counts.open} open
        {counts.critical > 0 && ` · ${counts.critical} critical`}
        {counts.fromCustomers > 0 && ` · ${counts.fromCustomers} from customers`}
        {counts.avgRating && ` · ${counts.avgRating}★ avg this week`}
      </div>

      {/* Empty states */}
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <MessageSquare size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 8 }}>No feedback yet.</h2>
          <p style={{ fontSize: 13 }}>
            Once the in-app widget is wired and customers start sending signals, they&apos;ll appear here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <SearchX size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 8 }}>
            No feedback matches these filters.
          </h2>
          <button className="btn-ghost" onClick={clearFilters} style={{ marginTop: 8 }}>Clear filters</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 400px' : '1fr', gap: 20 }}>
          {/* Table */}
          <div style={{ overflowX: 'auto', border: '0.5px solid var(--border)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--surface-sidebar)', borderBottom: '0.5px solid var(--border)' }}>
                  {['', 'Excerpt', 'Source', 'Category', 'Sentiment', 'Rating', 'Reporter', 'Created', 'Status'].map((h, i) => (
                    <th key={i} style={{
                      padding: '8px 12px', textAlign: 'left', fontWeight: 500,
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
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelected(selected?.id === item.id ? null : item)}
                    style={{
                      borderBottom: '0.5px solid var(--border)',
                      cursor: 'pointer',
                      background: selected?.id === item.id ? 'var(--surface-hover)' : undefined,
                      opacity: item.status === 'duplicate' ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => { if (selected?.id !== item.id) e.currentTarget.style.background = 'var(--surface-hover)' }}
                    onMouseLeave={(e) => { if (selected?.id !== item.id) e.currentTarget.style.background = '' }}
                  >
                    <td style={{ padding: '10px 12px', width: 20 }}>
                      <PriorityIcon priority={item.priority} />
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: 280 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-body)' }}
                        title={item.body}>
                        &ldquo;{item.body.slice(0, 80)}{item.body.length > 80 ? '…' : ''}&rdquo;
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="badge-neutral" style={{ fontSize: 10 }}>
                        {SOURCE_LABEL[item.source] ?? item.source}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="badge-neutral" style={{ fontSize: 10 }}>
                        {CATEGORY_LABEL[item.category] ?? item.category}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <SentimentIcon sentiment={item.sentiment} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontFamily: 'var(--mono-font)', color: 'var(--text-muted)' }}>
                        {item.rating != null ? `${item.rating}★` : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: 160 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--mono-font)', fontSize: 11, color: 'var(--text-muted)' }}>
                        {item.submitter_email ?? 'Anonymous'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontFamily: 'var(--mono-font)', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatRelative(item.created_at)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        className={STATUS_BADGE[item.status] ?? 'badge-neutral'}
                        style={{ fontSize: 10, textDecoration: item.status === 'duplicate' ? 'line-through' : undefined }}
                      >
                        {STATUS_LABEL[item.status] ?? item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail drawer */}
          {selected && (
            <div className="card" style={{ padding: '20px', height: 'fit-content', position: 'sticky', top: 100 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <PriorityIcon priority={selected.priority} />
                  <span className="badge-neutral" style={{ fontSize: 11 }}>{CATEGORY_LABEL[selected.category] ?? selected.category}</span>
                  <span className={STATUS_BADGE[selected.status] ?? 'badge-neutral'} style={{ fontSize: 11 }}>{STATUS_LABEL[selected.status] ?? selected.status}</span>
                </div>
                <button className="btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
              </div>

              <p style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.6, marginBottom: 16 }}>
                {selected.body}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, fontSize: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--text-label)', fontFamily: 'var(--mono-font)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', width: 72, flexShrink: 0 }}>Source</span>
                  <span className="badge-neutral" style={{ fontSize: 10 }}>{SOURCE_LABEL[selected.source] ?? selected.source}</span>
                </div>
                {selected.sentiment && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-label)', fontFamily: 'var(--mono-font)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', width: 72, flexShrink: 0 }}>Sentiment</span>
                    <SentimentIcon sentiment={selected.sentiment} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{selected.sentiment}</span>
                  </div>
                )}
                {selected.rating != null && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--text-label)', fontFamily: 'var(--mono-font)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', width: 72, flexShrink: 0 }}>Rating</span>
                    <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12 }}>{selected.rating}★</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--text-label)', fontFamily: 'var(--mono-font)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', width: 72, flexShrink: 0 }}>Reporter</span>
                  <span style={{ fontFamily: 'var(--mono-font)', fontSize: 11, color: 'var(--text-muted)' }}>
                    {selected.submitter_email ?? 'Anonymous'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--text-label)', fontFamily: 'var(--mono-font)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', width: 72, flexShrink: 0 }}>Created</span>
                  <span style={{ fontFamily: 'var(--mono-font)', fontSize: 11, color: 'var(--text-muted)' }}>
                    {formatRelative(selected.created_at)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary btn-sm">Reply</button>
                <button className="btn-ghost btn-sm">Change status…</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
