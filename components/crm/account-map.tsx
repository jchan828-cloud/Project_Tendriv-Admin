'use client'

/** MK8-CRM-003: ABM account map — filterable account table */

import { useState } from 'react'
import { OrganisationTypeValues } from '@/lib/types/scoring'

interface AbmAccountRow {
  id: string
  name: string
  organisation_type: string
  province: string | null
  naics_codes: string[]
  website: string | null
  annual_procurement_value_cad: number | null
}

interface AccountMapProps {
  accounts: AbmAccountRow[]
}

export function AccountMap({ accounts }: AccountMapProps) {
  const [orgFilter, setOrgFilter] = useState<string>('all')
  const [provinceFilter, setProvinceFilter] = useState<string>('all')

  const provinces = [...new Set(accounts.map((a) => a.province).filter(Boolean))]

  const filtered = accounts.filter((a) => {
    if (orgFilter !== 'all' && a.organisation_type !== orgFilter) return false
    if (provinceFilter !== 'all' && a.province !== provinceFilter) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select
          className="input-base"
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          {OrganisationTypeValues.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          className="input-base"
          value={provinceFilter}
          onChange={(e) => setProvinceFilter(e.target.value)}
        >
          <option value="all">All Provinces</option>
          {provinces.map((p) => (
            <option key={p} value={p ?? ''}>{p}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="section-label py-2">Account</th>
              <th className="section-label py-2">Type</th>
              <th className="section-label py-2">Province</th>
              <th className="section-label py-2 text-right">Est. Procurement</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-[var(--border)]">
                <td className="py-2">
                  <div className="font-medium">{a.name}</div>
                  {a.website && (
                    <div className="text-mono-xs text-[var(--text-muted)] truncate max-w-[200px]">{a.website}</div>
                  )}
                </td>
                <td className="py-2">
                  <span className="badge badge-neutral">{a.organisation_type}</span>
                </td>
                <td className="py-2">{a.province ?? '—'}</td>
                <td className="py-2 text-right text-data-sm">
                  {a.annual_procurement_value_cad != null
                    ? `$${a.annual_procurement_value_cad.toLocaleString()}`
                    : '—'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[var(--text-muted)]">
                  No accounts match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-mono-xs text-[var(--text-muted)]">
        {filtered.length} of {accounts.length} accounts
      </div>
    </div>
  )
}
