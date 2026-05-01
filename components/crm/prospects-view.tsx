'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Users, SearchX, CheckCircle2, Clock, XCircle, MinusCircle } from 'lucide-react'
import { STATUS_LABEL, STATUS_BADGE, SOURCE_LABEL, deriveCaslState } from '@/lib/crm/labels'
import { ContactForm } from '@/components/crm/contact-form'

type Prospect = {
  id: string
  business_name: string
  contact_email: string | null
  pipeline: string
  status: string
  last_activity_at: string | null
  casl_consent_date: string | null
  score: number | null
}

function CaslCell({ status, caslDate }: { status: string; caslDate: string | null }) {
  const state = deriveCaslState(status, caslDate)
  if (state === 'granted')
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--status-success)', fontSize: 12, fontFamily: 'var(--mono-font)' }}>
        <CheckCircle2 size={13} /> Granted
      </span>
    )
  if (state === 'withdrawn')
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--status-danger)', fontSize: 12, fontFamily: 'var(--mono-font)' }}>
        <XCircle size={13} /> Withdrawn
      </span>
    )
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--status-warning)', fontSize: 12, fontFamily: 'var(--mono-font)' }}>
      <Clock size={13} /> Pending
    </span>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toISOString().slice(0, 10)
}

const ALL_STATUSES = Object.keys(STATUS_LABEL)
const ALL_SOURCES = Object.keys(SOURCE_LABEL)
const PAGE_SIZE = 20

interface ProspectsViewProps {
  prospects: Prospect[]
}

export function ProspectsView({ prospects }: ProspectsViewProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [sourceFilter, setSourceFilter] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)

  const filtered = useMemo(() => {
    let result = prospects
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.business_name.toLowerCase().includes(q) ||
          p.contact_email?.toLowerCase().includes(q)
      )
    }
    if (statusFilter.length > 0) {
      result = result.filter((p) => statusFilter.includes(p.status))
    }
    if (sourceFilter.length > 0) {
      result = result.filter((p) => sourceFilter.includes(p.pipeline))
    }
    return result
  }, [prospects, search, statusFilter, sourceFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasFilters = search || statusFilter.length > 0 || sourceFilter.length > 0

  function clearFilters() {
    setSearch('')
    setStatusFilter([])
    setSourceFilter([])
    setPage(1)
  }

  function toggleStatus(s: string) {
    setStatusFilter((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
    setPage(1)
  }

  function toggleSource(s: string) {
    setSourceFilter((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
    setPage(1)
  }

  return (
    <>
    <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="text-heading-xl" style={{ marginBottom: 4 }}>Prospects</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Outreach pipeline across PSIB, geographic, and manual sources.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>Add prospect</button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input-base"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          style={{ maxWidth: 280, minWidth: 200 }}
        />

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={statusFilter.includes(s) ? 'btn-secondary btn-sm' : 'btn-ghost btn-sm'}
              style={statusFilter.includes(s) ? { background: 'var(--jade-pale)', borderColor: 'var(--jade-20)' } : {}}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {ALL_SOURCES.map((s) => (
            <button
              key={s}
              onClick={() => toggleSource(s)}
              className={sourceFilter.includes(s) ? 'btn-secondary btn-sm' : 'btn-ghost btn-sm'}
              style={sourceFilter.includes(s) ? { background: 'var(--jade-pale)', borderColor: 'var(--jade-20)' } : {}}
            >
              {SOURCE_LABEL[s]}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button className="btn-ghost btn-sm" onClick={clearFilters} style={{ color: 'var(--text-muted)' }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Empty states */}
      {prospects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 8 }}>
            No prospects yet.
          </h2>
          <p style={{ fontSize: 13, marginBottom: 24 }}>
            Import contacts from PSIB, run a geographic search, or add prospects manually.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => setShowForm(true)}>Add prospect</button>
            <button className="btn-ghost">Run PSIB import</button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <SearchX size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 8 }}>
            No prospects match these filters.
          </h2>
          <button className="btn-ghost" onClick={clearFilters} style={{ marginTop: 8 }}>Clear filters</button>
        </div>
      ) : (
        <>
          {/* Table */}
          <div style={{ overflowX: 'auto', border: '0.5px solid var(--border)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-sidebar)', borderBottom: '0.5px solid var(--border)' }}>
                  {['Prospect', 'Status', 'Source', 'Score', 'CASL', 'Last touch'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '8px 14px', textAlign: 'left', fontWeight: 500,
                        color: 'var(--text-label)', whiteSpace: 'nowrap',
                        fontFamily: 'var(--mono-font)', fontSize: 10, letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((prospect) => {
                  const withdrawn = deriveCaslState(prospect.status, prospect.casl_consent_date) === 'withdrawn'
                  const emailTruncated = prospect.contact_email && prospect.contact_email.length > 32
                    ? prospect.contact_email.slice(0, 32) + '…'
                    : prospect.contact_email

                  return (
                    <tr
                      key={prospect.id}
                      style={{ borderBottom: '0.5px solid var(--border)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
                    >
                      {/* Prospect name + email */}
                      <td style={{ padding: '10px 14px', maxWidth: 260 }}>
                        <Link
                          href={`/crm/${prospect.id}`}
                          style={{ textDecoration: 'none', display: 'block' }}
                        >
                          <span
                            style={{
                              display: 'block', fontWeight: 500, color: 'var(--text-heading)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}
                            title={prospect.business_name}
                          >
                            {prospect.business_name}
                          </span>
                          {prospect.contact_email && (
                            <span
                              style={{
                                display: 'block', fontSize: 11, color: 'var(--text-muted)',
                                fontFamily: 'var(--mono-font)',
                                textDecoration: withdrawn ? 'line-through' : 'none',
                              }}
                              title={prospect.contact_email}
                            >
                              {emailTruncated}
                            </span>
                          )}
                        </Link>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          className={STATUS_BADGE[prospect.status] ?? 'badge-neutral'}
                          style={{
                            fontSize: 11,
                            textDecoration: prospect.status === 'unsubscribed' ? 'line-through' : 'none',
                          }}
                        >
                          {STATUS_LABEL[prospect.status] ?? prospect.status}
                        </span>
                      </td>

                      {/* Source */}
                      <td style={{ padding: '10px 14px' }}>
                        <span className="badge-neutral" style={{ fontSize: 11 }}>
                          {SOURCE_LABEL[prospect.pipeline] ?? prospect.pipeline}
                        </span>
                      </td>

                      {/* Score */}
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12 }}>
                          {prospect.score ?? '—'}
                        </span>
                      </td>

                      {/* CASL */}
                      <td style={{ padding: '10px 14px' }}>
                        <CaslCell status={prospect.status} caslDate={prospect.casl_consent_date} />
                      </td>

                      {/* Last touch */}
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12, color: 'var(--text-muted)' }}>
                          {formatDate(prospect.last_activity_at)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <span style={{ fontFamily: 'var(--mono-font)', fontSize: 11, color: 'var(--text-muted)' }}>
              Page {page} of {totalPages} · {filtered.length} prospects
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
              <button className="btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
    {showForm && <ContactForm onClose={() => setShowForm(false)} />}
    </>
  )
}
