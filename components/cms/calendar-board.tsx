'use client'

/** MK8-CMS-003: Content calendar — Kanban + List views
 *  SEO-009: Adds queue states (queued / generating / failed) with retry.
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PostStatus, BuyerStageValues } from '@/lib/types/cms'
import type { BuyerStage, ContentType } from '@/lib/types/cms'

/** Lightweight subset of BlogPost used by the calendar views */
export type CalendarPost = {
  id: string
  title: string
  status: PostStatus
  buyer_stage: BuyerStage | null
  content_type: ContentType | null
  target_keyword: string | null
  word_count: number
  scheduled_at: string | null
  updated_at: string
  generation_error: string | null
  generation_attempts: number
}

type ViewMode = 'kanban' | 'list'

const KANBAN_COLUMNS: { status: PostStatus; label: string }[] = [
  { status: 'queued', label: 'Queued' },
  { status: 'generating', label: 'Generating' },
  { status: 'review', label: 'Review' },
  { status: 'approved', label: 'Approved' },
  { status: 'published', label: 'Published' },
  { status: 'failed', label: 'Failed' },
]

interface CalendarBoardProps {
  posts: CalendarPost[]
}

function statusBadge(status: string): string {
  switch (status) {
    case 'queued': return 'badge-neutral'
    case 'generating': return 'badge-jade'
    case 'draft': return 'badge-neutral'
    case 'review': return 'badge-warning'
    case 'approved': return 'badge-jade'
    case 'scheduled': return 'badge-jade'
    case 'published': return 'badge-success'
    case 'archived': return 'badge-purple'
    case 'failed': return 'badge-danger'
    default: return 'badge-neutral'
  }
}

export function CalendarBoard({ posts }: CalendarBoardProps) {
  const router = useRouter()
  const [view, setView] = useState<ViewMode>('kanban')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [stageFilter, setStageFilter] = useState<string>('All')
  const [busy, setBusy] = useState<string | null>(null)

  const handleDelete = useCallback(async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setBusy(id)
    try {
      const res = await fetch(`/api/marketing/posts/${id}`, { method: 'DELETE' })
      if (res.ok) router.refresh()
      else alert('Failed to delete post.')
    } catch { alert('Failed to delete post.') }
    finally { setBusy(null) }
  }, [router])

  const handleRetry = useCallback(async (id: string) => {
    setBusy(id)
    try {
      const res = await fetch(`/api/blog/posts/${id}/retry`, { method: 'POST' })
      if (res.ok) router.refresh()
      else {
        const data = await res.json().catch(() => ({}))
        alert(data.error ?? 'Retry failed.')
      }
    } catch { alert('Retry failed.') }
    finally { setBusy(null) }
  }, [router])

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
        <KanbanView posts={posts} busy={busy} onDelete={handleDelete} onRetry={handleRetry} />
      ) : (
        <ListView
          posts={filteredPosts}
          statusFilter={statusFilter}
          stageFilter={stageFilter}
          onStatusFilter={setStatusFilter}
          onStageFilter={setStageFilter}
          busy={busy}
          onDelete={handleDelete}
          onRetry={handleRetry}
        />
      )}
    </div>
  )
}

interface RowActionProps {
  busy: string | null
  onDelete: (id: string, title: string) => void
  onRetry: (id: string) => void
}

function KanbanView({ posts, busy, onDelete, onRetry }: { posts: CalendarPost[] } & RowActionProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
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
                <div key={p.id} className="card p-3 hover:bg-[var(--surface-hover)] group relative">
                  <Link href={`/posts/${p.id}`} className="block">
                    <p className="text-heading-sm mb-1 truncate">{p.title}</p>
                    <div className="flex flex-wrap gap-1">
                      {p.buyer_stage && <span className="badge badge-jade">{p.buyer_stage}</span>}
                      {p.content_type && <span className="badge badge-neutral">{p.content_type}</span>}
                      {p.generation_attempts > 0 && p.status !== 'review' && p.status !== 'published' && (
                        <span className="badge badge-neutral">try {p.generation_attempts}</span>
                      )}
                    </div>
                    {p.target_keyword && (
                      <p className="text-mono-xs mt-1 text-[var(--text-muted)] truncate">{p.target_keyword}</p>
                    )}
                    {p.status === 'failed' && p.generation_error && (
                      <p className="text-mono-xs mt-2 text-[var(--status-danger)] line-clamp-2" title={p.generation_error}>
                        {p.generation_error}
                      </p>
                    )}
                    <p className="text-body-xs mt-1 text-[var(--text-label)]">
                      {new Date(p.updated_at).toLocaleDateString('en-CA')}
                    </p>
                  </Link>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {p.status === 'failed' && (
                      <button
                        onClick={() => onRetry(p.id)}
                        disabled={busy === p.id}
                        className="text-[var(--text-link)] hover:bg-[var(--text-link)]/10 rounded px-1.5 py-0.5 text-body-xs"
                        title="Retry generation"
                      >
                        {busy === p.id ? '...' : 'Retry'}
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(p.id, p.title)}
                      disabled={busy === p.id}
                      className="text-[var(--status-danger)] hover:bg-[var(--status-danger)]/10 rounded px-1.5 py-0.5 text-body-xs"
                      title="Delete post"
                    >
                      {busy === p.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
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
  busy,
  onDelete,
  onRetry,
}: {
  posts: CalendarPost[]
  statusFilter: string
  stageFilter: string
  onStatusFilter: (v: string) => void
  onStageFilter: (v: string) => void
} & RowActionProps) {
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
          <option value="queued">Queued</option>
          <option value="generating">Generating</option>
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="approved">Approved</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
          <option value="failed">Failed</option>
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
              <th className="text-label-sm px-4 py-3">Words</th>
              <th className="text-label-sm px-4 py-3">Updated</th>
              <th className="text-label-sm px-4 py-3"></th>
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
                  {p.status === 'failed' && p.generation_error && (
                    <p className="text-mono-xs mt-1 text-[var(--status-danger)] line-clamp-2" title={p.generation_error}>
                      {p.generation_error}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${statusBadge(p.status)}`}>{p.status}</span>
                  {p.generation_attempts > 0 && p.status !== 'review' && p.status !== 'published' && (
                    <span className="ml-1 text-mono-xs text-[var(--text-muted)]">×{p.generation_attempts}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {p.buyer_stage && <span className="badge badge-jade">{p.buyer_stage}</span>}
                </td>
                <td className="px-4 py-3">
                  {p.content_type && <span className="badge badge-neutral">{p.content_type}</span>}
                </td>
                <td className="px-4 py-3 text-mono-xs">{p.word_count}</td>
                <td className="px-4 py-3 text-mono-xs">
                  {new Date(p.updated_at).toLocaleDateString('en-CA')}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {p.status === 'failed' && (
                    <button
                      onClick={() => onRetry(p.id)}
                      disabled={busy === p.id}
                      className="text-body-xs text-[var(--text-link)] hover:underline disabled:opacity-50 mr-2"
                    >
                      {busy === p.id ? '...' : 'Retry'}
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(p.id, p.title)}
                    disabled={busy === p.id}
                    className="text-body-xs text-[var(--status-danger)] hover:underline disabled:opacity-50"
                  >
                    {busy === p.id ? '...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
