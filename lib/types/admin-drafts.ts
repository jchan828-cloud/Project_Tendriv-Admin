/** MK7-ADMIN-003v2: Draft type definitions for editorial desk */

export type DraftSource = {
  url?: string
  title?: string
  verified?: boolean
}

export type BlogDraft = {
  id: string
  title: string
  slug: string
  tier: string
  type: string
  status: string
  created_at: string
  generated_by: string
  content: string | null
  sources: DraftSource[] | null
  reviewer_notes: string | null
  reviewed_at: string | null
}

export type DraftSummary = {
  id: string
  title: string
  tier: string
  type: string
  status: string
  created_at: string
}
