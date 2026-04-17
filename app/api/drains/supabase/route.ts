/** Supabase log drain ingest.
 *
 *  Accepts batched log events from a Supabase generic HTTP drain and
 *  writes them to log_drain_events. Supabase drains are currently
 *  unsigned, so auth is a shared bearer token provided as a custom
 *  header on the drain configuration:
 *    Authorization: Bearer $SUPABASE_LOG_DRAIN_TOKEN
 */

import { NextResponse, type NextRequest } from 'next/server'
import { gunzipSync } from 'node:zlib'
import { verifyBearer } from '@/lib/drains/verify'
import { persistLogEvents, type RawDrainEvent } from '@/lib/drains/persist'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const token = process.env.SUPABASE_LOG_DRAIN_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'drain not configured' }, { status: 500 })
  }

  if (!verifyBearer(req.headers.get('authorization'), token)) {
    return NextResponse.json({ error: 'invalid token' }, { status: 403 })
  }

  const encoding = req.headers.get('content-encoding')
  let rawBody: string
  try {
    if (encoding === 'gzip') {
      const buf = Buffer.from(await req.arrayBuffer())
      rawBody = gunzipSync(buf).toString('utf8')
    } else {
      rawBody = await req.text()
    }
  } catch {
    return NextResponse.json({ error: 'body read failed' }, { status: 400 })
  }

  let events: RawDrainEvent[]
  try {
    const parsed = JSON.parse(rawBody)
    events = Array.isArray(parsed) ? (parsed as RawDrainEvent[]) : [parsed as RawDrainEvent]
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const count = await persistLogEvents('supabase', events)
  return NextResponse.json({ ok: true, count })
}
