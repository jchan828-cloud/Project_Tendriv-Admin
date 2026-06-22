-- B2B-INTEL-002: fix Stage-4 storage dedupe indexes.
-- The original unique indexes used expressions (COALESCE(title,''), lower(tool_name)),
-- which Postgres cannot match against a column-list ON CONFLICT target, so every
-- contacts/technographics upsert failed with 42P10 and the AI-extracted rows were
-- silently dropped. Recreate as plain-column unique indexes (NULLS NOT DISTINCT so
-- a null title still dedupes).

DROP INDEX IF EXISTS idx_intel_contacts_dedupe;
CREATE UNIQUE INDEX idx_intel_contacts_dedupe
  ON intel_contacts (company_id, full_name, title) NULLS NOT DISTINCT;

DROP INDEX IF EXISTS idx_intel_tech_dedupe;
CREATE UNIQUE INDEX idx_intel_tech_dedupe
  ON intel_technographics (company_id, tool_name) NULLS NOT DISTINCT;
