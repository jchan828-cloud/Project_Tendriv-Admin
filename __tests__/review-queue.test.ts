import { describe, it, expect } from 'vitest';
import { fetchReviewQueue } from '@/lib/autoblog/review-queue';

// Single-DB join since the blog consolidation: blog_posts (status='review')
// enriched with autoblog_runs on slug == published_slug, all through ONE
// client. blog_posts is the source of truth — a run read failure degrades
// rows, never hides them.

type Row = Record<string, unknown>;

function makeClient(
  posts: Row[] | null,
  runs: Row[] | null,
  opts: {
    postError?: { message: string } | null;
    runError?: { message: string } | null;
    capture?: { slugs?: unknown };
  } = {},
) {
  return {
    from: (table: string) => {
      if (table === 'blog_posts') {
        return {
          select: () => ({
            eq: (col: string, val: string) => ({
              order: async () => {
                expect(col).toBe('status');
                expect(val).toBe('review');
                return { data: posts, error: opts.postError ?? null };
              },
            }),
          }),
        };
      }
      // autoblog_runs — same client, single DB now.
      return {
        select: () => ({
          in: async (col: string, vals: unknown) => {
            expect(col).toBe('published_slug');
            if (opts.capture) opts.capture.slugs = vals;
            return { data: runs, error: opts.runError ?? null };
          },
        }),
      };
    },
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
  it('joins each post to its run by slug == published_slug through one client', async () => {
    const capture: { slugs?: unknown } = {};
    const queue = await fetchReviewQueue(makeClient([POST_A, POST_B], [RUN_A], { capture }));

    expect(capture.slugs).toEqual(['shipley-guide-123', 'orphan-post-456']);
    expect(queue.items).toHaveLength(2);
    expect(queue.items[0]!.post.slug).toBe('shipley-guide-123');
    expect(queue.items[0]!.run?.quality_score).toBe(4.625);
    // A post with no matching run still renders, with run: null.
    expect(queue.items[1]!.run).toBeNull();
    expect(queue.engineError).toBeNull();
  });

  it('returns rows with engineError when the run read fails', async () => {
    const queue = await fetchReviewQueue(
      makeClient([POST_A], null, { runError: { message: 'runs unreadable' } }),
    );

    expect(queue.items).toHaveLength(1);
    expect(queue.items[0]!.run).toBeNull();
    expect(queue.engineError).toBe('runs unreadable');
  });

  it('skips the run query entirely for an empty queue', async () => {
    const client = {
      from: (table: string) => {
        if (table === 'autoblog_runs') {
          throw new Error('autoblog_runs must not be queried for an empty queue');
        }
        return {
          select: () => ({
            eq: () => ({ order: async () => ({ data: [], error: null }) }),
          }),
        };
      },
    };
    const queue = await fetchReviewQueue(client);
    expect(queue).toEqual({ items: [], engineError: null });
  });

  it('throws when the blog_posts read fails — there is no queue without it', async () => {
    await expect(
      fetchReviewQueue(makeClient(null, [], { postError: { message: 'posts down' } })),
    ).rejects.toThrow('posts down');
  });
});
