import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';

// The approval routes: all guarded by requireContentAccess. promote/reject/
// submit translate the action result into 409 (already actioned) / 500 (post
// update failed) / 200 (done — possibly with partial-state detail in the body).
// Single-DB now: the actions take one client, never an engine client.

let authResult: { userId: string } | NextResponse;
let actionResult: Record<string, unknown>;
const promotePostMock = vi.fn(async () => actionResult);
const rejectPostMock = vi.fn(async () => actionResult);
const submitPostMock = vi.fn(async () => actionResult);

function mockDeps() {
  vi.doMock('@/lib/autoblog/auth', () => ({
    requireContentAccess: vi.fn(async () => authResult),
  }));
  vi.doMock('@/lib/supabase/server', () => ({ createServiceRoleClient: async () => ({}) }));
  vi.doMock('@/lib/autoblog/review-actions', () => ({
    promotePost: promotePostMock,
    rejectPost: rejectPostMock,
    submitPostForReview: submitPostMock,
  }));
  vi.doMock('@/lib/autoblog/review-queue', () => ({
    fetchReviewQueue: vi.fn(async () => ({ items: [], engineError: null })),
  }));
}

function makeRequest(body: unknown): Request {
  return { json: async () => body } as unknown as Request;
}

const okResult = {
  ok: true,
  conflict: false,
  slug: 's',
  action: 'promote',
  post: { ok: true, detail: 'done' },
  topic: null,
};

describe('approval routes', () => {
  beforeEach(() => {
    vi.resetModules();
    promotePostMock.mockClear();
    rejectPostMock.mockClear();
    submitPostMock.mockClear();
    authResult = { userId: 'reviewer-1' };
    actionResult = { ...okResult };
  });

  const ROUTE_CALLS: Record<string, () => Promise<Response>> = {
    queue: async () => (await import('@/app/api/autoblog/queue/route')).GET(),
    promote: async () =>
      (await import('@/app/api/autoblog/promote/route')).POST(makeRequest({ slug: 's' })),
    reject: async () =>
      (await import('@/app/api/autoblog/reject/route')).POST(makeRequest({ slug: 's' })),
    submit: async () =>
      (await import('@/app/api/autoblog/submit/route')).POST(makeRequest({ slug: 's' })),
  };

  it.each(Object.keys(ROUTE_CALLS))(
    '/api/autoblog/%s rejects unauthenticated requests',
    async (route) => {
      authResult = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      mockDeps();
      const res = await ROUTE_CALLS[route]!();

      expect(res.status).toBe(401);
      expect(promotePostMock).not.toHaveBeenCalled();
      expect(rejectPostMock).not.toHaveBeenCalled();
      expect(submitPostMock).not.toHaveBeenCalled();
    },
  );

  it('promote passes slug and reviewer to the action (single client) and returns its result', async () => {
    mockDeps();
    const { POST } = await import('@/app/api/autoblog/promote/route');
    const res = await POST(makeRequest({ slug: 'shipley-guide-123' }));

    expect(res.status).toBe(200);
    // One client arg, not two (no engine client anymore).
    expect(promotePostMock).toHaveBeenCalledWith(
      expect.anything(),
      'shipley-guide-123',
      'reviewer-1',
    );
    expect(promotePostMock.mock.calls[0]).toHaveLength(3);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it('promote returns 400 without a slug', async () => {
    mockDeps();
    const { POST } = await import('@/app/api/autoblog/promote/route');
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(promotePostMock).not.toHaveBeenCalled();
  });

  it('promote maps conflict to 409', async () => {
    actionResult = {
      ...okResult,
      ok: false,
      conflict: true,
      post: { ok: false, detail: 'already actioned' },
    };
    mockDeps();
    const { POST } = await import('@/app/api/autoblog/promote/route');
    const res = await POST(makeRequest({ slug: 's' }));
    expect(res.status).toBe(409);
  });

  it('promote maps a post-update failure to 500', async () => {
    actionResult = {
      ...okResult,
      ok: false,
      post: { ok: false, detail: 'db down' },
    };
    mockDeps();
    const { POST } = await import('@/app/api/autoblog/promote/route');
    const res = await POST(makeRequest({ slug: 's' }));
    expect(res.status).toBe(500);
  });

  it('reject maps success to 200 and passes a single client', async () => {
    actionResult = { ...okResult, action: 'reject' };
    mockDeps();
    const { POST } = await import('@/app/api/autoblog/reject/route');
    const res = await POST(makeRequest({ slug: 's' }));
    expect(res.status).toBe(200);
    expect(rejectPostMock).toHaveBeenCalledWith(expect.anything(), 's', 'reviewer-1');
    expect(rejectPostMock.mock.calls[0]).toHaveLength(3);
  });

  it('reject returns 200 with partial-state body when the topic recycle failed', async () => {
    actionResult = {
      ...okResult,
      action: 'reject',
      ok: false,
      topic: { ok: false, detail: 'topic recycle failed: rls denied' },
    };
    mockDeps();
    const { POST } = await import('@/app/api/autoblog/reject/route');
    const res = await POST(makeRequest({ slug: 's' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.topic.detail).toContain('rls denied');
  });

  it('submit maps draft → review success to 200 and conflict to 409', async () => {
    actionResult = { ...okResult, action: 'submit' };
    mockDeps();
    const { POST } = await import('@/app/api/autoblog/submit/route');
    const res = await POST(makeRequest({ slug: 's' }));
    expect(res.status).toBe(200);
    expect(submitPostMock).toHaveBeenCalledWith(expect.anything(), 's', 'reviewer-1');
  });

  it('queue returns the joined review queue', async () => {
    mockDeps();
    const { GET } = await import('@/app/api/autoblog/queue/route');
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [], engineError: null });
  });
});
