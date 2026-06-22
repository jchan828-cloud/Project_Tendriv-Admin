/**
 * B2B-INTEL-001 · Stage 5 helper — NAICS industry classification.
 *
 * Two inputs feed industry code resolution (per the Phase 2 source mapping):
 *   1. An AI-inferred NAICS code (primary) — validated here.
 *   2. The Places `types` array (secondary / fallback) — keyword-mapped here.
 */

/** Minimal NAICS title lookup for the codes this pipeline emits. */
const NAICS_TITLES: Record<string, string> = {
  '511210': 'Software Publishers',
  '518210': 'Data Processing, Hosting, and Related Services',
  '541511': 'Custom Computer Programming Services',
  '541512': 'Computer Systems Design Services',
  '541513': 'Computer Facilities Management Services',
  '541519': 'Other Computer Related Services',
  '541330': 'Engineering Services',
  '541611': 'Administrative Management Consulting Services',
  '541810': 'Advertising Agencies',
  '522110': 'Commercial Banking',
  '621111': 'Offices of Physicians',
  '236220': 'Commercial and Institutional Building Construction',
  '423430': 'Computer and Peripheral Equipment Merchant Wholesalers',
  '561320': 'Temporary Help Services',
}

/**
 * Map a Places `types` array to a best-guess NAICS code. Used only as the
 * secondary source when the AI did not return a code.
 */
const PLACE_TYPE_TO_NAICS: { match: string[]; code: string }[] = [
  { match: ['software_company'], code: '511210' },
  { match: ['accounting'], code: '541211' },
  { match: ['lawyer', 'legal'], code: '541110' },
  { match: ['general_contractor'], code: '236220' },
  { match: ['electrician'], code: '238210' },
  { match: ['bank', 'finance'], code: '522110' },
  { match: ['doctor', 'hospital', 'health'], code: '621111' },
  { match: ['real_estate_agency'], code: '531210' },
  { match: ['insurance_agency'], code: '524210' },
  { match: ['marketing_agency', 'advertising_agency'], code: '541810' },
  { match: ['engineering'], code: '541330' },
  { match: ['consultant'], code: '541611' },
]

export function naicsTitle(code: string | null): string | null {
  if (!code) return null
  return NAICS_TITLES[code] ?? null
}

/** Accept an AI-inferred code only if it looks like a 2-6 digit NAICS code. */
export function validateNaicsCode(code: string | null | undefined): string | null {
  if (!code) return null
  const trimmed = code.trim()
  return /^\d{2,6}$/.test(trimmed) ? trimmed : null
}

export function naicsFromPlaceTypes(types: string[]): string | null {
  const lower = types.map((t) => t.toLowerCase())
  for (const { match, code } of PLACE_TYPE_TO_NAICS) {
    if (match.some((m) => lower.some((t) => t.includes(m)))) return code
  }
  return null
}

/**
 * Resolve a final NAICS code: prefer the validated AI inference, fall back to
 * the Places type mapping. Returns { code, title }.
 */
export function resolveNaics(
  aiCode: string | null | undefined,
  placeTypes: string[],
): { code: string | null; title: string | null } {
  const code = validateNaicsCode(aiCode) ?? naicsFromPlaceTypes(placeTypes)
  return { code, title: naicsTitle(code) }
}
