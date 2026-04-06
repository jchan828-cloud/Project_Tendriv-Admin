'use client'

import { useState } from 'react'

interface Transaction {
  id: string
  type: string
  category: string
  vendor: string | null
  description: string | null
  amount: number
  currency: string
  recurring: boolean
  transaction_date: string
  invoice_url: string | null
}

function fmt(value: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(value)
}

const CATEGORY_OPTIONS = [
  'infrastructure', 'ai-services', 'marketing', 'email', 'analytics',
  'hosting', 'domain', 'software', 'consulting', 'subscription', 'other',
]

export function TransactionList({ transactions: initialTx }: { transactions: Transaction[] }) {
  const [transactions, setTransactions] = useState(initialTx)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [form, setForm] = useState({
    type: 'expense' as 'income' | 'expense',
    category: 'infrastructure',
    vendor: '',
    description: '',
    amount: '',
    recurring: false,
    transaction_date: new Date().toISOString().slice(0, 10),
  })

  async function createTransaction() {
    if (!form.amount || Number(form.amount) <= 0) return
    const res = await fetch('/api/finance/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    })
    if (res.ok) {
      const tx = await res.json()
      setTransactions((prev) => [tx, ...prev])
      setForm({ type: 'expense', category: 'infrastructure', vendor: '', description: '', amount: '', recurring: false, transaction_date: new Date().toISOString().slice(0, 10) })
      setShowForm(false)
    }
  }

  const filtered = transactions.filter((t) => filter === 'all' || t.type === filter)

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="text-heading-sm">Recent Transactions</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['all', 'income', 'expense'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={filter === f ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}>
              {f === 'all' ? 'All' : f === 'income' ? 'Income' : 'Expenses'}
            </button>
          ))}
          <button className="btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>+ Add</button>
        </div>
      </div>

      {showForm && (
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)', background: 'var(--surface-sidebar)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <select className="input-base" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'income' | 'expense' })}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <select className="input-base" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>)}
            </select>
            <input className="input-base" type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <input className="input-base" placeholder="Vendor (e.g. Supabase)" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
            <input className="input-base" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input className="input-base" type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} />
              <span className="text-body-sm">Recurring</span>
            </label>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button className="btn-primary btn-sm" onClick={createTransaction}>Save</button>
              <button className="btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }} className="text-body-sm">
            No transactions yet. Add your first income or expense.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-sidebar)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '8px 16px', textAlign: 'left', fontFamily: 'var(--mono-font)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-label)' }}>Date</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--mono-font)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-label)' }}>Type</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--mono-font)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-label)' }}>Category</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--mono-font)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-label)' }}>Vendor</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--mono-font)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-label)' }}>Description</th>
                <th style={{ padding: '8px 16px', textAlign: 'right', fontFamily: 'var(--mono-font)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-label)' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 16px' }}>
                    <span className="text-mono-xs">{tx.transaction_date}</span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span className={`badge ${tx.type === 'income' ? 'badge-success' : 'badge-sovereign'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span className="text-body-sm" style={{ textTransform: 'capitalize' }}>
                      {tx.category.replace(/-/g, ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span className="text-body-sm" style={{ color: 'var(--text-heading)' }}>
                      {tx.vendor ?? '—'}
                    </span>
                    {tx.recurring && <span className="badge badge-warning" style={{ marginLeft: 6 }}>recurring</span>}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
                      {tx.description ?? '—'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                    <span className="text-data-sm" style={{ color: tx.type === 'income' ? 'var(--green)' : 'var(--sovereign)' }}>
                      {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount, tx.currency)}
                    </span>
                    {tx.invoice_url && (
                      <a href={tx.invoice_url} target="_blank" rel="noopener noreferrer" className="text-mono-xs" style={{ marginLeft: 8, color: 'var(--text-link)' }}>
                        receipt
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
