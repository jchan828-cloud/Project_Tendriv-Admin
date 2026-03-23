'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { DraftSummary } from '@/lib/types/admin-drafts'

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-amber-400',
  approved: 'bg-[var(--jade)]',
  rejected: 'bg-[var(--sovereign)]',
  published: 'bg-green-500',
}

const TIER_BADGE: Record<string, string> = {
  enterprise: 'badge badge-info',
  smb: 'badge badge-warning',
  psib: 'badge badge-purple',
  public: 'badge badge-neutral',
}

const FILTERS = ['All', 'Pending', 'PIR'] as const

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d'
  return `${days}d`
}

export function DraftIndexList({ drafts, activeId }: { drafts: DraftSummary[]; activeId: string }) {
  const [filter, setFilter] = useState<string>('All')

  const filtered = filter === 'All'
    ? drafts
    : filter === 'Pending'
      ? drafts.filter(d => d.status === 'pending')
      : drafts.filter(d => d.status === 'pending' || d.status === 'approved')

  return (
    <>
      <div className="flex gap-1 p-3 border-b border-border">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-[var(--jade)] text-white'
                : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'
            }`}
            aria-label={`Filter drafts: ${f}`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map(d => (
          <Link
            key={d.id}
            href={`/drafts/${d.id}`}
            className={`block px-3 py-2.5 border-b border-border transition-colors ${
              d.id === activeId
                ? 'border-l-2 border-l-[var(--brand-primary)] bg-[var(--jade-10)]'
                : 'hover:bg-[var(--surface-hover)]'
            }`}
          >
            <p className="text-body-sm font-medium line-clamp-2">{d.title}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[d.status] ?? 'bg-gray-300'}`} />
              <span className={TIER_BADGE[d.tier] ?? 'badge badge-neutral'}>{d.tier}</span>
              <span className="text-mono-xs text-[var(--text-muted)] ml-auto">{timeAgo(d.created_at)}</span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="p-4 text-body-sm text-[var(--text-muted)] text-center">No drafts</p>
        )}
      </div>
    </>
  )
}
