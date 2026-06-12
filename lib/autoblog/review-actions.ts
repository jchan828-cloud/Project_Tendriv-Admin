// Promote/Reject for the review queue. Since the blog DB consolidation,
// blog_posts is the single source of truth: there is no separate engine DB and
// autoblog_runs make NO content claims, so promote/reject touch ONLY
// blog_posts (W6) plus, on reject, the same-DB pillar_topics recycle.
//
// The `status = 'review'` guard on the blog_posts UPDATE is the concurrency
// lock: 0 rows updated means another reviewer actioned the post first, and the
// caller gets `conflict` instead of a double-fire.

type DbClient = { from: (table: string) => any };

export interface StepResult {
  ok: boolean;
  detail: string;
}

export interface ReviewActionResult {
  /** True only when every applicable step succeeded. */
  ok: boolean;
  /** Guard hit: the post was no longer in 'review'. Nothing changed. */
  conflict: boolean;
  slug: string;
  action: 'promote' | 'reject' | 'submit';
  post: StepResult;
  /** Reject only; null when the action has no topic step (promote, or no linked topic). */
  topic: StepResult | null;
}

const SKIPPED: StepResult = { ok: false, detail: 'skipped: post step did not complete' };

function finish(result: ReviewActionResult): ReviewActionResult {
  result.ok =
    !result.conflict &&
    result.post.ok &&
    (result.topic === null || result.topic.ok);
  return result;
}

export async function promotePost(
  db: DbClient,
  slug: string,
  reviewerId: string,
): Promise<ReviewActionResult> {
  const now = new Date().toISOString();
  const result: ReviewActionResult = {
    ok: false,
    conflict: false,
    slug,
    action: 'promote',
    post: SKIPPED,
    topic: null,
  };

  // The guarded review → published transition is the whole of promote now;
  // autoblog_runs make no content claims, so there is no mirror update (W6).
  const { data: posts, error: postError } = await db
    .from('blog_posts')
    .update({ status: 'published', published_at: now, reviewer_id: reviewerId })
    .eq('slug', slug)
    .eq('status', 'review')
    .select('id');

  if (postError) {
    result.post = { ok: false, detail: postError.message };
    return finish(result);
  }
  if (!posts || posts.length === 0) {
    result.conflict = true;
    result.post = { ok: false, detail: 'post is no longer in review — already actioned' };
    return finish(result);
  }
  result.post = { ok: true, detail: 'blog_posts → published' };

  return finish(result);
}

export async function submitPostForReview(
  db: DbClient,
  slug: string,
  reviewerId: string,
): Promise<ReviewActionResult> {
  const result: ReviewActionResult = {
    ok: false,
    conflict: false,
    slug,
    action: 'submit',
    post: SKIPPED,
    topic: null,
  };

  // Guarded draft → review. This is the ONLY path for the draft→review
  // transition (W2 — the generic PATCH no longer accepts status). The
  // status='draft' guard is the concurrency lock.
  const { data: posts, error: postError } = await db
    .from('blog_posts')
    .update({ status: 'review', reviewer_id: reviewerId })
    .eq('slug', slug)
    .eq('status', 'draft')
    .select('id');

  if (postError) {
    result.post = { ok: false, detail: postError.message };
    return finish(result);
  }
  if (!posts || posts.length === 0) {
    result.conflict = true;
    result.post = { ok: false, detail: 'post is no longer a draft — already actioned' };
    return finish(result);
  }
  result.post = { ok: true, detail: 'blog_posts → review' };

  return finish(result);
}

export async function rejectPost(
  db: DbClient,
  slug: string,
  reviewerId: string,
): Promise<ReviewActionResult> {
  const result: ReviewActionResult = {
    ok: false,
    conflict: false,
    slug,
    action: 'reject',
    post: SKIPPED,
    topic: null,
  };

  // Guarded review → archived. No autoblog_runs mirror (W6 — runs make no
  // content claims). The topic_id on the blog_posts row drives the recycle.
  const { data: posts, error: postError } = await db
    .from('blog_posts')
    .update({ status: 'archived', reviewer_id: reviewerId })
    .eq('slug', slug)
    .eq('status', 'review')
    .select('id, topic_id');

  if (postError) {
    result.post = { ok: false, detail: postError.message };
    return finish(result);
  }
  if (!posts || posts.length === 0) {
    result.conflict = true;
    result.post = { ok: false, detail: 'post is no longer in review — already actioned' };
    return finish(result);
  }
  result.post = { ok: true, detail: 'blog_posts → archived' };

  // Topic recycle: a rejected draft's topic re-enters rotation. Now a same-DB
  // update keyed on the blog_posts row's topic_id — the previously-planned
  // engine-endpoint round-trip is obsolete since the tables share one DB.
  const topicId: string | null =
    (posts[0]?.topic_id as string | null | undefined) ?? null;

  if (!topicId) {
    // rfp-workflow posts have no topic — nothing to recycle, and that's fine.
    result.topic = null;
    return finish(result);
  }

  const { data: topics, error: topicError } = await db
    .from('pillar_topics')
    .update({ status: 'queued' })
    .eq('id', topicId)
    .eq('status', 'used')
    .select('id');

  if (topicError) {
    result.topic = { ok: false, detail: `topic recycle failed: ${topicError.message}` };
  } else if (!topics || topics.length === 0) {
    // Not in 'used' — e.g. already requeued by hand. Recorded, not a failure.
    result.topic = { ok: true, detail: 'topic was not in used state — left unchanged' };
  } else {
    result.topic = { ok: true, detail: 'pillar_topics → queued' };
  }

  return finish(result);
}
