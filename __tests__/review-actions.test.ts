import { describe, it, expect, beforeEach } from 'vitest';
import { promotePost, rejectPost, submitPostForReview } from '@/lib/autoblog/review-actions';

// Single-DB contract since the blog consolidation: promote/reject touch ONLY
// blog_posts (autoblog_runs make no content claims — no mirror update), and
// reject's topic recycle is a same-DB update keyed on the blog_posts row's
// topic_id. The status guard is the concurrency lock; partial failures (topic
// recycle only) are reported step-by-step, never swallowed.

interface Call {
  table: string;
  payload: Record<string, unknown>;
  filters: Record<string, unknown>;
}

let calls: Call[];
let results: Record<string, { data: unknown; error: { message: string } | null }>;

function makeClient() {
  return {
    from(table: string) {
      return {
        update(payload: Record<string, unknown>) {
          const filters: Record<string, unknown> = {};
          const chain = {
            eq(col: string, val: unknown) {
              filters[col] = val;
              return chain;
            },
            async select() {
              calls.push({ table, payload, filters });
              return results[table] ?? { data: [], error: null };
            },
          };
          return chain;
        },
      };
    },
  };
}

const db = makeClient();

beforeEach(() => {
  calls = [];
  results = {
    blog_posts: { data: [{ id: 'p1', topic_id: null }], error: null },
    pillar_topics: { data: [{ id: 't1' }], error: null },
  };
});

describe('promotePost', () => {
  it('flips blog_posts review → published and makes NO autoblog_runs mirror', async () => {
    const result = await promotePost(db, 'shipley-guide-123', 'reviewer-1');

    expect(result.ok).toBe(true);
    expect(result.conflict).toBe(false);
    expect(result.topic).toBeNull();

    // Single write: only blog_posts. No autoblog_runs touch (W6).
    expect(calls).toHaveLength(1);
    expect(calls.some((c) => c.table === 'autoblog_runs')).toBe(false);
    const [m] = calls;
    expect(m!.table).toBe('blog_posts');
    expect(m!.payload.status).toBe('published');
    expect(typeof m!.payload.published_at).toBe('string');
    expect(m!.payload.reviewer_id).toBe('reviewer-1');
    expect(m!.filters).toEqual({ slug: 'shipley-guide-123', status: 'review' });
  });

  it('returns conflict when the review guard matches 0 rows', async () => {
    results.blog_posts = { data: [], error: null };
    const result = await promotePost(db, 'slug-x', 'reviewer-1');

    expect(result.conflict).toBe(true);
    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(1);
  });

  it('maps a blog_posts error to a failed post step', async () => {
    results.blog_posts = { data: null, error: { message: 'db down' } };
    const result = await promotePost(db, 'slug-x', 'reviewer-1');

    expect(result.ok).toBe(false);
    expect(result.conflict).toBe(false);
    expect(result.post.ok).toBe(false);
    expect(result.post.detail).toContain('db down');
  });
});

describe('submitPostForReview', () => {
  it('flips blog_posts draft → review under the draft guard', async () => {
    const result = await submitPostForReview(db, 'my-draft', 'reviewer-1');

    expect(result.ok).toBe(true);
    expect(result.action).toBe('submit');
    expect(calls).toHaveLength(1);
    const [m] = calls;
    expect(m!.table).toBe('blog_posts');
    expect(m!.payload.status).toBe('review');
    expect(m!.filters).toEqual({ slug: 'my-draft', status: 'draft' });
  });

  it('returns conflict when the draft guard matches 0 rows', async () => {
    results.blog_posts = { data: [], error: null };
    const result = await submitPostForReview(db, 'my-draft', 'reviewer-1');

    expect(result.conflict).toBe(true);
    expect(result.ok).toBe(false);
  });
});

describe('rejectPost', () => {
  it('archives blog_posts and recycles the topic — no autoblog_runs mirror', async () => {
    results.blog_posts = { data: [{ id: 'p1', topic_id: 'topic-9' }], error: null };
    const result = await rejectPost(db, 'shipley-guide-123', 'reviewer-1');

    expect(result.ok).toBe(true);
    // Two writes: blog_posts then pillar_topics. autoblog_runs is never touched.
    expect(calls.map((c) => c.table)).toEqual(['blog_posts', 'pillar_topics']);
    expect(calls.some((c) => c.table === 'autoblog_runs')).toBe(false);

    const [m, t] = calls;
    expect(m!.payload.status).toBe('archived');
    expect('published_at' in m!.payload).toBe(false);
    expect(m!.filters).toEqual({ slug: 'shipley-guide-123', status: 'review' });

    // Recycle: queued only from 'used', keyed on the blog_posts row's topic_id.
    expect(t!.payload).toEqual({ status: 'queued' });
    expect(t!.filters).toEqual({ id: 'topic-9', status: 'used' });
    expect(result.topic).toEqual({ ok: true, detail: 'pillar_topics → queued' });
  });

  it('skips the topic step when the post carries no topic_id', async () => {
    const result = await rejectPost(db, 'slug-x', 'reviewer-1');

    expect(result.topic).toBeNull();
    expect(result.ok).toBe(true);
    expect(calls.some((c) => c.table === 'pillar_topics')).toBe(false);
  });

  it('records, without failing, a topic that was not in used state', async () => {
    results.blog_posts = { data: [{ id: 'p1', topic_id: 'topic-9' }], error: null };
    results.pillar_topics = { data: [], error: null };
    const result = await rejectPost(db, 'slug-x', 'reviewer-1');

    expect(result.ok).toBe(true);
    expect(result.topic!.ok).toBe(true);
    expect(result.topic!.detail).toContain('not in used state');
  });

  it('reports partial state when the topic recycle fails', async () => {
    results.blog_posts = { data: [{ id: 'p1', topic_id: 'topic-9' }], error: null };
    results.pillar_topics = { data: null, error: { message: 'rls denied' } };
    const result = await rejectPost(db, 'slug-x', 'reviewer-1');

    expect(result.ok).toBe(false);
    expect(result.post.ok).toBe(true);
    expect(result.topic!.ok).toBe(false);
    expect(result.topic!.detail).toContain('rls denied');
  });

  it('returns conflict and stops when the post was already actioned', async () => {
    results.blog_posts = { data: [], error: null };
    const result = await rejectPost(db, 'slug-x', 'reviewer-1');

    expect(result.conflict).toBe(true);
    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(1);
  });
});
