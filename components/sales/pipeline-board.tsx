'use client'

import { useState } from 'react'

const STAGES = [
  { key: 'lead', label: 'Lead', color: 'var(--ink-20)' },
  { key: 'qualified', label: 'Qualified', color: 'var(--blue)' },
  { key: 'proposal', label: 'Proposal', color: 'var(--purple)' },
  { key: 'negotiation', label: 'Negotiation', color: 'var(--amber)' },
  { key: 'won', label: 'Won', color: 'var(--green)' },
  { key: 'lost', label: 'Lost', color: 'var(--sovereign)' },
] as const

interface Deal {
  id: string
  title: string
  value: number
  currency: string
  stage: string
  notes: string | null
  expected_close_date: string | null
  outreach_contacts: { business_name: string; contact_email: string } | null
  abm_accounts: { name: string } | null
}

interface PipelineBoardProps {
  deals: Deal[]
}

export function PipelineBoard({ deals: initialDeals }: PipelineBoardProps) {
  const [deals, setDeals] = useState(initialDeals)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [showNewDeal, setShowNewDeal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newValue, setNewValue] = useState('')

  async function moveDeal(dealId: string, newStage: string) {
    setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, stage: newStage } : d))
    await fetch(`/api/sales/deals/${dealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    })
  }

  async function createDeal() {
    if (!newTitle.trim()) return
    const res = await fetch('/api/sales/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), value: parseFloat(newValue) || 0 }),
    })
    if (res.ok) {
      const deal = await res.json()
      setDeals((prev) => [{ ...deal, outreach_contacts: null, abm_accounts: null }, ...prev])
      setNewTitle('')
      setNewValue('')
      setShowNewDeal(false)
    }
  }

  function formatCurrency(value: number, currency: string) {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(value)
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        {!showNewDeal ? (
          <button className="btn-primary btn-sm" onClick={() => setShowNewDeal(true)}>
            + New Deal
          </button>
        ) : (
          <div className="card" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', padding: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="text-label-sm" style={{ display: 'block', marginBottom: 4 }}>Title</label>
              <input className="input-base" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Deal title" />
            </div>
            <div style={{ width: 140 }}>
              <label className="text-label-sm" style={{ display: 'block', marginBottom: 4 }}>Value (CAD)</label>
              <input className="input-base" type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="0" />
            </div>
            <button className="btn-primary btn-sm" onClick={createDeal}>Create</button>
            <button className="btn-ghost btn-sm" onClick={() => setShowNewDeal(false)}>Cancel</button>
          </div>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${STAGES.length}, minmax(180px, 1fr))`,
        gap: 12,
        overflowX: 'auto',
      }}>
        {STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.key)
          const totalValue = stageDeals.reduce((sum, d) => sum + (d.value ?? 0), 0)

          return (
            <div
              key={stage.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (draggedId) moveDeal(draggedId, stage.key)
                setDraggedId(null)
              }}
              style={{
                background: 'var(--surface-sidebar)',
                borderRadius: 'calc(var(--radius) * 1.5)',
                padding: 8,
                minHeight: 300,
              }}
            >
              {/* Column header */}
              <div style={{ padding: '8px 8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
                  <span className="text-label-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {stage.label}
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: 9 }}>{stageDeals.length}</span>
                </div>
                {totalValue > 0 && (
                  <span className="text-mono-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatCurrency(totalValue, 'CAD')}
                  </span>
                )}
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {stageDeals.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => setDraggedId(deal.id)}
                    onDragEnd={() => setDraggedId(null)}
                    className="card"
                    style={{
                      padding: 12,
                      cursor: 'grab',
                      opacity: draggedId === deal.id ? 0.5 : 1,
                      transition: 'opacity var(--duration-fast) ease, box-shadow var(--duration-fast) ease',
                    }}
                  >
                    <div className="text-body-sm" style={{ fontWeight: 500, color: 'var(--text-heading)', marginBottom: 4 }}>
                      {deal.title}
                    </div>
                    {deal.value > 0 && (
                      <div className="text-data-sm" style={{ color: stage.color, marginBottom: 4 }}>
                        {formatCurrency(deal.value, deal.currency ?? 'CAD')}
                      </div>
                    )}
                    {deal.outreach_contacts && (
                      <div className="text-mono-xs" style={{ color: 'var(--text-muted)' }}>
                        {deal.outreach_contacts.business_name}
                      </div>
                    )}
                    {deal.abm_accounts && (
                      <div className="text-mono-xs" style={{ color: 'var(--text-muted)' }}>
                        {deal.abm_accounts.name}
                      </div>
                    )}
                    {deal.expected_close_date && (
                      <div className="text-mono-xs" style={{ color: 'var(--text-label)', marginTop: 4 }}>
                        Close: {deal.expected_close_date}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
