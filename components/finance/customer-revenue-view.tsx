'use client'

import { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

type Customer = {
  id: string
  name: string
  tier_id: string | null
  tier_name: string | null
  plan: string
  status: string
  mrr_cad: number
  lifetime_revenue_cad: number
  cac_cad: number | null
  margin_pct: number | null
  started_at: string | null
}

type TierSummary = {
  id: string
  name: string
  count: number
  total_mrr: number
  avg_margin: number | null
  top_customers: { name: string; mrr: number }[]
}

type TrendPoint = { month: string; mrr: number }

type Kpis = {
  mrr: number
  arr: number
  activeCount: number
  avgRevPerCustomer: number
}

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-success',
  churned: 'badge-neutral',
  trial: 'badge-info',
  paused: 'badge-warning',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  churned: 'Churned',
  trial: 'Trial',
  paused: 'Paused',
}

function formatCAD(n: number): string {
  return `$${n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD`
}

function marginColor(pct: number | null): string {
  if (pct == null) return 'var(--text-muted)'
  if (pct >= 60) return 'var(--status-success)'
  if (pct >= 30) return 'var(--text-heading)'
  if (pct >= 0) return 'var(--status-warning)'
  return 'var(--status-danger)'
}

function MarginCell({ pct }: { pct: number | null }) {
  if (pct == null) return <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--mono-font)', fontSize: 12 }}>—</span>
  return (
    <span style={{ color: marginColor(pct), fontFamily: 'var(--mono-font)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
      {pct < 0 ? '−' : ''}{Math.abs(pct)}%
    </span>
  )
}

type View = 'customers' | 'tiers' | 'trend'

interface CustomerRevenueViewProps {
  customers: Customer[]
  kpis: Kpis
  tiers: TierSummary[]
  trend: TrendPoint[]
}

export function CustomerRevenueView({ customers, kpis, tiers, trend }: CustomerRevenueViewProps) {
  const [view, setView] = useState<View>('customers')

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="text-heading-xl" style={{ marginBottom: 4 }}>Customer Revenue</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Recognized revenue, tier profitability, and CAC margins.
          </p>
        </div>
        {/* View toggle */}
        <div style={{ display: 'flex', border: '0.5px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          {(['customers', 'tiers', 'trend'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '6px 16px', fontSize: 12, border: 'none', cursor: 'pointer',
                background: view === v ? 'var(--jade)' : 'transparent',
                color: view === v ? '#fff' : 'var(--text-muted)',
                fontWeight: view === v ? 600 : 400,
                textTransform: 'capitalize',
                transition: 'background var(--duration-fast) ease',
              }}
            >
              {v === 'customers' ? 'Customers' : v === 'tiers' ? 'Tiers' : 'Trend'}
            </button>
          ))}
        </div>
      </div>

      {/* KV strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div className="text-eyebrow">MRR</div>
          <div className="text-data-md" style={{ fontFamily: 'var(--mono-font)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCAD(kpis.mrr)}
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div className="text-eyebrow">ARR run-rate</div>
          <div className="text-data-md" style={{ fontFamily: 'var(--mono-font)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCAD(kpis.arr)}
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div className="text-eyebrow">Active customers</div>
          <div className="text-data-md">{kpis.activeCount}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div className="text-eyebrow">Avg revenue / customer</div>
          <div className="text-data-md" style={{ fontFamily: 'var(--mono-font)', fontVariantNumeric: 'tabular-nums' }}>
            {kpis.activeCount > 0 ? formatCAD(kpis.avgRevPerCustomer) : '—'}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {customers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <TrendingUp size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 8 }}>
            No revenue recorded yet.
          </h2>
          <p style={{ fontSize: 13, maxWidth: 400, margin: '0 auto' }}>
            Once customers sign up and revenue events flow into finance_transactions, this view will populate.
          </p>
        </div>
      ) : view === 'customers' ? (
        <CustomersTable customers={customers} />
      ) : view === 'tiers' ? (
        <TiersView tiers={tiers} />
      ) : (
        <TrendView trend={trend} />
      )}
    </div>
  )
}

function CustomersTable({ customers }: { customers: Customer[] }) {
  return (
    <div style={{ overflowX: 'auto', border: '0.5px solid var(--border)', borderRadius: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--surface-sidebar)', borderBottom: '0.5px solid var(--border)' }}>
            {['Customer', 'Plan', 'MRR', 'Lifetime', 'CAC', 'Margin', 'Started', 'Status'].map((h) => (
              <th
                key={h}
                style={{
                  padding: '8px 14px', textAlign: 'left', fontWeight: 500,
                  color: 'var(--text-label)', whiteSpace: 'nowrap',
                  fontFamily: 'var(--mono-font)', fontSize: 10, letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr
              key={c.id}
              style={{
                borderBottom: '0.5px solid var(--border)',
                textDecoration: c.status === 'churned' ? 'line-through' : undefined,
                opacity: c.status === 'churned' ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
            >
              <td style={{ padding: '10px 14px', maxWidth: 220 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{ fontWeight: 500, color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={c.name}
                  >
                    {c.name}
                  </span>
                  {c.tier_name && (
                    <span className="badge-neutral" style={{ fontSize: 10, flexShrink: 0 }}>{c.tier_name}</span>
                  )}
                </div>
              </td>
              <td style={{ padding: '10px 14px' }}>
                <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12, color: 'var(--text-muted)' }}>
                  {c.plan}
                </span>
              </td>
              <td style={{ padding: '10px 14px' }}>
                <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCAD(c.mrr_cad)}
                </span>
              </td>
              <td style={{ padding: '10px 14px' }}>
                <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCAD(c.lifetime_revenue_cad)}
                </span>
              </td>
              <td style={{ padding: '10px 14px' }}>
                <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
                  {c.cac_cad != null ? formatCAD(c.cac_cad) : '—'}
                </span>
              </td>
              <td style={{ padding: '10px 14px' }}>
                <MarginCell pct={c.cac_cad != null ? c.margin_pct : null} />
              </td>
              <td style={{ padding: '10px 14px' }}>
                <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12, color: 'var(--text-muted)' }}>
                  {c.started_at ? c.started_at.slice(0, 10) : '—'}
                </span>
              </td>
              <td style={{ padding: '10px 14px' }}>
                <span className={STATUS_BADGE[c.status] ?? 'badge-neutral'} style={{ fontSize: 11 }}>
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TiersView({ tiers }: { tiers: TierSummary[] }) {
  if (tiers.length === 0) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
        No tier data yet.
      </p>
    )
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {tiers.map((tier) => (
        <div key={tier.id} className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {tier.name}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono-font)' }}>
              {tier.count} customer{tier.count !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--mono-font)', fontSize: 16, fontVariantNumeric: 'tabular-nums', color: 'var(--text-heading)', marginBottom: 4 }}>
            {formatCAD(tier.total_mrr)} MRR
          </div>
          {tier.avg_margin != null && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
              Avg margin: <span style={{ color: marginColor(tier.avg_margin) }}>{tier.avg_margin}%</span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tier.top_customers.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ fontFamily: 'var(--mono-font)', color: 'var(--text-muted)', width: 14, flexShrink: 0 }}>
                  {i + 1}.
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-body)' }}
                  title={c.name}>
                  {c.name}
                </span>
                <span style={{ fontFamily: 'var(--mono-font)', fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {formatCAD(c.mrr)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TrendView({ trend }: { trend: TrendPoint[] }) {
  if (trend.length === 0) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
        No revenue history yet.
      </p>
    )
  }
  return (
    <div className="card" style={{ padding: '24px 28px' }}>
      <div className="section-label" style={{ marginBottom: 20 }}>12-month MRR trend</div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={trend} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="month"
            tick={{ fontFamily: 'var(--mono-font)', fontSize: 10, fill: 'var(--text-muted)' }}
          />
          <YAxis
            tick={{ fontFamily: 'var(--mono-font)', fontSize: 10, fill: 'var(--text-muted)' }}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{ background: 'var(--surface-sidebar)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
            formatter={(v) => [typeof v === 'number' ? formatCAD(v) : String(v), 'MRR']}
          />
          <Line
            type="monotone"
            dataKey="mrr"
            stroke="var(--jade)"
            strokeWidth={2}
            dot={{ fill: 'var(--jade)', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
