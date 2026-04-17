/** System health queries — parallel read of drain ingest + audit activity.
 *
 *  Follows the same direct `.from().select()` pattern used by the /audit
 *  page rather than introducing a stored procedure. If query volume on
 *  this page ever becomes hot enough to matter, push these aggregates
 *  down into an RPC.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'

export type IngestSource = 'vercel' | 'supabase'
export type HealthStatus = 'healthy' | 'stale' | 'dead'

export interface IngestStats {
  source: IngestSource
  lastReceivedAt: string | null
  count5m: number
  count1h: number
  count24h: number
  status: HealthStatus
}

export interface ErrorEvent {
  id: string
  source: IngestSource
  event_timestamp: string | null
  received_at: string
  severity: string | null
  project_id: string | null
  message: string | null
}

export interface SystemHealthSnapshot {
  generatedAt: string
  ingest: IngestStats[]
  totalErrors24h: number
  auditActivity24h: number
  recentErrors: ErrorEvent[]
}

const HEALTHY_WINDOW_MS = 5 * 60 * 1000
const STALE_WINDOW_MS = 30 * 60 * 1000

const ERROR_SEVERITIES = ['error', 'fatal', 'warn', 'warning', 'critical']

export function classifyHeartbeat(lastReceivedAt: string | null, now: Date): HealthStatus {
  if (!lastReceivedAt) return 'dead'
  const age = now.getTime() - new Date(lastReceivedAt).getTime()
  if (age <= HEALTHY_WINDOW_MS) return 'healthy'
  if (age <= STALE_WINDOW_MS) return 'stale'
  return 'dead'
}

async function countSince(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  source: IngestSource,
  sinceIso: string,
): Promise<number> {
  const { count } = await supabase
    .from('log_drain_events')
    .select('id', { count: 'exact', head: true })
    .eq('source', source)
    .gte('received_at', sinceIso)
  return count ?? 0
}

async function fetchIngestStats(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  source: IngestSource,
  now: Date,
): Promise<IngestStats> {
  const iso5m = new Date(now.getTime() - HEALTHY_WINDOW_MS).toISOString()
  const iso1h = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const iso24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const [lastRow, count5m, count1h, count24h] = await Promise.all([
    supabase
      .from('log_drain_events')
      .select('received_at')
      .eq('source', source)
      .order('received_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    countSince(supabase, source, iso5m),
    countSince(supabase, source, iso1h),
    countSince(supabase, source, iso24h),
  ])

  const lastReceivedAt: string | null = lastRow.data?.received_at ?? null

  return {
    source,
    lastReceivedAt,
    count5m,
    count1h,
    count24h,
    status: classifyHeartbeat(lastReceivedAt, now),
  }
}

export async function getSystemHealthSnapshot(): Promise<SystemHealthSnapshot> {
  const supabase = await createServiceRoleClient()
  const now = new Date()
  const iso24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const [vercel, supa, errorCountRes, auditCountRes, recentErrorsRes] = await Promise.all([
    fetchIngestStats(supabase, 'vercel', now),
    fetchIngestStats(supabase, 'supabase', now),
    supabase
      .from('log_drain_events')
      .select('id', { count: 'exact', head: true })
      .in('severity', ERROR_SEVERITIES)
      .gte('received_at', iso24h),
    supabase
      .from('audit_log')
      .select('id', { count: 'exact', head: true })
      .gte('occurred_at', iso24h),
    supabase
      .from('log_drain_events')
      .select('id, source, event_timestamp, received_at, severity, project_id, message')
      .in('severity', ERROR_SEVERITIES)
      .order('received_at', { ascending: false })
      .limit(20),
  ])

  return {
    generatedAt: now.toISOString(),
    ingest: [vercel, supa],
    totalErrors24h: errorCountRes.count ?? 0,
    auditActivity24h: auditCountRes.count ?? 0,
    recentErrors: (recentErrorsRes.data ?? []) as ErrorEvent[],
  }
}
