import { describe, it, expect } from 'vitest'
import { coerceExtraction } from '@/lib/intel/extract'

describe('coerceExtraction (tolerant Stage-4 parsing)', () => {
  it('maps the canonical schema', () => {
    const r = coerceExtraction({
      contacts: [{ full_name: 'Jane Doe', title: 'CTO', linkedin_url: 'https://x', confidence: 0.9 }],
      technographics: [{ tool_name: 'TypeScript', category: 'language', evidence_url: 'https://y' }],
    })
    expect(r.contacts).toHaveLength(1)
    expect(r.contacts[0]).toMatchObject({ full_name: 'Jane Doe', title: 'CTO' })
    expect(r.technographics[0]?.tool_name).toBe('TypeScript')
  })

  it('accepts common field aliases instead of dropping the whole batch', () => {
    const r = coerceExtraction({
      people: [{ name: 'Bill Copeland', role: 'VP Operations', linkedin: 'https://li/bill' }],
      technologies: [{ technology: 'React', type: 'framework' }],
    })
    expect(r.contacts[0]).toMatchObject({
      full_name: 'Bill Copeland',
      title: 'VP Operations',
      linkedin_url: 'https://li/bill',
    })
    expect(r.technographics[0]?.tool_name).toBe('React')
  })

  it('drops only items missing a required key, keeps the rest', () => {
    const r = coerceExtraction({
      contacts: [
        { title: 'No name here' }, // dropped
        { full_name: 'Real Person' }, // kept
      ],
    })
    expect(r.contacts).toHaveLength(1)
    expect(r.contacts[0]?.full_name).toBe('Real Person')
  })

  it('returns empty arrays for junk input', () => {
    expect(coerceExtraction(null)).toEqual({ contacts: [], technographics: [] })
    expect(coerceExtraction({ contacts: 'nope' })).toEqual({ contacts: [], technographics: [] })
  })
})
