-- MK8-CMS-001: Blog posts table
-- Sprint MK-8 · Phase 1

-- Reusable trigger function for updated_at columns
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE blog_posts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 text NOT NULL,
  slug                  text NOT NULL UNIQUE,
  content               text,
  excerpt               text,
  meta_description      text,
  canonical_url         text,
  og_image_url          text,
  target_keyword        text,
  secondary_keywords    text[] DEFAULT '{}',
  buyer_stage           text CHECK (buyer_stage IN ('awareness','consideration','decision')),
  content_type          text CHECK (content_type IN ('blog','case-study','guide','whitepaper')),
  status                text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','published','archived')),
  is_gated              boolean DEFAULT false,
  gate_cta              text,
  author_id             uuid NOT NULL REFERENCES auth.users(id),
  reviewer_id           uuid REFERENCES auth.users(id),
  reviewer_notes        text,
  published_at          timestamptz,
  scheduled_at          timestamptz,
  generated_by          text DEFAULT 'human' CHECK (generated_by IN ('human','ai-assisted')),
  word_count            integer DEFAULT 0,
  reading_time_minutes  integer GENERATED ALWAYS AS (GREATEST(1, word_count / 200)) STORED,
  jsonld_override       jsonb,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_blog_posts_status_stage_pub ON blog_posts(status, buyer_stage, published_at DESC);
