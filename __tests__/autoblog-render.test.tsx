// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'

import { AutoblogPage } from '@/components/autoblog/autoblog-page'
import { RunHistoryTable } from '@/components/autoblog/run-history-table'
import { RunDetailPanel } from '@/components/autoblog/run-detail-panel'
import { ApprovalsTab } from '@/components/autoblog/approvals-tab'
import { PostEditor } from '@/components/cms/post-editor'
import { CalendarBoard, type CalendarPost } from '@/components/cms/calendar-board'
import type { BlogPost } from '@/lib/types/cms'
import {
  ENGINE_RUNS,
  FAILED_PILLAR_RUN,
  SHIPLEY_REVIEW_RUN,
  ALL_NULLS_RUN,
  SHIPLEY_QUEUE_ITEM,
} from './fixtures/engine-runs'

// The crash class under test: engine-DB rows have a different null-profile
// than the legacy marketing rows these components were written for. The page
// must render with real engine rows, an all-nulls run, and empty everything.

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

// Without vitest globals, RTL's auto-cleanup never registers — clean up
// explicitly or the DOM accumulates across tests.
afterEach(cleanup)

// CalendarBoard persists its view preference; give it a working storage.
beforeEach(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  })
})
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children: React.ReactNode }) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  ),
}))

describe('AutoblogPage with the real engine-row fixtures', () => {
  it('renders the dashboard, including the all-null-profile failed run', () => {
    render(
      <AutoblogPage
        initialRuns={ENGINE_RUNS}
        initialSettings={null}
        initialQueue={[SHIPLEY_QUEUE_ITEM]}
      />
    )
    // The failed pillar run has null headline AND null tender_id — the row
    // falls back to run_id instead of crashing on .slice().
    expect(screen.getByText(/wrun_01KTRTDQ911VNFD2232RVWK7FK/)).toBeDefined()
    // The Shipley run renders its headline and an honest 'In review' badge
    // (status 'review' used to fall through to 'Failed').
    expect(screen.getByText(/The Lean Shipley Method/)).toBeDefined()
    expect(screen.getByText('In review')).toBeDefined()
  })

  it('opens the detail panel for the all-nulls failed run without crashing', () => {
    render(
      <AutoblogPage initialRuns={[FAILED_PILLAR_RUN]} initialSettings={null} initialQueue={[]} />
    )
    fireEvent.click(screen.getByText(/wrun_01KTRTDQ911VNFD2232RVWK7FK/))
    // Panel header falls back to run_id; debug footer omits the null tender.
    expect(screen.getAllByText(/wrun_01KTRTDQ911VNFD2232RVWK7FK/).length).toBeGreaterThan(1)
    expect(screen.queryByText(/^tender:/)).toBeNull()
  })

  it('renders every tab with null settings and the Shipley queue item', () => {
    render(
      <AutoblogPage
        initialRuns={ENGINE_RUNS}
        initialSettings={null}
        initialQueue={[SHIPLEY_QUEUE_ITEM]}
      />
    )
    fireEvent.click(screen.getByText('Review Queue'))
    fireEvent.click(screen.getByText('Approvals'))
    // Quality badge renders in both the list item and the action bar.
    expect(screen.getAllByText('4.63/5').length).toBeGreaterThan(0)
    expect(screen.getByText('Promote')).toBeDefined()
    fireEvent.click(screen.getByText('Settings'))
  })

  it('renders with empty everything', () => {
    render(<AutoblogPage initialRuns={[]} initialSettings={null} initialQueue={[]} />)
    expect(screen.getByText(/No runs yet/)).toBeDefined()
    fireEvent.click(screen.getByText('Approvals'))
    expect(screen.getByText(/Nothing awaiting approval/)).toBeDefined()
  })
})

describe('null-profile components in isolation', () => {
  it('RunHistoryTable survives a run with every nullable field null', () => {
    render(<RunHistoryTable runs={[ALL_NULLS_RUN]} />)
    expect(screen.getByText(/wrun_ALLNULLS/)).toBeDefined()
    // Duration and score both fall back to '—'
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('RunDetailPanel survives a run with every nullable field null', () => {
    render(<RunDetailPanel run={ALL_NULLS_RUN} onClose={() => {}} />)
    // Header falls back to run_id, and the debug footer repeats it.
    expect(screen.getAllByText(/wrun_ALLNULLS/).length).toBeGreaterThan(0)
  })

  it('ApprovalsTab renders a queue item with no matching engine run', () => {
    render(
      <ApprovalsTab
        initialItems={[{ ...SHIPLEY_QUEUE_ITEM, run: null }]}
        queueWarning={null}
      />
    )
    expect(screen.getByText(/No engine run matched/)).toBeDefined()
    expect(screen.getByText('Promote')).toBeDefined()
  })
})

const REVIEW_POST: BlogPost = {
  id: 'post-shipley',
  title: 'The Lean Shipley Method',
  slug: 'shipley-color-teams-proposal-efficiency-1781157562325',
  content: '# Body',
  excerpt: null,
  meta_description: null,
  canonical_url: null,
  og_image_url: null,
  target_keyword: null,
  secondary_keywords: [],
  buyer_stage: null,
  content_type: null,
  status: 'review',
  is_gated: false,
  gate_cta: null,
  gate_asset_ids: [],
  author_id: null,
  reviewer_id: null,
  reviewer_notes: null,
  published_at: null,
  scheduled_at: null,
  generated_by: 'ai-assisted',
  word_count: 2595,
  reading_time_minutes: 12,
  jsonld_override: null,
  topic_id: null,
  generation_error: null,
  generation_attempts: 0,
  generated_at: null,
  created_at: '2026-06-11T00:00:00Z',
  updated_at: '2026-06-11T00:00:00Z',
}

describe('approval surfaces outside /autoblog', () => {
  it('PostEditor shows Promote and Reject for a review-status post', () => {
    render(<PostEditor initialPost={REVIEW_POST} />)
    expect(screen.getByText('Promote')).toBeDefined()
    expect(screen.getByText('Reject')).toBeDefined()
    expect(screen.queryByText('Submit for Review')).toBeNull()
  })

  it('PostEditor shows Submit for Review (not Promote) for a draft post', () => {
    render(<PostEditor initialPost={{ ...REVIEW_POST, status: 'draft' }} />)
    expect(screen.getByText('Submit for Review')).toBeDefined()
    expect(screen.queryByText('Promote')).toBeNull()
  })

  it('CalendarBoard review cards expose Promote and Reject', () => {
    const post: CalendarPost = {
      id: 'post-shipley',
      title: 'The Lean Shipley Method',
      slug: 'shipley-color-teams-proposal-efficiency-1781157562325',
      status: 'review',
      buyer_stage: null,
      content_type: null,
      target_keyword: null,
      word_count: 2595,
      scheduled_at: null,
      updated_at: '2026-06-11T00:00:00Z',
      generation_error: null,
      generation_attempts: 0,
    }
    render(<CalendarBoard posts={[post]} />)
    expect(screen.getByText('Promote')).toBeDefined()
    expect(screen.getByText('Reject')).toBeDefined()
  })
})
