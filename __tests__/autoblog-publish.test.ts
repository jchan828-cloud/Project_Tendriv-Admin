import { describe, it, expect, beforeEach, vi } from 'vitest';

// The publish route must follow the shared review contract: read the run from
// the ENGINE DB, write a review-state row to the MARKETING DB, never publish
// directly. These tests pin that split and the row shape.

type Captured = { table: string; op: string; payload?: unknown };

const engineOps: Captured[] = [];
const marketingOps: Captured[] = [];
let runRow: Record<string, unknown> | null = null;
let insertError: { message: string } | null = null;

const engineClient = {
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: runRow, error: runRow ? null : { message: 'not found' } }),
      }),
    }),
    update: (payload: unknown) => ({
      eq: async () => {
        engineOps.push({ table, op: 'update', payload });
        return { error: null };
      },
    }),
  }),
};

const marketingClient = {
  from: (table: string) => ({
    insert: async (payload: unknown) => {
      marketingOps.push({ table, op: 'insert', payload });
      return { error: insertError };
    },
  }),
};

async function importRoute() {
  vi.doMock('@/lib/autoblog/auth', () => ({
    requireContentAccess: vi.fn(async () => ({ userId: 'reviewer-user-1' })),
  }));
  vi.doMock('@/lib/supabase/engine', () => ({
    createEngineClient: () => engineClient,
  }));
  vi.doMock('@/lib/supabase/server', () => ({
    createServiceRoleClient: async () => marketingClient,
  }));
  return import('@/app/api/autoblog/publish/route');
}

function makeRequest(body: unknown): Request {
  return { json: async () => body } as unknown as Request;
}

const SEO = {
  primaryKeyword: 'kw',
  secondaryKeywords: ['kw2'],
  targetSlug: 'tender-post',
  schemaType: 'HowTo',
  metaTitle: 'T | Tendriv',
  metaDescription: 'Meta',
};

describe('POST /api/autoblog/publish', () => {
  beforeEach(() => {
    vi.resetModules();
    engineOps.length = 0;
    marketingOps.length = 0;
    insertError = null;
    runRow = {
      headline: 'Tender Post',
      seo_metadata: SEO,
      completed_at: '2026-06-11T00:00:00.000Z',
    };
  });

  it('writes a review-state row to the marketing DB and updates the run on the engine DB', async () => {
    const { POST } = await importRoute();
    const res = await POST(makeRequest({ runId: 'wrun_1', markdown: '# Body text' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.status).toBe('review');
    expect(body.slug).toMatch(/^tender-post-\d{13}$/);

    // blog_posts insert went to the marketing client only.
    expect(marketingOps).toHaveLength(1);
    expect(marketingOps[0]!.table).toBe('blog_posts');
    const row = marketingOps[0]!.payload as Record<string, unknown>;
    expect(row.status).toBe('review');
    expect(row.generated_by).toBe('ai-assisted');
    expect(row.content_type).toBe('howto'); // resolveContentType('rfp','HowTo')
    expect(row.slug).toBe(body.slug);
    expect('published_at' in row).toBe(false);
    expect(row.author_id).toBe('reviewer-user-1');
    expect((row.jsonld_override as Record<string, unknown>)['@type']).toBe('HowTo');

    // Run update went to the engine client, mirrors the slug, honest status.
    expect(engineOps).toHaveLength(1);
    expect(engineOps[0]!.table).toBe('autoblog_runs');
    const runUpdate = engineOps[0]!.payload as Record<string, unknown>;
    expect(runUpdate.status).toBe('review');
    expect(runUpdate.published_slug).toBe(body.slug);
    expect('published_at' in runUpdate).toBe(false);
  });

  it('resolves Article schema to content_type blog for the rfp workflow', async () => {
    runRow = { ...runRow!, seo_metadata: { ...SEO, schemaType: 'Article' } };
    const { POST } = await importRoute();
    await POST(makeRequest({ runId: 'wrun_1', markdown: '# Body' }));

    const row = marketingOps[0]!.payload as Record<string, unknown>;
    expect(row.content_type).toBe('blog');
    expect((row.jsonld_override as Record<string, unknown>)['@type']).toBe('Article');
  });

  it('does not touch the run when the blog_posts insert fails', async () => {
    insertError = { message: 'check constraint violation' };
    const { POST } = await importRoute();
    const res = await POST(makeRequest({ runId: 'wrun_1', markdown: '# Body' }));

    expect(res.status).toBe(500);
    expect(engineOps).toHaveLength(0);
  });

  it('404s when the run is not in the engine DB', async () => {
    runRow = null;
    const { POST } = await importRoute();
    const res = await POST(makeRequest({ runId: 'missing', markdown: '# Body' }));
    expect(res.status).toBe(404);
    expect(marketingOps).toHaveLength(0);
  });
});
