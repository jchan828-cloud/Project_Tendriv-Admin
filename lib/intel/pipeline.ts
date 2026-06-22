/**
 * B2B-INTEL-001 — Waterfall orchestrator.
 *
 * Runs the five sequential stages, cheap→specific, persisting a complete
 * company profile per seed. Every external dependency (fetch, extractor, db) is
 * injectable so the orchestration logic is unit-testable without network/keys.
 *
 *   1. Seed Generation     — Places Text Search Pro
 *   2. Firmographic Detail — Places Place Details Pro
 *   3. Signal Discovery    — Custom Search (LinkedIn + job boards)
 *   4. AI Extraction       — Gemini 2.5 Flash (Anthropic fallback)
 *   5. Normalize & Store   — ISO 3166-2 + NAICS + revenue → Supabase
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  UNIT_COST_USD,
  USD_TO_CAD,
  type GoogleIntelEnv,
} from './config'
import type { PipelineRequest, ExtractionResult } from '@/lib/types/intel'
import { textSearchSeeds, placeDetails, type Fetcher } from './places'
import { discoverSignals, signalsToText } from './search'
import { makeExtractor, type Extractor } from './extract'
import { normalizeCompany } from './normalize'
import {
  createRun,
  updateRun,
  upsertCompany,
  insertSignals,
  insertExtraction,
} from './store'

export type PipelineDeps = {
  db: SupabaseClient
  env: GoogleIntelEnv
  fetcher?: Fetcher
  /** Override the AI extractor (tests / custom providers). */
  extractor?: Extractor
  /** Optional throttle between companies (ms) to respect rate limits. */
  delayMs?: number
}

export type PipelineSummary = {
  runId: string
  seeds: number
  companies: number
  contacts: number
  technographics: number
  costEstimateCad: number
}

const EMPTY_EXTRACTION: ExtractionResult = { contacts: [], technographics: [] }

function projectCostCad(seeds: number, details: number, searches: number): number {
  const usd =
    UNIT_COST_USD.textSearchPro * 1 +
    UNIT_COST_USD.placeDetailsPro * details +
    UNIT_COST_USD.customSearch * searches +
    UNIT_COST_USD.geminiFlashPer1kTokens * details // ~1k tokens/company
  void seeds
  return Math.round(usd * USD_TO_CAD * 100) / 100
}

export async function runPipeline(
  request: PipelineRequest,
  deps: PipelineDeps,
): Promise<PipelineSummary> {
  const { db, env } = deps
  const fetcher = deps.fetcher ?? fetch
  // Construct the extractor lazily so a misconfigured AI provider never aborts
  // the cheap seed/enrich stages before the run is even recorded.
  let extractor = deps.extractor
  const getExtractor = (): Extractor => (extractor ??= makeExtractor(env, { fetcher }))

  const runId = await createRun(db, request.query, request.region ?? null)

  try {
    /* ── Stage 1: Seed Generation ─────────────────────────────── */
    const seeds = await textSearchSeeds(request.query, env.placesApiKey, {
      limit: request.limit,
      fetcher,
    })
    await updateRun(db, runId, { seeds_found: seeds.length, stage: 'enrich' })

    let companies = 0
    let totalContacts = 0
    let totalTech = 0
    let totalSignals = 0
    let detailCalls = 0
    let searchCalls = 0

    for (const seed of seeds) {
      try {
        /* ── Stage 2: Firmographic Enrichment ─────────────────── */
        const details = await placeDetails(seed.placeId, env.placesApiKey, { fetcher })
        detailCalls++

        /* ── Stage 3: Signal Discovery ────────────────────────── */
        const signals = await discoverSignals(
          details.name,
          env.customSearchApiKey,
          env.customSearchEngineId,
          { fetcher },
        )
        searchCalls += 2
        totalSignals += signals.reduce((n, s) => n + s.hits.length, 0)

        /* ── Stage 4: AI Extraction ───────────────────────────── */
        let extraction: ExtractionResult = EMPTY_EXTRACTION
        const text = signalsToText(signals)
        if (text.trim().length > 0) {
          try {
            extraction = await getExtractor()(details.name, text)
          } catch (err) {
            const m = err instanceof Error ? err.message : String(err)
            console.error(`[intel:pipeline] extraction failed for ${details.name}:`, m)
          }
        }

        /* ── Stage 5: Normalize & Store ───────────────────────── */
        const normalized = normalizeCompany(details, extraction)
        const companyId = await upsertCompany(db, normalized, runId)
        await insertSignals(db, companyId, runId, signals)
        const stored = await insertExtraction(db, companyId, extraction)

        companies++
        totalContacts += stored.contacts
        totalTech += stored.technographics
      } catch (err) {
        const m = err instanceof Error ? err.message : String(err)
        console.error(`[intel:pipeline] company failed (${seed.placeId}):`, m)
      }

      if (deps.delayMs) await new Promise((r) => setTimeout(r, deps.delayMs))
    }

    const costEstimateCad = projectCostCad(seeds.length, detailCalls, searchCalls)

    await updateRun(db, runId, {
      status: 'completed',
      stage: 'store',
      enriched_count: detailCalls,
      signals_count: totalSignals,
      contacts_extracted: totalContacts,
      technographics_extracted: totalTech,
      companies_stored: companies,
      cost_estimate_cad: costEstimateCad,
      finished_at: new Date().toISOString(),
    })

    return {
      runId,
      seeds: seeds.length,
      companies,
      contacts: totalContacts,
      technographics: totalTech,
      costEstimateCad,
    }
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err)
    await updateRun(db, runId, {
      status: 'failed',
      error: m,
      finished_at: new Date().toISOString(),
    })
    throw err
  }
}
