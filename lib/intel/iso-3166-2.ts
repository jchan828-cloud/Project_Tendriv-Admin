/**
 * B2B-INTEL-001 · Stage 5 helper — ISO 3166-2 region normalization.
 *
 * Maps free-text / Places `administrative_area_level_1` strings to ISO 3166-2
 * subdivision codes. Canada is exhaustive (this is a Canada-first product); US
 * states are included because seed queries and LinkedIn data routinely cross
 * the border.
 */

const CA_SUBDIVISIONS: Record<string, string> = {
  ab: 'CA-AB', alberta: 'CA-AB',
  bc: 'CA-BC', 'british columbia': 'CA-BC',
  mb: 'CA-MB', manitoba: 'CA-MB',
  nb: 'CA-NB', 'new brunswick': 'CA-NB',
  nl: 'CA-NL', newfoundland: 'CA-NL', 'newfoundland and labrador': 'CA-NL',
  ns: 'CA-NS', 'nova scotia': 'CA-NS',
  nt: 'CA-NT', 'northwest territories': 'CA-NT',
  nu: 'CA-NU', nunavut: 'CA-NU',
  on: 'CA-ON', ontario: 'CA-ON',
  pe: 'CA-PE', pei: 'CA-PE', 'prince edward island': 'CA-PE',
  qc: 'CA-QC', quebec: 'CA-QC', québec: 'CA-QC',
  sk: 'CA-SK', saskatchewan: 'CA-SK',
  yt: 'CA-YT', yukon: 'CA-YT',
}

const US_SUBDIVISIONS: Record<string, string> = {
  ca: 'US-CA', california: 'US-CA',
  ny: 'US-NY', 'new york': 'US-NY',
  tx: 'US-TX', texas: 'US-TX',
  wa: 'US-WA', washington: 'US-WA',
  ma: 'US-MA', massachusetts: 'US-MA',
  il: 'US-IL', illinois: 'US-IL',
  fl: 'US-FL', florida: 'US-FL',
}

/**
 * Normalize a region string (and optional country) to ISO 3166-2.
 * Returns null when no confident match exists.
 */
export function toIso3166_2(
  region: string | null | undefined,
  country?: string | null,
): string | null {
  if (!region) return null
  const key = region.trim().toLowerCase()
  const cc = (country ?? '').trim().toUpperCase()

  // "CA" is ambiguous (Canada vs California). Resolve via country when present.
  if (key === 'ca') {
    if (cc === 'US' || cc === 'USA') return 'US-CA'
    return null // bare "CA" with no US signal is treated as the country code
  }

  if (cc === 'US' || cc === 'USA') return US_SUBDIVISIONS[key] ?? null
  if (cc === 'CA' || cc === 'CAN' || cc === '') {
    if (CA_SUBDIVISIONS[key]) return CA_SUBDIVISIONS[key]
  }
  return CA_SUBDIVISIONS[key] ?? US_SUBDIVISIONS[key] ?? null
}
