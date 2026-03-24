-- MK8-ANL-001: UTM campaigns, clicks, and marketing events
-- Sprint MK-8 · Phase 1

CREATE TABLE utm_campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  utm_source      text NOT NULL,
  utm_medium      text NOT NULL,
  utm_campaign    text NOT NULL,
  utm_term        text,
  utm_content     text,
  destination_url text NOT NULL,
  full_url        text NOT NULL,
  short_code      text NOT NULL UNIQUE,
  click_count     integer DEFAULT 0,
  post_id         uuid REFERENCES blog_posts(id) ON DELETE SET NULL,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE utm_clicks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utm_id              uuid NOT NULL REFERENCES utm_campaigns(id) ON DELETE CASCADE,
  clicked_at          timestamptz DEFAULT now(),
  ip_hash             text,
  referrer            text,
  user_agent_hash     text,
  resolved_contact_id uuid REFERENCES outreach_contacts(id) ON DELETE SET NULL
);

CREATE TABLE marketing_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text NOT NULL,
  post_id     uuid REFERENCES blog_posts(id) ON DELETE SET NULL,
  session_id  text NOT NULL,
  metadata    jsonb,
  occurred_at timestamptz DEFAULT now()
);

ALTER TABLE utm_campaigns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE utm_clicks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_utm_clicks_utm_id ON utm_clicks(utm_id);
CREATE INDEX idx_marketing_events_session ON marketing_events(session_id, occurred_at DESC);
CREATE INDEX idx_marketing_events_post ON marketing_events(post_id, event_type);
