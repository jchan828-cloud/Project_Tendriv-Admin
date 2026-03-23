import type { BlogDraft } from '@/lib/types/admin-drafts'

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge badge-warning',
  approved: 'badge badge-jade',
  rejected: 'badge badge-sovereign',
  published: 'badge badge-success',
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

function isSourceObj(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null
}

export function DraftSourcesSidebar({ draft }: { draft: BlogDraft }) {
  const sources = Array.isArray(draft.sources) ? draft.sources : []

  return (
    <div className="flex flex-col h-full p-3 space-y-3">
      <div className="card p-2">
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--jade-dim)]">
          {draft.slug}
        </span>
      </div>

      {sources.length > 0 && (
        <div>
          <h3 className="section-label">Sources</h3>
          <div className="space-y-2 mt-2">
            {sources.map((src, i) => {
              if (!isSourceObj(src)) return null
              const verified = src.verified !== false
              return (
                <div
                  key={i}
                  className={`card p-2 text-xs ${
                    !verified ? 'bg-[var(--sovereign-pale)] border-[var(--sovereign-border)]' : ''
                  }`}
                >
                  <p className="font-medium truncate">
                    {String(src.title ?? src.url ?? `Source ${i + 1}`)}
                  </p>
                  {src.url && (
                    <p className="text-[var(--text-muted)] truncate font-[family-name:var(--font-mono)] text-[10px]">
                      {String(src.url)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="section-label">Metadata</h3>
        <dl className="mt-2 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <dt className="text-[var(--text-muted)]">Status</dt>
            <dd><span className={STATUS_BADGE[draft.status] ?? 'badge'}>{draft.status}</span></dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--text-muted)]">Model</dt>
            <dd className="font-[family-name:var(--font-mono)] text-[var(--jade-dim)]">{draft.generated_by}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--text-muted)]">Generated</dt>
            <dd className="text-[var(--text-muted)]">{timeAgo(draft.created_at)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--text-muted)]">Tier</dt>
            <dd className="capitalize">{draft.tier}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--text-muted)]">Type</dt>
            <dd>{draft.type}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
