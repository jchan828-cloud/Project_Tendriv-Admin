'use client'

import { useState } from 'react'
import Link from 'next/link'

interface BillingAccount {
  id: string
  service_name: string
  billing_email: string | null
  plan_name: string | null
  monthly_cost: number
  currency: string
  billing_cycle: string | null
  next_billing_date: string | null
  status: string
  dashboard_url: string | null
}

function fmt(value: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(value)
}

const STATUS_BADGES: Record<string, string> = {
  active: 'badge-success',
  trial: 'badge-warning',
  paused: 'badge-neutral',
  cancelled: 'badge-sovereign',
}

export function BillingOverview({ accounts: initialAccounts }: { accounts: BillingAccount[] }) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    service_name: '', billing_email: '', plan_name: '', monthly_cost: '',
    billing_cycle: 'monthly', dashboard_url: '',
  })

  const totalMonthly = accounts
    .filter((a) => a.status === 'active')
    .reduce((sum, a) => {
      if (a.billing_cycle === 'yearly') return sum + a.monthly_cost / 12
      return sum + a.monthly_cost
    }, 0)

  async function createAccount() {
    if (!form.service_name.trim()) return
    const res = await fetch('/api/finance/billing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        monthly_cost: parseFloat(form.monthly_cost) || 0,
      }),
    })
    if (res.ok) {
      const account = await res.json()
      setAccounts((prev) => [...prev, account])
      setForm({ service_name: '', billing_email: '', plan_name: '', monthly_cost: '', billing_cycle: 'monthly', dashboard_url: '' })
      setShowForm(false)
    }
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="text-heading-sm">Billing Accounts</div>
          <div className="text-mono-xs" style={{ color: 'var(--text-muted)', marginTop: 2 }}>
            Est. monthly: {fmt(totalMonthly)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/finance/billing" className="btn-ghost btn-sm" style={{ textDecoration: 'none' }}>View all</Link>
          <button className="btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>+ Add</button>
        </div>
      </div>

      {showForm && (
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)', background: 'var(--surface-sidebar)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input className="input-base" placeholder="Service name" value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} />
            <input className="input-base" placeholder="Billing email" value={form.billing_email} onChange={(e) => setForm({ ...form, billing_email: e.target.value })} />
            <input className="input-base" placeholder="Plan name" value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} />
            <input className="input-base" type="number" placeholder="Monthly cost" value={form.monthly_cost} onChange={(e) => setForm({ ...form, monthly_cost: e.target.value })} />
            <select className="input-base" value={form.billing_cycle} onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="usage-based">Usage-based</option>
            </select>
            <input className="input-base" placeholder="Dashboard URL" value={form.dashboard_url} onChange={(e) => setForm({ ...form, dashboard_url: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn-primary btn-sm" onClick={createAccount}>Save</button>
            <button className="btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {accounts.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }} className="text-body-sm">
            No billing accounts configured. Add your services (Supabase, Vercel, Anthropic, etc.)
          </div>
        ) : (
          accounts.map((account) => (
            <div key={account.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="text-body-sm" style={{ fontWeight: 500, color: 'var(--text-heading)' }}>
                    {account.service_name}
                  </span>
                  <span className={`badge ${STATUS_BADGES[account.status] ?? 'badge-neutral'}`}>
                    {account.status}
                  </span>
                </div>
                <div className="text-mono-xs" style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                  {account.plan_name && <span>{account.plan_name} &middot; </span>}
                  {account.billing_cycle}
                  {account.billing_email && <span> &middot; {account.billing_email}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="text-data-sm" style={{ color: 'var(--text-heading)' }}>
                  {fmt(account.monthly_cost, account.currency)}
                  {account.billing_cycle === 'yearly' ? '/yr' : '/mo'}
                </div>
                {account.next_billing_date && (
                  <div className="text-mono-xs" style={{ color: 'var(--text-label)' }}>
                    Next: {account.next_billing_date}
                  </div>
                )}
              </div>
              {account.dashboard_url && (
                <a
                  href={account.dashboard_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost btn-sm"
                  style={{ textDecoration: 'none', flexShrink: 0 }}
                >
                  Open
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
