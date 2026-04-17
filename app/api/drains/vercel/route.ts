/** Vercel log drain ingest.
 *
 *  Accepts batched log events from a Vercel Drain (delivery.type=http)
 *  and writes them to log_drain_events. Signature verification uses
 *  HMAC-SHA1 over the raw body with VERCEL_LOG_DRAIN_SECRET, per
 *  https://vercel.com/docs/drains/security.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { gunzipSync } from 'node:zlib'
import { verifyVercelSignature } from '@/lib/drains/verify'
import { persistLogEvents, type RawDrainEvent } from '@/lib/drains/persist'

export const runtime = 'nodejs'
export const maxDuration = 60

function parseBody(raw: string, contentType: string | null): RawDrainEvent[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  if (contentType?.includes('ndjson') || (trimmed[0] !== '[' && trimmed[0] !== '{')) {
    return trimmed
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as RawDrainEvent)
  }
  const parsed = JSON.parse(trimmed)
  return Array.isArray(parsed) ? (parsed as RawDrainEvent[]) : [parsed as RawDrainEvent]
}

export async function POST(req: NextRequest) {
  const secret = process.env.VERCEL_LOG_DRAIN_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'drain not configured' }, { status: 500 })
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

  const signature = req.headers.get('x-vercel-signature')
  if (!verifyVercelSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 403 })
  }

  let events: RawDrainEvent[]
  try {
    events = parseBody(rawBody, req.headers.get('content-type'))
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const count = await persistLogEvents('vercel', events)
  return NextResponse.json({ ok: true, count })
}
