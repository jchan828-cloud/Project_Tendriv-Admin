'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Radar,
  Loader2,
  Building2,
  Users,
  Cpu,
  AlertTriangle,
  X,
} from 'lucide-react'
import type { IntelCompany, IntelPipelineRun } from '@/lib/types/intel'

type RunRow = Partial<IntelPipelineRun>
type CompanyRow = Partial<IntelCompany>

type CompanyDetail = {
  company: IntelCompany
  contacts: {
    id: string
    full_name: string
    title: string | null
    linkedin_url: string | null
    confidence: number | null
  }[]
  technographics: {
    id: string
    tool_name: string
    category: string | null
    evidence_url: string | null
  }[]
}

const TH: React.CSSProperties = {
  padding: '8px 14px',
  textAlign: 'left',
  fontWeight: 500,
  color: 'var(--text-label)',
  whiteSpace: 'nowrap',
  fontFamily: 'var(--mono-font)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
}
const TD: React.CSSProperties = { padding: '8px 14px', borderBottom: '0.5px solid var(--border)' }

function fmtMoney(v: number | null | undefined): string {
  if (v == null) return '—'
  return `CA$${Math.round(v).toLocaleString()}`
}
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toISOString().slice(0, 16).replace('T', ' ')
}

interface Props {
  runs: RunRow[]
  companies: CompanyRow[]
}

