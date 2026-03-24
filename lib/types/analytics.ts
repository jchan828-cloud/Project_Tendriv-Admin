/** MK8-ANL-001 / MK8-ANL-002: Analytics type definitions + Zod schemas */

import { z } from 'zod'

/* ── UTM Campaigns ──────────────────────────────────── */

export type UtmCampaign = {
  id: string
  name: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_term: string | null
  utm_content: string | null
  destination_url: string
  full_url: string
  short_code: string
  click_count: number
  post_id: string | null
  created_by: string | null
  created_at: string
}

export const UtmCampaignInsertSchema = z.object({
  name: z.string().min(1).max(200),
  utm_source: z.string().min(1).max(100),
  utm_medium: z.string().min(1).max(100),
  utm_campaign: z.string().min(1).max(200),
  utm_term: z.string().max(200).nullable().optional(),
  utm_content: z.string().max(200).nullable().optional(),
  destination_url: z.string().url(),
  post_id: z.string().uuid().nullable().optional(),
})
export type UtmCampaignInsert = z.infer<typeof UtmCampaignInsertSchema>

/* ── UTM Clicks ─────────────────────────────────────── */

export type UtmClick = {
  id: string
  utm_id: string
  clicked_at: string
  ip_hash: string | null
  referrer: string | null
  user_agent_hash: string | null
  resolved_contact_id: string | null
}

/* ── Marketing Events ───────────────────────────────── */

export const MarketingEventTypeValues = [
  'page_view', 'scroll_depth', 'time_on_page',
  'cta_click', 'gate_submit', 'internal_search',
  'post_view', 'utm_click',
] as const
export type MarketingEventType = (typeof MarketingEventTypeValues)[number]

export type MarketingEvent = {
  id: string
  event_type: MarketingEventType
  post_id: string | null
  session_id: string
  metadata: Record<string, unknown> | null
  occurred_at: string
}

export const MarketingEventInsertSchema = z.object({
  event_type: z.enum(MarketingEventTypeValues),
  post_id: z.string().uuid().nullable().optional(),
  session_id: z.string().min(1).max(200),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})
export type MarketingEventInsert = z.infer<typeof MarketingEventInsertSchema>

export const MarketingEventBatchSchema = z.array(MarketingEventInsertSchema).min(1).max(100)
