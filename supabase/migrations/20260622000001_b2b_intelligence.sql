-- B2B-INTEL-001: B2B intelligence warehouse (ZoomInfo-style waterfall pipeline)
--
-- Stores the output of the five-stage enrichment waterfall:
--   1. Seed Generation     → intel_companies (pipeline_stage='seed')
--   2. Firmographic Detail → intel_companies (firmographic columns)
--   3. Signal Discovery    → intel_signals (raw scraped text)
--   4. AI Extraction       → intel_contacts + intel_technographics
--   5. Normalization       → iso_3166_2, naics_code, estimated_revenue_cad
--
-- Warehouse note: the original plan named BigQuery as the warehouse. This repo
-- already runs on Supabase/Postgres, so we reuse it as the indexed warehouse
-- rather than provisioning a second data store (see goal: "we don't need the
-- full tech stack unless there is a component we don't already have").

/* ── Pipeline run ledger ─────────────────────────────────────── */
CREATE TABLE intel_pipeline_runs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query                    text NOT NULL,
  region                   text,
  status                   text NOT NULL DEFAULT 'queued'
                             CHECK (status IN ('queued','running','completed','failed')),
  stage                    text
                             CHECK (stage IN ('seed','enrich','signals','extract','normalize','store')),
  seeds_found              integer NOT NULL DEFAULT 0,
  enriched_count           integer NOT NULL DEFAULT 0,
  signals_count            integer NOT NULL DEFAULT 0,
  contacts_extracted       integer NOT NULL DEFAULT 0,
  technographics_extracted integer NOT NULL DEFAULT 0,
  companies_stored         integer NOT NULL DEFAULT 0,
  cost_estimate_cad        numeric NOT NULL DEFAULT 0,
  error                    text,
  started_at               timestamptz,
  finished_at              timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE intel_pipeline_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_intel_runs_status ON intel_pipeline_runs(status);
CREATE INDEX idx_intel_runs_created ON intel_pipeline_runs(created_at DESC);

/* ── Company firmographic profile ────────────────────────────── */
CREATE TABLE intel_companies (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id              text NOT NULL UNIQUE,
  name                  text NOT NULL,
  legal_name            text,
  website               text,
  formatted_address     text,
  phone                 text,
  business_status       text,
  city                  text,
  province              text,
  country               text DEFAULT 'CA',
  iso_3166_2            text,               -- e.g. CA-AB (normalized region)
  naics_code            text,               -- e.g. 541511
  naics_title           text,
  place_types           text[] DEFAULT '{}',
  latitude              numeric,
  longitude             numeric,
  employee_estimate     integer,
  estimated_revenue_cad numeric,
  pipeline_stage        text NOT NULL DEFAULT 'seed'
                          CHECK (pipeline_stage IN ('seed','enriched','signals','extracted','stored')),
  run_id                uuid REFERENCES intel_pipeline_runs(id) ON DELETE SET NULL,
  raw_place_details     jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE intel_companies ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_intel_companies_province ON intel_companies(province);
CREATE INDEX idx_intel_companies_iso ON intel_companies(iso_3166_2);
CREATE INDEX idx_intel_companies_naics ON intel_companies(naics_code);
CREATE INDEX idx_intel_companies_stage ON intel_companies(pipeline_stage);

CREATE TRIGGER set_intel_companies_updated_at
  BEFORE UPDATE ON intel_companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

/* ── Raw signal store (Stage 3 output, pre-AI) ───────────────── */
CREATE TABLE intel_signals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES intel_companies(id) ON DELETE CASCADE,
  run_id      uuid REFERENCES intel_pipeline_runs(id) ON DELETE SET NULL,
  signal_type text NOT NULL CHECK (signal_type IN ('contacts','technographics')),
  query       text,
  source_url  text,
  raw_text    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE intel_signals ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_intel_signals_company ON intel_signals(company_id);

/* ── Extracted employee contacts (Stage 4 output) ────────────── */
CREATE TABLE intel_contacts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES intel_companies(id) ON DELETE CASCADE,
  full_name    text NOT NULL,
  title        text,
  linkedin_url text,
  source       text,               -- custom_search_linkedin | vertex_about_page
  confidence   numeric,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE intel_contacts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_intel_contacts_company ON intel_contacts(company_id);
CREATE UNIQUE INDEX idx_intel_contacts_dedupe
  ON intel_contacts(company_id, full_name, COALESCE(title, ''));

/* ── Extracted technographics (Stage 4 output) ───────────────── */
CREATE TABLE intel_technographics (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES intel_companies(id) ON DELETE CASCADE,
  tool_name    text NOT NULL,
  category     text,               -- language | framework | cloud | analytics | crm | ...
  source       text,               -- custom_search_jobs | website_head
  evidence_url text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE intel_technographics ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_intel_tech_company ON intel_technographics(company_id);
CREATE UNIQUE INDEX idx_intel_tech_dedupe
  ON intel_technographics(company_id, lower(tool_name));
