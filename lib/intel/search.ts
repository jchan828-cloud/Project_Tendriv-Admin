/**
 * B2B-INTEL-001 · Stage 3 — Signal Discovery (pluggable search provider).
 *
 * Two query surfaces per company:
 *   Query A (Contacts):       site:linkedin.com/in/ "<Company>"
 *   Query B (Technographics): site:jobs.lever.co OR site:boards.greenhouse.io "<Company>"
 *
 * Provider is env-selected (see resolveSearchProvider in config.ts):
 *   - 'serper'     → Serper.dev SERP API (recommended; works on any account)
 *   - 'google_cse' → Google Custom Search JSON API (grandfathered projects only;
 *                    closed to new GCP projects in 2026, gone 2027-01-01)
 *
 * Output is unstructured snippet text handed to Stage 4 for AI extraction.
 */

import {
  CUSTOM_SEARCH_URL,
  SERPER_URL,
  resolveSearchProvider,
  type GoogleIntelEnv,
} from './config'
import type { SearchHit, DiscoveredSignal } from '@/lib/types/intel'
import type { Fetcher } from './places'

/** Executes a single search query and returns normalized hits. */
export type SearchRunner = (query: string) => Promise<SearchHit[]>

export function contactsQuery(companyName: string): string {
  return `site:linkedin.com/in/ "${companyName}"`
}

export function technographicsQuery(companyName: string): string {
  return `site:jobs.lever.co OR site:boards.greenhouse.io "${companyName}"`
}

/* ───────────────────── Provider: Google CSE ────────────────────── */

function googleCseRunner(
  apiKey: string,
  engineId: string,
  fetcher: Fetcher,
): SearchRunner {
  return async (query: string) => {
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
}

/* ───────────────────── Provider: Serper.dev ────────────────────── */

function serperRunner(apiKey: string, fetcher: Fetcher): SearchRunner {
  return async (query: string) => {
    const res = await fetcher(SERPER_URL, {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 10 }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Serper ${res.status}: ${body}`)
    }
    const json = (await res.json()) as {
      organic?: { title?: string; link?: string; snippet?: string }[]
    }
    return (json.organic ?? []).map((i) => ({
      title: i.title ?? '',
      link: i.link ?? '',
      snippet: i.snippet ?? '',
    }))
  }
}

/**
 * Build the configured search runner, or null when no provider is set (the
 * pipeline then runs firmographics-only).
 */
export function makeSearchRunner(
  env: GoogleIntelEnv,
  opts: { fetcher?: Fetcher } = {},
): SearchRunner | null {
  const fetcher = opts.fetcher ?? fetch
  const provider = resolveSearchProvider(env)
  if (provider === 'serper' && env.serperApiKey) {
    return serperRunner(env.serperApiKey, fetcher)
  }
  if (
    provider === 'google_cse' &&
    env.customSearchApiKey &&
    env.customSearchEngineId
  ) {
    return googleCseRunner(env.customSearchApiKey, env.customSearchEngineId, fetcher)
  }
  return null
}

/**
 * Discover both signal types for one company. A failure on one query is logged
 * and skipped — partial signal is better than aborting the whole company.
 */
export async function discoverSignals(
  companyName: string,
  runner: SearchRunner,
): Promise<DiscoveredSignal[]> {
  const plan: { type: DiscoveredSignal['signalType']; q: string }[] = [
    { type: 'contacts', q: contactsQuery(companyName) },
    { type: 'technographics', q: technographicsQuery(companyName) },
  ]

  const signals: DiscoveredSignal[] = []
  for (const { type, q } of plan) {
    try {
      const hits = await runner(q)
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
