/**
 * W7: Public/machine marketing routes — the ONLY handlers under
 * app/api/marketing that do not require a content-editor session.
 *
 * The meta-test (__tests__/marketing-route-guard.meta.test.ts) walks every
 * route.ts under app/api/marketing and fails any file that neither invokes
 * requireContentAccess() nor appears here, so additions to this list are
 * diff-visible and deliberate.
 *
 * Constraint (audited 2026-06-11): no route on this list may write blog
 * content tables (blog_posts, blog_tags, blog_topics, blog_post_tags,
 * blog_post_topics, blog_post_versions, jsonld_override). Anonymous routes
 * may only write their own event/contact/attribution/score tables.
 */

export interface PublicMarketingRoute {
  /** Route file path relative to the repo root, posix separators. */
  route: string
  /**
   * 'anonymous'   — deliberately public, called by the marketing site or
   *                 anonymous visitors.
   * 'cron-secret' — machine endpoint guarded by the CRON_SECRET bearer
   *                 token; the meta-test verifies the guard is present.
   */
  guard: 'anonymous' | 'cron-secret'
  /** One-line justification for not requiring a session. */
  reason: string
}

export const PUBLIC_MARKETING_ROUTES: PublicMarketingRoute[] = [
  {
    route: 'app/api/marketing/events/route.ts',
    guard: 'anonymous',
    reason:
      'Marketing-site visitors POST analytics events for lead scoring (writes marketing_events only); rate-limited per session.',
  },
  {
    route: 'app/api/marketing/gate/route.ts',
    guard: 'anonymous',
    reason:
      'Public lead capture for gated content; writes contacts/attribution/events, reads blog_posts only; rate-limited per IP hash.',
  },
  {
    route: 'app/api/marketing/gate/template/route.ts',
    guard: 'anonymous',
    reason:
      'Public template-download gate called cross-origin from the marketing site (CORS); writes contacts/events only; rate-limited per IP hash.',
  },
  {
    route: 'app/api/marketing/utms/[code]/route.ts',
    guard: 'anonymous',
    reason:
      'Public UTM short-link redirect clicked from emails by anonymous recipients; records clicks/attribution only.',
  },
  {
    route: 'app/api/marketing/attribution/route.ts',
    guard: 'anonymous',
    reason: 'Read-only content-attribution listing for CRM surfaces; performs no writes.',
  },
  {
    route: 'app/api/marketing/score/route.ts',
    guard: 'anonymous',
    reason: 'System lead-score recompute hook; writes lead_scores only.',
  },
  {
    route: 'app/api/marketing/score/cron/route.ts',
    guard: 'cron-secret',
    reason:
      'Vercel cron batch re-score (vercel.json, daily 06:00 UTC); authenticated by the CRON_SECRET bearer token, not a browser session.',
  },
]
