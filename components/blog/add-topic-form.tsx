// components/blog/add-topic-form.tsx
'use client'

import { useState, useTransition } from 'react'
import { upsertTopic } from '@/lib/actions/blog-settings'

const TIERS = ['enterprise', 'smb', 'psib'] as const

const EMPTY = { title: '', source: '', source_url: '', relevance: 0.5, tier: 'smb' as const }

export function AddTopicForm() {
  const [form, setForm] = useState(EMPTY)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!form.title.trim() || !form.source.trim() || !form.source_url.trim()) {
      setError('Title, source, and source URL are required')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await upsertTopic(null, form)
      if (result.error) {
        setError(result.error)
      } else {
        setForm(EMPTY)
        setOpen(false)
      }
    })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost btn-sm">
        + Add topic
      </button>
    )
  }

  return (
    <div className="card p-4 space-y-3">
      <h3 className="text-label-sm text-[var(--text-muted)]">New topic</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-label-sm text-[var(--text-muted)]">Title</label>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="input-base w-full mt-1"
            placeholder="IT Professional Services"
          />
        </div>
        <div>
          <label className="text-label-sm text-[var(--text-muted)]">Source</label>
          <input
            value={form.source}
            onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
            className="input-base w-full mt-1"
            placeholder="CanadaBuys"
          />
        </div>
        <div>
          <label className="text-label-sm text-[var(--text-muted)]">Source URL</label>
          <input
            value={form.source_url}
            onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))}
            className="input-base w-full mt-1"
            placeholder="https://canadabuys.canada.ca/..."
          />
        </div>
        <div>
          <label className="text-label-sm text-[var(--text-muted)]">Relevance (0–1)</label>
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={form.relevance}
            onChange={e => setForm(f => ({ ...f, relevance: parseFloat(e.target.value) }))}
            className="input-base w-full mt-1"
          />
        </div>
        <div>
          <label className="text-label-sm text-[var(--text-muted)]">Tier</label>
          <select
            value={form.tier}
            onChange={e => setForm(f => ({ ...f, tier: e.target.value as typeof form.tier }))}
            className="input-base w-full mt-1"
          >
            {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      {error && <p className="text-body-sm text-[var(--sovereign)]">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={isPending} className={`btn-primary btn-sm ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
          {isPending ? 'Adding…' : 'Add topic'}
        </button>
        <button onClick={() => { setOpen(false); setError(null) }} className="btn-ghost btn-sm">Cancel</button>
      </div>
    </div>
  )
}
