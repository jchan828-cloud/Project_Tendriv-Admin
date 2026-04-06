'use client'

import { useState } from 'react'

interface FeedbackResponse {
  id: string; body: string; is_public: boolean; created_at: string
}

interface FeedbackItem {
  id: string; source: string; page_url: string | null;
  submitter_name: string | null; submitter_email: string | null;
  category: string; sentiment: string | null; rating: number | null;
  title: string | null; body: string; status: string; priority: string;
  internal_notes: string | null; created_at: string; responses: FeedbackResponse[]
}

interface Props {
  items: FeedbackItem[]
  totalCount: number
  statusCounts: Record<string, number>
  sentimentCounts: Record<string, number>
  categoryCounts: Record<string, number>
}

const STATUS_BADGES: Record<string, string> = {
  new: 'badge-jade', reviewed: 'badge-purple', 'in-progress': 'badge-warning',
  resolved: 'badge-success', 'wont-fix': 'badge-neutral', duplicate: 'badge-neutral',
}
const PRIORITY_BADGES: Record<string, string> = {
  low: 'badge-neutral', medium: 'badge-warning', high: 'badge-sovereign', critical: 'badge-sovereign',
}
const SENTIMENT_BADGES: Record<string, string> = {
  positive: 'badge-success', neutral: 'badge-warning', negative: 'badge-sovereign',
}
const STATUSES = ['new', 'reviewed', 'in-progress', 'resolved', 'wont-fix', 'duplicate']
const PRIORITIES = ['low', 'medium', 'high', 'critical']

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ color: 'var(--amber)', letterSpacing: 2 }}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

