-- MK8-CMS-008: Blog post version control
-- Sprint MK-8 · Phase 2 (schema only; UI in Phase 3)

CREATE TABLE blog_post_versions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id        uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  content        jsonb NOT NULL,
  changed_by     uuid REFERENCES auth.users(id),
  change_type    text NOT NULL CHECK (change_type IN ('auto-save','manual-save','status-change','approval','restore')),
  created_at     timestamptz DEFAULT now(),
  UNIQUE (post_id, version_number)
);

ALTER TABLE blog_post_versions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_versions_post ON blog_post_versions(post_id, version_number DESC);
