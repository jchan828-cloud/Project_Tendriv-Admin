import { createServiceRoleClient } from '@/lib/supabase/server'

export type DrainSource = 'vercel' | 'supabase'

export interface RawDrainEvent {
  [key: string]: unknown
}

interface NormalizedRow {
  source: DrainSource
  event_timestamp: string | null
  severity: string | null
  project_id: string | null
  message: string | null
  payload: RawDrainEvent
}

const MESSAGE_MAX = 500
const INSERT_CHUNK = 500

function toIso(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value
    const d = new Date(ms)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  if (typeof value === 'string') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  return null
}

function firstString(event: RawDrainEvent, keys: string[]): string | null {
  for (const k of keys) {
    const v = event[k]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return null
}

function normalize(source: DrainSource, event: RawDrainEvent): NormalizedRow {
  const timestamp =
    toIso(event.timestamp) ??
    toIso(event.event_timestamp) ??
    toIso(event.time) ??
    toIso((event.metadata as RawDrainEvent | undefined)?.timestamp)

  const severity = firstString(event, ['level', 'severity', 'log_level', 'type'])
  const projectId = firstString(event, ['projectId', 'project_id', 'project', 'projectRef'])

  const rawMessage = firstString(event, ['message', 'event_message', 'msg', 'body'])
  const message = rawMessage ? rawMessage.slice(0, MESSAGE_MAX) : null

  return {
    source,
    event_timestamp: timestamp,
    severity,
    project_id: projectId,
    message,
    payload: event,
  }
}

export async function persistLogEvents(
  source: DrainSource,
  events: RawDrainEvent[],
): Promise<number> {
  if (events.length === 0) return 0

  const rows = events.map((e) => normalize(source, e))
  const supabase = await createServiceRoleClient()

  let inserted = 0
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const chunk = rows.slice(i, i + INSERT_CHUNK)
    try {
      const { error } = await supabase.from('log_drain_events').insert(chunk)
      if (error) {
        console.error('[log_drain_events] insert error:', error.message)
      } else {
        inserted += chunk.length
      }
    } catch (err) {
      console.error('[log_drain_events] insert threw:', err)
    }
  }
  return inserted
}
