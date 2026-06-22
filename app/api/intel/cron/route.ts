import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { readIntelEnv, assertIntelEnv } from '@/lib/intel/config'
import { runPipeline } from '@/lib/intel/pipeline'

/**
 * B2B-INTEL-001 — Scheduled waterfall sweep.
 *
 * Runs one or more seed queries configured via INTEL_CRON_QUERIES
 * (comma-separated, e.g. "Software companies in Alberta,IT services in Ontario").
 * Cron-authenticated via Bearer CRON_SECRET (matches geo-match / psib-match).
 *
 * Schedule: weekly (see vercel.json). A small per-company throttle keeps us
 * inside the 2026 SKU free tiers across the month.
 */
async function handler(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const env = readIntelEnv()
  try {
    assertIntelEnv(env)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const queries = (process.env.INTEL_CRON_QUERIES ?? '')
    .split(',')
    .map((q) => q.trim())
    .filter(Boolean)

  if (queries.length === 0) {
    return NextResponse.json({ success: true, runs: 0, note: 'INTEL_CRON_QUERIES not set' })
  }

  const limit = Math.min(Number(process.env.INTEL_CRON_LIMIT ?? '20'), 60)
  const db = await createServiceRoleClient()
  const results: { query: string; ok: boolean; companies?: number; error?: string }[] = []

  for (const query of queries) {
    try {
      const summary = await runPipeline({ query, limit }, { db, env, delayMs: 250 })
      results.push({ query, ok: true, companies: summary.companies })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      results.push({ query, ok: false, error: message })
    }
  }

  return NextResponse.json({
    success: results.every((r) => r.ok),
    runs: results.length,
    results,
  })
}

export { handler as GET, handler as POST }
