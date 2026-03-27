'use client'

interface CacMarginsViewProps {
  acquisition: {
    avgCac: number
    totalAcquisitionCost: number
    totalCustomers: number
    byChannel: {
      channel: string; customers: number; avgCac: number;
      totalMrr: number; ltv: number; ltvCacRatio: number
    }[]
  }
  margins: {
    totalRevenue: number; totalExpenses: number; totalCogs: number; totalOpex: number;
    grossMargin: number; grossMarginAfterCogs: number; netMargin: number;
    totalMrr: number; monthlyBurn: number
  }
}

function fmt(value: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value)
}

function marginColor(margin: number): string {
  if (margin >= 60) return 'var(--green)'
  if (margin >= 30) return 'var(--amber)'
  return 'var(--sovereign)'
}

export function CacMarginsView({ acquisition, margins }: CacMarginsViewProps) {
  const runway = margins.monthlyBurn > 0
    ? Math.round((margins.totalRevenue - margins.totalExpenses) / margins.monthlyBurn)
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Margin KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        <div className="card" style={{ padding: '12px 16px' }}>
          <div className="card-kicker">Total Revenue</div>
          <div className="text-data-md" style={{ color: 'var(--green)' }}>{fmt(margins.totalRevenue)}</div>
        </div>
        <div className="card" style={{ padding: '12px 16px' }}>
          <div className="card-kicker">COGS</div>
          <div className="text-data-md" style={{ color: 'var(--sovereign)' }}>{fmt(margins.totalCogs)}</div>
          <div className="text-mono-xs" style={{ color: 'var(--text-label)' }}>direct costs</div>
        </div>
        <div className="card" style={{ padding: '12px 16px' }}>
          <div className="card-kicker">OpEx</div>
          <div className="text-data-md" style={{ color: 'var(--amber)' }}>{fmt(margins.totalOpex)}</div>
          <div className="text-mono-xs" style={{ color: 'var(--text-label)' }}>operating costs</div>
        </div>
        <div className="card" style={{ padding: '12px 16px' }}>
          <div className="card-kicker">Gross Margin</div>
          <div className="text-data-md" style={{ color: marginColor(margins.grossMarginAfterCogs) }}>
            {margins.grossMarginAfterCogs.toFixed(1)}%
          </div>
          <div className="text-mono-xs" style={{ color: 'var(--text-label)' }}>after COGS</div>
        </div>
        <div className="card" style={{ padding: '12px 16px' }}>
          <div className="card-kicker">Net Margin</div>
          <div className="text-data-md" style={{ color: marginColor(margins.grossMargin) }}>
            {margins.grossMargin.toFixed(1)}%
          </div>
          <div className="text-mono-xs" style={{ color: 'var(--text-label)' }}>after all expenses</div>
        </div>
      </div>

      {/* Waterfall */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="text-heading-sm">Revenue Waterfall</div>
        </div>
        <div style={{ padding: 20 }}>
          <WaterfallBar label="Revenue" value={margins.totalRevenue} max={margins.totalRevenue} color="var(--green)" />
          <WaterfallBar label="- COGS" value={margins.totalCogs} max={margins.totalRevenue} color="var(--sovereign)" />
          <WaterfallBar label="= Gross Profit" value={margins.totalRevenue - margins.totalCogs} max={margins.totalRevenue} color="var(--jade)" />
          <WaterfallBar label="- OpEx" value={margins.totalOpex} max={margins.totalRevenue} color="var(--amber)" />
          <WaterfallBar label="= Net Profit" value={margins.totalRevenue - margins.totalExpenses} max={margins.totalRevenue} color={margins.totalRevenue - margins.totalExpenses >= 0 ? 'var(--jade)' : 'var(--sovereign)'} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* CAC Summary */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div className="text-heading-sm">Customer Acquisition Cost</div>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <div className="card-kicker">Avg. CAC</div>
                <div className="text-data-lg" style={{ color: 'var(--blue)' }}>{fmt(acquisition.avgCac)}</div>
              </div>
              <div>
                <div className="card-kicker">Total Spent</div>
                <div className="text-data-lg" style={{ color: 'var(--text-heading)' }}>{fmt(acquisition.totalAcquisitionCost)}</div>
                <div className="text-mono-xs" style={{ color: 'var(--text-label)' }}>{acquisition.totalCustomers} customers</div>
              </div>
            </div>
            {runway !== null && (
              <div style={{ padding: '8px 12px', background: 'var(--surface-sidebar)', borderRadius: 'var(--radius)' }}>
                <span className="text-mono-xs" style={{ color: 'var(--text-muted)' }}>
                  At current MRR ({fmt(margins.totalMrr)}/mo) vs burn ({fmt(margins.monthlyBurn)}/mo)
                  {runway > 0 ? ` = ${runway} months of positive cash flow ratio` : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CAC by Channel */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div className="text-heading-sm">CAC by Acquisition Channel</div>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {acquisition.byChannel.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }} className="text-body-sm">
                No customer data yet. Add customers with acquisition channels.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-sidebar)', borderBottom: '1px solid var(--border)' }}>
                    {['Channel', 'Customers', 'Avg CAC', 'MRR', 'LTV:CAC'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--mono-font)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-label)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {acquisition.byChannel.map((ch) => (
                    <tr key={ch.channel} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500, textTransform: 'capitalize', color: 'var(--text-heading)' }}>{ch.channel}</td>
                      <td style={{ padding: '8px 12px' }}>{ch.customers}</td>
                      <td style={{ padding: '8px 12px' }} className="text-mono-sm">{fmt(ch.avgCac)}</td>
                      <td style={{ padding: '8px 12px' }} className="text-mono-sm">{fmt(ch.totalMrr)}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span className={`badge ${ch.ltvCacRatio >= 3 ? 'badge-success' : ch.ltvCacRatio >= 1 ? 'badge-warning' : 'badge-sovereign'}`}>
                          {ch.ltvCacRatio.toFixed(1)}x
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function WaterfallBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.abs(value / max) * 100 : 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <div className="text-body-sm" style={{ width: 120, fontWeight: 500, color: 'var(--text-heading)' }}>{label}</div>
      <div style={{ flex: 1 }}>
        <div className="progress-bar" style={{ height: 6 }}>
          <div className="progress-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
        </div>
      </div>
      <div className="text-data-sm" style={{ width: 100, textAlign: 'right', color }}>
        {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value)}
      </div>
    </div>
  )
}
