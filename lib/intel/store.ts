/**
 * B2B-INTEL-001 · Storage — persist waterfall output to the Supabase warehouse.
 *
 * All writes use the service-role client (RLS is on; only the server touches
 * these tables). Upserts are idempotent so re-running a query never duplicates
 * a company, contact, or tool.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  DiscoveredSignal,
  ExtractionResult,
  PipelineStage,
} from '@/lib/types/intel'
import type { NormalizedCompany } from './normalize'

export async function createRun(
  db: SupabaseClient,
  query: string,
  region: string | null,
): Promise<string> {
  const { data, error } = await db
    .from('intel_pipeline_runs')
    .insert({
      query,
      region,
      status: 'running',
      stage: 'seed',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error) throw new Error(`createRun failed: ${error.message}`)
  return (data as { id: string }).id
}

export async function updateRun(
  db: SupabaseClient,
  runId: string,
  patch: Partial<{
    status: string
    stage: PipelineStage
    seeds_found: number
    enriched_count: number
    signals_count: number
    contacts_extracted: number
    technographics_extracted: number
    companies_stored: number
    cost_estimate_cad: number
    error: string
    finished_at: string
  }>,
): Promise<void> {
  const { error } = await db
    .from('intel_pipeline_runs')
    .update(patch)
    .eq('id', runId)
  if (error) console.error(`[intel:store] updateRun failed: ${error.message}`)
}

/** Upsert a normalized company by place_id; returns its id. */
export async function upsertCompany(
  db: SupabaseClient,
  company: NormalizedCompany,
  runId: string,
): Promise<string> {
  const { data, error } = await db
    .from('intel_companies')
    .upsert(
      { ...company, run_id: runId, pipeline_stage: 'stored' },
      { onConflict: 'place_id' },
    )
    .select('id')
    .single()
  if (error) throw new Error(`upsertCompany failed: ${error.message}`)
  return (data as { id: string }).id
}

export async function insertSignals(
  db: SupabaseClient,
  companyId: string,
  runId: string,
  signals: DiscoveredSignal[],
): Promise<number> {
  const rows = signals.flatMap((s) =>
    s.hits.map((h) => ({
      company_id: companyId,
      run_id: runId,
      signal_type: s.signalType,
      query: s.query,
      source_url: h.link,
      raw_text: `${h.title}\n${h.snippet}`,
    })),
  )
  if (rows.length === 0) return 0
  const { error } = await db.from('intel_signals').insert(rows)
  if (error) {
    console.error(`[intel:store] insertSignals failed: ${error.message}`)
    return 0
  }
  return rows.length
}

/** Insert extracted contacts + technographics, ignoring de-dupe conflicts. */
export async function insertExtraction(
  db: SupabaseClient,
  companyId: string,
  extraction: ExtractionResult,
): Promise<{ contacts: number; technographics: number }> {
  let contacts = 0
  let technographics = 0

  if (extraction.contacts.length > 0) {
    const rows = extraction.contacts.map((c) => ({
      company_id: companyId,
      full_name: c.full_name,
      title: c.title,
      linkedin_url: c.linkedin_url,
      confidence: c.confidence,
      source: 'custom_search_linkedin',
    }))
    const { error } = await db
      .from('intel_contacts')
      .upsert(rows, { onConflict: 'company_id,full_name,title', ignoreDuplicates: true })
    if (error) console.error(`[intel:store] insertContacts failed: ${error.message}`)
    else contacts = rows.length
  }

  if (extraction.technographics.length > 0) {
    const rows = extraction.technographics.map((t) => ({
      company_id: companyId,
      tool_name: t.tool_name,
      category: t.category,
      evidence_url: t.evidence_url,
      source: 'custom_search_jobs',
    }))
    const { error } = await db
      .from('intel_technographics')
      .upsert(rows, { onConflict: 'company_id,tool_name', ignoreDuplicates: true })
    if (error) console.error(`[intel:store] insertTechnographics failed: ${error.message}`)
    else technographics = rows.length
  }

  return { contacts, technographics }
}
