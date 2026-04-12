-- Add gate_asset_ids column to blog_posts for content-upgrade model.
-- Posts with gate_asset_ids keep their body fully crawlable; only
-- bonus downloadable assets require a gate form submission.
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS gate_asset_ids text[] DEFAULT '{}';

COMMENT ON COLUMN blog_posts.gate_asset_ids IS
  'Template IDs of gated bonus assets attached to this post (e.g. tbips-checklist, bid-no-bid-framework, psib-roadmap)';
