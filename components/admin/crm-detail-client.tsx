'use client'

import { useState, useTransition } from 'react'

type Contact = {
  id: string
  business_name: string
  contact_website: string | null
  contact_email: string | null
  province: string | null
  pipeline: string
  status: string
  unspsc_categories: string[]
  casl_consent_method: string | null
  ibd_registered: boolean
}

type Activity = {
  id: string
  event_type: string
  occurred_at: string
}

type MatchNotice = {
  id: string
  title: string
  agency_canonical: string
  closing_date: string
  notice_type: string
}

type Match = {
  match_score: number
  created_at: string
  scout_notices: MatchNotice[]
}

const STATUS_BADGE: Record<string, string> = {
  prospect: 'badge badge-neutral',
  contacted: 'badge badge-warning',
  replied: 'badge badge-info',
  demo: 'badge badge-purple',
  converted: 'badge badge-jade',
}

const PIPELINE_BADGE: Record<string, string> = {
  psib: 'badge badge-purple',
  geo: 'badge badge-info',
  manual: 'badge badge-neutral',
}

const EVENT_ICON_BG: Record<string, string> = {
  sent: 'bg-[var(--ink-05)]',
  opened: 'bg-[var(--jade-10)]',
  clicked: 'bg-[var(--jade-10)]',
  replied: 'bg-[var(--blue-bg)]',
  bounced: 'bg-[var(--sovereign-pale)]',
}

const STATUSES = ['prospect', 'contacted', 'replied', 'demo', 'converted'] as const

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

export function CrmDetailClient({
  contact,
  activities,
  matches,
}: {
  contact: Contact
  activities: Activity[]
  matches: Match[]
}) {
  const [status, setStatus] = useState(contact.status)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleStatusUpdate(newStatus: string) {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/admin/crm/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        setError('Update failed — try again')
        setTimeout(() => setError(null), 5000)
        return
      }
      setStatus(newStatus)
    })
  }

  const emailsSent = activities.filter(a => a.event_type === 'sent').length
  const lastOpen = activities.find(a => a.event_type === 'opened')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-heading-md">{contact.business_name}</h1>
            {contact.contact_website && (
              <p className="text-mono-xs text-[var(--jade-dim)] mt-0.5">{contact.contact_website}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => handleStatusUpdate(s)}
                disabled={isPending || s === status}
                className={`px-2 py-0.5 rounded text-xs font-medium capitalize transition-colors ${
                  s === status
                    ? 'bg-[var(--jade)] text-white'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'
                } ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
                aria-label={`Set status to ${s}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={PIPELINE_BADGE[contact.pipeline] ?? 'badge badge-neutral'}>
            {contact.pipeline}
          </span>
          <span className="badge badge-neutral">{contact.province ?? '—'}</span>
          <span className={STATUS_BADGE[status] ?? 'badge'}>{status}</span>
          {matches.length > 0 && (
            <span className="badge badge-jade">{matches.length} matches</span>
          )}
        </div>
        {error && <p className="mt-2 text-body-sm text-[var(--sovereign)]">{error}</p>}
      </div>

      {/* Body: timeline + stats sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Activity timeline */}
          <div>
            <h2 className="section-label">Activity</h2>
            <div className="mt-3 space-y-3">
              {activities.length === 0 && (
                <p className="text-body-sm text-[var(--text-muted)]">No activity recorded yet.</p>
              )}
              {activities.map(a => (
                <div key={a.id} className="flex items-center gap-3">
                  <div
                    className={`h-7 w-7 flex-shrink-0 rounded-lg flex items-center justify-center ${
                      EVENT_ICON_BG[a.event_type] ?? 'bg-[var(--ink-05)]'
                    }`}
                  >
                    <span className="text-[10px] font-medium capitalize">
                      {a.event_type.slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium capitalize">{a.event_type}</p>
                  </div>
                  <span className="text-mono-xs text-[var(--text-muted)] flex-shrink-0">
                    {timeAgo(a.occurred_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Matched tenders */}
          <div>
            <h2 className="section-label">Matched tenders</h2>
            <div className="mt-3 space-y-2">
              {matches.length === 0 && (
                <p className="text-body-sm text-[var(--text-muted)]">No matched tenders yet.</p>
              )}
              {matches.map((m, i) => {
                const notice = m.scout_notices[0]
                if (!notice) return null
                const days = daysUntil(notice.closing_date)
                return (
                  <div key={i} className="card p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-body-sm font-medium">{notice.title}</p>
                      <p className="text-mono-xs text-[var(--text-muted)] truncate">
                        {notice.agency_canonical}
                      </p>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-mono-xs text-[var(--jade-dim)] font-medium">
                        {Math.round(m.match_score * 100)}%
                      </span>
                      <span
                        className={`text-mono-xs ${
                          days < 0
                            ? 'text-[var(--text-muted)]'
                            : days <= 14
                              ? 'text-amber-500'
                              : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {days < 0 ? 'Closed' : `${days}d left`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Stats sidebar */}
        <div className="w-[192px] flex-shrink-0 border-l border-border bg-[var(--ink-05)] p-3 overflow-y-auto">
          <h3 className="section-label">Stats</h3>
          <dl className="mt-3 space-y-3 text-xs">
            <div>
              <dt className="text-[var(--text-muted)]">Matching tenders</dt>
              <dd className="text-data-md text-[var(--jade-dim)]">{matches.length}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">CASL consent</dt>
              <dd className="text-green-600">
                {contact.casl_consent_method === 'express'
                  ? 'express'
                  : contact.ibd_registered
                    ? 'implied · IBD'
                    : contact.casl_consent_method ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Emails sent</dt>
              <dd>{emailsSent}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Last open</dt>
              <dd className="text-mono-xs">
                {lastOpen ? timeAgo(lastOpen.occurred_at) : '—'}
              </dd>
            </div>
            {contact.unspsc_categories.length > 0 && (
              <div>
                <dt className="text-[var(--text-muted)] mb-1">UNSPSC codes</dt>
                <dd className="flex flex-wrap gap-1">
                  {contact.unspsc_categories.map(code => (
                    <span
                      key={code}
                      className="inline-block rounded border border-[var(--ink-10)] bg-white px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-[var(--jade-dim)]"
                    >
                      {code}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}
