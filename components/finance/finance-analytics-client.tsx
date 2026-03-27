'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopSpendView } from './top-spend-view'
import { CacMarginsView } from './cac-margins-view'
import { TierProfitabilityView } from './tier-profitability-view'
import { TierUsageView } from './tier-usage-view'

interface AnalyticsData {
  topSpend: {
    bySupplier: { name: string; amount: number; pct: number }[]
    byCategory: { name: string; amount: number; pct: number }[]
    monthlyBurn: number
  }
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
  tierProfitability: {
    tierName: string; customerCount: number; totalMrr: number;
    avgMrr: number; totalRevenue: number; allocatedCost: number;
    profit: number; margin: number
  }[]
  usage: {
    byTier: Record<string, Record<string, { quantity: number; cost: number; customerCount: number }>>
    global: Record<string, { quantity: number; cost: number; customerCount: number }>
  }
  summary: { activeCustomers: number; totalMrr: number; arr: number }
}

type TabKey = 'spend' | 'cac' | 'tiers' | 'usage'

export function FinanceAnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('spend')
  const [period, setPeriod] = useState('current')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/analytics?period=${period}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { fetchData() }, [fetchData])

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'spend', label: 'Top Spend' },
    { key: 'cac', label: 'CAC & Margins' },
    { key: 'tiers', label: 'Tier Profitability' },
    { key: 'usage', label: 'Usage by Tier' },
  ]

  return (
    <div>
      {/* Period selector + tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={tab === t.key ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          className="input-base"
          style={{ width: 160 }}
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="current">This Month</option>
          <option value="all">All Time</option>
          <option value={getPrevMonth(1)}>Last Month</option>
          <option value={getPrevMonth(2)}>2 Months Ago</option>
          <option value={getPrevMonth(3)}>3 Months Ago</option>
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }} className="text-body-sm">
          Loading analytics...
        </div>
      ) : !data ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }} className="text-body-sm">
          Failed to load analytics data.
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <MiniKpi label="Active Customers" value={String(data.summary.activeCustomers)} />
            <MiniKpi label="MRR" value={fmt(data.summary.totalMrr)} color="var(--jade)" />
            <MiniKpi label="ARR" value={fmt(data.summary.arr)} color="var(--blue)" />
            <MiniKpi label="Monthly Burn" value={fmt(data.topSpend.monthlyBurn)} color="var(--amber)" />
          </div>

          {tab === 'spend' && <TopSpendView data={data.topSpend} totalExpenses={data.margins.totalExpenses} />}
          {tab === 'cac' && <CacMarginsView acquisition={data.acquisition} margins={data.margins} />}
          {tab === 'tiers' && <TierProfitabilityView tiers={data.tierProfitability} />}
          {tab === 'usage' && <TierUsageView usage={data.usage} />}
        </>
      )}
    </div>
  )
}

function MiniKpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="card" style={{ padding: '12px 16px' }}>
      <div className="card-kicker">{label}</div>
      <div className="text-data-md" style={{ color: color ?? 'var(--text-heading)' }}>{value}</div>
    </div>
  )
}

function fmt(value: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(value)
}

function getPrevMonth(offset: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
