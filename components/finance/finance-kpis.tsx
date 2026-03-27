'use client'

interface FinanceKpisProps {
  allTimeIncome: number
  allTimeExpenses: number
  currentIncome: number
  currentExpenses: number
  prevIncome: number
  prevExpenses: number
  estimatedMonthly: number
}

function fmt(value: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value)
}

function pctChange(current: number, previous: number): string | null {
  if (previous === 0) return null
  const pct = ((current - previous) / previous) * 100
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(0)}%`
}

interface KpiProps {
  label: string
  value: string
  subtitle?: string
  color: string
  change?: string | null
}

function Kpi({ label, value, subtitle, color, change }: KpiProps) {
  const changeColor = change && change.startsWith('+') ? 'var(--green)' : change && change.startsWith('-') ? 'var(--sovereign)' : 'var(--text-muted)'
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div className="card-kicker">{label}</div>
      <div className="text-data-lg" style={{ color }}>{value}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {subtitle && <span className="text-body-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</span>}
        {change && <span className="text-mono-xs" style={{ color: changeColor }}>{change} vs last month</span>}
      </div>
    </div>
  )
}

export function FinanceKpis(props: FinanceKpisProps) {
  const currentNet = props.currentIncome - props.currentExpenses
  const allTimeNet = props.allTimeIncome - props.allTimeExpenses

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
      <Kpi
        label="This Month Income"
        value={fmt(props.currentIncome)}
        color="var(--green)"
        change={pctChange(props.currentIncome, props.prevIncome)}
      />
      <Kpi
        label="This Month Expenses"
        value={fmt(props.currentExpenses)}
        color="var(--sovereign)"
        change={pctChange(props.currentExpenses, props.prevExpenses)}
      />
      <Kpi
        label="Net This Month"
        value={fmt(currentNet)}
        color={currentNet >= 0 ? 'var(--jade)' : 'var(--sovereign)'}
      />
      <Kpi
        label="All-Time Net"
        value={fmt(allTimeNet)}
        color={allTimeNet >= 0 ? 'var(--jade)' : 'var(--sovereign)'}
        subtitle={`Income ${fmt(props.allTimeIncome)} · Expenses ${fmt(props.allTimeExpenses)}`}
      />
      <Kpi
        label="Est. Monthly Burn"
        value={fmt(props.estimatedMonthly)}
        color="var(--amber)"
        subtitle="From billing accounts"
      />
    </div>
  )
}
