// Promote/Reject for the review queue, with the cross-DB consistency rule:
// marketing first (it's the user-visible truth on tendriv.ca), engine second,
// topic third. Each step's outcome is reported individually — a later-step
// failure never pretends overall success and never rolls back an earlier step.
//
// The `status = 'review'` guard on the marketing UPDATE is the concurrency
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
  /** Marketing guard hit: the post was no longer in 'review'. Nothing changed. */
  conflict: boolean;
  slug: string;
  action: 'promote' | 'reject';
  marketing: StepResult;
  engine: StepResult;
  /** Reject only; null when the action has no topic step (promote, or no linked topic). */
  topic: StepResult | null;
}

const SKIPPED: StepResult = { ok: false, detail: 'skipped: marketing step did not complete' };

function finish(result: ReviewActionResult): ReviewActionResult {
  result.ok =
    !result.conflict &&
    result.marketing.ok &&
    result.engine.ok &&
    (result.topic === null || result.topic.ok);
  return result;
}

export async function promotePost(
  marketing: DbClient,
  engine: DbClient,
  slug: string,
  reviewerId: string,
): Promise<ReviewActionResult> {
  const now = new Date().toISOString();
  const result: ReviewActionResult = {
    ok: false,
    conflict: false,
    slug,
    action: 'promote',
    marketing: SKIPPED,
    engine: SKIPPED,
    topic: null,
  };

  const { data: posts, error: postError } = await marketing
    .from('blog_posts')
    .update({ status: 'published', published_at: now, reviewer_id: reviewerId })
    .eq('slug', slug)
    .eq('status', 'review')
    .select('id');

  if (postError) {
    result.marketing = { ok: false, detail: postError.message };
    return finish(result);
  }
  if (!posts || posts.length === 0) {
    result.conflict = true;
    result.marketing = { ok: false, detail: 'post is no longer in review — already actioned' };
    return finish(result);
  }
  result.marketing = { ok: true, detail: 'blog_posts → published' };

  const { data: runs, error: runError } = await engine
    .from('autoblog_runs')
    .update({ status: 'published', published_at: now })
    .eq('published_slug', slug)
    .eq('status', 'review')
    .select('id');

  if (runError) {
    result.engine = { ok: false, detail: `post published but engine run update failed: ${runError.message}` };
  } else if (!runs || runs.length === 0) {
    result.engine = { ok: false, detail: 'post published but no engine run in review matched this slug' };
  } else {
    result.engine = { ok: true, detail: 'autoblog_runs → published' };
  }

  return finish(result);
}

export async function rejectPost(
  marketing: DbClient,
  engine: DbClient,
  slug: string,
  reviewerId: string,
): Promise<ReviewActionResult> {
  const result: ReviewActionResult = {
    ok: false,
    conflict: false,
    slug,
    action: 'reject',
    marketing: SKIPPED,
    engine: SKIPPED,
    topic: null,
  };

  const { data: posts, error: postError } = await marketing
    .from('blog_posts')
    .update({ status: 'archived', reviewer_id: reviewerId })
    .eq('slug', slug)
    .eq('status', 'review')
    .select('id, topic_id');

  if (postError) {
    result.marketing = { ok: false, detail: postError.message };
    return finish(result);
  }
  if (!posts || posts.length === 0) {
    result.conflict = true;
    result.marketing = { ok: false, detail: 'post is no longer in review — already actioned' };
    return finish(result);
  }
  result.marketing = { ok: true, detail: 'blog_posts → archived' };

  const { data: runs, error: runError } = await engine
    .from('autoblog_runs')
    .update({ status: 'rejected' })
    .eq('published_slug', slug)
    .eq('status', 'review')
    .select('id, topic_id');

  if (runError) {
    result.engine = { ok: false, detail: `post archived but engine run update failed: ${runError.message}` };
  } else if (!runs || runs.length === 0) {
    result.engine = { ok: false, detail: 'post archived but no engine run in review matched this slug' };
  } else {
    result.engine = { ok: true, detail: 'autoblog_runs → rejected' };
  }

  // Topic recycle: a rejected draft's topic re-enters rotation. The run's
  // topic_id is authoritative; the blog_posts row carries a copy as fallback.
  const topicId: string | null =
    (runs?.[0]?.topic_id as string | null | undefined) ??
    (posts[0]?.topic_id as string | null | undefined) ??
    null;

  if (!topicId) {
    // rfp-workflow runs have no topic — nothing to recycle, and that's fine.
    result.topic = null;
    return finish(result);
  }

  const { data: topics, error: topicError } = await engine
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
