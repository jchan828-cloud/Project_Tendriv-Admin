import type { Tables } from './database.types'

type AutoblogRunRow = Tables<'autoblog_runs'>
type AutoblogSettingsRow = Tables<'autoblog_settings'>

export type AutoblogRunStatus = 'running' | 'completed' | 'published' | 'failed' | 'rejected' | 'timeout'

export type AutoblogRun = Omit<AutoblogRunRow, 'status' | 'seo_metadata'> & {
  status: AutoblogRunStatus
  seo_metadata: SeoMetadata | null
}

export interface SeoMetadata {
  primaryKeyword: string
  secondaryKeywords: string[]
  targetSlug: string
  schemaType: string
  contentSilo: string
  metaTitle: string
  metaDescription: string
}

export type AutoblogFrequency = 'daily' | 'every_2_days' | 'weekly'

export type AutoblogSettings = Omit<AutoblogSettingsRow, 'frequency'> & {
  frequency: AutoblogFrequency
}

export interface AutoblogEvent {
  type: string
  [key: string]: unknown
}

// --- Review queue (approval surface) ---
// blog_posts rows come from the MARKETING DB; the run mirror comes from the
// ENGINE DB, joined in code on blog_posts.slug == autoblog_runs.published_slug.
// Standalone interfaces: the generated Tables<> above mirror the marketing DB,
// whose legacy autoblog_runs lacks the engine-only columns (workflow_type,
// topic_id).

export interface ReviewQueuePost {
  id: string
  slug: string
  title: string
  content_type: string | null
  word_count: number | null
  created_at: string | null
  generated_at: string | null
  content: string | null
  excerpt: string | null
  meta_description: string | null
  topic_id: string | null
}

export interface ReviewQueueRun {
  run_id: string
  published_slug: string | null
  workflow_type: string | null
  status: string
  quality_score: number | null
  estimated_cost: number | null
  total_tokens: number | null
  topic_id: string | null
  created_at: string
}

export interface ReviewQueueItem {
  post: ReviewQueuePost
  run: ReviewQueueRun | null
}
