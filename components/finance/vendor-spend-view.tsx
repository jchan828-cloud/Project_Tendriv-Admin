'use client'

import { useState, useMemo } from 'react'
import { Receipt } from 'lucide-react'

type BillingAccount = {
  id: string
  service_name: string
  plan_name: string | null
  monthly_cost: number
  currency: string
  billing_cycle: string | null
  next_billing_date: string | null
  status: string
  notes: string | null
  dashboard_url: string | null
}

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-jade',
  trial: 'badge-info',
  paused: 'badge-warning',
  cancelled: 'badge-neutral',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  trial: 'Trial',
  paused: 'Paused',
  cancelled: 'Cancelled',
}

const CYCLE_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  yearly: 'Annual',
  'usage-based': 'Usage',
}

function monthlyEquivalent(a: BillingAccount): number {
  if (a.billing_cycle === 'yearly') return a.monthly_cost / 12
  return a.monthly_cost
}

function formatCAD(amount: number, currency = 'CAD'): string {
  return `$${amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

function isNearDue(dateStr: string | null, cycle: string | null): boolean {
  if (!dateStr || cycle !== 'yearly') return false
  const diff = new Date(dateStr).getTime() - Date.now()
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
}

interface VendorSpendViewProps {
  accounts: BillingAccount[]
}

export function VendorSpendView({ accounts }: VendorSpendViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const active = accounts.filter((a) => a.status === 'active' || a.status === 'trial')

  const monthlySpend = useMemo(
    () => active.reduce((sum, a) => sum + monthlyEquivalent(a), 0),
    [active]
  )
  const annualRunRate = monthlySpend * 12
  const activeCount = active.length

  const largest = useMemo(
    () => active.reduce<BillingAccount | null>(
      (top, a) => !top || monthlyEquivalent(a) > monthlyEquivalent(top) ? a : top,
      null
    ),
    [active]
  )

  // Sort: past_due-equivalent (paused with upcoming date) first, then by amount
  const sorted = useMemo(() => {
    return [...accounts].sort((a, b) => {
      const aPaused = a.status === 'paused' ? -1 : 0
      const bPaused = b.status === 'paused' ? -1 : 0
      if (aPaused !== bPaused) return aPaused - bPaused
      return monthlyEquivalent(b) - monthlyEquivalent(a)
    })
  }, [accounts])

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 className="text-heading-xl" style={{ marginBottom: 4 }}>Vendor Spend</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Recurring bills paid to platform vendors.</p>
        </div>
        <button className="btn-primary">Add vendor</button>
      </div>

      {/* KV strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div className="text-eyebrow">Monthly spend</div>
          <div className="text-data-md" style={{ fontFamily: 'var(--mono-font)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCAD(monthlySpend)}
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div className="text-eyebrow">Annual run-rate</div>
          <div className="text-data-md" style={{ fontFamily: 'var(--mono-font)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCAD(annualRunRate)}
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div className="text-eyebrow">Active vendors</div>
          <div className="text-data-md">{activeCount}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div className="text-eyebrow">Largest line item</div>
          <div className="text-data-md" style={{ fontSize: 14, fontFamily: 'var(--mono-font)', fontVariantNumeric: 'tabular-nums' }}>
            {largest
              ? `${largest.service_name} · ${formatCAD(monthlyEquivalent(largest))}`
              : '—'}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {accounts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <Receipt size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 8 }}>
            No vendor bills tracked yet.
          </h2>
          <p style={{ fontSize: 13, marginBottom: 24 }}>
            Add the platforms you pay each month or year to start tracking infrastructure spend.
          </p>
          <button className="btn-primary">Add vendor</button>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', border: '0.5px solid var(--border)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-sidebar)', borderBottom: '0.5px solid var(--border)' }}>
                  {['Vendor', 'Plan', 'Cycle', 'Next bill', 'Amount', 'Status', ''].map((h, i) => (
                    <th
                      key={i}
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
                {sorted.map((account) => {
                  const paused = account.status === 'paused'
                  const nearDue = isNearDue(account.next_billing_date, account.billing_cycle)

                  return (
                    <tr
                      key={account.id}
                      style={{
                        borderBottom: '0.5px solid var(--border)',
                        borderLeft: paused ? '3px solid var(--status-danger)' : undefined,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
                    >
                      <td style={{ padding: '10px 14px' }}>
                        {account.dashboard_url ? (
                          <a
                            href={account.dashboard_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--text-heading)', fontWeight: 500, textDecoration: 'none' }}
                          >
                            {account.service_name.length > 32
                              ? account.service_name.slice(0, 32) + '…'
                              : account.service_name}
                          </a>
                        ) : (
                          <span style={{ fontWeight: 500, color: 'var(--text-heading)' }}>
                            {account.service_name.length > 32
                              ? account.service_name.slice(0, 32) + '…'
                              : account.service_name}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12, color: 'var(--text-muted)' }}>
                          {account.plan_name ?? '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {account.billing_cycle ? (
                          <span className="badge-neutral" style={{ fontSize: 11 }}>
                            {CYCLE_LABEL[account.billing_cycle] ?? account.billing_cycle}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--mono-font)', fontSize: 12,
                            color: nearDue ? 'var(--status-warning)' : 'var(--text-muted)',
                          }}
                        >
                          {nearDue && '● '}
                          {formatDate(account.next_billing_date)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontFamily: 'var(--mono-font)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                          {formatCAD(account.monthly_cost, account.currency)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          className={STATUS_BADGE[account.status] ?? 'badge-neutral'}
                          style={{ fontSize: 11 }}
                        >
                          {STATUS_LABEL[account.status] ?? account.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => setEditingId(account.id)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, fontFamily: 'var(--mono-font)', fontSize: 11, color: 'var(--text-muted)' }}>
            {accounts.length} vendor{accounts.length !== 1 ? 's' : ''}
          </div>
        </>
      )}

      {/* Edit placeholder — full drawer is phase 2 */}
      {editingId && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setEditingId(null)}
        >
          <div
            className="card"
            style={{ padding: 24, minWidth: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ fontFamily: 'var(--mono-font)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Edit vendor
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-body)', marginBottom: 20 }}>
              Full edit form — phase 2.
            </p>
            <button className="btn-ghost" onClick={() => setEditingId(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
