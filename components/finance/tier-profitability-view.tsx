'use client'

interface TierData {
  tierName: string
  customerCount: number
  totalMrr: number
  avgMrr: number
  totalRevenue: number
  allocatedCost: number
  profit: number
  margin: number
}

function fmt(value: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value)
}

function marginColor(margin: number): string {
  if (margin >= 60) return 'var(--green)'
  if (margin >= 30) return 'var(--jade)'
  if (margin >= 0) return 'var(--amber)'
  return 'var(--sovereign)'
}

export function TierProfitabilityView({ tiers }: { tiers: TierData[] }) {
  const totalRevenue = tiers.reduce((s, t) => s + t.totalRevenue, 0)
  const totalProfit = tiers.reduce((s, t) => s + t.profit, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div className="card" style={{ padding: '12px 16px' }}>
          <div className="card-kicker">Total Customers</div>
          <div className="text-data-lg" style={{ color: 'var(--jade)' }}>{tiers.reduce((s, t) => s + t.customerCount, 0)}</div>
        </div>
        <div className="card" style={{ padding: '12px 16px' }}>
          <div className="card-kicker">Total Revenue</div>
          <div className="text-data-lg" style={{ color: 'var(--blue)' }}>{fmt(totalRevenue)}</div>
        </div>
        <div className="card" style={{ padding: '12px 16px' }}>
          <div className="card-kicker">Total Profit</div>
          <div className="text-data-lg" style={{ color: totalProfit >= 0 ? 'var(--green)' : 'var(--sovereign)' }}>
            {fmt(totalProfit)}
          </div>
        </div>
      </div>

      {/* Tier cards */}
      {tiers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
            No customer tiers configured. Create tiers (Free, Starter, Pro, Enterprise) and assign customers to see profitability analysis.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {tiers.map((tier) => (
            <div key={tier.tierName} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-heading-sm">{tier.tierName}</span>
                <span className={`badge ${tier.margin >= 30 ? 'badge-success' : tier.margin >= 0 ? 'badge-warning' : 'badge-sovereign'}`}>
                  {tier.margin.toFixed(1)}% margin
                </span>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div className="text-mono-xs" style={{ color: 'var(--text-label)', marginBottom: 2 }}>Customers</div>
                    <div className="text-data-sm" style={{ color: 'var(--text-heading)' }}>{tier.customerCount}</div>
                  </div>
                  <div>
                    <div className="text-mono-xs" style={{ color: 'var(--text-label)', marginBottom: 2 }}>Avg MRR</div>
                    <div className="text-data-sm" style={{ color: 'var(--text-heading)' }}>{fmt(tier.avgMrr)}</div>
                  </div>
                  <div>
                    <div className="text-mono-xs" style={{ color: 'var(--text-label)', marginBottom: 2 }}>Revenue</div>
                    <div className="text-data-sm" style={{ color: 'var(--green)' }}>{fmt(tier.totalRevenue)}</div>
                  </div>
                  <div>
                    <div className="text-mono-xs" style={{ color: 'var(--text-label)', marginBottom: 2 }}>Allocated Cost</div>
                    <div className="text-data-sm" style={{ color: 'var(--sovereign)' }}>{fmt(tier.allocatedCost)}</div>
                  </div>
                </div>

                {/* Profit bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="text-label-sm">Profit</span>
                  <span className="text-data-sm" style={{ color: marginColor(tier.margin) }}>{fmt(tier.profit)}</span>
                </div>
                <div className="progress-bar" style={{ height: 6 }}>
                  <div className="progress-bar-fill" style={{
                    width: `${Math.max(0, Math.min(tier.margin, 100))}%`,
                    backgroundColor: marginColor(tier.margin),
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comparison table */}
      {tiers.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div className="text-heading-sm">Tier Comparison</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-sidebar)', borderBottom: '1px solid var(--border)' }}>
                  {['Tier', 'Customers', 'MRR', 'Avg MRR', 'Revenue', 'Cost', 'Profit', 'Margin'].map((h) => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Tier' ? 'left' : 'right', fontFamily: 'var(--mono-font)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-label)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tiers.map((t) => (
                  <tr key={t.tierName} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-heading)' }}>{t.tierName}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{t.customerCount}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }} className="text-mono-sm">{fmt(t.totalMrr)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }} className="text-mono-sm">{fmt(t.avgMrr)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--green)' }} className="text-mono-sm">{fmt(t.totalRevenue)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }} className="text-mono-sm">{fmt(t.allocatedCost)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: marginColor(t.margin) }} className="text-data-sm">{fmt(t.profit)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <span className={`badge ${t.margin >= 30 ? 'badge-success' : t.margin >= 0 ? 'badge-warning' : 'badge-sovereign'}`}>
                        {t.margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
