/** MK8-CMS-001: Blog CMS type definitions + Zod schemas */

import { z } from 'zod'

/* ── Enums ──────────────────────────────────────────── */

export const BuyerStageValues = ['awareness', 'consideration', 'decision'] as const
export type BuyerStage = (typeof BuyerStageValues)[number]
export const BuyerStageSchema = z.enum(BuyerStageValues)

export const ContentTypeValues = ['blog', 'case-study', 'guide', 'whitepaper'] as const
export type ContentType = (typeof ContentTypeValues)[number]
export const ContentTypeSchema = z.enum(ContentTypeValues)

export const PostStatusValues = ['draft', 'review', 'approved', 'published', 'archived'] as const
export type PostStatus = (typeof PostStatusValues)[number]
export const PostStatusSchema = z.enum(PostStatusValues)

export const GeneratedByValues = ['human', 'ai-assisted'] as const
export type GeneratedBy = (typeof GeneratedByValues)[number]

/* ── Blog Post ──────────────────────────────────────── */

export type BlogPost = {
  id: string
  title: string
  slug: string
  content: string | null
  excerpt: string | null
  meta_description: string | null
  canonical_url: string | null
  og_image_url: string | null
  target_keyword: string | null
  secondary_keywords: string[]
  buyer_stage: BuyerStage | null
  content_type: ContentType | null
  status: PostStatus
  is_gated: boolean
  gate_cta: string | null
  /**
   * Content-upgrade gating: IDs of downloadable template assets attached to
   * this post. When set, the post body stays fully indexable by search engines
   * while only the bonus assets require a gate submission. Prefer this over
   * `is_gated: true` which hides the entire post from crawlers.
   */
  gate_asset_ids: string[]
  author_id: string
  reviewer_id: string | null
  reviewer_notes: string | null
  published_at: string | null
  scheduled_at: string | null
  generated_by: GeneratedBy
  word_count: number
  reading_time_minutes: number
  jsonld_override: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export const BlogPostInsertSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(500),
  content: z.string().nullable().optional(),
  excerpt: z.string().max(300).nullable().optional(),
  meta_description: z.string().max(160).nullable().optional(),
  canonical_url: z.string().url().nullable().optional(),
  og_image_url: z.string().url().nullable().optional(),
  target_keyword: z.string().max(200).nullable().optional(),
  secondary_keywords: z.array(z.string()).optional(),
  buyer_stage: BuyerStageSchema.nullable().optional(),
  content_type: ContentTypeSchema.nullable().optional(),
  status: PostStatusSchema.optional(),
  is_gated: z.boolean().optional(),
  gate_cta: z.string().max(200).nullable().optional(),
  gate_asset_ids: z.array(z.string()).optional(),
  author_id: z.string().uuid(),
  reviewer_id: z.string().uuid().nullable().optional(),
  reviewer_notes: z.string().nullable().optional(),
  published_at: z.string().datetime().nullable().optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
  generated_by: z.enum(GeneratedByValues).optional(),
  word_count: z.number().int().min(0).optional(),
})
export type BlogPostInsert = z.infer<typeof BlogPostInsertSchema>

export const BlogPostUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  slug: z.string().min(1).max(500).optional(),
  content: z.string().nullable().optional(),
  excerpt: z.string().max(300).nullable().optional(),
  meta_description: z.string().max(160).nullable().optional(),
  canonical_url: z.string().url().nullable().optional(),
  og_image_url: z.string().url().nullable().optional(),
  target_keyword: z.string().max(200).nullable().optional(),
  secondary_keywords: z.array(z.string()).optional(),
  buyer_stage: BuyerStageSchema.nullable().optional(),
  content_type: ContentTypeSchema.nullable().optional(),
  status: PostStatusSchema.optional(),
  is_gated: z.boolean().optional(),
  gate_cta: z.string().max(200).nullable().optional(),
  gate_asset_ids: z.array(z.string()).optional(),
  reviewer_id: z.string().uuid().nullable().optional(),
  reviewer_notes: z.string().nullable().optional(),
  published_at: z.string().datetime().nullable().optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
  generated_by: z.enum(GeneratedByValues).optional(),
  word_count: z.number().int().min(0).optional(),
})
export type BlogPostUpdate = z.infer<typeof BlogPostUpdateSchema>

/* ── Taxonomy (MK8-CMS-004) ────────────────────────── */

export type BlogTag = {
  id: string
  name: string
  slug: string
  description: string | null
  created_at: string
}

export type BlogTopic = {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  created_at: string
}

export type BlogPostTag = {
  post_id: string
  tag_id: string
}

export type BlogPostTopic = {
  post_id: string
  topic_id: string
}

/* ── AI Brief (MK8-INT-001) ────────────────────────── */

export type OutlineSection = {
  heading: string
  key_points: string[]
}

export type Faq = {
  question: string
  answer: string
}

export type HowToStep = {
  name: string
  text: string
  url?: string
}

export type ContentBrief = {
  title: string
  target_keyword: string
  secondary_keywords: string[]
  buyer_stage: BuyerStage
  content_type: ContentType
  outline: OutlineSection[]
  faqs: Faq[]
  word_count_target: number
  meta_description: string
  internal_links_suggested: string[]
}

export const OutlineSectionSchema = z.object({
  heading: z.string(),
  key_points: z.array(z.string()),
})

export const FaqSchema = z.object({
  question: z.string(),
  answer: z.string(),
})

export const HowToStepSchema = z.object({
  name: z.string(),
  text: z.string(),
  url: z.string().optional(),
})

export const ContentBriefSchema = z.object({
  title: z.string(),
  target_keyword: z.string(),
  secondary_keywords: z.array(z.string()),
  buyer_stage: BuyerStageSchema,
  content_type: ContentTypeSchema,
  outline: z.array(OutlineSectionSchema),
  faqs: z.array(FaqSchema),
  word_count_target: z.number().int().min(100),
  meta_description: z.string().max(160),
  internal_links_suggested: z.array(z.string()),
})

/* ── Taxonomy Schemas (MK8-CMS-004) ────────────────── */

export const TagCreateSchema = z.object({ name: z.string().min(1).max(200) })
export type TagCreate = z.infer<typeof TagCreateSchema>

export const TopicCreateSchema = z.object({
  name: z.string().min(1).max(200),
  parent_id: z.string().uuid().nullable().optional(),
})
export type TopicCreate = z.infer<typeof TopicCreateSchema>

/* ── Version Control (MK8-CMS-008) ─────────────────── */

export type ChangeType = 'auto-save' | 'manual-save' | 'status-change' | 'approval' | 'restore'

export type BlogPostVersion = {
  id: string
  post_id: string
  version_number: number
  content: Record<string, unknown>
  changed_by: string | null
  change_type: ChangeType
  created_at: string
}
