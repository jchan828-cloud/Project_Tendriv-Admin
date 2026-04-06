'use client'

import { useState } from 'react'

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
  notes: string | null
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

export function BillingManager({ accounts: initial }: { accounts: BillingAccount[] }) {
  const [accounts, setAccounts] = useState(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<BillingAccount>>({})

  function startEdit(account: BillingAccount) {
    setEditing(account.id)
    setForm({ ...account })
  }

  async function saveEdit() {
    if (!editing) return
    const res = await fetch(`/api/finance/billing/${editing}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const updated = await res.json()
      setAccounts((prev) => prev.map((a) => a.id === editing ? { ...a, ...updated } : a))
      setEditing(null)
      setForm({})
    }
  }

  async function deleteAccount(id: string) {
    const res = await fetch(`/api/finance/billing/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setAccounts((prev) => prev.filter((a) => a.id !== id))
    }
  }

  const totalMonthly = accounts
    .filter((a) => a.status === 'active')
    .reduce((sum, a) => {
      if (a.billing_cycle === 'yearly') return sum + a.monthly_cost / 12
      return sum + a.monthly_cost
    }, 0)

  const totalYearly = totalMonthly * 12

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div className="card-kicker">Active Services</div>
          <div className="text-data-lg" style={{ color: 'var(--jade)' }}>
            {accounts.filter((a) => a.status === 'active').length}
          </div>
        </div>
        <div className="card">
          <div className="card-kicker">Est. Monthly</div>
          <div className="text-data-lg" style={{ color: 'var(--amber)' }}>{fmt(totalMonthly)}</div>
        </div>
        <div className="card">
          <div className="card-kicker">Est. Yearly</div>
          <div className="text-data-lg" style={{ color: 'var(--sovereign)' }}>{fmt(totalYearly)}</div>
        </div>
      </div>

      {/* Accounts list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {accounts.map((account) => (
          <div key={account.id} className="card" style={{ padding: 0 }}>
            {editing === account.id ? (
              /* Edit mode */
              <div style={{ padding: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label className="text-label-sm" style={{ display: 'block', marginBottom: 4 }}>Service Name</label>
                    <input className="input-base" value={form.service_name ?? ''} onChange={(e) => setForm({ ...form, service_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-label-sm" style={{ display: 'block', marginBottom: 4 }}>Billing Email</label>
                    <input className="input-base" value={form.billing_email ?? ''} onChange={(e) => setForm({ ...form, billing_email: e.target.value })} placeholder="billing@yourdomain.com" />
                  </div>
                  <div>
                    <label className="text-label-sm" style={{ display: 'block', marginBottom: 4 }}>Plan</label>
                    <input className="input-base" value={form.plan_name ?? ''} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-label-sm" style={{ display: 'block', marginBottom: 4 }}>Monthly Cost</label>
                    <input className="input-base" type="number" value={form.monthly_cost ?? ''} onChange={(e) => setForm({ ...form, monthly_cost: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="text-label-sm" style={{ display: 'block', marginBottom: 4 }}>Billing Cycle</label>
                    <select className="input-base" value={form.billing_cycle ?? 'monthly'} onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })}>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="usage-based">Usage-based</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-label-sm" style={{ display: 'block', marginBottom: 4 }}>Status</label>
                    <select className="input-base" value={form.status ?? 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="trial">Trial</option>
                      <option value="paused">Paused</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-label-sm" style={{ display: 'block', marginBottom: 4 }}>Next Billing Date</label>
                    <input className="input-base" type="date" value={form.next_billing_date ?? ''} onChange={(e) => setForm({ ...form, next_billing_date: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-label-sm" style={{ display: 'block', marginBottom: 4 }}>Dashboard URL</label>
                    <input className="input-base" value={form.dashboard_url ?? ''} onChange={(e) => setForm({ ...form, dashboard_url: e.target.value })} />
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <label className="text-label-sm" style={{ display: 'block', marginBottom: 4 }}>Notes</label>
                  <input className="input-base" value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn-primary btn-sm" onClick={saveEdit}>Save</button>
                  <button className="btn-ghost btn-sm" onClick={() => { setEditing(null); setForm({}) }}>Cancel</button>
                </div>
              </div>
            ) : (
              /* View mode */
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="text-heading-sm">{account.service_name}</span>
                    <span className={`badge ${STATUS_BADGES[account.status] ?? 'badge-neutral'}`}>{account.status}</span>
                    {account.plan_name && <span className="badge badge-neutral">{account.plan_name}</span>}
                  </div>
                  <div className="text-mono-xs" style={{ color: 'var(--text-muted)' }}>
                    {account.billing_email && <span>{account.billing_email} &middot; </span>}
                    {account.billing_cycle ?? 'monthly'}
                    {account.next_billing_date && <span> &middot; Next: {account.next_billing_date}</span>}
                  </div>
                  {account.notes && (
                    <div className="text-body-xs" style={{ color: 'var(--text-muted)', marginTop: 4 }}>{account.notes}</div>
                  )}
                </div>
                <div className="text-data-md" style={{ color: 'var(--text-heading)', whiteSpace: 'nowrap' }}>
                  {fmt(account.monthly_cost, account.currency)}
                  <span className="text-mono-xs" style={{ color: 'var(--text-label)' }}>
                    {account.billing_cycle === 'yearly' ? '/yr' : '/mo'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {account.dashboard_url && (
                    <a href={account.dashboard_url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm" style={{ textDecoration: 'none' }}>Open</a>
                  )}
                  <button className="btn-ghost btn-sm" onClick={() => startEdit(account)}>Edit</button>
                  <button className="btn-danger btn-sm" onClick={() => deleteAccount(account.id)}>Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
