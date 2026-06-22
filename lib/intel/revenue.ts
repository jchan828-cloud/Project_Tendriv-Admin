/**
 * B2B-INTEL-001 · Stage 5 helper — algorithmic revenue estimate.
 *
 * Phase 2 maps "Estimated Revenue" to "BigQuery (Algorithmic Math)". We compute
 * the same algorithm in-warehouse: revenue ≈ employees × sector revenue-per-
 * employee. Employee count is a floor derived from discovered contacts when no
 * firmographic headcount is available.
 */

/** Revenue per employee (CAD/yr) benchmarks by NAICS 2-digit sector. */
const REV_PER_EMPLOYEE_BY_SECTOR: Record<string, number> = {
  '51': 320_000, // Information (software/data)
  '52': 410_000, // Finance & insurance
  '54': 200_000, // Professional/scientific/technical services
  '23': 240_000, // Construction
  '62': 160_000, // Health care
  '42': 600_000, // Wholesale trade
  '44': 280_000, // Retail trade
  '31': 350_000, // Manufacturing
}

const DEFAULT_REV_PER_EMPLOYEE = 220_000

/**
 * Estimate employee count. Public contact discovery surfaces only a fraction of
 * staff, so we scale the discovered count by a visibility multiplier as a rough
 * floor. Returns null when there is no basis at all.
 */
export function estimateEmployees(
  discoveredContacts: number,
  opts: { visibilityMultiplier?: number } = {},
): number | null {
  if (discoveredContacts <= 0) return null
  const mult = opts.visibilityMultiplier ?? 4
  return Math.max(discoveredContacts, Math.round(discoveredContacts * mult))
}

export function revenuePerEmployee(naicsCode: string | null): number {
  if (!naicsCode) return DEFAULT_REV_PER_EMPLOYEE
  const sector = naicsCode.slice(0, 2)
  return REV_PER_EMPLOYEE_BY_SECTOR[sector] ?? DEFAULT_REV_PER_EMPLOYEE
}

/** Final revenue estimate in CAD, rounded to the nearest $1k. Null if no employees. */
export function estimateRevenueCad(
  employees: number | null,
  naicsCode: string | null,
): number | null {
  if (!employees || employees <= 0) return null
  const raw = employees * revenuePerEmployee(naicsCode)
  return Math.round(raw / 1000) * 1000
}
