'use client'

interface KpiCardsProps {
  totalContacts: number
  activeLeads: number
  totalPosts: number
  publishedPosts: number
  gateSubmissions: number
  utmClicks: number
}

interface KpiCardProps {
  label: string
  value: number
  subtitle?: string
  color: string
}

function KpiCard({ label, value, subtitle, color }: KpiCardProps) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div className="card-kicker">{label}</div>
      <div className="text-data-lg" style={{ color }}>{value.toLocaleString()}</div>
      {subtitle && <div className="text-body-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</div>}
    </div>
  )
}

export function KpiCards(props: KpiCardsProps) {
  const draftPosts = props.totalPosts - props.publishedPosts

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
      <KpiCard label="Total Contacts" value={props.totalContacts} subtitle={`${props.activeLeads} active`} color="var(--jade)" />
      <KpiCard label="Published Posts" value={props.publishedPosts} subtitle={`${draftPosts} drafts`} color="var(--blue)" />
      <KpiCard label="Gate Submissions" value={props.gateSubmissions} color="var(--purple)" />
      <KpiCard label="UTM Clicks" value={props.utmClicks} color="var(--amber)" />
    </div>
  )
}
