import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextResponse } from 'next/server'

// W7 behavioral tests: every non-allowlisted /api/marketing/* handler calls
// requireContentAccess() before any service-role client is constructed or
// query issued. The real requireContentAccess runs against a mocked
// @/lib/supabase/server so the 401 path is the production code path.

let currentUser: { id: string } | null
let serviceRoleClient: Record<string, unknown>
const createServiceRoleClientMock = vi.fn(async () => serviceRoleClient)
const appendAuditLogMock = vi.fn(async () => {})

function mockDeps() {
  vi.doMock('@/lib/supabase/server', () => ({
    createServerSupabaseClient: async () => ({
      auth: { getUser: async () => ({ data: { user: currentUser } }) },
    }),
    createServiceRoleClient: createServiceRoleClientMock,
  }))
  vi.doMock('@/lib/audit/log', () => ({ appendAuditLog: appendAuditLogMock }))
}

function jsonReq(method: string, body?: unknown): never {
  return new Request('http://admin.test/api/marketing/x', {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: { 'content-type': 'application/json' },
  }) as never
}

const ctx = () => ({ params: Promise.resolve({ id: 'post-1' }) })

// Every mutating handler under app/api/marketing/** that requires a session.
const MUTATING: Record<string, () => Promise<Response>> = {
  'posts POST': async () =>
    (await import('@/app/api/marketing/posts/route')).POST(jsonReq('POST', { title: 'T' })),
  'posts/[id] PATCH': async () =>
    (await import('@/app/api/marketing/posts/[id]/route')).PATCH(jsonReq('PATCH', {}), ctx()),
  'posts/[id] DELETE': async () =>
    (await import('@/app/api/marketing/posts/[id]/route')).DELETE(jsonReq('DELETE'), ctx()),
  'posts/[id]/publish POST': async () =>
    (await import('@/app/api/marketing/posts/[id]/publish/route')).POST(
      jsonReq('POST', { channels: ['blog'] }),
      ctx()
    ),
  'posts/[id]/versions POST': async () =>
    (await import('@/app/api/marketing/posts/[id]/versions/route')).POST(
      jsonReq('POST', { content: {}, change_type: 'manual' }),
      ctx()
    ),
  'posts/[id]/topics PUT': async () =>
    (await import('@/app/api/marketing/posts/[id]/topics/route')).PUT(jsonReq('PUT', []), ctx()),
  'posts/[id]/tags PUT': async () =>
    (await import('@/app/api/marketing/posts/[id]/tags/route')).PUT(jsonReq('PUT', []), ctx()),
  'posts/[id]/jsonld POST': async () =>
    (await import('@/app/api/marketing/posts/[id]/jsonld/route')).POST(jsonReq('POST', {}), ctx()),
  'brief POST': async () =>
    (await import('@/app/api/marketing/brief/route')).POST(jsonReq('POST', { topic: 't' })),
  'tags POST': async () =>
    (await import('@/app/api/marketing/tags/route')).POST(jsonReq('POST', { name: 'n' })),
  'topics POST': async () =>
    (await import('@/app/api/marketing/topics/route')).POST(jsonReq('POST', { name: 'n' })),
  'utms POST': async () =>
    (await import('@/app/api/marketing/utms/route')).POST(jsonReq('POST', {})),
}

describe('marketing route auth (W7)', () => {
  beforeEach(() => {
    vi.resetModules()
    createServiceRoleClientMock.mockClear()
    appendAuditLogMock.mockClear()
    currentUser = null
    serviceRoleClient = {}
  })

  it.each(Object.entries(MUTATING))(
    '%s rejects unauthenticated requests with 401 and zero DB operations',
    async (_name, call) => {
      currentUser = null
      mockDeps()
      const res = await call()
      expect(res.status).toBe(401)
      expect(createServiceRoleClientMock).not.toHaveBeenCalled()
      expect(appendAuditLogMock).not.toHaveBeenCalled()
    }
  )

  it('authenticated PUT posts/[id]/tags with valid payload returns 200 and records the write once', async () => {
    currentUser = { id: 'editor-1' }
    const tagInsert = vi.fn(async () => ({ error: null }))
    const tagDeleteEq = vi.fn(async () => ({ error: null }))
    serviceRoleClient = {
      from: (table: string) => {
        if (table !== 'blog_post_tags') throw new Error(`unexpected table: ${table}`)
        return { delete: () => ({ eq: tagDeleteEq }), insert: tagInsert }
      },
    }
    mockDeps()
    const { PUT } = await import('@/app/api/marketing/posts/[id]/tags/route')
    const res = await PUT(jsonReq('PUT', ['tag-1', 'tag-2']), ctx())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(tagInsert).toHaveBeenCalledTimes(1)
    expect(tagInsert).toHaveBeenCalledWith([
      { post_id: 'post-1', tag_id: 'tag-1' },
      { post_id: 'post-1', tag_id: 'tag-2' },
    ])
  })

  it('returns the requireContentAccess NextResponse verbatim with zero DB operations', async () => {
    const sentinel = NextResponse.json({ error: 'Session expired' }, { status: 401 })
    vi.doMock('@/lib/autoblog/auth', () => ({
      requireContentAccess: vi.fn(async () => sentinel),
    }))
    mockDeps()
    const { PUT } = await import('@/app/api/marketing/posts/[id]/tags/route')
    const res = await PUT(jsonReq('PUT', ['tag-1']), ctx())
    expect(res).toBe(sentinel)
    expect(createServiceRoleClientMock).not.toHaveBeenCalled()
    expect(appendAuditLogMock).not.toHaveBeenCalled()
  })
})
