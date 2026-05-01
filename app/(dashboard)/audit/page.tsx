import { createServiceRoleClient } from '@/lib/supabase/server'
import { AuditView } from '@/components/audit/audit-view'

const PAGE_SIZE = 50

interface PageProps {
  readonly searchParams: Promise<{
    page?: string
    actor_type?: string
    resource_type?: string
    range?: string
  }>
}

export default async function AuditPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const actorFilter = params.actor_type ?? ''
  const resourceFilter = params.resource_type ?? ''
  const range = params.range ?? '24h'

  const supabase = await createServiceRoleClient()

  const now = new Date()
  const rangeStart: Record<string, Date> = {
    '1h': new Date(now.getTime() - 60 * 60 * 1000),
    '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
    '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
  }
  const since = rangeStart[range] ?? rangeStart['24h']!

  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .gte('occurred_at', since.toISOString())
    .order('occurred_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (actorFilter) query = query.eq('actor_type', actorFilter)
  if (resourceFilter) query = query.eq('resource_type', resourceFilter)

  const { data: entries, count } = await query

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  type AuditEntry = {
    id: string
    event_type: string
    actor_id: string | null
    actor_type: string
    resource_type: string
    resource_id: string
    metadata: Record<string, unknown> | null
    ip_hash: string | null
    occurred_at: string
  }

  return (
    <AuditView
      entries={(entries ?? []) as AuditEntry[]}
      count={count ?? 0}
      page={page}
      totalPages={totalPages}
      range={range}
      actorFilter={actorFilter}
      resourceFilter={resourceFilter}
    />
  )
}
