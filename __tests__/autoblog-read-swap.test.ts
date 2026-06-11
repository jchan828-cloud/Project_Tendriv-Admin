import { describe, it, expect, beforeEach, vi } from 'vitest';

// Since the DB split, autoblog_runs and autoblog_settings live in the ENGINE
// DB. These tests pin the read-swap: engine tables are never queried through
// the marketing client again.

const engineTables: string[] = [];
const marketingTables: string[] = [];
let settingsUpdate: Record<string, unknown> | null = null;

const RUNS = [{ run_id: 'wrun_1', status: 'review' }];
const SETTINGS = { id: 1, enabled: true, frequency: 'daily' };

const engineClient = {
  from: (table: string) => {
    engineTables.push(table);
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

const marketingClient = {
  from: (table: string) => {
    marketingTables.push(table);
    throw new Error(`marketing client must not serve engine table reads (got ${table})`);
  },
};

function mockClients() {
  vi.doMock('@/lib/autoblog/auth', () => ({
    requireContentAccess: vi.fn(async () => ({ userId: 'reviewer-user-1' })),
  }));
  vi.doMock('@/lib/supabase/engine', () => ({
    createEngineClient: () => engineClient,
  }));
  vi.doMock('@/lib/supabase/server', () => ({
    createServiceRoleClient: async () => marketingClient,
  }));
}

describe('autoblog engine-table read swap', () => {
  beforeEach(() => {
    vi.resetModules();
    engineTables.length = 0;
    marketingTables.length = 0;
    settingsUpdate = null;
  });

  it('GET /api/autoblog/runs reads autoblog_runs through the engine client', async () => {
    mockClients();
    const { GET } = await import('@/app/api/autoblog/runs/route');
    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(RUNS);
    expect(engineTables).toEqual(['autoblog_runs']);
    expect(marketingTables).toEqual([]);
  });

  it('GET /api/autoblog/settings reads autoblog_settings through the engine client', async () => {
    mockClients();
    const { GET } = await import('@/app/api/autoblog/settings/route');
    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(SETTINGS);
    expect(engineTables).toEqual(['autoblog_settings']);
    expect(marketingTables).toEqual([]);
  });

  it('POST /api/autoblog/settings writes autoblog_settings through the engine client', async () => {
    mockClients();
    const { POST } = await import('@/app/api/autoblog/settings/route');
    const res = await POST({
      json: async () => ({ enabled: false, frequency: 'weekly' }),
    } as unknown as Request);

    expect(res.status).toBe(200);
    expect(engineTables).toEqual(['autoblog_settings']);
    expect(marketingTables).toEqual([]);
    expect(settingsUpdate).toMatchObject({ enabled: false, frequency: 'weekly' });
  });
});
