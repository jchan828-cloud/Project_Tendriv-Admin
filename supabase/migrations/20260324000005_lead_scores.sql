-- MK8-CRM-001: Lead scores + content attribution
-- Sprint MK-8 · Phase 1

CREATE TABLE lead_scores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      uuid NOT NULL REFERENCES outreach_contacts(id) ON DELETE CASCADE UNIQUE,
  score           integer NOT NULL CHECK (score >= 0 AND score <= 100),
  score_breakdown jsonb NOT NULL,
  scored_at       timestamptz DEFAULT now(),
  scoring_version text DEFAULT 'v1'
);

CREATE TABLE content_attribution (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  uuid NOT NULL REFERENCES outreach_contacts(id) ON DELETE CASCADE,
  post_id     uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  touch_type  text NOT NULL CHECK (touch_type IN ('first','last','assist')),
  touched_at  timestamptz DEFAULT now(),
  UNIQUE (contact_id, post_id, touch_type)
);

ALTER TABLE lead_scores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_attribution ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_lead_scores_contact ON lead_scores(contact_id);
CREATE INDEX idx_content_attribution_contact ON content_attribution(contact_id);
CREATE INDEX idx_content_attribution_post ON content_attribution(post_id, touch_type);