export function IntelligenceView({ runs, companies }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('Software companies in Alberta')
  const [limit, setLimit] = useState(10)
  const [running, setRunning] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [detail, setDetail] = useState<CompanyDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  async function runPipeline() {
    setRunning(true)
    setNotice(null)
    try {
      const res = await fetch('/api/intel/pipeline', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query, limit }),
      })
      const json = await res.json()
      if (!res.ok) {
        setNotice({ kind: 'err', text: json.error ?? `Request failed (${res.status})` })
      } else {
        setNotice({
          kind: 'ok',
          text: `Done — ${json.companies} companies, ${json.contacts} contacts, ${json.technographics} tools (≈${fmtMoney(json.costEstimateCad)}).`,
        })
        router.refresh()
      }
    } catch (err) {
      setNotice({ kind: 'err', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setRunning(false)
    }
  }

  async function openCompany(id: string) {
    setDetailLoading(true)
    setDetail(null)
    try {
      const res = await fetch(`/api/intel/companies/${id}`)
      if (res.ok) setDetail(await res.json())
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Radar size={22} style={{ color: 'var(--jade-40, #2f8f6b)' }} />
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-heading)' }}>
          B2B Intelligence
        </h1>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        Sweep a geography + industry, enrich firmographics, and extract contacts &amp; tech stack.
      </p>

      {/* Run form */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: 16,
          border: '0.5px solid var(--border)',
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <input
          className="input-base"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Software companies in Alberta"
          style={{ flex: 1, minWidth: 280 }}
          disabled={running}
        />
        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          limit&nbsp;
          <input
            className="input-base"
            type="number"
            min={1}
            max={60}
            value={limit}
            onChange={(e) => setLimit(Math.min(60, Math.max(1, Number(e.target.value) || 1)))}
            style={{ width: 64 }}
            disabled={running}
          />
        </label>
        <button className="btn-primary" onClick={runPipeline} disabled={running || query.trim().length < 3}>
          {running ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Loader2 size={14} className="spin" /> Running…
            </span>
          ) : (
            'Run pipeline'
          )}
        </button>
      </div>

      {notice && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 13,
            background: notice.kind === 'ok' ? 'var(--jade-pale, #e8f5ee)' : 'var(--status-danger-bg, #fdeaea)',
            color: notice.kind === 'ok' ? 'var(--status-success, #1a7f4f)' : 'var(--status-danger, #b42318)',
            border: '0.5px solid var(--border)',
          }}
        >
          {notice.text}
        </div>
      )}

      {/* Runs */}
      <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', margin: '8px 0' }}>
        Recent runs
      </h2>
      <div style={{ overflowX: 'auto', border: '0.5px solid var(--border)', borderRadius: 8, marginBottom: 28 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface-sidebar)', borderBottom: '0.5px solid var(--border)' }}>
              {['Query', 'Status', 'Companies', 'Contacts', 'Tools', 'Cost', 'When', 'Error'].map((h) => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr><td style={{ ...TD, color: 'var(--text-muted)' }} colSpan={8}>No runs yet — start one above.</td></tr>
            ) : (
              runs.map((r) => (
                <tr key={r.id}>
                  <td style={TD}>{r.query}</td>
                  <td style={TD}>{r.status}</td>
                  <td style={TD}>{r.companies_stored ?? 0}</td>
                  <td style={TD}>{r.contacts_extracted ?? 0}</td>
                  <td style={TD}>{r.technographics_extracted ?? 0}</td>
                  <td style={TD}>{fmtMoney(r.cost_estimate_cad)}</td>
                  <td style={{ ...TD, whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{fmtDate(r.finished_at ?? r.created_at)}</td>
                  <td style={{ ...TD, color: 'var(--status-danger)', maxWidth: 280 }}>
                    {r.error ? (
                      <span style={{ display: 'inline-flex', gap: 4 }} title={r.error}>
                        <AlertTriangle size={13} /> {r.error.slice(0, 60)}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Companies */}
      <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', margin: '8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Building2 size={15} /> Companies ({companies.length})
      </h2>
      <div style={{ overflowX: 'auto', border: '0.5px solid var(--border)', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface-sidebar)', borderBottom: '0.5px solid var(--border)' }}>
              {['Company', 'Location', 'NAICS', 'Est. revenue', 'Phone', ''].map((h) => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 ? (
              <tr><td style={{ ...TD, color: 'var(--text-muted)' }} colSpan={6}>No companies yet.</td></tr>
            ) : (
              companies.map((c) => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => c.id && openCompany(c.id)}>
                  <td style={TD}>
                    <div style={{ fontWeight: 500, color: 'var(--text-heading)' }}>{c.name}</div>
                    {c.website && (
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 11, color: 'var(--text-muted)' }}
                      >
                        {c.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    )}
                  </td>
                  <td style={TD}>{[c.city, c.province].filter(Boolean).join(', ') || '—'}</td>
                  <td style={TD}>
                    {c.naics_code ? (
                      <span title={c.naics_title ?? undefined}>{c.naics_code}</span>
                    ) : '—'}
                  </td>
                  <td style={TD}>{fmtMoney(c.estimated_revenue_cad)}</td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{c.phone ?? '—'}</td>
                  <td style={{ ...TD, color: 'var(--text-muted)', fontSize: 11 }}>view →</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail drawer */}
      {(detail || detailLoading) && (
        <div
          onClick={() => { setDetail(null); setDetailLoading(false) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
            display: 'flex', justifyContent: 'flex-end', zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 460, maxWidth: '90vw', height: '100%', background: 'var(--surface, #fff)',
              borderLeft: '0.5px solid var(--border)', padding: 24, overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-heading)' }}>
                {detailLoading ? 'Loading…' : detail?.company.name}
              </h3>
              <button className="btn-ghost btn-sm" onClick={() => { setDetail(null); setDetailLoading(false) }}>
                <X size={16} />
              </button>
            </div>

            {detail && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.7 }}>
                  {detail.company.formatted_address && <div>{detail.company.formatted_address}</div>}
                  {detail.company.phone && <div>{detail.company.phone}</div>}
                  <div>
                    {detail.company.naics_code
                      ? `NAICS ${detail.company.naics_code} · ${detail.company.naics_title ?? ''}`
                      : 'NAICS —'}
                  </div>
                  <div>Est. revenue {fmtMoney(detail.company.estimated_revenue_cad)} · ~{detail.company.employee_estimate ?? '—'} employees</div>
                </div>

                <h4 style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, margin: '12px 0 8px' }}>
                  <Users size={14} /> Contacts ({detail.contacts.length})
                </h4>
                {detail.contacts.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No contacts extracted.</p>
                ) : (
                  detail.contacts.map((p) => (
                    <div key={p.id} style={{ fontSize: 13, padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
                      <div style={{ fontWeight: 500 }}>
                        {p.linkedin_url ? (
                          <a href={p.linkedin_url} target="_blank" rel="noreferrer">{p.full_name}</a>
                        ) : p.full_name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.title ?? '—'}</div>
                    </div>
                  ))
                )}

                <h4 style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, margin: '20px 0 8px' }}>
                  <Cpu size={14} /> Tech stack ({detail.technographics.length})
                </h4>
                {detail.technographics.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No technographics extracted.</p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {detail.technographics.map((t) => (
                      <span
                        key={t.id}
                        title={t.category ?? undefined}
                        style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, background: 'var(--surface-sidebar)', border: '0.5px solid var(--border)' }}
                      >
                        {t.tool_name}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
