/** MK8-INT-003: Audit log viewer — read-only, paginated, filterable */

import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { AuditFilters } from '@/components/audit/audit-filters'

const PAGE_SIZE = 50

interface PageProps {
  searchParams: Promise<{
    page?: string
    event_type?: string
    resource_type?: string
  }>
}

export default async function AuditPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const eventFilter = params.event_type ?? ''
  const resourceFilter = params.resource_type ?? ''

  const supabase = await createServiceRoleClient()

  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('occurred_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (eventFilter) {
    query = query.eq('event_type', eventFilter)
  }
  if (resourceFilter) {
    query = query.eq('resource_type', resourceFilter)
  }

  const { data: entries, count } = await query

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  function buildHref(overrides: Record<string, string | undefined>): string {
    const merged: Record<string, string> = {}
    if (eventFilter) merged.event_type = eventFilter
    if (resourceFilter) merged.resource_type = resourceFilter
    merged.page = String(page)
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === '') {
        delete merged[k]
      } else {
        merged[k] = v
      }
    }
    const qs = new URLSearchParams(merged).toString()
    return qs ? `/audit?${qs}` : '/audit'
  }

  return (
    <div>
      <h1 className="text-heading-lg mb-6">Audit Log</h1>

      <AuditFilters eventType={eventFilter} resourceType={resourceFilter} />

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-sidebar)]">
              <th className="text-label-sm px-4 py-3">Timestamp</th>
              <th className="text-label-sm px-4 py-3">Event</th>
              <th className="text-label-sm px-4 py-3">Actor</th>
              <th className="text-label-sm px-4 py-3">Resource</th>
              <th className="text-label-sm px-4 py-3">ID</th>
              <th className="text-label-sm px-4 py-3">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {(!entries || entries.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">
                  No audit entries found.
                </td>
              </tr>
            )}
            {entries?.map((entry) => (
              <tr key={entry.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]">
                <td className="text-mono-sm px-4 py-3 whitespace-nowrap">
                  {new Date(entry.occurred_at).toLocaleString('en-CA', {
                    dateStyle: 'short',
                    timeStyle: 'medium',
                  })}
                </td>
                <td className="px-4 py-3">
                  <span className="badge badge-neutral">{entry.event_type}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="badge badge-jade">{entry.actor_type}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-mono-sm">{entry.resource_type}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-mono-xs truncate max-w-[120px] inline-block">
                    {entry.resource_id}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {entry.metadata && (
                    <pre className="text-mono-xs max-w-[300px] truncate">
                      {JSON.stringify(entry.metadata)}
                    </pre>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-body-sm text-[var(--text-muted)]">
            Page {page} of {totalPages} ({count} entries)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildHref({ page: String(page - 1) })} className="btn-secondary btn-sm">
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link href={buildHref({ page: String(page + 1) })} className="btn-secondary btn-sm">
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
