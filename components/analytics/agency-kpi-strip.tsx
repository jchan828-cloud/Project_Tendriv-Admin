interface AgencyKpiStripProps {
  totalNotices: number
  totalAgencies: number
  totalTenders: number
  totalAwards: number
  psibPct: number
}

export function AgencyKpiStrip({ totalNotices, totalAgencies, totalTenders, totalAwards, psibPct }: AgencyKpiStripProps) {
  const kpis = [
    { label: 'Total Notices', value: totalNotices.toLocaleString() },
    { label: 'Unique Agencies', value: totalAgencies.toString() },
    { label: 'Open Tenders', value: totalTenders.toLocaleString() },
    { label: 'Awards', value: totalAwards.toLocaleString() },
    { label: 'PSIB Set-Aside', value: `${psibPct}%` },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {kpis.map((k) => (
        <div key={k.label} className="card p-4">
          <p className="text-label-sm text-[var(--text-muted)] mb-1">{k.label}</p>
          <p className="text-heading-md">{k.value}</p>
        </div>
      ))}
    </div>
  )
}
