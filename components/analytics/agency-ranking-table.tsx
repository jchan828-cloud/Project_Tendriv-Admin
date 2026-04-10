'use client'

import { useState } from 'react'

interface Agency {
  name: string; tenders: number; awards: number; total: number;
  psibCount: number; psibPct: number; acanCount: number; smbCount: number;
  avgAwardValue: number | null; segmentCount: number; provinces: string[]
}

type SortKey = 'total' | 'tenders' | 'awards' | 'psibPct' | 'avgAwardValue'

export function AgencyRankingTable({ agencies }: { agencies: Agency[] }) {
  const [sortBy, setSortBy] = useState<SortKey>('total')
  const [expanded, setExpanded] = useState<string | null>(null)

  const sorted = [...agencies].sort((a, b) => {
    const av = a[sortBy] ?? 0
    const bv = b[sortBy] ?? 0
    return (bv as number) - (av as number)
  })

  const headers: { key: SortKey; label: string }[] = [
    { key: 'total', label: 'Total RFX' },
    { key: 'tenders', label: 'Tenders' },
    { key: 'awards', label: 'Awards' },
    { key: 'psibPct', label: 'PSIB %' },
    { key: 'avgAwardValue', label: 'Avg Award' },
  ]

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-[var(--border-subtle)]">
            <th className="text-left px-4 py-3 text-label-sm text-[var(--text-muted)]">#</th>
            <th className="text-left px-4 py-3 text-label-sm text-[var(--text-muted)]">Agency</th>
            {headers.map((h) => (
              <th key={h.key}
                className="text-right px-4 py-3 text-label-sm text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-heading)] select-none"
                onClick={() => setSortBy(h.key)}>
                {h.label}{sortBy === h.key && ' \u25be'}
              </th>
            ))}
            <th className="text-right px-4 py-3 text-label-sm text-[var(--text-muted)]">Campaign</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((agency, i) => {
            const isOpen = expanded === agency.name
            const priority = agency.total >= 100 ? 'high' : agency.total >= 30 ? 'medium' : 'low'
            return (
              <tr key={agency.name}
                className={`border-b border-[var(--border-subtle)] cursor-pointer transition-colors ${isOpen ? 'bg-[var(--surface-selected)]' : 'hover:bg-[var(--surface-hover)]'}`}
                onClick={() => setExpanded(isOpen ? null : agency.name)}>
                <td className="px-4 py-3 tabular-nums text-[var(--text-muted)]">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-[var(--text-heading)]">
                  <div>{agency.name}</div>
                  {isOpen && (
                    <div className="mt-2 grid grid-cols-3 gap-3 text-body-xs text-[var(--text-muted)] font-normal">
                      <div><span className="block text-label-xs">PSIB Set-Asides</span><span className="text-[var(--text-heading)]">{agency.psibCount}</span></div>
                      <div><span className="block text-label-xs">ACAN Notices</span><span className="text-[var(--text-heading)]">{agency.acanCount}</span></div>
                      <div><span className="block text-label-xs">UNSPSC Segments</span><span className="text-[var(--text-heading)]">{agency.segmentCount}</span></div>
                      <div><span className="block text-label-xs">SMB Stream</span><span className="text-[var(--text-heading)]">{agency.smbCount}</span></div>
                      <div className="col-span-2"><span className="block text-label-xs">Provinces</span><span className="text-[var(--text-heading)]">{agency.provinces.length > 0 ? agency.provinces.join(', ') : '\u2014'}</span></div>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-[var(--text-heading)] font-medium">{agency.total.toLocaleString()}</td>
                <td className="px-4 py-3 text-right tabular-nums">{agency.tenders}</td>
                <td className="px-4 py-3 text-right tabular-nums">{agency.awards.toLocaleString()}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {agency.psibPct > 0 ? <span className={agency.psibPct >= 20 ? 'text-[var(--accent-jade)]' : ''}>{agency.psibPct}%</span> : <span className="text-[var(--text-muted)]">\u2014</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {agency.avgAwardValue != null && agency.avgAwardValue > 0 ? `$${(agency.avgAwardValue / 1_000_000).toFixed(1)}M` : <span className="text-[var(--text-muted)]">\u2014</span>}
                </td>
                <td className="px-4 py-3 text-right"><PriorityBadge priority={priority} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const styles = { high: 'badge-jade', medium: 'badge-warning', low: 'badge-neutral' }
  const labels = { high: 'High Priority', medium: 'Medium', low: 'Low' }
  return <span className={`badge ${styles[priority]}`}>{labels[priority]}</span>
}