export function FeedbackDashboard({ items: initial, totalCount, statusCounts, sentimentCounts, categoryCounts }: Props) {
  const [items, setItems] = useState(initial)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  const filtered = items.filter((i) => filter === 'all' || i.status === filter || i.category === filter || i.sentiment === filter)
  const selectedItem = items.find((i) => i.id === selected)

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, status } : i))
    }
  }

  async function updatePriority(id: string, priority: string) {
    const res = await fetch(`/api/feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority }),
    })
    if (res.ok) {
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, priority } : i))
    }
  }

  async function submitReply(id: string) {
    if (!replyText.trim()) return
    const res = await fetch(`/api/feedback/${id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: replyText.trim(), is_public: false }),
    })
    if (res.ok) {
      const resp = await res.json()
      setItems((prev) => prev.map((i) =>
        i.id === id ? { ...i, status: i.status === 'new' ? 'reviewed' : i.status, responses: [...i.responses, { id: resp.id, body: replyText.trim(), is_public: false, created_at: new Date().toISOString() }] } : i
      ))
      setReplyText('')
    }
  }

  const newCount = statusCounts['new'] ?? 0

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: '10px 16px' }}>
          <div className="card-kicker">Total</div>
          <div className="text-data-md" style={{ color: 'var(--text-heading)' }}>{totalCount}</div>
        </div>
        <div className="card" style={{ padding: '10px 16px' }}>
          <div className="card-kicker">New / Unread</div>
          <div className="text-data-md" style={{ color: newCount > 0 ? 'var(--jade)' : 'var(--text-heading)' }}>{newCount}</div>
        </div>
        <div className="card" style={{ padding: '10px 16px' }}>
          <div className="card-kicker">Positive</div>
          <div className="text-data-md" style={{ color: 'var(--green)' }}>{sentimentCounts['positive'] ?? 0}</div>
        </div>
        <div className="card" style={{ padding: '10px 16px' }}>
          <div className="card-kicker">Negative</div>
          <div className="text-data-md" style={{ color: 'var(--sovereign)' }}>{sentimentCounts['negative'] ?? 0}</div>
        </div>
        <div className="card" style={{ padding: '10px 16px' }}>
          <div className="card-kicker">Top Category</div>
          <div className="text-data-sm" style={{ color: 'var(--text-heading)', textTransform: 'capitalize' }}>
            {Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/-/g, ' ') ?? '—'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', 'new', 'reviewed', 'in-progress', 'resolved', 'bug', 'feature-request', 'positive', 'negative'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={filter === f ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}>
            {f === 'all' ? 'All' : f.replace(/-/g, ' ')}
          </button>
        ))}
      </div>

      {/* Split view: list + detail */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20 }}>
        {/* List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }} className="text-body-sm">
                No feedback yet. Embed the feedback widget on your site to start collecting.
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => { setSelected(item.id); setReplyText('') }}
                  style={{
                    padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)',
                    cursor: 'pointer', transition: 'background var(--duration-fast) ease',
                    background: selected === item.id ? 'var(--surface-active)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className={`badge ${STATUS_BADGES[item.status] ?? 'badge-neutral'}`}>{item.status}</span>
                      <span className={`badge ${PRIORITY_BADGES[item.priority] ?? 'badge-neutral'}`}>{item.priority}</span>
                      {item.sentiment && <span className={`badge ${SENTIMENT_BADGES[item.sentiment]}`}>{item.sentiment}</span>}
                    </div>
                    <span className="text-mono-xs" style={{ color: 'var(--text-label)' }}>{timeAgo(item.created_at)}</span>
                  </div>
                  <div className="text-body-sm" style={{ fontWeight: 500, color: 'var(--text-heading)', marginBottom: 2 }}>
                    {item.title ?? item.body.slice(0, 80)}
                  </div>
                  <div className="text-mono-xs" style={{ color: 'var(--text-muted)' }}>
                    {item.submitter_name ?? item.submitter_email ?? 'Anonymous'} &middot; {item.category.replace(/-/g, ' ')} &middot; {item.source}
                    {item.responses.length > 0 && <span> &middot; {item.responses.length} replies</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selected && selectedItem && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="text-heading-sm" style={{ marginBottom: 4 }}>
                    {selectedItem.title ?? 'Feedback'}
                  </div>
                  <div className="text-mono-xs" style={{ color: 'var(--text-muted)' }}>
                    {selectedItem.submitter_name && <span>{selectedItem.submitter_name} &middot; </span>}
                    {selectedItem.submitter_email && <span>{selectedItem.submitter_email} &middot; </span>}
                    {new Date(selectedItem.created_at).toLocaleString()}
                  </div>
                </div>
                <button className="btn-ghost btn-sm" onClick={() => setSelected(null)}>Close</button>
              </div>
              {selectedItem.rating && (
                <div style={{ marginTop: 6 }}><Stars rating={selectedItem.rating} /></div>
              )}
            </div>

            <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
              {/* Feedback body */}
              <div className="text-body-sm" style={{ color: 'var(--text-heading)', lineHeight: 1.7, marginBottom: 16, whiteSpace: 'pre-wrap' }}>
                {selectedItem.body}
              </div>

              {selectedItem.page_url && (
                <div className="text-mono-xs" style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
                  Submitted from: {selectedItem.page_url}
                </div>
              )}

              {/* Controls */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <select className="input-base" style={{ width: 140 }} value={selectedItem.status} onChange={(e) => updateStatus(selectedItem.id, e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="input-base" style={{ width: 120 }} value={selectedItem.priority} onChange={(e) => updatePriority(selectedItem.id, e.target.value)}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Responses */}
              {selectedItem.responses.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="section-label" style={{ marginBottom: 12 }}>Responses</div>
                  {selectedItem.responses.map((resp) => (
                    <div key={resp.id} style={{ padding: '10px 12px', background: 'var(--surface-sidebar)', borderRadius: 'var(--radius)', marginBottom: 8 }}>
                      <div className="text-body-sm" style={{ whiteSpace: 'pre-wrap' }}>{resp.body}</div>
                      <div className="text-mono-xs" style={{ color: 'var(--text-label)', marginTop: 4 }}>
                        {timeAgo(resp.created_at)} {resp.is_public && <span className="badge badge-jade" style={{ marginLeft: 6 }}>public</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply form */}
              <div className="section-label" style={{ marginBottom: 8 }}>Add Response</div>
              <textarea
                className="input-base"
                rows={3}
                placeholder="Write an internal note or reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                style={{ resize: 'vertical', marginBottom: 8 }}
              />
              <button className="btn-primary btn-sm" onClick={() => submitReply(selectedItem.id)}>
                Send Reply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
