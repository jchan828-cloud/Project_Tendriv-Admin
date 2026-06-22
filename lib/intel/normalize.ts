/**
 * B2B-INTEL-001 · Stage 5 — Normalization.
 *
 * Pure function that folds firmographics (Stage 2) + AI extraction (Stage 4)
 * into the normalized warehouse row: ISO 3166-2 region, NAICS code/title, and
 * the algorithmic revenue estimate.
 */

import type { PlaceDetails, ExtractionResult } from '@/lib/types/intel'
import { toIso3166_2 } from './iso-3166-2'
import { resolveNaics } from './naics'
import { estimateEmployees, estimateRevenueCad } from './revenue'

export type NormalizedCompany = {
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
  raw_place_details: Record<string, unknown>
}

export function normalizeCompany(
  details: PlaceDetails,
  extraction: ExtractionResult,
  opts: { aiNaicsCode?: string | null } = {},
): NormalizedCompany {
  const iso = toIso3166_2(details.province, details.country)
  const { code: naicsCode, title: naicsTitle } = resolveNaics(
    opts.aiNaicsCode,
    details.types,
  )
  const employees = estimateEmployees(extraction.contacts.length)
  const revenue = estimateRevenueCad(employees, naicsCode)

  return {
    place_id: details.placeId,
    name: details.name,
    legal_name: details.name, // <title>/legal validation can refine later
    website: details.website,
    formatted_address: details.formattedAddress,
    phone: details.phone,
    business_status: details.businessStatus,
    city: details.city,
    province: details.province,
    country: details.country,
    iso_3166_2: iso,
    naics_code: naicsCode,
    naics_title: naicsTitle,
    place_types: details.types,
    latitude: details.latitude,
    longitude: details.longitude,
    employee_estimate: employees,
    estimated_revenue_cad: revenue,
    raw_place_details: details.raw,
  }
}
