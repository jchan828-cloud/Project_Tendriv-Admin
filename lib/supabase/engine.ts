import { createClient } from '@supabase/supabase-js';

/** Engine DB (tendriv-blog-content): autoblog runs, telemetry, pillar topics.
 *  Distinct from the marketing DB this app otherwise uses (blog_posts, CRM).
 *  Server-only — service role key.
 */
export function createEngineClient() {
  const url = process.env.ENGINE_SUPABASE_URL;
  const key = process.env.ENGINE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing ENGINE_SUPABASE_URL or ENGINE_SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key);
}
