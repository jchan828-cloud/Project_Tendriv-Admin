/**
 * B2B-INTEL-001: Pipeline configuration, endpoints, and 2026 cost model.
 *
 * Reflects Google's 2026 API restructuring:
 *   - The flat $200/mo universal Maps credit is gone, replaced by
 *     SKU-specific monthly free tiers (e.g. first 5,000 Place Details Pro
 *     requests free).
 *   - Custom Search no longer supports "entire web" engines, so the engine
 *     (cx) must be configured to target specific high-signal domains.
 */

export const PLACES_BASE_URL = 'https://places.googleapis.com/v1'
export const CUSTOM_SEARCH_URL = 'https://www.googleapis.com/customsearch/v1'

/**
 * Default generative endpoint. Vertex AI proper uses OAuth + a regional host;
 * this repo standardises on API-key auth (see .env.example), so we target the
 * Generative Language surface for Gemini 2.5 Flash by default and allow the
 * host/model to be overridden for a Vertex deployment.
 */
export const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL ??
  'https://generativelanguage.googleapis.com/v1beta'
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'

/* ── Field masks (Places API New requires explicit masks) ───────── */

/** Stage 1 — Text Search Pro: cheapest fields that still identify a place. */
export const TEXT_SEARCH_FIELD_MASK = 'places.id,places.displayName'

/** Stage 2 — Place Details Pro: the firmographic core. */
export const PLACE_DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'internationalPhoneNumber',
  'nationalPhoneNumber',
  'websiteUri',
  'businessStatus',
  'types',
  'location',
  'addressComponents',
].join(',')

/* ── 2026 SKU-specific monthly free tiers ───────────────────────── */

export const FREE_TIER = {
  textSearchPro: 5_000,
  placeDetailsPro: 5_000,
  customSearchQueriesPerDay: 100, // JSON API free quota
} as const

/**
 * Per-unit costs (USD) once the free tier is exhausted. Used only to project
 * run cost into intel_pipeline_runs.cost_estimate_cad — never to gate calls.
 * Approximate 2026 list pricing; FX applied to report in CAD.
 */
export const UNIT_COST_USD = {
  textSearchPro: 0.032, // per request
  placeDetailsPro: 0.017, // per request
  customSearch: 0.005, // per query beyond free quota
  geminiFlashPer1kTokens: 0.0003, // blended in/out, rough
} as const

export const USD_TO_CAD = Number(process.env.USD_TO_CAD ?? '1.37')

/* ── Env accessors (fail loud, fail clear) ──────────────────────── */

export type GoogleIntelEnv = {
  placesApiKey: string
  customSearchApiKey: string
  customSearchEngineId: string
  geminiApiKey: string | null
  anthropicApiKey: string | null
}

export function readIntelEnv(): GoogleIntelEnv {
  return {
    placesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? '',
    customSearchApiKey:
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY ??
      process.env.GOOGLE_PLACES_API_KEY ??
      '',
    customSearchEngineId: process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID ?? '',
    geminiApiKey: process.env.GEMINI_API_KEY ?? null,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? null,
  }
}

/** Throws a single, actionable error listing every missing required var. */
export function assertIntelEnv(env: GoogleIntelEnv): void {
  const missing: string[] = []
  if (!env.placesApiKey) missing.push('GOOGLE_PLACES_API_KEY')
  if (!env.customSearchApiKey)
    missing.push('GOOGLE_CUSTOM_SEARCH_API_KEY (or GOOGLE_PLACES_API_KEY)')
  if (!env.customSearchEngineId) missing.push('GOOGLE_CUSTOM_SEARCH_ENGINE_ID')
  if (!env.geminiApiKey && !env.anthropicApiKey)
    missing.push('GEMINI_API_KEY or ANTHROPIC_API_KEY (for AI extraction)')
  if (missing.length > 0) {
    throw new Error(
      `B2B intelligence pipeline misconfigured — missing env: ${missing.join(', ')}`,
    )
  }
}
