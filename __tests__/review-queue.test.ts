import { describe, it, expect } from 'vitest';
import { fetchReviewQueue } from '@/lib/autoblog/review-queue';

// Cross-DB join: marketing blog_posts (status='review') enriched with engine
// runs on slug == published_slug. Marketing is the source of truth — engine
// failures degrade rows, never hide them.

type Row = Record<string, unknown>;

function makeMarketing(posts: Row[] | null, error: { message: string } | null = null) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: (col: string, val: string) => ({
          order: async () => {
            expect(table).toBe('blog_posts');
            expect(col).toBe('status');
            expect(val).toBe('review');
            return { data: posts, error };
          },
        }),
      }),
    }),
  };
}

function makeEngine(
  runs: Row[] | null,
  error: { message: string } | null = null,
  capture?: { slugs?: unknown },
) {
  return {
    from: (table: string) => ({
      select: () => ({
        in: async (col: string, vals: unknown) => {
          expect(table).toBe('autoblog_runs');
          expect(col).toBe('published_slug');
          if (capture) capture.slugs = vals;
          return { data: runs, error };
        },
      }),
    }),
  };
}

const POST_A = { id: 'p1', slug: 'shipley-guide-123', title: 'Shipley', topic_id: 't1' };
const POST_B = { id: 'p2', slug: 'orphan-post-456', title: 'Orphan', topic_id: null };
const RUN_A = {
  run_id: 'wrun_1',
  published_slug: 'shipley-guide-123',
  quality_score: 4.625,
  estimated_cost: 0.31,
  total_tokens: 12345,
  workflow_type: 'pillar',
  status: 'review',
  topic_id: 't1',
  created_at: '2026-06-10T00:00:00Z',
};

describe('fetchReviewQueue', () => {
  it('joins each post to its engine run by slug == published_slug', async () => {
    const capture: { slugs?: unknown } = {};
    const queue = await fetchReviewQueue(
      makeMarketing([POST_A, POST_B]),
      makeEngine([RUN_A], null, capture),
    );

    expect(capture.slugs).toEqual(['shipley-guide-123', 'orphan-post-456']);
    expect(queue.items).toHaveLength(2);
    expect(queue.items[0]!.post.slug).toBe('shipley-guide-123');
    expect(queue.items[0]!.run?.quality_score).toBe(4.625);
    // A post with no matching run still renders, with run: null.
    expect(queue.items[1]!.run).toBeNull();
    expect(queue.engineError).toBeNull();
  });

  it('returns rows with engineError when the engine read fails', async () => {
    const queue = await fetchReviewQueue(
      makeMarketing([POST_A]),
      makeEngine(null, { message: 'engine unreachable' }),
    );

    expect(queue.items).toHaveLength(1);
    expect(queue.items[0]!.run).toBeNull();
    expect(queue.engineError).toBe('engine unreachable');
  });

  it('skips the engine query entirely for an empty queue', async () => {
    const engine = {
      from: () => {
        throw new Error('engine must not be queried for an empty queue');
      },
    };
    const queue = await fetchReviewQueue(makeMarketing([]), engine);
    expect(queue).toEqual({ items: [], engineError: null });
  });

  it('throws when the marketing read fails — there is no queue without it', async () => {
    await expect(
      fetchReviewQueue(makeMarketing(null, { message: 'marketing down' }), makeEngine([])),
    ).rejects.toThrow('marketing down');
  });
});
