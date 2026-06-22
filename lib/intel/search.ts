/**
 * B2B-INTEL-001 · Stage 3 — Signal Discovery (Custom Search JSON API).
 *
 * Post-2026, Custom Search engines can no longer search the "entire web", so
 * the configured engine (cx) must whitelist high-signal domains. We still scope
 * each query to the exact surface we want:
 *
 *   Query A (Contacts):       site:linkedin.com/in/ "<Company>"
 *   Query B (Technographics): site:jobs.lever.co OR site:boards.greenhouse.io "<Company>"
 *
 * Output is unstructured snippet text handed to Stage 4 for AI extraction.
 */

import { CUSTOM_SEARCH_URL } from './config'
import type { SearchHit, DiscoveredSignal } from '@/lib/types/intel'
import type { Fetcher } from './places'

export function contactsQuery(companyName: string): string {
  return `site:linkedin.com/in/ "${companyName}"`
}

export function technographicsQuery(companyName: string): string {
  return `site:jobs.lever.co OR site:boards.greenhouse.io "${companyName}"`
}

async function runQuery(
  query: string,
  apiKey: string,
  engineId: string,
  fetcher: Fetcher,
): Promise<SearchHit[]> {
  const url = new URL(CUSTOM_SEARCH_URL)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('cx', engineId)
  url.searchParams.set('q', query)
  url.searchParams.set('num', '10')

  const res = await fetcher(url.toString())
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Custom Search ${res.status}: ${body}`)
  }

  const json = (await res.json()) as {
    items?: { title?: string; link?: string; snippet?: string }[]
  }

  return (json.items ?? []).map((i) => ({
    title: i.title ?? '',
    link: i.link ?? '',
    snippet: i.snippet ?? '',
  }))
}

/**
 * Discover both signal types for one company. A failure on one query is logged
 * and skipped — partial signal is better than aborting the whole company.
 */
export async function discoverSignals(
  companyName: string,
  apiKey: string,
  engineId: string,
  opts: { fetcher?: Fetcher } = {},
): Promise<DiscoveredSignal[]> {
  const fetcher = opts.fetcher ?? fetch
  const plan: { type: DiscoveredSignal['signalType']; q: string }[] = [
    { type: 'contacts', q: contactsQuery(companyName) },
    { type: 'technographics', q: technographicsQuery(companyName) },
  ]

  const signals: DiscoveredSignal[] = []
  for (const { type, q } of plan) {
    try {
      const hits = await runQuery(q, apiKey, engineId, fetcher)
      signals.push({ signalType: type, query: q, hits })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[intel:search] ${type} query failed for ${companyName}:`, message)
    }
  }
  return signals
}

/** Flatten hits into a single text blob for the LLM. */
export function signalsToText(signals: DiscoveredSignal[]): string {
  return signals
    .map((s) => {
      const lines = s.hits
        .map((h) => `- [${h.title}](${h.link}) :: ${h.snippet}`)
        .join('\n')
      return `### ${s.signalType} (query: ${s.query})\n${lines || '(no results)'}`
    })
    .join('\n\n')
}
