'use client'

interface ExpenseBreakdownProps {
  categoryBreakdown: Record<string, number>
  vendorBreakdown: Record<string, number>
}

function fmt(value: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value)
}

const CATEGORY_COLORS: Record<string, string> = {
  'infrastructure': 'var(--blue)',
  'ai-services': 'var(--purple)',
  'marketing': 'var(--jade)',
  'email': 'var(--amber)',
  'analytics': 'var(--green)',
  'hosting': 'var(--blue)',
  'domain': 'var(--ink-40)',
  'software': 'var(--purple)',
  'other': 'var(--ink-20)',
}

export function ExpenseBreakdown({ categoryBreakdown, vendorBreakdown }: ExpenseBreakdownProps) {
  const categoryEntries = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])
  const vendorEntries = Object.entries(vendorBreakdown).sort((a, b) => b[1] - a[1])
  const totalExpenses = categoryEntries.reduce((sum, [, v]) => sum + v, 0)

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div className="text-heading-sm">Expense Breakdown (This Month)</div>
      </div>
      <div style={{ padding: 20 }}>
        {categoryEntries.length === 0 ? (
          <div className="text-body-sm" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
            No expenses this month
          </div>
        ) : (
          <>
            {/* Category bars */}
            <div className="section-label" style={{ marginBottom: 16 }}>By Category</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {categoryEntries.map(([cat, amount]) => {
                const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
                const color = CATEGORY_COLORS[cat] ?? 'var(--ink-20)'
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="text-body-sm" style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                        {cat.replace(/-/g, ' ')}
                      </span>
                      <span className="text-mono-sm" style={{ color: 'var(--text-heading)' }}>{fmt(amount)}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Vendor list */}
            {vendorEntries.length > 0 && (
              <>
                <div className="section-label" style={{ marginBottom: 12 }}>By Vendor</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {vendorEntries.map(([vendor, amount]) => (
                    <div key={vendor} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span className="text-body-sm">{vendor}</span>
                      <span className="text-mono-sm" style={{ color: 'var(--text-heading)' }}>{fmt(amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
