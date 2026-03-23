'use client'

import { useState } from 'react'
import Link from 'next/link'

type ContactSummary = {
  id: string
  business_name: string
  province: string | null
  pipeline: string
  status: string
  last_activity_at: string | null
}

const STATUS_DOT: Record<string, string> = {
  prospect: 'bg-[var(--ink-20)]',
  contacted: 'bg-amber-400',
  replied: 'bg-blue-500',
  demo: 'bg-purple-500',
  converted: 'bg-[var(--jade)]',
}

const PIPELINE_AVATAR: Record<string, string> = {
  psib: 'bg-[var(--purple-bg)] text-purple-700',
  geo: 'bg-[var(--blue-bg)] text-blue-700',
  manual: 'bg-[var(--ink-05)] text-[var(--ink-20)]',
}

const FILTERS = ['All', 'PSIB', 'Geo', 'Replied'] as const

function timeAgo(date: string | null): string {
  if (!date) return '—'
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d'
  return `${days}d`
}

function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function CrmContactList({
  contacts,
  activeId,
}: {
  contacts: ContactSummary[]
  activeId?: string
}) {
  const [filter, setFilter] = useState<string>('All')
  const [search, setSearch] = useState('')

  const filtered = contacts
    .filter(c => {
      if (filter === 'PSIB') return c.pipeline === 'psib'
      if (filter === 'Geo') return c.pipeline === 'geo'
      if (filter === 'Replied') return c.status === 'replied'
      return true
    })
    .filter(c => !search || c.business_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <div className="p-3 space-y-2 border-b border-border">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-base w-full"
          placeholder="Search contacts…"
          aria-label="Search contacts"
        />
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-[var(--jade)] text-white'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'
              }`}
              aria-label={`Filter contacts: ${f}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map(c => (
          <Link
            key={c.id}
            href={`/crm/${c.id}`}
            className={`flex items-center gap-3 px-3 py-2.5 border-b border-border transition-colors ${
              c.id === activeId
                ? 'border-l-2 border-l-[var(--brand-primary)] bg-[var(--jade-10)]'
                : 'hover:bg-[var(--surface-hover)]'
            }`}
          >
            <div
              className={`h-8 w-8 flex-shrink-0 rounded-lg flex items-center justify-center text-xs font-medium ${
                PIPELINE_AVATAR[c.pipeline] ?? 'bg-[var(--ink-05)] text-[var(--ink-20)]'
              }`}
            >
              {initials(c.business_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-medium truncate">{c.business_name}</p>
              <p className="text-mono-xs text-[var(--text-muted)] truncate">
                {c.province ?? '—'} · {c.pipeline}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span
                className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[c.status] ?? 'bg-gray-300'}`}
              />
              <span className="text-mono-xs text-[var(--text-muted)]">
                {timeAgo(c.last_activity_at)}
              </span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="p-4 text-body-sm text-[var(--text-muted)] text-center">No contacts found</p>
        )}
      </div>
    </>
  )
}
