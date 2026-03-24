'use client'

/** MK8-CMS-003: Content calendar — Kanban + List views */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BlogPost, PostStatus, BuyerStageValues } from '@/lib/types/cms'

type ViewMode = 'kanban' | 'list'

const KANBAN_COLUMNS: { status: PostStatus; label: string }[] = [
  { status: 'draft', label: 'Draft' },
  { status: 'review', label: 'Review' },
  { status: 'approved', label: 'Approved' },
  { status: 'published', label: 'Published' },
]

interface CalendarBoardProps {
  posts: BlogPost[]
}

function statusBadge(status: string): string {
  switch (status) {
    case 'draft': return 'badge-neutral'
    case 'review': return 'badge-warning'
    case 'approved': return 'badge-jade'
    case 'published': return 'badge-success'
    case 'archived': return 'badge-purple'
    default: return 'badge-neutral'
  }
}

export function CalendarBoard({ posts }: CalendarBoardProps) {
  const [view, setView] = useState<ViewMode>('kanban')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [stageFilter, setStageFilter] = useState<string>('All')

  // Persist view preference
  useEffect(() => {
    const saved = localStorage.getItem('tendriv-calendar-view')
    if (saved === 'kanban' || saved === 'list') setView(saved)
  }, [])

  const toggleView = (v: ViewMode) => {
    setView(v)
    localStorage.setItem('tendriv-calendar-view', v)
  }

  const scheduledPosts = posts
    .filter((p) => p.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())

  const filteredPosts = posts.filter((p) => {
    if (statusFilter !== 'All' && p.status !== statusFilter) return false
    if (stageFilter !== 'All' && p.buyer_stage !== stageFilter) return false
    return true
  })

  return (
    <div>
      {/* View toggle + New post */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className={`btn-sm ${view === 'kanban' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => toggleView('kanban')}
          >
            Kanban
          </button>
          <button
            className={`btn-sm ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => toggleView('list')}
          >
            List
          </button>
        </div>
        <Link href="/posts/new" className="btn-primary btn-sm">
          New Post
        </Link>
      </div>

      {/* Scheduled strip */}
      {scheduledPosts.length > 0 && (
        <div className="mb-4 flex gap-3 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface-sidebar)] px-4 py-2">
          <span className="text-eyebrow flex-shrink-0 self-center">Scheduled</span>
          {scheduledPosts.map((p) => (
            <Link
              key={p.id}
              href={`/posts/${p.id}`}
              className="flex-shrink-0 text-body-sm text-[var(--text-link)] hover:underline"
            >
              {p.title} · {new Date(p.scheduled_at!).toLocaleDateString('en-CA')}
            </Link>
          ))}
        </div>
      )}

      {/* Views */}
      {view === 'kanban' ? (
        <KanbanView posts={posts} />
      ) : (
        <ListView
          posts={filteredPosts}
          statusFilter={statusFilter}
          stageFilter={stageFilter}
          onStatusFilter={setStatusFilter}
          onStageFilter={setStageFilter}
        />
      )}
    </div>
  )
}

function KanbanView({ posts }: { posts: BlogPost[] }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {KANBAN_COLUMNS.map((col) => {
        const colPosts = posts.filter((p) => p.status === col.status)
        return (
          <div key={col.status} className="kanban-col rounded-lg border border-[var(--border)] bg-[var(--surface-sidebar)] p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-label-sm">{col.label}</span>
              <span className="badge badge-neutral">{colPosts.length}</span>
            </div>
            <div className="space-y-2">
              {colPosts.map((p) => (
                <Link
                  key={p.id}
                  href={`/posts/${p.id}`}
                  className="card block p-3 hover:bg-[var(--surface-hover)]"
                >
                  <p className="text-heading-sm mb-1 truncate">{p.title}</p>
                  <div className="flex flex-wrap gap-1">
                    {p.buyer_stage && <span className="badge badge-jade">{p.buyer_stage}</span>}
                    {p.content_type && <span className="badge badge-neutral">{p.content_type}</span>}
                  </div>
                  {p.target_keyword && (
                    <p className="text-mono-xs mt-1 text-[var(--text-muted)] truncate">{p.target_keyword}</p>
                  )}
                  <p className="text-body-xs mt-1 text-[var(--text-label)]">
                    {new Date(p.updated_at).toLocaleDateString('en-CA')}
                  </p>
                </Link>
              ))}
              {colPosts.length === 0 && (
                <p className="text-body-xs text-center text-[var(--text-label)] py-4">No posts</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ListView({
  posts,
  statusFilter,
  stageFilter,
  onStatusFilter,
  onStageFilter,
}: {
  posts: BlogPost[]
  statusFilter: string
  stageFilter: string
  onStatusFilter: (v: string) => void
  onStageFilter: (v: string) => void
}) {
  return (
    <div>
      {/* Filters */}
      <div className="mb-3 flex gap-3">
        <select
          className="input-base py-1.5 text-body-sm w-auto"
          value={statusFilter}
          onChange={(e) => onStatusFilter(e.target.value)}
        >
          <option>All</option>
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="approved">Approved</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select
          className="input-base py-1.5 text-body-sm w-auto"
          value={stageFilter}
          onChange={(e) => onStageFilter(e.target.value)}
        >
          <option>All</option>
          {BuyerStageValues.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border)] bg-gray-50">
              <th className="text-label-sm px-4 py-3">Title</th>
              <th className="text-label-sm px-4 py-3">Status</th>
              <th className="text-label-sm px-4 py-3">Stage</th>
              <th className="text-label-sm px-4 py-3">Type</th>
              <th className="text-label-sm px-4 py-3">Scheduled</th>
              <th className="text-label-sm px-4 py-3">Words</th>
              <th className="text-label-sm px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">No posts found.</td>
              </tr>
            )}
            {posts.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]">
                <td className="px-4 py-3">
                  <Link href={`/posts/${p.id}`} className="text-body-md font-medium text-[var(--text-heading)] hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${statusBadge(p.status)}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3">
                  {p.buyer_stage && <span className="badge badge-jade">{p.buyer_stage}</span>}
                </td>
                <td className="px-4 py-3">
                  {p.content_type && <span className="badge badge-neutral">{p.content_type}</span>}
                </td>
                <td className="px-4 py-3 text-mono-xs">
                  {p.scheduled_at ? new Date(p.scheduled_at).toLocaleDateString('en-CA') : '—'}
                </td>
                <td className="px-4 py-3 text-mono-xs">{p.word_count}</td>
                <td className="px-4 py-3 text-mono-xs">
                  {new Date(p.updated_at).toLocaleDateString('en-CA')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
