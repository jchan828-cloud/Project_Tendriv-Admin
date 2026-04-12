/** MK8-CRM-001: Lead scoring engine — pure function, no I/O */

import { OutreachContact, OutreachActivityLog } from '@/lib/types/crm'
import { ContentAttribution } from '@/lib/types/scoring'

export interface ScoreBreakdown {
  content_engagement: number
  email_engagement: number
  firmographic: number
  recency: number
}

/* ── Scoring constants (no magic numbers) ───────────── */

const CONTENT_GATE_SUBMIT_POINTS = 8
const CONTENT_POST_VIEW_POINTS = 4
const CONTENT_SCROLL_DEPTH_POINTS = 2
const CONTENT_CTA_CLICK_POINTS = 6
const CONTENT_TIME_ON_PAGE_POINTS = 3  // Awarded when seconds >= 120
const CONTENT_TIME_ON_PAGE_THRESHOLD = 120
const CONTENT_MAX = 30

/** buyer_stage multiplier: decision-stage content signals higher intent */
const BUYER_STAGE_MULTIPLIER: Record<string, number> = {
  awareness: 1.0,
  consideration: 1.25,
  decision: 1.5,
}

const EMAIL_REPLY_POINTS = 10
const EMAIL_CLICK_POINTS = 5
const EMAIL_OPEN_POINTS = 2
const EMAIL_MAX = 25

const FIRMOGRAPHIC_PSIB_POINTS = 15
const FIRMOGRAPHIC_PROVINCE_POINTS = 5
const FIRMOGRAPHIC_NAICS_POINTS = 5
const FIRMOGRAPHIC_MAX = 25
const FIRMOGRAPHIC_ELIGIBLE_PROVINCES = [
  'ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT', 'NU',
]

const RECENCY_BASE = 20
const RECENCY_DECAY_PER_WEEK = 1
const RECENCY_MIN = 0
const RECENCY_MAX = 20

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function computeScore(
  contact: OutreachContact,
  activityLog: OutreachActivityLog[],
  contentTouches: ContentAttribution[]
): { score: number; breakdown: ScoreBreakdown } {
  // Content engagement: +8 gate submit, +4 post_view, +2 scroll_depth >= 75
  let contentRaw = 0
  const gateSubmits = contentTouches.filter((t) => t.touch_type === 'first').length
  contentRaw += gateSubmits * CONTENT_GATE_SUBMIT_POINTS

  for (const event of activityLog) {
    const meta = event.event_metadata
    if (meta && typeof meta === 'object') {
      const eventType = 'event_type' in meta ? meta.event_type : null
      const buyerStage = 'buyer_stage' in meta ? String(meta.buyer_stage) : null
      const multiplier = buyerStage ? (BUYER_STAGE_MULTIPLIER[buyerStage] ?? 1.0) : 1.0

      if (eventType === 'post_view') {
        contentRaw += CONTENT_POST_VIEW_POINTS * multiplier
      }
      if (eventType === 'scroll_depth') {
        const depth = 'depth' in meta ? Number(meta.depth) : 0
        if (depth >= 75) {
          contentRaw += CONTENT_SCROLL_DEPTH_POINTS * multiplier
        }
      }
      if (eventType === 'cta_click') {
        contentRaw += CONTENT_CTA_CLICK_POINTS * multiplier
      }
      if (eventType === 'time_on_page') {
        const seconds = 'seconds' in meta ? Number(meta.seconds) : 0
        if (seconds >= CONTENT_TIME_ON_PAGE_THRESHOLD) {
          contentRaw += CONTENT_TIME_ON_PAGE_POINTS * multiplier
        }
      }
    }
  }
  const content_engagement = clamp(Math.round(contentRaw), 0, CONTENT_MAX)

  // Email engagement: +10 reply, +5 click, +2 open
  let emailRaw = 0
  for (const event of activityLog) {
    if (event.event_type === 'replied') emailRaw += EMAIL_REPLY_POINTS
    if (event.event_type === 'clicked') emailRaw += EMAIL_CLICK_POINTS
    if (event.event_type === 'opened') emailRaw += EMAIL_OPEN_POINTS
  }
  const email_engagement = clamp(emailRaw, 0, EMAIL_MAX)

  // Firmographic: +15 PSIB, +5 province match, +5 naics non-empty
  let firmRaw = 0
  if (contact.pipeline === 'psib') firmRaw += FIRMOGRAPHIC_PSIB_POINTS
  if (contact.province && FIRMOGRAPHIC_ELIGIBLE_PROVINCES.includes(contact.province)) {
    firmRaw += FIRMOGRAPHIC_PROVINCE_POINTS
  }
  if (contact.unspsc_categories && contact.unspsc_categories.length > 0) {
    firmRaw += FIRMOGRAPHIC_NAICS_POINTS
  }
  const firmographic = clamp(firmRaw, 0, FIRMOGRAPHIC_MAX)

  // Recency: 20 - floor(days_since_last_activity / 7), min 0
  const lastActivityDate = contact.last_activity_at ?? activityLog[0]?.occurred_at ?? null
  const days = daysSince(lastActivityDate)
  const recencyRaw = RECENCY_BASE - Math.floor(days / 7) * RECENCY_DECAY_PER_WEEK
  const recency = clamp(recencyRaw, RECENCY_MIN, RECENCY_MAX)

  const totalRaw = content_engagement + email_engagement + firmographic + recency
  const score = clamp(totalRaw, 0, 100)

  return {
    score,
    breakdown: { content_engagement, email_engagement, firmographic, recency },
  }
}
