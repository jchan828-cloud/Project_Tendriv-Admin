import { describe, it, expect, vi } from 'vitest'
import { runPipeline } from '@/lib/intel/pipeline'
import { textSearchSeeds, mapPlaceDetails } from '@/lib/intel/places'
import {
  contactsQuery,
  technographicsQuery,
  signalsToText,
} from '@/lib/intel/search'
import type { GoogleIntelEnv } from '@/lib/intel/config'
import type { SupabaseClient } from '@supabase/supabase-js'

/* ── A chainable, thenable Supabase mock that records writes ──── */
function makeDb() {
  const log = {
    inserts: [] as { table: string; rows: unknown }[],
    upserts: [] as { table: string; rows: unknown }[],
    updates: [] as { table: string; patch: unknown }[],
  }
  let idSeq = 0

  function builder(table: string) {
    const b: Record<string, unknown> = {
      insert(rows: unknown) {
        log.inserts.push({ table, rows })
        return b
      },
      update(patch: unknown) {
        log.updates.push({ table, patch })
        return b
      },
      upsert(rows: unknown) {
        log.upserts.push({ table, rows })
        return b
      },
      select: () => b,
      eq: () => b,
      order: () => b,
      limit: () => b,
      ilike: () => b,
      returns: () => b,
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: { id: `id-${++idSeq}` }, error: null }),
      then(resolve: (v: { data: null; error: null }) => void) {
        resolve({ data: null, error: null })
      },
    }
    return b
  }

  const db = { from: (t: string) => builder(t) } as unknown as SupabaseClient
  return { db, log }
}

const ENV: GoogleIntelEnv = {
  placesApiKey: 'places-key',
  customSearchApiKey: 'cse-key',
  customSearchEngineId: 'cx-id',
  geminiApiKey: null,
  anthropicApiKey: null,
}

/* ── Mock fetch routing each waterfall stage by URL ──────────── */
function makeFetcher() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()

    if (url.includes('places:searchText')) {
      return new Response(
        JSON.stringify({
          places: [
            { id: 'place-A', displayName: { text: 'Acme Software' } },
            { id: 'place-B', displayName: { text: 'Beta Labs' } },
          ],
        }),
        { status: 200 },
      )
    }

    if (url.includes('/places/place-')) {
      const id = url.includes('place-A') ? 'place-A' : 'place-B'
      return new Response(
        JSON.stringify({
          id,
          displayName: { text: id === 'place-A' ? 'Acme Software' : 'Beta Labs' },
          formattedAddress: '1 St, Calgary, AB',
          websiteUri: 'https://x.example',
          businessStatus: 'OPERATIONAL',
          types: ['software_company'],
          location: { latitude: 51, longitude: -114 },
          addressComponents: [
            { shortText: 'AB', types: ['administrative_area_level_1'] },
            { shortText: 'CA', types: ['country'] },
            { longText: 'Calgary', types: ['locality'] },
          ],
        }),
        { status: 200 },
      )
    }

    if (url.includes('customsearch')) {
      return new Response(
        JSON.stringify({
          items: [
            { title: 'Jane Doe - CTO', link: 'https://linkedin.com/in/jane', snippet: 'CTO at Acme' },
          ],
        }),
        { status: 200 },
      )
    }

    throw new Error(`unexpected fetch: ${url}`)
  })
}

describe('Stage 3 query builders', () => {
  it('targets LinkedIn for contacts and job boards for tech', () => {
    expect(contactsQuery('Acme')).toBe('site:linkedin.com/in/ "Acme"')
    expect(technographicsQuery('Acme')).toBe(
      'site:jobs.lever.co OR site:boards.greenhouse.io "Acme"',
    )
  })

  it('flattens signals to LLM-ready text', () => {
    const text = signalsToText([
      { signalType: 'contacts', query: 'q', hits: [{ title: 'T', link: 'L', snippet: 'S' }] },
    ])
    expect(text).toContain('### contacts')
    expect(text).toContain('[T](L) :: S')
  })
})

describe('Stage 1 seed parsing', () => {
  it('parses and limits seeds', async () => {
    const fetcher = makeFetcher()
    const seeds = await textSearchSeeds('Software companies in Alberta', 'k', {
      limit: 1,
      fetcher: fetcher as unknown as typeof fetch,
    })
    expect(seeds).toHaveLength(1)
    expect(seeds[0]).toEqual({ placeId: 'place-A', name: 'Acme Software' })
  })
})

describe('Stage 2 mapper', () => {
  it('extracts province/country shortText from address components', () => {
    const d = mapPlaceDetails('place-A', {
      id: 'place-A',
      displayName: { text: 'Acme' },
      types: ['software_company'],
      addressComponents: [
        { shortText: 'AB', types: ['administrative_area_level_1'] },
        { shortText: 'CA', types: ['country'] },
      ],
    })
    expect(d.province).toBe('AB')
    expect(d.country).toBe('CA')
  })
})

describe('runPipeline (full waterfall, mocked I/O)', () => {
  it('runs all five stages, stores companies, and records a completed run', async () => {
    const { db, log } = makeDb()
    const fetcher = makeFetcher()
    const extractor = vi.fn(async () => ({
      contacts: [{ full_name: 'Jane Doe', title: 'CTO', linkedin_url: null, confidence: 0.9 }],
      technographics: [{ tool_name: 'TypeScript', category: 'language', evidence_url: null }],
    }))

    const summary = await runPipeline(
      { query: 'Software companies in Alberta', limit: 2 },
      { db, env: ENV, fetcher: fetcher as unknown as typeof fetch, extractor },
    )

    expect(summary.seeds).toBe(2)
    expect(summary.companies).toBe(2)
    expect(summary.contacts).toBe(2) // 1 per company × 2
    expect(summary.technographics).toBe(2)
    expect(summary.costEstimateCad).toBeGreaterThan(0)

    // Extractor invoked once per enriched company.
    expect(extractor).toHaveBeenCalledTimes(2)

    // Companies upserted by place_id; run marked completed.
    const companyUpserts = log.upserts.filter((u) => u.table === 'intel_companies')
    expect(companyUpserts).toHaveLength(2)
    const finalUpdate = log.updates.at(-1)?.patch as { status?: string }
    expect(finalUpdate.status).toBe('completed')
  })

  it('marks the run failed when seed generation throws', async () => {
    const { db, log } = makeDb()
    const failing = vi.fn(async () => new Response('boom', { status: 500 }))

    await expect(
      runPipeline(
        { query: 'x y z', limit: 2 },
        { db, env: ENV, fetcher: failing as unknown as typeof fetch },
      ),
    ).rejects.toThrow()

    const finalUpdate = log.updates.at(-1)?.patch as { status?: string }
    expect(finalUpdate.status).toBe('failed')
  })
})
