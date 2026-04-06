'use client'

interface TopSpendViewProps {
  data: {
    bySupplier: { name: string; amount: number; pct: number }[]
    byCategory: { name: string; amount: number; pct: number }[]
    monthlyBurn: number
  }
  totalExpenses: number
}

function fmt(value: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value)
}

const SUPPLIER_COLORS = [
  'var(--blue)', 'var(--purple)', 'var(--amber)', 'var(--jade)', 'var(--sovereign)',
  'var(--green)', 'var(--ink-40)', 'var(--ink-20)',
]

export function TopSpendView({ data, totalExpenses }: TopSpendViewProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* By Supplier */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="text-heading-sm">Top Spend by Supplier</div>
          <div className="text-mono-xs" style={{ color: 'var(--text-muted)', marginTop: 2 }}>
            Total: {fmt(totalExpenses)}
          </div>
        </div>
        <div style={{ padding: 20 }}>
          {data.bySupplier.length === 0 ? (
            <div className="text-body-sm" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
              No expense data. Add transactions to see spend analysis.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {data.bySupplier.map((item, i) => (
                <div key={item.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: SUPPLIER_COLORS[i % SUPPLIER_COLORS.length] }} />
                      <span className="text-body-sm" style={{ fontWeight: 500, color: 'var(--text-heading)' }}>{item.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span className="text-data-sm" style={{ color: 'var(--text-heading)' }}>{fmt(item.amount)}</span>
                      <span className="text-mono-xs" style={{ color: 'var(--text-label)' }}>{item.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${item.pct}%`, backgroundColor: SUPPLIER_COLORS[i % SUPPLIER_COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* By Category */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="text-heading-sm">Spend by Service Type</div>
          <div className="text-mono-xs" style={{ color: 'var(--text-muted)', marginTop: 2 }}>
            Est. monthly burn: {fmt(data.monthlyBurn)}
          </div>
        </div>
        <div style={{ padding: 20 }}>
          {data.byCategory.length === 0 ? (
            <div className="text-body-sm" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
              No categorized expenses yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {data.byCategory.map((item, i) => (
                <div key={item.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="text-body-sm" style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                      {item.name.replace(/-/g, ' ')}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span className="text-data-sm" style={{ color: 'var(--text-heading)' }}>{fmt(item.amount)}</span>
                      <span className="text-mono-xs" style={{ color: 'var(--text-label)' }}>{item.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${item.pct}%`, backgroundColor: SUPPLIER_COLORS[(i + 3) % SUPPLIER_COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
