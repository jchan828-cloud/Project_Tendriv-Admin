/**
 * B2B-INTEL-001: B2B intelligence pipeline types + validation schemas.
 *
 * Centralised here per the repo's type-drift rule (no inline Zod in app/ or
 * components/). These types model the five-stage enrichment waterfall and the
 * normalized JSON the AI extraction stage is required to return.
 */

import { z } from 'zod'

/* ───────────────────────── Pipeline run ───────────────────────── */

export type PipelineStatus = 'queued' | 'running' | 'completed' | 'failed'
export type PipelineStage =
  | 'seed'
  | 'enrich'
  | 'signals'
  | 'extract'
  | 'normalize'
  | 'store'

export type IntelPipelineRun = {
  id: string
  query: string
  region: string | null
  status: PipelineStatus
  stage: PipelineStage | null
  seeds_found: number
  enriched_count: number
  signals_count: number
  contacts_extracted: number
  technographics_extracted: number
  companies_stored: number
  cost_estimate_cad: number
  error: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

/* ───────────────────────── Company profile ────────────────────── */

export type CompanyPipelineStage =
  | 'seed'
  | 'enriched'
  | 'signals'
  | 'extracted'
  | 'stored'

export type IntelCompany = {
  id: string
  place_id: string
  name: string
  legal_name: string | null
  website: string | null
  formatted_address: string | null
  phone: string | null
  business_status: string | null
  city: string | null
  province: string | null
  country: string | null
  iso_3166_2: string | null
  naics_code: string | null
  naics_title: string | null
  place_types: string[]
  latitude: number | null
  longitude: number | null
  employee_estimate: number | null
  estimated_revenue_cad: number | null
  pipeline_stage: CompanyPipelineStage
  run_id: string | null
  raw_place_details: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type IntelContact = {
  id: string
  company_id: string
  full_name: string
  title: string | null
  linkedin_url: string | null
  source: string | null
  confidence: number | null
  created_at: string
}

export type IntelTechnographic = {
  id: string
  company_id: string
  tool_name: string
  category: string | null
  source: string | null
  evidence_url: string | null
  created_at: string
}

/* ──────────────── Stage 1/2: Places API shapes ─────────────────── */

/** Stage 1 — Text Search Pro seed. */
export type PlaceSeed = {
  placeId: string
  name: string
}

/** Stage 2 — Place Details Pro firmographics. */
export type PlaceDetails = {
  placeId: string
  name: string
  formattedAddress: string | null
  phone: string | null
  website: string | null
  businessStatus: string | null
  types: string[]
  city: string | null
  province: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  raw: Record<string, unknown>
}

/* ──────────────── Stage 3: Custom Search shape ─────────────────── */

export type SearchSignalType = 'contacts' | 'technographics'

export type SearchHit = {
  title: string
  link: string
  snippet: string
}

export type DiscoveredSignal = {
  signalType: SearchSignalType
  query: string
  hits: SearchHit[]
}

/* ──────────────── Stage 4: AI extraction schema ────────────────── */

/**
 * The strict, normalized JSON the LLM (Vertex AI Gemini 2.5 Flash, or the
 * Anthropic fallback) must return. Validated before storage so a malformed
 * model response can never poison the warehouse.
 */
export const ExtractedContactSchema = z.object({
  full_name: z.string().min(1),
  title: z.string().nullable().default(null),
  linkedin_url: z.string().nullable().default(null),
  confidence: z.number().min(0).max(1).nullable().default(null),
})

export const ExtractedTechnographicSchema = z.object({
  tool_name: z.string().min(1),
  category: z.string().nullable().default(null),
  evidence_url: z.string().nullable().default(null),
})

export const ExtractionResultSchema = z.object({
  contacts: z.array(ExtractedContactSchema).default([]),
  technographics: z.array(ExtractedTechnographicSchema).default([]),
})

export type ExtractedContact = z.infer<typeof ExtractedContactSchema>
export type ExtractedTechnographic = z.infer<typeof ExtractedTechnographicSchema>
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>

/* ──────────────── Pipeline trigger request ─────────────────────── */

export const PipelineRequestSchema = z.object({
  /** Geographic + industry seed query, e.g. "Software companies in Alberta". */
  query: z.string().min(3).max(200),
  /** Optional region hint used for ISO 3166-2 normalization. */
  region: z.string().max(100).optional(),
  /** Cap on seed companies processed in one run (cost guard). */
  limit: z.number().int().min(1).max(60).default(20),
})

export type PipelineRequest = z.infer<typeof PipelineRequestSchema>
