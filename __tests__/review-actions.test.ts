import { describe, it, expect, beforeEach } from 'vitest';
import { promotePost, rejectPost } from '@/lib/autoblog/review-actions';

// Cross-DB consistency contract: marketing first, engine second, topic third;
// the status='review' guard is the concurrency lock; partial failures are
// reported step-by-step, never swallowed, never rolled back.

interface Call {
  db: 'marketing' | 'engine';
  table: string;
  payload: Record<string, unknown>;
  filters: Record<string, unknown>;
}

let calls: Call[];
let marketingResult: { data: unknown; error: { message: string } | null };
let engineResults: Record<string, { data: unknown; error: { message: string } | null }>;

function makeClient(db: 'marketing' | 'engine') {
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
              calls.push({ db, table, payload, filters });
              return db === 'marketing'
                ? marketingResult
                : engineResults[table] ?? { data: [], error: null };
            },
          };
          return chain;
        },
      };
    },
  };
}

const marketing = makeClient('marketing');
const engine = makeClient('engine');

beforeEach(() => {
  calls = [];
  marketingResult = { data: [{ id: 'p1', topic_id: null }], error: null };
  engineResults = {
    autoblog_runs: { data: [{ id: 'r1', topic_id: null }], error: null },
    pillar_topics: { data: [{ id: 't1' }], error: null },
  };
});

describe('promotePost', () => {
  it('publishes marketing first, then mirrors the engine run', async () => {
    const result = await promotePost(marketing, engine, 'shipley-guide-123', 'reviewer-1');

    expect(result.ok).toBe(true);
    expect(result.conflict).toBe(false);
    expect(result.topic).toBeNull();

    expect(calls).toHaveLength(2);
    const [m, e] = calls;
    expect(m!.db).toBe('marketing');
    expect(m!.table).toBe('blog_posts');
    expect(m!.payload.status).toBe('published');
    expect(typeof m!.payload.published_at).toBe('string');
    expect(m!.payload.reviewer_id).toBe('reviewer-1');
    expect(m!.filters).toEqual({ slug: 'shipley-guide-123', status: 'review' });

    expect(e!.db).toBe('engine');
    expect(e!.table).toBe('autoblog_runs');
    expect(e!.payload).toMatchObject({ status: 'published' });
    expect(typeof e!.payload.published_at).toBe('string');
    expect(e!.filters).toEqual({ published_slug: 'shipley-guide-123', status: 'review' });
  });

  it('returns conflict and never touches the engine when the guard matches 0 rows', async () => {
    marketingResult = { data: [], error: null };
    const result = await promotePost(marketing, engine, 'slug-x', 'reviewer-1');

    expect(result.conflict).toBe(true);
    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.db).toBe('marketing');
  });

  it('reports partial state when the engine update fails after the publish', async () => {
    engineResults.autoblog_runs = { data: null, error: { message: 'engine timeout' } };
    const result = await promotePost(marketing, engine, 'slug-x', 'reviewer-1');

    expect(result.ok).toBe(false);
    expect(result.conflict).toBe(false);
    expect(result.marketing.ok).toBe(true);
    expect(result.engine.ok).toBe(false);
    expect(result.engine.detail).toContain('engine timeout');
  });

  it('reports partial state when no engine run in review matches the slug', async () => {
    engineResults.autoblog_runs = { data: [], error: null };
    const result = await promotePost(marketing, engine, 'slug-x', 'reviewer-1');

    expect(result.ok).toBe(false);
    expect(result.marketing.ok).toBe(true);
    expect(result.engine.ok).toBe(false);
    expect(result.engine.detail).toContain('no engine run');
  });
});

describe('rejectPost', () => {
  it('archives marketing, rejects the engine run, and recycles the topic — in that order', async () => {
    engineResults.autoblog_runs = { data: [{ id: 'r1', topic_id: 'topic-9' }], error: null };
    const result = await rejectPost(marketing, engine, 'shipley-guide-123', 'reviewer-1');

    expect(result.ok).toBe(true);
    expect(calls.map((c) => `${c.db}:${c.table}`)).toEqual([
      'marketing:blog_posts',
      'engine:autoblog_runs',
      'engine:pillar_topics',
    ]);

    const [m, e, t] = calls;
    expect(m!.payload.status).toBe('archived');
    expect('published_at' in m!.payload).toBe(false);
    expect(m!.filters).toEqual({ slug: 'shipley-guide-123', status: 'review' });

    expect(e!.payload).toEqual({ status: 'rejected' });
    expect(e!.filters).toEqual({ published_slug: 'shipley-guide-123', status: 'review' });

    // Recycle: queued only from 'used', so a hand-managed topic is untouched.
    expect(t!.payload).toEqual({ status: 'queued' });
    expect(t!.filters).toEqual({ id: 'topic-9', status: 'used' });
    expect(result.topic).toEqual({ ok: true, detail: 'pillar_topics → queued' });
  });

  it('falls back to the blog_posts topic_id when the run has none', async () => {
    marketingResult = { data: [{ id: 'p1', topic_id: 'topic-from-post' }], error: null };
    engineResults.autoblog_runs = { data: [{ id: 'r1', topic_id: null }], error: null };
    const result = await rejectPost(marketing, engine, 'slug-x', 'reviewer-1');

    const topicCall = calls.find((c) => c.table === 'pillar_topics');
    expect(topicCall!.filters.id).toBe('topic-from-post');
    expect(result.ok).toBe(true);
  });

  it('skips the topic step for rfp runs with no topic anywhere', async () => {
    const result = await rejectPost(marketing, engine, 'slug-x', 'reviewer-1');

    expect(result.topic).toBeNull();
    expect(result.ok).toBe(true);
    expect(calls.some((c) => c.table === 'pillar_topics')).toBe(false);
  });

  it('records, without failing, a topic that was not in used state', async () => {
    engineResults.autoblog_runs = { data: [{ id: 'r1', topic_id: 'topic-9' }], error: null };
    engineResults.pillar_topics = { data: [], error: null };
    const result = await rejectPost(marketing, engine, 'slug-x', 'reviewer-1');

    expect(result.ok).toBe(true);
    expect(result.topic!.ok).toBe(true);
    expect(result.topic!.detail).toContain('not in used state');
  });

  it('reports partial state when the topic recycle fails', async () => {
    engineResults.autoblog_runs = { data: [{ id: 'r1', topic_id: 'topic-9' }], error: null };
    engineResults.pillar_topics = { data: null, error: { message: 'rls denied' } };
    const result = await rejectPost(marketing, engine, 'slug-x', 'reviewer-1');

    expect(result.ok).toBe(false);
    expect(result.marketing.ok).toBe(true);
    expect(result.engine.ok).toBe(true);
    expect(result.topic!.ok).toBe(false);
    expect(result.topic!.detail).toContain('rls denied');
  });

  it('returns conflict and stops when the post was already actioned', async () => {
    marketingResult = { data: [], error: null };
    const result = await rejectPost(marketing, engine, 'slug-x', 'reviewer-1');

    expect(result.conflict).toBe(true);
    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(1);
  });
});
