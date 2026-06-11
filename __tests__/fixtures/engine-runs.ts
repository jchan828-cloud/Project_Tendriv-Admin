import type { AutoblogRun } from '@/lib/types/autoblog'
import type { ReviewQueueItem } from '@/lib/types/autoblog'

// Field-exact copies of the two live engine-DB rows (tendriv-blog-content,
// fetched read-only 2026-06-11). The crash class these pin: engine rows have a
// different null-profile than the legacy marketing rows the UI was written
// for — pillar runs carry null tender_id/closing_date, failed runs null
// almost everything. draft_markdown is truncated; its shape (fence +
// frontmatter, pre-sanitizer run) is preserved.

export const FAILED_PILLAR_RUN = {
  id: '750d1c44-58ef-4c6b-a585-556dca7bd99a',
  run_id: 'wrun_01KTRTDQ911VNFD2232RVWK7FK',
  tender_id: null,
  status: 'failed',
  target_persona: 'enterprise',
  closing_date: null,
  published_slug: null,
  quality_score: null,
  total_tokens: null,
  estimated_cost: null,
  created_at: '2026-06-10T13:09:28.914757+00:00',
  completed_at: '2026-06-10T13:09:44.664+00:00',
  headline: null,
  draft_markdown: null,
  seo_metadata: null,
  word_count: null,
  content_type: null,
  published_at: null,
  workflow_type: 'pillar',
  topic_id: '849f92ff-172c-42d6-a419-2919723803ca',
} as unknown as AutoblogRun

export const SHIPLEY_REVIEW_RUN = {
  id: 'e140f0f6-9d68-46bc-beb9-6701f1adf2a2',
  run_id: 'wrun_01KTSZN9J7YTHJ4AW4R508464N',
  tender_id: null,
  status: 'review',
  target_persona: 'enterprise',
  closing_date: null,
  published_slug: 'shipley-color-teams-proposal-efficiency-1781157562325',
  quality_score: 4.625,
  total_tokens: 51720,
  estimated_cost: 0.3134,
  created_at: '2026-06-11T00:00:14.302599+00:00',
  completed_at: '2026-06-11T00:04:42.765+00:00',
  headline:
    'The Lean Shipley Method: A Guide to Pink, Red & Gold Teams Without Burning Out Your SMEs',
  draft_markdown:
    '```markdown\n---\ntitle: The Lean Shipley Method\nmetaDescription: Learn how to adapt Shipley reviews.\n---\n\n# The Lean Shipley Method\n\nBody truncated for fixture…\n```',
  // Note the live shape: no metaTitle/metaDescription/contentSilo/secondaryKeywords.
  seo_metadata: {
    schemaType: 'HowTo',
    targetSlug: 'shipley-color-teams-proposal-efficiency',
    primaryKeyword: 'Shipley color teams',
  },
  word_count: 2656,
  content_type: 'HowTo',
  published_at: null,
  workflow_type: 'pillar',
  topic_id: '3da094c9-e297-4619-9a36-a0873ca86cbe',
} as unknown as AutoblogRun

/** Every nullable field null — the worst-case row the UI must survive. */
export const ALL_NULLS_RUN = {
  id: '00000000-0000-0000-0000-000000000000',
  run_id: 'wrun_ALLNULLS',
  tender_id: null,
  status: 'failed',
  target_persona: 'enterprise',
  closing_date: null,
  published_slug: null,
  quality_score: null,
  total_tokens: null,
  estimated_cost: null,
  created_at: '2026-06-11T00:00:00.000+00:00',
  completed_at: null,
  headline: null,
  draft_markdown: null,
  seo_metadata: null,
  word_count: null,
  content_type: null,
  published_at: null,
  workflow_type: null,
  topic_id: null,
} as unknown as AutoblogRun

export const ENGINE_RUNS: AutoblogRun[] = [SHIPLEY_REVIEW_RUN, FAILED_PILLAR_RUN]

export const SHIPLEY_QUEUE_ITEM: ReviewQueueItem = {
  post: {
    id: 'post-shipley',
    slug: 'shipley-color-teams-proposal-efficiency-1781157562325',
    title:
      'The Lean Shipley Method: A Guide to Pink, Red & Gold Teams Without Burning Out Your SMEs',
    content_type: 'howto',
    word_count: 2595,
    created_at: '2026-06-11T05:59:23.546829+00:00',
    generated_at: '2026-06-11T00:04:42.765+00:00',
    content: '# The Lean Shipley Method\n\nClean body…',
    excerpt: 'Winning a large Canadian government contract…',
    meta_description: 'Learn how to adapt Shipley reviews.',
    topic_id: '3da094c9-e297-4619-9a36-a0873ca86cbe',
  },
  run: {
    run_id: 'wrun_01KTSZN9J7YTHJ4AW4R508464N',
    published_slug: 'shipley-color-teams-proposal-efficiency-1781157562325',
    workflow_type: 'pillar',
    status: 'review',
    quality_score: 4.625,
    estimated_cost: 0.3134,
    total_tokens: 51720,
    topic_id: '3da094c9-e297-4619-9a36-a0873ca86cbe',
    created_at: '2026-06-11T00:00:14.302599+00:00',
  },
}
