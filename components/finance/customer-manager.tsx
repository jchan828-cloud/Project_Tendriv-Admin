'use client'

import { useState } from 'react'

interface Customer {
  id: string; name: string; email: string; tier_id: string; tier_name: string | null;
  status: string; mrr: number; acquisition_channel: string; acquisition_cost: number;
  first_payment_date: string; notes: string
}

interface Tier {
  id: string; name: string; monthly_price: number
}

function fmt(value: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value)
}

const STATUS_BADGES: Record<string, string> = { active: 'badge-success', trial: 'badge-warning', churned: 'badge-sovereign', paused: 'badge-neutral' }
const CHANNELS = ['organic', 'paid-ad', 'referral', 'outbound', 'partnership', 'event', 'other']

export function CustomerManager({ customers: initial, tiers }: { customers: Customer[]; tiers: Tier[] }) {
  const [customers, setCustomers] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'churned' | 'trial'>('all')
  const [form, setForm] = useState({
    name: '', email: '', tier_id: tiers[0]?.id ?? '', mrr: '',
    acquisition_channel: 'organic', acquisition_cost: '', first_payment_date: '', notes: '',
  })

  async function createCustomer() {
    if (!form.name.trim()) return
    const res = await fetch('/api/finance/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        mrr: parseFloat(form.mrr) || 0,
        acquisition_cost: parseFloat(form.acquisition_cost) || 0,
      }),
    })
    if (res.ok) {
      const customer = await res.json()
      const tier = customer.customer_tiers as Record<string, unknown> | null
      setCustomers((prev) => [{
        id: customer.id, name: customer.name, email: customer.email ?? '',
        tier_id: customer.tier_id ?? '', tier_name: tier ? (tier.name as string) : null,
        status: customer.status, mrr: Number(customer.mrr ?? 0),
        acquisition_channel: customer.acquisition_channel ?? '',
        acquisition_cost: Number(customer.acquisition_cost ?? 0),
        first_payment_date: customer.first_payment_date ?? '', notes: customer.notes ?? '',
      }, ...prev])
      setForm({ name: '', email: '', tier_id: tiers[0]?.id ?? '', mrr: '', acquisition_channel: 'organic', acquisition_cost: '', first_payment_date: '', notes: '' })
      setShowForm(false)
    }
  }

  const filtered = customers.filter((c) => filter === 'all' || c.status === filter)
  const totalMrr = customers.filter((c) => c.status === 'active').reduce((s, c) => s + c.mrr, 0)
  const avgCac = customers.length > 0 ? customers.reduce((s, c) => s + c.acquisition_cost, 0) / customers.length : 0

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: '10px 16px' }}>
          <div className="card-kicker">Total</div>
          <div className="text-data-md" style={{ color: 'var(--text-heading)' }}>{customers.length}</div>
        </div>
        <div className="card" style={{ padding: '10px 16px' }}>
          <div className="card-kicker">Active</div>
          <div className="text-data-md" style={{ color: 'var(--green)' }}>{customers.filter((c) => c.status === 'active').length}</div>
        </div>
        <div className="card" style={{ padding: '10px 16px' }}>
          <div className="card-kicker">Total MRR</div>
          <div className="text-data-md" style={{ color: 'var(--jade)' }}>{fmt(totalMrr)}</div>
        </div>
        <div className="card" style={{ padding: '10px 16px' }}>
          <div className="card-kicker">Avg CAC</div>
          <div className="text-data-md" style={{ color: 'var(--blue)' }}>{fmt(avgCac)}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        {(['all', 'active', 'trial', 'churned'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={filter === f ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>+ Add Customer</button>
        </div>
      </div>

      {/* New customer form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <input className="input-base" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input-base" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <select className="input-base" value={form.tier_id} onChange={(e) => setForm({ ...form, tier_id: e.target.value })}>
              <option value="">No tier</option>
              {tiers.map((t) => <option key={t.id} value={t.id}>{t.name} ({fmt(t.monthly_price)}/mo)</option>)}
            </select>
            <input className="input-base" type="number" placeholder="MRR" value={form.mrr} onChange={(e) => setForm({ ...form, mrr: e.target.value })} />
            <select className="input-base" value={form.acquisition_channel} onChange={(e) => setForm({ ...form, acquisition_channel: e.target.value })}>
              {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className="input-base" type="number" placeholder="Acquisition cost" value={form.acquisition_cost} onChange={(e) => setForm({ ...form, acquisition_cost: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn-primary btn-sm" onClick={createCustomer}>Save</button>
            <button className="btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-sidebar)', borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Email', 'Tier', 'Status', 'MRR', 'Channel', 'CAC'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: h === 'MRR' || h === 'CAC' ? 'right' : 'left', fontFamily: 'var(--mono-font)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-label)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No customers found</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--text-heading)' }}>{c.name}</td>
                    <td style={{ padding: '8px 12px' }} className="text-mono-xs">{c.email || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{c.tier_name ? <span className="badge badge-jade">{c.tier_name}</span> : <span className="text-mono-xs" style={{ color: 'var(--text-label)' }}>—</span>}</td>
                    <td style={{ padding: '8px 12px' }}><span className={`badge ${STATUS_BADGES[c.status] ?? 'badge-neutral'}`}>{c.status}</span></td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }} className="text-mono-sm">{fmt(c.mrr)}</td>
                    <td style={{ padding: '8px 12px', textTransform: 'capitalize' }}>{c.acquisition_channel || '—'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }} className="text-mono-sm">{fmt(c.acquisition_cost)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
