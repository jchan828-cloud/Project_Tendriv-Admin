-- MK8-CMS-007: LinkedIn drafts table
-- Sprint MK-8 · Phase 3

CREATE TABLE linkedin_drafts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid REFERENCES blog_posts(id) ON DELETE CASCADE,
  copy       text NOT NULL,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','posted')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE linkedin_drafts ENABLE ROW LEVEL SECURITY;
