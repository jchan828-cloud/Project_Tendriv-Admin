'use client'

import { useState, useTransition } from 'react'
import type { BlogDraft } from '@/lib/types/admin-drafts'

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge badge-warning',
  approved: 'badge badge-jade',
  rejected: 'badge badge-sovereign',
  published: 'badge badge-success',
}

const TIER_BADGE: Record<string, string> = {
  enterprise: 'badge badge-info',
  smb: 'badge badge-warning',
  psib: 'badge badge-purple',
  public: 'badge badge-neutral',
}

const TABS = ['Preview', 'MDX source', 'Diff'] as const
type Tab = typeof TABS[number]

type LineKind = 'heading' | 'code-fence' | 'code' | 'frontmatter' | 'link' | 'image' | 'blockquote' | 'bold' | 'list' | 'normal'

function classifyLines(content: string): { kind: LineKind; text: string }[] {
  const lines = content.split('\n')
  const result: { kind: LineKind; text: string }[] = []
  let inCode = false
  let inFrontmatter = false
  let lineIndex = 0

  for (const line of lines) {
    if (lineIndex === 0 && line === '---') { inFrontmatter = true; result.push({ kind: 'frontmatter', text: line }); lineIndex++; continue }
    if (inFrontmatter) { result.push({ kind: 'frontmatter', text: line }); if (line === '---') inFrontmatter = false; lineIndex++; continue }
    if (/^```/.test(line)) { result.push({ kind: 'code-fence', text: line }); inCode = !inCode; lineIndex++; continue }
    if (inCode) { result.push({ kind: 'code', text: line }); lineIndex++; continue }
    if (/^#{1,6}\s/.test(line)) { result.push({ kind: 'heading', text: line }); lineIndex++; continue }
    if (/^!\[/.test(line)) { result.push({ kind: 'image', text: line }); lineIndex++; continue }
    if (/\[.*]\(.*\)/.test(line)) { result.push({ kind: 'link', text: line }); lineIndex++; continue }
    if (/^>\s/.test(line)) { result.push({ kind: 'blockquote', text: line }); lineIndex++; continue }
    if (/\*\*.*\*\*/.test(line)) { result.push({ kind: 'bold', text: line }); lineIndex++; continue }
    if (/^[-*]\s/.test(line)) { result.push({ kind: 'list', text: line }); lineIndex++; continue }
    result.push({ kind: 'normal', text: line }); lineIndex++
  }
  return result
}

function contentStats(content: string) {
  const words = content.split(/\s+/).filter(Boolean).length
  const lines = content.split('\n')
  const headings = lines.filter(l => /^#{1,6}\s/.test(l)).length
  const codeBlocks = lines.filter(l => /^```/.test(l)).length / 2
  const links = lines.filter(l => /\[.*]\(.*\)/.test(l)).length
  const images = lines.filter(l => /^!\[/.test(l)).length
  const lists = lines.filter(l => /^[-*]\s/.test(l)).length
  return { words, headings, codeBlocks: Math.floor(codeBlocks), links, images, lists, lines: lines.length }
}

const LINE_COLOR: Record<LineKind, string> = {
  heading: 'text-[var(--jade-dim)] font-medium',
  'code-fence': 'text-purple-400 font-medium',
  code: 'text-purple-600',
  frontmatter: 'text-[var(--text-muted)] italic',
  link: 'text-blue-600',
  image: 'text-teal-600',
  blockquote: 'text-amber-500 italic',
  bold: 'text-[var(--text-heading)] font-medium',
  list: 'text-amber-600',
  normal: 'text-[var(--text-body)]',
}

const KIND_LABEL: Record<LineKind, string> = {
  heading: 'H', 'code-fence': '```', code: 'COD', frontmatter: 'FM',
  link: 'LNK', image: 'IMG', blockquote: 'BQ', bold: 'B', list: 'LST', normal: '',
}

const KIND_LABEL_COLOR: Record<LineKind, string> = {
  heading: 'text-[var(--jade-dim)]', 'code-fence': 'text-purple-400', code: 'text-purple-600',
  frontmatter: 'text-[var(--text-muted)]', link: 'text-blue-600', image: 'text-teal-600',
  blockquote: 'text-amber-500', bold: 'text-[var(--text-heading)]', list: 'text-amber-600', normal: 'text-transparent',
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

export function DraftDeskClient({ draft }: { draft: BlogDraft }) {
  const [tab, setTab] = useState<Tab>('Preview')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState(draft.status)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function handleApprove() {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/admin/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', reviewer_notes: notes }),
      })
      if (!res.ok) {
        setError('Update failed — try again')
        setTimeout(() => setError(null), 5000)
        return
      }
      setStatus('approved')
      await navigator.clipboard.writeText(draft.content ?? '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function handleReject() {
    if (!notes.trim()) return
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/admin/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', reviewer_notes: notes }),
      })
      if (!res.ok) {
        setError('Update failed — try again')
        setTimeout(() => setError(null), 5000)
        return
      }
      setStatus('rejected')
      setNotes('')
    })
  }

  function handleCopyMdx() {
    navigator.clipboard.writeText(draft.content ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-heading-md">{draft.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={STATUS_BADGE[status] ?? 'badge'}>{status}</span>
          <span className={TIER_BADGE[draft.tier] ?? 'badge badge-neutral'}>{draft.tier}</span>
          <span className="badge">{draft.type}</span>
          <span className="text-mono-xs text-[var(--text-muted)]">{draft.generated_by}</span>
          <span className="text-mono-xs text-[var(--text-muted)]">{timeAgo(draft.created_at)}</span>
        </div>
      </div>

      {/* Tab row */}
      <div className="flex border-b border-border px-4">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-body-sm font-medium transition-colors ${
              tab === t
                ? 'border-b-2 border-[var(--brand-primary)] text-[var(--jade-dim)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-body)]'
            }`}
            aria-label={`${t} tab`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'Preview' && (
          <div className="p-6 text-body-sm leading-relaxed whitespace-pre-wrap">
            {draft.content ?? 'No content'}
          </div>
        )}
        {tab === 'MDX source' && (
          <pre className="p-6 text-mono-xs leading-relaxed bg-[var(--ink-05)] min-h-full overflow-x-auto whitespace-pre-wrap">
            {draft.content ?? 'No content'}
          </pre>
        )}
        {tab === 'Diff' && (
          <div className="bg-[var(--ink-05)] min-h-full">
            {draft.content ? (() => {
              const stats = contentStats(draft.content)
              const classified = classifyLines(draft.content)
              return (
                <>
                  <div className="flex items-center gap-4 px-6 py-3 border-b border-border">
                    <span className="text-mono-xs font-medium text-[var(--text-heading)]">Analysis</span>
                    <span className="text-mono-xs text-[var(--text-muted)]">{stats.words} words</span>
                    <span className="text-mono-xs text-[var(--text-muted)]">{stats.lines} lines</span>
                    <span className="text-mono-xs text-[var(--jade-dim)]">{stats.headings} headings</span>
                    <span className="text-mono-xs text-purple-600">{stats.codeBlocks} code blocks</span>
                    <span className="text-mono-xs text-blue-600">{stats.links} links</span>
                    {stats.images > 0 && <span className="text-mono-xs text-teal-600">{stats.images} images</span>}
                    {stats.lists > 0 && <span className="text-mono-xs text-amber-600">{stats.lists} list items</span>}
                  </div>
                  <pre className="text-mono-xs leading-6 overflow-x-auto">
                    {classified.map((line, i) => (
                      <div key={i} className="flex hover:bg-[var(--surface-hover)]">
                        <span className="w-10 flex-shrink-0 text-right pr-3 text-[var(--text-muted)] select-none border-r border-border">
                          {i + 1}
                        </span>
                        <span className={`w-8 flex-shrink-0 text-center text-[10px] leading-6 select-none ${KIND_LABEL_COLOR[line.kind]}`}>
                          {KIND_LABEL[line.kind]}
                        </span>
                        <span className={`pl-2 flex-1 whitespace-pre-wrap ${LINE_COLOR[line.kind]}`}>
                          {line.text || '\u00A0'}
                        </span>
                      </div>
                    ))}
                  </pre>
                </>
              )
            })() : (
              <p className="p-6 text-body-sm text-[var(--text-muted)] text-center">No content</p>
            )}
          </div>
        )}
      </div>

      {/* Decision bar — pending only */}
      {status === 'pending' && (
        <div className="border-t border-border p-4 flex items-center gap-3">
          <label className="text-label-sm text-[var(--text-muted)] flex-shrink-0">Note</label>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="input-base flex-1"
            placeholder="Reviewer notes"
            aria-label="Reviewer notes"
          />
          <button
            onClick={handleReject}
            disabled={isPending}
            className={`btn-danger btn-sm ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
            aria-label="Reject draft"
          >
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={isPending}
            className={`btn-primary btn-sm ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
            aria-label="Approve and copy MDX"
          >
            {isPending ? 'Saving…' : copied ? 'MDX copied ✓' : 'Approve + Copy MDX'}
          </button>
          {error && <p className="text-body-sm text-[var(--sovereign)]">{error}</p>}
        </div>
      )}

      {/* Status bar — approved */}
      {status === 'approved' && (
        <div className="border-t border-[rgba(0,200,150,0.20)] bg-[var(--jade-10)] p-4 flex items-center gap-3">
          <span className="badge badge-jade">Approved</span>
          <button onClick={handleCopyMdx} className="btn-ghost btn-sm ml-auto" aria-label="Copy MDX">
            {copied ? 'MDX copied ✓' : 'Copy MDX'}
          </button>
        </div>
      )}

      {/* Status bar — published */}
      {status === 'published' && (
        <div className="border-t bg-[var(--green-bg)] p-4 flex items-center gap-3">
          <span className="badge badge-success">Published</span>
        </div>
      )}

      {/* Status bar — rejected */}
      {status === 'rejected' && (
        <div className="border-t bg-[var(--sovereign-pale)] p-4 flex items-center gap-3">
          <span className="badge badge-sovereign">Rejected</span>
          {draft.reviewer_notes && (
            <span className="text-body-sm text-[var(--text-muted)]">{draft.reviewer_notes}</span>
          )}
        </div>
      )}
    </div>
  )
}
