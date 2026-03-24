/** MK8-ANL-003: Per-post analytics dashboard */

import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { PostStatsCard } from '@/components/analytics/post-stats-card'

interface PageProps {
  searchParams: Promise<{ range?: string }>
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const range = params.range ?? '30d'
  const supabase = await createServiceRoleClient()

  const intervalMap: Record<string, string> = {
    '7d': '7 days',
    '30d': '30 days',
    'all': '100 years',
  }
  const interval = intervalMap[range] ?? '30 days'

  // Get top 10 posts by marketing_events count
  const { data: topPosts } = await supabase.rpc('get_top_posts_by_events', { interval_str: interval }).limit(10)

  // Fallback: if RPC not available, fetch posts directly
  const posts = topPosts ?? []

  // For each post, compute stats
  const { data: allPosts } = await supabase
    .from('blog_posts')
    .select('id, title, is_gated')
    .order('updated_at', { ascending: false })
    .limit(10)

  const postsToShow = posts.length > 0 ? posts : (allPosts ?? [])

  const statsPromises = postsToShow.map(async (post: Record<string, unknown>) => {
    const postId = String(post.id)
    const [views, scrolls, ctaClicks, firstTouch, lastTouch, gateSubmits, utmData] = await Promise.all([
      supabase.from('marketing_events').select('*', { count: 'exact', head: true })
        .eq('post_id', postId).eq('event_type', 'post_view'),
      supabase.from('marketing_events').select('metadata')
        .eq('post_id', postId).eq('event_type', 'scroll_depth'),
      supabase.from('marketing_events').select('*', { count: 'exact', head: true })
        .eq('post_id', postId).eq('event_type', 'cta_click'),
      supabase.from('content_attribution').select('*', { count: 'exact', head: true })
        .eq('post_id', postId).eq('touch_type', 'first'),
      supabase.from('content_attribution').select('*', { count: 'exact', head: true })
        .eq('post_id', postId).eq('touch_type', 'last'),
      supabase.from('marketing_events').select('*', { count: 'exact', head: true })
        .eq('post_id', postId).eq('event_type', 'gate_submit'),
      supabase.from('utm_campaigns').select('utm_source, click_count')
        .eq('post_id', postId).order('click_count', { ascending: false }).limit(3),
    ])

    const viewCount = views.count ?? 0
    const scrollData = scrolls.data ?? []
    const avgScroll = scrollData.length > 0
      ? scrollData.reduce((sum, s) => {
          const meta = s.metadata
          const depth = meta && typeof meta === 'object' && 'depth' in meta ? Number(meta.depth) : 0
          return sum + depth
        }, 0) / scrollData.length
      : 0

    const ctaCount = ctaClicks.count ?? 0
    const ctaRate = viewCount > 0 ? (ctaCount / viewCount) * 100 : 0
    const gateCount = gateSubmits.count ?? 0
    const gateConv = viewCount > 0 ? (gateCount / viewCount) * 100 : 0
    const utmSources = (utmData.data ?? []).map((u) => String(u.utm_source))

    return {
      id: postId,
      title: String(post.title),
      is_gated: Boolean(post.is_gated),
      views: viewCount,
      avgScrollDepth: avgScroll,
      ctaClickRate: ctaRate,
      utmSources,
      firstTouchCount: firstTouch.count ?? 0,
      lastTouchCount: lastTouch.count ?? 0,
      gateConversion: gateConv,
    }
  })

  const stats = await Promise.all(statsPromises)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-heading-lg">Post Analytics</h1>
        <div className="flex gap-2">
          {(['7d', '30d', 'all'] as const).map((r) => (
            <Link
              key={r}
              href={`/analytics?range=${r}`}
              className={`btn-sm ${range === r ? 'btn-primary' : 'btn-secondary'}`}
            >
              {r === 'all' ? 'All time' : r}
            </Link>
          ))}
        </div>
      </div>

      {stats.length === 0 ? (
        <p className="text-body-md text-[var(--text-muted)]">No posts with analytics data yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {stats.map((s) => (
            <PostStatsCard key={s.id} stats={s} />
          ))}
        </div>
      )}
    </div>
  )
}
