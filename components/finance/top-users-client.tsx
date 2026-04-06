'use client'

import { useState, useEffect, useCallback } from 'react'

interface CustomerStat {
  id: string; name: string; email: string | null; tier: string; status: string;
  mrr: number; totalRevenue: number; totalUsage: number; totalCost: number;
  serviceBreakdown: Record<string, { quantity: number; cost: number }>;
}

interface AbuseFlagged extends CustomerStat {
  usageMultiple: number; costMultiple: number; tierAvgUsage: number; tierAvgCost: number
}

interface ProfitRow extends CustomerStat {
  profit: number; margin: number
}

interface TopUsersData {
  summary: {
    totalSubscribers: number; activeSubscribers: number; totalRevenue: number;
    totalCost: number; revenueConcentration: number; abuseFlaggedCount: number
  }
  topByRevenue: CustomerStat[]
  topByVolume: CustomerStat[]
  topByCost: CustomerStat[]
  abuseFlagged: AbuseFlagged[]
  profitability: ProfitRow[]
  tierAverages: Record<string, { avgUsage: number; avgCost: number; count: number }>
}

type TabKey = 'revenue' | 'volume' | 'cost' | 'abuse' | 'profitability'

function fmt(value: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(value)
}

function fmtQty(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

const STATUS_BADGES: Record<string, string> = { active: 'badge-success', trial: 'badge-warning', churned: 'badge-sovereign', paused: 'badge-neutral' }

export function TopUsersClient() {
  const [data, setData] = useState<TopUsersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('revenue')
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/top-users?period=current')
      if (res.ok) setData(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: 'revenue', label: 'By Revenue' },
    { key: 'volume', label: 'By Volume' },
    { key: 'cost', label: 'By Cost to Serve' },
    { key: 'profitability', label: 'Profitability' },
    { key: 'abuse', label: 'Abuse Flags', badge: data?.summary.abuseFlaggedCount },
  ]

  if (loading) {
    return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }} className="text-body-sm">Loading top users...</div>
  }
  if (!data) {
    return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }} className="text-body-sm">Failed to load data.</div>
  }

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        <MiniKpi label="Total Subscribers" value={String(data.summary.totalSubscribers)} />
        <MiniKpi label="Active" value={String(data.summary.activeSubscribers)} color="var(--green)" />
        <MiniKpi label="Total Revenue" value={fmt(data.summary.totalRevenue)} color="var(--jade)" />
        <MiniKpi label="Total Cost" value={fmt(data.summary.totalCost)} color="var(--sovereign)" />
        <MiniKpi label="Revenue Concentration" value={`${data.summary.revenueConcentration}%`} color="var(--amber)" subtitle="top 20% of users" />
        <MiniKpi label="Abuse Flags" value={String(data.summary.abuseFlaggedCount)} color={data.summary.abuseFlaggedCount > 0 ? 'var(--sovereign)' : 'var(--green)'} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={tab === t.key ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}>
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className="badge badge-sovereign" style={{ marginLeft: 6 }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'revenue' && <RankTable rows={data.topByRevenue} metric="totalRevenue" metricLabel="Revenue" expanded={expanded} setExpanded={setExpanded} />}
      {tab === 'volume' && <RankTable rows={data.topByVolume} metric="totalUsage" metricLabel="Usage Volume" expanded={expanded} setExpanded={setExpanded} isQuantity />}
      {tab === 'cost' && <RankTable rows={data.topByCost} metric="totalCost" metricLabel="Cost to Serve" expanded={expanded} setExpanded={setExpanded} />}
      {tab === 'profitability' && <ProfitabilityTable rows={data.profitability} />}
      {tab === 'abuse' && <AbuseTable rows={data.abuseFlagged} tierAverages={data.tierAverages} />}
    </div>
  )
}

