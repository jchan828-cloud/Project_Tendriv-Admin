'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Building2, SearchX } from 'lucide-react'
import { ORG_TYPE_LABEL } from '@/lib/crm/labels'
import { AccountForm } from '@/components/crm/account-form'

type Account = {
  id: string
  name: string
  organisation_type: string
  province: string | null
  naics_codes: string[]
  annual_procurement_value_cad: number | null
  updated_at: string
  contact_count: number
  last_activity_at: string | null
}

function formatCAD(amount: number | null): string {
  if (amount == null) return '—'
  return `$${amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toISOString().slice(0, 10)
}

function NaicsCell({ codes }: { readonly codes: string[] }) {
  if (codes.length === 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const [first, ...rest] = codes
  return (
    <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12 }}>
      {first}
      {rest.length > 0 && (
        <span className="badge-neutral" style={{ marginLeft: 6, fontSize: 10 }}>
          +{rest.length}
        </span>
      )}
    </span>
  )
}

const ALL_ORG_TYPES = Object.keys(ORG_TYPE_LABEL)
const PAGE_SIZE = 20

interface AccountsViewProps {
  readonly accounts: Account[]
}

export function AccountsView({ accounts }: AccountsViewProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [provinceFilter, setProvinceFilter] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)

  const provinces = useMemo(
    () => [...new Set(accounts.map((a) => a.province).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)),
    [accounts]
  )

  const filtered = useMemo(() => {
    let result = accounts
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((a) => a.name.toLowerCase().includes(q))
    }
    if (typeFilter.length > 0) {
      result = result.filter((a) => typeFilter.includes(a.organisation_type))
    }
    if (provinceFilter.length > 0) {
      result = result.filter((a) => a.province && provinceFilter.includes(a.province))
    }
    return result
  }, [accounts, search, typeFilter, provinceFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const hasFilters = search || typeFilter.length > 0 || provinceFilter.length > 0

  function clearFilters() {
    setSearch('')
    setTypeFilter([])
    setProvinceFilter([])
    setPage(1)
  }

  function toggleType(t: string) {
    setTypeFilter((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )
    setPage(1)
  }

  function toggleProvince(p: string) {
    setProvinceFilter((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
    setPage(1)
  }

  return (
    <>
    <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="text-heading-xl" style={{ marginBottom: 4 }}>Accounts</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Target organizations and their contacts.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>New account</button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input-base"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          style={{ maxWidth: 260, minWidth: 180 }}
        />

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {ALL_ORG_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={typeFilter.includes(t) ? 'btn-secondary btn-sm' : 'btn-ghost btn-sm'}
              style={typeFilter.includes(t) ? { background: 'var(--jade-pale)', borderColor: 'var(--jade-20)' } : {}}
            >
              {ORG_TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        {provinces.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {provinces.map((p) => (
              <button
                key={p}
                onClick={() => toggleProvince(p)}
                className={provinceFilter.includes(p) ? 'btn-secondary btn-sm' : 'btn-ghost btn-sm'}
                style={provinceFilter.includes(p) ? { background: 'var(--jade-pale)', borderColor: 'var(--jade-20)', fontFamily: 'var(--mono-font)' } : { fontFamily: 'var(--mono-font)' }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {hasFilters && (
          <button className="btn-ghost btn-sm" onClick={clearFilters} style={{ color: 'var(--text-muted)' }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Empty states */}
      {accounts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <Building2 size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 8 }}>
            No accounts yet.
          </h2>
          <p style={{ fontSize: 13, marginBottom: 24 }}>
            Add your first target organization to start tracking opportunities and contacts.
          </p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>New account</button>
        </div>
      )}
      {accounts.length > 0 && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <SearchX size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 8 }}>
            No accounts match these filters.
          </h2>
          <p style={{ fontSize: 13, marginBottom: 24 }}>Try clearing one of the active filters.</p>
          <button className="btn-ghost" onClick={clearFilters}>Clear filters</button>
        </div>
      )}
      {accounts.length > 0 && filtered.length > 0 && (
        <>
          {/* Table */}
          <div style={{ overflowX: 'auto', border: '0.5px solid var(--border)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-sidebar)', borderBottom: '0.5px solid var(--border)' }}>
                  {['Name', 'Type', 'Province', 'NAICS', 'Contacts', 'Annual procurement', 'Last activity'].map((h) => (
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
                {paged.map((account) => (
                  <tr
                    key={account.id}
                    style={{ borderBottom: '0.5px solid var(--border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
                  >
                    <td style={{ padding: '10px 14px', maxWidth: 280 }}>
                      <Link
                        href={`/crm/accounts/${account.id}`}
                        style={{ color: 'var(--text-heading)', fontWeight: 500, textDecoration: 'none' }}
                        title={account.name}
                      >
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {account.name}
                        </span>
                      </Link>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="badge-neutral" style={{ fontSize: 11 }}>
                        {ORG_TYPE_LABEL[account.organisation_type] ?? account.organisation_type}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12, color: 'var(--text-muted)' }}>
                        {account.province ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <NaicsCell codes={account.naics_codes} />
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12 }}>
                        {account.contact_count}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                        {formatCAD(account.annual_procurement_value_cad)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12, color: 'var(--text-muted)' }}>
                        {formatDate(account.last_activity_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <span style={{ fontFamily: 'var(--mono-font)', fontSize: 11, color: 'var(--text-muted)' }}>
              Page {page} of {totalPages} · {filtered.length} accounts
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
              <button className="btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
    {showForm && <AccountForm onClose={() => setShowForm(false)} />}
    </>
  )
}
