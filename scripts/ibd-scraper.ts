/**
 * MK7-PSIB-001: IBD Scraper
 *
 * Scrapes the Indigenous Business Directory (sac-isc.gc.ca/REA-IBD) and
 * upserts contacts into outreach_contacts with pipeline='psib'.
 *
 * Usage: npx tsx scripts/ibd-scraper.ts
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Rate limit: 1 request/second minimum.
 * Idempotent: upserts on (business_name, province).
 */

import { parse } from 'node-html-parser'
import { createClient } from '@supabase/supabase-js'

/* ────────────────── Database Schema Type ────────────────── */

type OutreachContactInsert = {
  pipeline: string
  business_name: string
  contact_email: string | null
  contact_website: string | null
  province: string | null
  unspsc_categories: string[]
  ibd_registered: boolean
  source_url: string
  status: string
  casl_consent_method: string
  casl_consent_date: string
  casl_consent_source: string
}

type OutreachContactRow = OutreachContactInsert & {
  id: string
  created_at: string
  last_activity_at: string | null
  cyberimpact_member_id: string | null
  notes: string | null
}

type Database = {
  public: {
    Tables: {
      outreach_contacts: {
        Row: OutreachContactRow
        Insert: OutreachContactInsert
        Update: Partial<OutreachContactInsert>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

/* ────────────────── Config ────────────────── */

const IBD_BASE = 'https://www.sac-isc.gc.ca/REA-IBD'
const IBD_RESULTS_URL = `${IBD_BASE}/eng/results`
const HITS_PER_PAGE = 25
const RATE_LIMIT_MS = 1100 // slightly over 1 second
const MAX_PAGES = 200 // safety cap (25 * 200 = 5,000 max)

const PROVINCES = [
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
]

/* ────────────────── Supabase ────────────────── */

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient<Database>(url, key)
}

/* ────────────────── Types ────────────────── */

type ScrapedContact = {
  business_name: string
  province: string | null
  contact_email: string | null
  contact_website: string | null
  categories: string[]
  source_url: string
}

/* ────────────────── Fetch with rate limit ────────────────── */

let lastRequestTime = 0

async function fetchWithRateLimit(url: string, init?: RequestInit): Promise<string> {
  const elapsed = Date.now() - lastRequestTime
  if (elapsed < RATE_LIMIT_MS) {
    await sleep(RATE_LIMIT_MS - elapsed)
  }
  lastRequestTime = Date.now()

  const response = await fetch(url, {
    ...init,
    headers: {
      'User-Agent': 'Tendriv-IBD-Scraper/1.0 (procurement notification service)',
      'Accept': 'text/html,application/xhtml+xml',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`)
  }
  return response.text()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/* ────────────────── HTML Parsing ────────────────── */

/**
 * Parse a results page and extract business contacts.
 *
 * NOTE: The IBD uses the Government of Canada WET (Web Experience Toolkit)
 * framework. The exact HTML structure may need adjustment after the first
 * live run. Key selectors are isolated here for easy tuning.
 */
function parseResultsPage(html: string): { contacts: ScrapedContact[]; hasNextPage: boolean } {
  const root = parse(html)
  const contacts: ScrapedContact[] = []

  // IBD results typically render as definition lists or table rows within a results div.
  // Try multiple selector strategies:

  // Strategy 1: Look for result entries in definition list format
  const dlEntries = root.querySelectorAll('.result, .searchResult, [class*="result"]')

  // Strategy 2: Look for table rows in a results table
  const tableRows = root.querySelectorAll('table.wet-boew-zebra tbody tr, table tbody tr')

  // Strategy 3: Look for structured divs with business data
  const businessDivs = root.querySelectorAll('.business-info, .company-result, article')

  // Combine all candidate elements
  const elements = dlEntries.length > 0 ? dlEntries
    : tableRows.length > 0 ? tableRows
    : businessDivs

  for (const el of elements) {
    const text = el.text.trim()
    if (!text) continue

    // Extract business name — typically the first heading or strong element
    const nameEl = el.querySelector('h2, h3, h4, strong, .company-name, a[href*="profile"]')
    const businessName = nameEl?.text.trim()
    if (!businessName) continue

    // Extract province
    const provinceMatch = text.match(/(?:Province|Territory|Prov)[:\s]*([A-Z]{2})/i)
      ?? text.match(/\b(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)\b/)
    const province = provinceMatch?.[1] ?? null

    // Extract website
    const websiteEl = el.querySelector('a[href^="http"]:not([href*="sac-isc"])')
    const contactWebsite = websiteEl?.getAttribute('href') ?? null

    // Extract email
    const emailEl = el.querySelector('a[href^="mailto:"]')
    const emailHref = emailEl?.getAttribute('href')
    const contactEmail = emailHref ? emailHref.replace('mailto:', '').trim() : null

    // Extract categories/keywords
    const categories: string[] = []
    const categoryEls = el.querySelectorAll('.category, .naics, [class*="category"]')
    for (const catEl of categoryEls) {
      const cat = catEl.text.trim()
      if (cat) categories.push(cat)
    }

    // Extract profile link for source_url
    const profileLink = el.querySelector('a[href*="profile"], a[href*="detail"]')
    const sourceUrl = profileLink?.getAttribute('href')
      ? new URL(profileLink.getAttribute('href')!, IBD_BASE).href
      : IBD_RESULTS_URL

    contacts.push({
      business_name: businessName,
      province,
      contact_email: contactEmail,
      contact_website: contactWebsite,
      categories,
      source_url: sourceUrl,
    })
  }

  // Check for next page
  const nextLink = root.querySelector('a[rel="next"], .next a, a:has(> .glyphicon-chevron-right), li.next a')
  const hasNextPage = nextLink !== null

  return { contacts, hasNextPage }
}

/* ────────────────── Upsert to Supabase ────────────────── */

type TypedClient = ReturnType<typeof getSupabase>

async function upsertContacts(
  supabase: TypedClient,
  contacts: ScrapedContact[],
): Promise<number> {
  if (contacts.length === 0) return 0

  const now = new Date().toISOString()
  const rows = contacts.map((c) => ({
    pipeline: 'psib',
    business_name: c.business_name,
    contact_email: c.contact_email,
    contact_website: c.contact_website,
    province: c.province,
    unspsc_categories: c.categories,
    ibd_registered: true,
    source_url: c.source_url,
    status: 'prospect',
    casl_consent_method: 'implied',
    casl_consent_date: now,
    casl_consent_source: 'IBD public directory — sac-isc.gc.ca/rea-ibd',
  }))

  // Upsert in batches of 50
  let upserted = 0
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50)
    const { error, count } = await supabase
      .from('outreach_contacts')
      .upsert(batch, {
        onConflict: 'business_name,province',
        ignoreDuplicates: false,
        count: 'exact',
      })

    if (error) {
      console.error(`  Upsert error (batch ${i / 50 + 1}):`, error.message)
    } else {
      upserted += count ?? batch.length
    }
  }

  return upserted
}

/* ────────────────── Main ────────────────── */

async function scrapeProvince(
  supabase: TypedClient,
  province: string,
): Promise<number> {
  let page = 1
  let total = 0

  while (page <= MAX_PAGES) {
    const params = new URLSearchParams({
      Province: province,
      hitsPerPage: String(HITS_PER_PAGE),
      page: String(page),
      format: 'HTML',
    })

    const url = `${IBD_RESULTS_URL}?${params.toString()}`
    console.log(`  [${province}] Page ${page}: ${url}`)

    let html: string
    try {
      html = await fetchWithRateLimit(url)
    } catch (err) {
      console.error(`  [${province}] Fetch failed on page ${page}:`, err)
      break
    }

    const { contacts, hasNextPage } = parseResultsPage(html)

    if (contacts.length === 0) {
      console.log(`  [${province}] No results on page ${page}, stopping.`)
      break
    }

    const upserted = await upsertContacts(supabase, contacts)
    total += upserted
    console.log(`  [${province}] Page ${page}: ${contacts.length} scraped, ${upserted} upserted`)

    if (!hasNextPage) break
    page++
  }

  return total
}

async function main() {
  console.log('=== IBD Scraper — MK7-PSIB-001 ===')
  console.log(`Rate limit: ${RATE_LIMIT_MS}ms between requests`)
  console.log(`Provinces: ${PROVINCES.join(', ')}`)
  console.log('')

  const supabase = getSupabase()
  let grandTotal = 0

  for (const province of PROVINCES) {
    console.log(`\nScraping province: ${province}`)
    const count = await scrapeProvince(supabase, province)
    grandTotal += count
    console.log(`  [${province}] Total upserted: ${count}`)
  }

  console.log(`\n=== Complete: ${grandTotal} total contacts upserted ===`)

  // Verify final count
  const { count: finalCount } = await supabase
    .from('outreach_contacts')
    .select('*', { count: 'exact', head: true })
    .eq('pipeline', 'psib')

  console.log(`Final count in outreach_contacts (psib): ${finalCount}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
