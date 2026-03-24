-- MK8-CMS-004: Blog taxonomy — tags and topics
-- Sprint MK-8 · Phase 2

CREATE TABLE blog_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  slug        text NOT NULL UNIQUE,
  description text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE blog_topics (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  slug        text NOT NULL UNIQUE,
  description text,
  parent_id   uuid REFERENCES blog_topics(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE blog_post_tags (
  post_id uuid REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id  uuid REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE blog_post_topics (
  post_id  uuid REFERENCES blog_posts(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES blog_topics(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, topic_id)
);

ALTER TABLE blog_tags        ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_topics      ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags   ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_topics ENABLE ROW LEVEL SECURITY;
