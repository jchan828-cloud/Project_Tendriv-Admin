export interface AutoblogRun {
  id: string;
  run_id: string;
  tender_id: string;
  status: 'running' | 'completed' | 'published' | 'failed' | 'rejected' | 'timeout';
  target_persona: string;
  closing_date: string;
  published_slug: string | null;
  quality_score: number | null;
  total_tokens: number | null;
  estimated_cost: number | null;
  headline: string | null;
  draft_markdown: string | null;
  seo_metadata: SeoMetadata | null;
  word_count: number | null;
  content_type: string | null;
  created_at: string;
  completed_at: string | null;
  published_at: string | null;
}

export interface SeoMetadata {
  primaryKeyword: string;
  secondaryKeywords: string[];
  targetSlug: string;
  schemaType: string;
  contentSilo: string;
  metaTitle: string;
  metaDescription: string;
}

export interface AutoblogSettings {
  id: number;
  enabled: boolean;
  frequency: 'daily' | 'every_2_days' | 'weekly';
  run_time_utc: string;
  posts_per_run: number;
  target_persona: string;
  updated_at: string;
}

export interface AutoblogEvent {
  type: string;
  [key: string]: unknown;
}