function MiniKpi({ label, value, color, subtitle }: { label: string; value: string; color?: string; subtitle?: string }) {
  return (
    <div className="card" style={{ padding: '10px 14px' }}>
      <div className="card-kicker">{label}</div>
      <div className="text-data-md" style={{ color: color ?? 'var(--text-heading)' }}>{value}</div>
      {subtitle && <div className="text-mono-xs" style={{ color: 'var(--text-label)' }}>{subtitle}</div>}
    </div>
  )
}

function RankTable({ rows, metric, metricLabel, expanded, setExpanded, isQuantity }: {
  rows: CustomerStat[]; metric: 'totalRevenue' | 'totalUsage' | 'totalCost'; metricLabel: string;
  expanded: string | null; setExpanded: (id: string | null) => void; isQuantity?: boolean
}) {
  const maxValue = rows.length > 0 ? (rows[0]?.[metric] ?? 1) : 1

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface-sidebar)', borderBottom: '1px solid var(--border)' }}>
              <th style={thStyle}>#</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Subscriber</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Tier</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>MRR</th>
              <th style={{ ...thStyle, textAlign: 'right', width: 200 }}>{metricLabel}</th>
              <th style={{ ...thStyle, width: 200 }}>Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No subscriber data. Add subscribers and log revenue/usage to see rankings.</td></tr>
            ) : rows.map((row, i) => (
              <>
                <tr
                  key={row.id}
                  onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                  style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
                >
                  <td style={{ ...tdStyle, fontWeight: 700, color: i < 3 ? 'var(--jade)' : 'var(--text-muted)' }}>{i + 1}</td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500, color: 'var(--text-heading)' }}>{row.name}</div>
                    {row.email && <div className="text-mono-xs" style={{ color: 'var(--text-label)' }}>{row.email}</div>}
                  </td>
                  <td style={tdStyle}><span className="badge badge-jade">{row.tier}</span></td>
                  <td style={tdStyle}><span className={`badge ${STATUS_BADGES[row.status] ?? 'badge-neutral'}`}>{row.status}</span></td>
                  <td style={{ ...tdStyle, textAlign: 'right' }} className="text-mono-sm">{fmt(row.mrr)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }} className="text-data-sm">
                    {isQuantity ? fmtQty(row[metric]) : fmt(row[metric])}
                  </td>
                  <td style={{ ...tdStyle, paddingRight: 16 }}>
                    <div className="progress-bar" style={{ height: 6 }}>
                      <div className="progress-bar-fill" style={{
                        width: `${maxValue > 0 ? (row[metric] / maxValue) * 100 : 0}%`,
                        backgroundColor: i < 3 ? 'var(--jade)' : i < 10 ? 'var(--blue)' : 'var(--ink-20)',
                      }} />
                    </div>
                  </td>
                </tr>
                {expanded === row.id && Object.keys(row.serviceBreakdown).length > 0 && (
                  <tr key={`${row.id}-detail`}>
                    <td colSpan={7} style={{ padding: '12px 20px', background: 'var(--surface-sidebar)' }}>
                      <div className="text-label-sm" style={{ marginBottom: 8 }}>Service Breakdown</div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {Object.entries(row.serviceBreakdown).sort((a, b) => b[1].quantity - a[1].quantity).map(([svc, d]) => (
                          <div key={svc} style={{ padding: '6px 12px', background: 'var(--surface-card-solid)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                            <div className="text-body-xs" style={{ fontWeight: 500, textTransform: 'capitalize' }}>{svc.replace(/-/g, ' ')}</div>
                            <div className="text-data-sm" style={{ color: 'var(--text-heading)' }}>{fmtQty(d.quantity)}</div>
                            {d.cost > 0 && <div className="text-mono-xs" style={{ color: 'var(--text-muted)' }}>{fmt(d.cost)} cost</div>}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProfitabilityTable({ rows }: { rows: ProfitRow[] }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface-sidebar)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ ...thStyle, textAlign: 'left' }}>Subscriber</th>
              <th style={thStyle}>Tier</th>
              <th style={thStyle}>Revenue</th>
              <th style={thStyle}>Cost</th>
              <th style={thStyle}>Profit</th>
              <th style={thStyle}>Margin</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No profitability data yet.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 500, color: 'var(--text-heading)' }}>{row.name}</div>
                  {row.email && <div className="text-mono-xs" style={{ color: 'var(--text-label)' }}>{row.email}</div>}
                </td>
                <td style={tdStyle}><span className="badge badge-jade">{row.tier}</span></td>
                <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--green)' }} className="text-mono-sm">{fmt(row.totalRevenue)}</td>
                <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--sovereign)' }} className="text-mono-sm">{fmt(row.totalCost)}</td>
                <td style={{ ...tdStyle, textAlign: 'right', color: row.profit >= 0 ? 'var(--jade)' : 'var(--sovereign)' }} className="text-data-sm">{fmt(row.profit)}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  <span className={`badge ${row.margin >= 50 ? 'badge-success' : row.margin >= 0 ? 'badge-warning' : 'badge-sovereign'}`}>
                    {row.margin.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AbuseTable({ rows, tierAverages }: { rows: AbuseFlagged[]; tierAverages: Record<string, { avgUsage: number; avgCost: number; count: number }> }) {
  return (
    <div>
      {/* Tier averages reference */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(tierAverages).map(([tier, avg]) => (
          <div key={tier} className="card" style={{ padding: '8px 14px' }}>
            <div className="text-label-sm">{tier}</div>
            <div className="text-mono-xs" style={{ color: 'var(--text-muted)' }}>
              Avg usage: {fmtQty(avg.avgUsage)} &middot; Avg cost: {fmt(avg.avgCost)} &middot; {avg.count} subscribers
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--sovereign-pale)' }}>
          <div className="text-heading-sm" style={{ color: 'var(--sovereign)' }}>
            Abuse / Outlier Detection
          </div>
          <div className="text-body-xs" style={{ color: 'var(--text-muted)', marginTop: 2 }}>
            Subscribers using &gt;3x the average for their tier. May indicate abuse, misconfiguration, or an upsell opportunity.
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-sidebar)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ ...thStyle, textAlign: 'left' }}>Subscriber</th>
                <th style={thStyle}>Tier</th>
                <th style={thStyle}>Usage</th>
                <th style={thStyle}>Tier Avg</th>
                <th style={thStyle}>Multiple</th>
                <th style={thStyle}>Cost</th>
                <th style={thStyle}>Cost Multiple</th>
                <th style={thStyle}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--green)' }}>No abuse flags detected. All subscribers are within normal usage for their tier.</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500, color: 'var(--text-heading)' }}>{row.name}</div>
                    {row.email && <div className="text-mono-xs" style={{ color: 'var(--text-label)' }}>{row.email}</div>}
                  </td>
                  <td style={tdStyle}><span className="badge badge-jade">{row.tier}</span></td>
                  <td style={{ ...tdStyle, textAlign: 'right' }} className="text-data-sm">{fmtQty(row.totalUsage)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }} className="text-mono-sm">{fmtQty(row.tierAvgUsage)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <span className={`badge ${row.usageMultiple >= 5 ? 'badge-sovereign' : 'badge-warning'}`}>
                      {row.usageMultiple}x
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }} className="text-mono-sm">{fmt(row.totalCost)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <span className={`badge ${row.costMultiple >= 5 ? 'badge-sovereign' : 'badge-warning'}`}>
                      {row.costMultiple}x
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--green)' }} className="text-mono-sm">{fmt(row.totalRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'right',
  fontFamily: 'var(--mono-font)', fontSize: 10,
  letterSpacing: '0.06em', textTransform: 'uppercase',
  color: 'var(--text-label)',
}

const tdStyle: React.CSSProperties = { padding: '10px 12px' }
