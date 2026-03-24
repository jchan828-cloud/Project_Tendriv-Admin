/** MK8-INT-002: Predictive lead score — velocity + engagement trend */

import { ScoreBreakdown } from './engine'

/* ── Predictive constants ──────────────────────────── */

const VELOCITY_WEIGHT = 0.3
const TREND_WEIGHT = 0.7
const VELOCITY_LOOKBACK_DAYS = 14
const MIN_EVENTS_FOR_PREDICTION = 3

interface ScoringEvent {
  occurred_at: string
  score_at_time: number
}

/**
 * Compute a predictive score adjustment based on engagement velocity.
 * Returns a modifier (-10 to +10) to add to the base score.
 */
export function computePredictiveModifier(
  _breakdown: ScoreBreakdown,
  recentEvents: ScoringEvent[]
): number {
  if (recentEvents.length < MIN_EVENTS_FOR_PREDICTION) return 0

  const now = Date.now()
  const lookbackMs = VELOCITY_LOOKBACK_DAYS * 86400_000

  // Velocity: events per day in lookback window
  const recentInWindow = recentEvents.filter(
    (e) => now - new Date(e.occurred_at).getTime() < lookbackMs
  )
  const velocity = recentInWindow.length / VELOCITY_LOOKBACK_DAYS

  // Trend: are scores increasing or decreasing?
  const sorted = [...recentEvents].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
  )
  let trendSum = 0
  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i]
    const prev = sorted[i - 1]
    if (curr && prev) {
      trendSum += curr.score_at_time - prev.score_at_time
    }
  }
  const trend = sorted.length > 1 ? trendSum / (sorted.length - 1) : 0

  // Combined modifier: velocity contributes engagement signal, trend shows direction
  const velocitySignal = Math.min(velocity * 5, 5)
  const trendSignal = Math.max(-5, Math.min(5, trend))

  const modifier = velocitySignal * VELOCITY_WEIGHT + trendSignal * TREND_WEIGHT
  return Math.round(Math.max(-10, Math.min(10, modifier)))
}

/**
 * Determine if a contact is "heating up" or "cooling down".
 */
export function engagementDirection(modifier: number): 'heating' | 'cooling' | 'stable' {
  if (modifier >= 3) return 'heating'
  if (modifier <= -3) return 'cooling'
  return 'stable'
}
