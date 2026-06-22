import { describe, it, expect } from 'vitest'
import { toIso3166_2 } from '@/lib/intel/iso-3166-2'
import {
  resolveNaics,
  validateNaicsCode,
  naicsFromPlaceTypes,
} from '@/lib/intel/naics'
import {
  estimateEmployees,
  estimateRevenueCad,
  revenuePerEmployee,
} from '@/lib/intel/revenue'
import { normalizeCompany } from '@/lib/intel/normalize'
import type { PlaceDetails, ExtractionResult } from '@/lib/types/intel'

describe('ISO 3166-2 normalization', () => {
  it('maps Canadian province names and abbreviations', () => {
    expect(toIso3166_2('Alberta')).toBe('CA-AB')
    expect(toIso3166_2('AB')).toBe('CA-AB')
    expect(toIso3166_2('ontario')).toBe('CA-ON')
    expect(toIso3166_2('Québec')).toBe('CA-QC')
  })

  it('disambiguates bare "CA" using country', () => {
    expect(toIso3166_2('CA', 'US')).toBe('US-CA') // California
    expect(toIso3166_2('CA', 'CA')).toBeNull() // Canada country code, not a subdivision
  })

  it('maps US states when country is US', () => {
    expect(toIso3166_2('New York', 'US')).toBe('US-NY')
    expect(toIso3166_2('texas', 'US')).toBe('US-TX')
  })

  it('returns null for unknown regions', () => {
    expect(toIso3166_2('Atlantis')).toBeNull()
    expect(toIso3166_2(null)).toBeNull()
  })
})

describe('NAICS resolution', () => {
  it('validates code shape', () => {
    expect(validateNaicsCode('541511')).toBe('541511')
    expect(validateNaicsCode('51')).toBe('51')
    expect(validateNaicsCode('abc')).toBeNull()
    expect(validateNaicsCode('1234567')).toBeNull()
    expect(validateNaicsCode(null)).toBeNull()
  })

  it('falls back to Places types when AI code is absent', () => {
    expect(naicsFromPlaceTypes(['software_company'])).toBe('511210')
    expect(naicsFromPlaceTypes(['point_of_interest', 'lawyer'])).toBe('541110')
    expect(naicsFromPlaceTypes(['unknown_type'])).toBeNull()
  })

  it('prefers the validated AI code over the place-type fallback', () => {
    const r = resolveNaics('541512', ['software_company'])
    expect(r.code).toBe('541512')
    expect(r.title).toBe('Computer Systems Design Services')
  })

  it('uses the place-type fallback for an invalid AI code', () => {
    const r = resolveNaics('not-a-code', ['software_company'])
    expect(r.code).toBe('511210')
  })
})

describe('Algorithmic revenue', () => {
  it('estimates employees with a visibility multiplier', () => {
    expect(estimateEmployees(0)).toBeNull()
    expect(estimateEmployees(3)).toBe(12) // 3 × 4
  })

  it('uses sector revenue-per-employee benchmarks', () => {
    expect(revenuePerEmployee('511210')).toBe(320_000) // Information
    expect(revenuePerEmployee('999999')).toBe(220_000) // default
    expect(revenuePerEmployee(null)).toBe(220_000)
  })

  it('computes a rounded CAD estimate', () => {
    expect(estimateRevenueCad(12, '511210')).toBe(3_840_000)
    expect(estimateRevenueCad(null, '511210')).toBeNull()
    expect(estimateRevenueCad(0, '511210')).toBeNull()
  })
})

describe('normalizeCompany (Stage 5)', () => {
  const details: PlaceDetails = {
    placeId: 'place-1',
    name: 'Acme Software Inc',
    formattedAddress: '100 Main St, Calgary, AB, Canada',
    phone: '+1 403-555-0100',
    website: 'https://acme.example',
    businessStatus: 'OPERATIONAL',
    types: ['software_company', 'point_of_interest'],
    city: 'Calgary',
    province: 'AB',
    country: 'CA',
    latitude: 51.0,
    longitude: -114.0,
    raw: { id: 'place-1' },
  }

  const extraction: ExtractionResult = {
    contacts: [
      { full_name: 'Jane Doe', title: 'CTO', linkedin_url: null, confidence: 0.9 },
      { full_name: 'John Roe', title: 'VP Eng', linkedin_url: null, confidence: 0.8 },
    ],
    technographics: [
      { tool_name: 'TypeScript', category: 'language', evidence_url: null },
    ],
  }

  it('produces a fully normalized warehouse row', () => {
    const row = normalizeCompany(details, extraction)
    expect(row.place_id).toBe('place-1')
    expect(row.iso_3166_2).toBe('CA-AB')
    expect(row.naics_code).toBe('511210')
    expect(row.naics_title).toBe('Software Publishers')
    expect(row.employee_estimate).toBe(8) // 2 contacts × 4
    expect(row.estimated_revenue_cad).toBe(2_560_000) // 8 × 320k
  })

  it('honours an AI-inferred NAICS code over the place-type fallback', () => {
    const row = normalizeCompany(details, extraction, { aiNaicsCode: '541511' })
    expect(row.naics_code).toBe('541511')
    expect(row.naics_title).toBe('Custom Computer Programming Services')
  })
})
