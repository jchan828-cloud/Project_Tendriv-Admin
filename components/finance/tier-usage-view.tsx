'use client'

interface TierUsageViewProps {
  usage: {
    byTier: Record<string, Record<string, { quantity: number; cost: number; customerCount: number }>>
    global: Record<string, { quantity: number; cost: number; customerCount: number }>
  }
}

function fmt(value: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value)
}

function fmtQty(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

const SERVICE_COLORS: Record<string, string> = {
  'api-calls': 'var(--blue)',
  'storage': 'var(--purple)',
  'ai-briefs': 'var(--jade)',
  'email-sends': 'var(--amber)',
  'contacts': 'var(--green)',
  'page-views': 'var(--ink-40)',
  'utm-clicks': 'var(--sovereign)',
}

export function TierUsageView({ usage }: TierUsageViewProps) {
  const tierNames = Object.keys(usage.byTier)
  const globalServices = Object.entries(usage.global).sort((a, b) => b[1].cost - a[1].cost)
  const totalCost = globalServices.reduce((s, [, v]) => s + v.cost, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Global service usage */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="text-heading-sm">Core App Service Usage</div>
          <div className="text-mono-xs" style={{ color: 'var(--text-muted)', marginTop: 2 }}>
            Total allocated cost: {fmt(totalCost)}
          </div>
        </div>
        <div style={{ padding: 20 }}>
          {globalServices.length === 0 ? (
            <div className="text-body-sm" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
              No service usage data. Track usage (API calls, storage, AI briefs, email sends, etc.) per customer to see breakdowns here.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {globalServices.map(([service, data]) => {
                const color = SERVICE_COLORS[service] ?? 'var(--ink-40)'
                return (
                  <div key={service} style={{
                    padding: 16, borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)', background: 'var(--surface-card-solid)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                      <span className="text-label-sm" style={{ textTransform: 'capitalize' }}>
                        {service.replace(/-/g, ' ')}
                      </span>
                    </div>
                    <div className="text-data-md" style={{ color, marginBottom: 4 }}>
                      {fmtQty(data.quantity)}
                    </div>
                    <div className="text-mono-xs" style={{ color: 'var(--text-muted)' }}>
                      {data.customerCount} customer{data.customerCount !== 1 ? 's' : ''}
                      {data.cost > 0 && <span> &middot; {fmt(data.cost)} cost</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Usage by tier */}
      {tierNames.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div className="text-heading-sm">Service Usage by Customer Tier</div>
            <div className="text-body-xs" style={{ color: 'var(--text-muted)', marginTop: 2 }}>
              Which services each tier consumes and the cost to serve them.
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-sidebar)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '8px 16px', textAlign: 'left', fontFamily: 'var(--mono-font)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-label)' }}>Tier</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--mono-font)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-label)' }}>Service</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono-font)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-label)' }}>Usage</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono-font)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-label)' }}>Customers</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--mono-font)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-label)' }}>Avg/Customer</th>
                  <th style={{ padding: '8px 16px', textAlign: 'right', fontFamily: 'var(--mono-font)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-label)' }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {tierNames.map((tierName) => {
                  const services = Object.entries(usage.byTier[tierName] ?? {}).sort((a, b) => b[1].cost - a[1].cost)
                  return services.map(([service, data], i) => (
                    <tr key={`${tierName}-${service}`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {i === 0 && (
                        <td rowSpan={services.length} style={{
                          padding: '8px 16px', fontWeight: 600, color: 'var(--text-heading)',
                          verticalAlign: 'top', borderRight: '1px solid var(--border-subtle)',
                        }}>
                          {tierName}
                        </td>
                      )}
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: SERVICE_COLORS[service] ?? 'var(--ink-40)' }} />
                          <span style={{ textTransform: 'capitalize' }}>{service.replace(/-/g, ' ')}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }} className="text-mono-sm">
                        {fmtQty(data.quantity)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{data.customerCount}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }} className="text-mono-sm">
                        {data.customerCount > 0 ? fmtQty(data.quantity / data.customerCount) : '—'}
                      </td>
                      <td style={{ padding: '8px 16px', textAlign: 'right' }} className="text-mono-sm">
                        {fmt(data.cost)}
                      </td>
                    </tr>
                  ))
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tierNames.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
            No usage data by tier. To populate this view:<br />
            1. Create customer tiers (Free, Starter, Pro, Enterprise)<br />
            2. Add customers and assign tiers<br />
            3. Log service usage per customer (API calls, storage, AI briefs, email sends)
          </div>
        </div>
      )}
    </div>
  )
}
