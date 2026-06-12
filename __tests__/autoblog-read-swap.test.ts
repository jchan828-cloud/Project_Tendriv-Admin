import { describe, it, expect, beforeEach, vi } from 'vitest';

// Since the blog DB consolidation, autoblog_runs and autoblog_settings live in
// the SAME marketing DB as blog_posts. These tests pin that the runs/settings
// routes read through the single service-role client; the former separate
// engine client no longer exists.

const tables: string[] = [];
let settingsUpdate: Record<string, unknown> | null = null;

const RUNS = [{ run_id: 'wrun_1', status: 'review' }];
const SETTINGS = { id: 1, enabled: true, frequency: 'daily' };

const serviceRoleClient = {
  from: (table: string) => {
    tables.push(table);
    return {
      select: () => ({
        order: () => ({
          limit: async () => ({ data: RUNS, error: null }),
        }),
        eq: () => ({
          single: async () => ({ data: SETTINGS, error: null }),
        }),
      }),
      update: (payload: Record<string, unknown>) => ({
        eq: async () => {
          settingsUpdate = payload;
          return { error: null };
        },
      }),
    };
  },
};

function mockClients() {
  vi.doMock('@/lib/autoblog/auth', () => ({
    requireContentAccess: vi.fn(async () => ({ userId: 'reviewer-user-1' })),
  }));
  vi.doMock('@/lib/supabase/server', () => ({
    createServiceRoleClient: async () => serviceRoleClient,
  }));
}

describe('autoblog engine-table reads on the single marketing client', () => {
  beforeEach(() => {
    vi.resetModules();
    tables.length = 0;
    settingsUpdate = null;
  });

  it('GET /api/autoblog/runs reads autoblog_runs through the service-role client', async () => {
    mockClients();
    const { GET } = await import('@/app/api/autoblog/runs/route');
    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(RUNS);
    expect(tables).toEqual(['autoblog_runs']);
  });

  it('GET /api/autoblog/settings reads autoblog_settings through the service-role client', async () => {
    mockClients();
    const { GET } = await import('@/app/api/autoblog/settings/route');
    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(SETTINGS);
    expect(tables).toEqual(['autoblog_settings']);
  });

  it('POST /api/autoblog/settings writes autoblog_settings through the service-role client', async () => {
    mockClients();
    const { POST } = await import('@/app/api/autoblog/settings/route');
    const res = await POST({
      json: async () => ({ enabled: false, frequency: 'weekly' }),
    } as unknown as Request);

    expect(res.status).toBe(200);
    expect(tables).toEqual(['autoblog_settings']);
    expect(settingsUpdate).toMatchObject({ enabled: false, frequency: 'weekly' });
  });
});
