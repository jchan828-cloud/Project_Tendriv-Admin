import type { ReviewQueueItem, ReviewQueuePost, ReviewQueueRun } from '@/lib/types/autoblog';

// Minimal structural client type: both supabase clients are untyped here and
// this keeps the join logic trivially mockable in tests.
type DbClient = { from: (table: string) => any };

const POST_COLUMNS =
  'id, slug, title, content_type, word_count, created_at, generated_at, content, excerpt, meta_description, topic_id';
const RUN_COLUMNS =
  'run_id, published_slug, workflow_type, status, quality_score, estimated_cost, total_tokens, topic_id, created_at';

export interface ReviewQueue {
  items: ReviewQueueItem[];
  /** Non-fatal: queue renders from blog_posts alone; run enrichment failed. */
  engineError: string | null;
}

/**
 * The approval queue: blog_posts in 'review', each joined in code to its
 * autoblog_run via slug == published_slug. Since the DB consolidation both
 * tables live in the same (marketing) DB, so this is single-DB display
 * enrichment — one client serves both reads. blog_posts is the source of truth
 * for what needs review; a missing or unreadable run degrades the row (no
 * scores/cost), it never hides it.
 */
export async function fetchReviewQueue(db: DbClient): Promise<ReviewQueue> {
  const { data: posts, error } = await db
    .from('blog_posts')
    .select(POST_COLUMNS)
    .eq('status', 'review')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Review queue read failed: ${error.message}`);

  const rows = (posts ?? []) as ReviewQueuePost[];
  if (rows.length === 0) return { items: [], engineError: null };

  const { data: runs, error: runError } = await db
    .from('autoblog_runs')
    .select(RUN_COLUMNS)
    .in('published_slug', rows.map((p) => p.slug));

  const runsBySlug = new Map<string, ReviewQueueRun>();
  for (const run of (runs ?? []) as ReviewQueueRun[]) {
    if (run.published_slug) runsBySlug.set(run.published_slug, run);
  }

  return {
    items: rows.map((post) => ({ post, run: runsBySlug.get(post.slug) ?? null })),
    engineError: runError ? runError.message : null,
  };
}
