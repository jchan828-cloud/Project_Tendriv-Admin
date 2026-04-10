// components/blog/topic-table.tsx
'use client'

import { useState, useTransition } from 'react'
import { upsertTopic, setTopicActive, deleteTopic } from '@/lib/actions/blog-settings'
import type { BlogPipelineTopic } from '@/lib/types/blog-settings'

const TIERS = ['enterprise', 'smb', 'psib'] as const

const TIER_BADGE: Record<string, string> = {
  enterprise: 'badge badge-info',
  smb: 'badge badge-warning',
  psib: 'badge badge-purple',
}

function TopicRow({ topic }: { topic: BlogPipelineTopic }) {
  const [editing, setEditing] = useState(false)
  const [relevance, setRelevance] = useState(topic.relevance)
  const [tier, setTier] = useState(topic.tier)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSaveEdit() {
    setError(null)
    startTransition(async () => {
      const result = await upsertTopic(topic.id, {
        title: topic.title,
        source: topic.source,
        source_url: topic.source_url,
        relevance,
        tier,
      })
      if (result.error) { setError(result.error); return }
      setEditing(false)
    })
  }

  function handleToggle() {
    startTransition(async () => {
      await setTopicActive(topic.id, !topic.active)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteTopic(topic.id)
    })
  }

  return (
    <tr className={`border-b ${!topic.active ? 'opacity-50' : ''}`}>
      <td className="py-2 pr-4 text-body-sm font-medium">{topic.title}</td>
      <td className="py-2 pr-4">
        {editing ? (
          <select
            value={tier}
            onChange={e => setTier(e.target.value as BlogPipelineTopic['tier'])}
            className="input-base text-xs py-0.5"
          >
            {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        ) : (
          <span className={TIER_BADGE[topic.tier] ?? 'badge'}>{topic.tier}</span>
        )}
      </td>
      <td className="py-2 pr-4">
        {editing ? (
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={relevance}
            onChange={e => {
              const parsed = parseFloat(e.target.value)
              if (!isNaN(parsed)) setRelevance(parsed)
            }}
            className="input-base w-20 text-xs py-0.5"
          />
        ) : (
          <span className="text-mono-xs text-[var(--text-muted)]">{topic.relevance.toFixed(2)}</span>
        )}
      </td>
      <td className="py-2 pr-4">
        <span className="text-mono-xs text-[var(--text-muted)] truncate max-w-[160px] block">{topic.source}</span>
      </td>
      <td className="py-2 text-right space-x-2 whitespace-nowrap">
        {error && <span className="text-xs text-[var(--sovereign)] mr-2">{error}</span>}
        {editing ? (
          <>
            <button onClick={handleSaveEdit} disabled={isPending} className="btn-primary btn-sm">
              {isPending ? '…' : 'Save'}
            </button>
            <button onClick={() => { setEditing(false); setRelevance(topic.relevance); setTier(topic.tier) }} className="btn-ghost btn-sm">
              Cancel
            </button>
          </>
        ) : confirmDelete ? (
          <>
            <span className="text-xs text-[var(--sovereign)]">Delete?</span>
            <button onClick={handleDelete} disabled={isPending} className="btn-danger btn-sm">
              {isPending ? '…' : 'Confirm'}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="btn-ghost btn-sm">Cancel</button>
          </>
        ) : (
          <>
            <button onClick={handleToggle} disabled={isPending} className="btn-ghost btn-sm">
              {topic.active ? 'Disable' : 'Enable'}
            </button>
            <button onClick={() => setEditing(true)} className="btn-ghost btn-sm">Edit</button>
            <button onClick={() => setConfirmDelete(true)} className="btn-danger btn-sm">Delete</button>
          </>
        )}
      </td>
    </tr>
  )
}

export function TopicTable({ topics }: { topics: BlogPipelineTopic[] }) {
  if (topics.length === 0) {
    return <p className="text-body-sm text-[var(--text-muted)] py-4">No topics yet. Add one below.</p>
  }
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b text-xs text-[var(--text-muted)]">
          <th className="pb-2 pr-4">Title</th>
          <th className="pb-2 pr-4">Tier</th>
          <th className="pb-2 pr-4">Relevance</th>
          <th className="pb-2 pr-4">Source</th>
          <th className="pb-2 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {topics.map(topic => <TopicRow key={topic.id} topic={topic} />)}
      </tbody>
    </table>
  )
}
