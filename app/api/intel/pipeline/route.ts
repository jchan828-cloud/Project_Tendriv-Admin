import { NextResponse, type NextRequest } from 'next/server'
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server'
import { PipelineRequestSchema } from '@/lib/types/intel'
import { readIntelEnv, assertIntelEnv } from '@/lib/intel/config'
import { runPipeline } from '@/lib/intel/pipeline'

/**
 * B2B-INTEL-001 — Trigger a B2B intelligence waterfall run.
 *
 * POST /api/intel/pipeline
 * Body: { query: string, region?: string, limit?: number }
 *
 * OAuth-protected (authenticated admin). Synchronous: returns the run summary.
 */
export async function POST(request: NextRequest) {
  /* ── 1. Auth ──────────────────────────────────────────────── */
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  /* ── 2. Validate body ─────────────────────────────────────── */
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = PipelineRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  /* ── 3. Validate pipeline configuration ───────────────────── */
  const env = readIntelEnv()
  try {
    assertIntelEnv(env)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  /* ── 4. Run the waterfall ─────────────────────────────────── */
  const db = await createServiceRoleClient()
  try {
    const summary = await runPipeline(parsed.data, { db, env })
    return NextResponse.json({ success: true, ...summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
