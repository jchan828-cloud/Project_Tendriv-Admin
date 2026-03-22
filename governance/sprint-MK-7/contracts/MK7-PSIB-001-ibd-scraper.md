---
task_id: MK7-PSIB-001
name: IBD Scraper → outreach_contacts
layer: Layer 3/Script
repo: Project_Tendriv-Admin
priority: High
depends_on: [MK7-CRM-001]
interface_contract: Project_Tendriv-Marketing/governance/sprint-MK-7/SPRINT-MK-7-INTERFACE-CONTRACT.md
---

# MK7-PSIB-001 — IBD Scraper → outreach_contacts

## Objective

Build a scraper script that extracts Indigenous business contact data from the
IBD (Indigenous Business Directory) at `sac-isc.gc.ca/REA-IBD` and populates
the `outreach_contacts` table with PSIB pipeline prospects.

## Target

URL: `https://www.sac-isc.gc.ca/REA-IBD/eng/results`

The IBD search interface accepts category filter parameters. Scrape systematically
by business category to get full coverage.

## Deliverables

### Script: `scripts/ibd-scraper.ts`

A TypeScript script (run via `npx tsx scripts/ibd-scraper.ts`) that:

1. Fetches IBD search results page by page
2. Extracts per contact:
   - Business name (required)
   - Province/territory (required)
   - Website URL (preferred contact surface)
   - Email (if publicly visible)
   - Business category tags (for UNSPSC matching)
3. Upserts into `outreach_contacts` with:
   - `pipeline = 'psib'`
   - `ibd_registered = true`
   - `status = 'prospect'`
   - `source_url` = IBD profile URL
   - `casl_consent_method = 'implied'`
   - `casl_consent_date` = scrape date
   - `casl_consent_source = 'IBD public directory — sac-isc.gc.ca/rea-ibd'`

### Constraints

- Batch size: 100 per page
- Rate limit: 1 request/second minimum
- Target: 500 contacts minimum in MK-7
- Idempotent: re-running does not create duplicates (upsert on business_name + province)

## Acceptance Criteria

- [ ] Script runs without errors: `npx tsx scripts/ibd-scraper.ts`
- [ ] Contacts inserted into `outreach_contacts` with correct fields
- [ ] CASL consent fields populated on every record
- [ ] Rate limiting implemented (1 req/sec)
- [ ] Idempotent — safe to re-run
- [ ] Zero `any`, zero `as` assertions
- [ ] tsc --noEmit passes

## CASL Compliance

IBD is a public business directory. Businesses opted into public visibility when
registering. ISC documentation states: "This is a public directory available for
use by all levels of government, as well as the private sector to identify
Indigenous businesses." Consent basis: implied.
