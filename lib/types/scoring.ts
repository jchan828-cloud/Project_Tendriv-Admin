/** MK8-CRM-001 / MK8-CRM-003: Scoring + ABM type definitions */

import { z } from 'zod'

/* ── Request Schemas ────────────────────────────────── */

export const ScoreRequestSchema = z.object({
  contact_id: z.string().uuid(),
})

/* ── Lead Scores ────────────────────────────────────── */

export type ScoreBreakdown = {
  content_engagement: number
  email_engagement: number
  firmographic: number
  recency: number
}

export type LeadScore = {
  id: string
  contact_id: string
  score: number
  score_breakdown: ScoreBreakdown
  scored_at: string
  scoring_version: string
}

/* ── Content Attribution ────────────────────────────── */

export type TouchType = 'first' | 'last' | 'assist'

export type ContentAttribution = {
  id: string
  contact_id: string
  post_id: string
  touch_type: TouchType
  touched_at: string
}

/* ── ABM Accounts (MK8-CRM-003) ────────────────────── */

export const OrganisationTypeValues = [
  'ministry', 'agency', 'crown-corp', 'enterprise', 'indigenous-org',
] as const
export type OrganisationType = (typeof OrganisationTypeValues)[number]

export type AbmAccount = {
  id: string
  name: string
  organisation_type: OrganisationType
  province: string | null
  naics_codes: string[]
  website: string | null
  annual_procurement_value_cad: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type AbmAccountInsert = {
  name: string
  organisation_type: OrganisationType
  province?: string | null
  naics_codes?: string[]
  website?: string | null
  annual_procurement_value_cad?: number | null
  notes?: string | null
}

export type AbmAccountContact = {
  account_id: string
  contact_id: string
  role: string | null
}
