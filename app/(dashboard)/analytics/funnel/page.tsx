/** MK8-ANL-004: Funnel visualisation page */

import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { FunnelChart } from '@/components/analytics/funnel-chart'

interface PageProps {
  searchParams: Promise<{ range?: string }>
}

export default async function FunnelPage({ searchParams }: PageProps) {
  const params = await searchParams
  const range = params.range ?? '30d'
  const supabase = await createServiceRoleClient()

  const intervalDays: Record<string, number> = { '30d': 30, '90d': 90, '12m': 365, 'all': 36500 }
  const days = intervalDays[range] ?? 30
  const since = new Date(Date.now() - days * 86400_000).toISOString()

  // Stage 1: Content readers (unique sessions with post_view)
  const { count: readers } = await supabase
    .from('marketing_events')
    .select('session_id', { count: 'exact', head: true })
    .eq('event_type', 'post_view')
    .gte('occurred_at', since)

  // Stage 2: Identified leads (unique contacts with attribution)
  const { count: leads } = await supabase
    .from('content_attribution')
    .select('contact_id', { count: 'exact', head: true })
    .gte('touched_at', since)

  // Stage 3: Demo requests
  const { count: demos } = await supabase
    .from('outreach_contacts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'demo')
    .gte('last_activity_at', since)

  // Stage 4: Converted
  const { count: converted } = await supabase
    .from('outreach_contacts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'converted')
    .gte('last_activity_at', since)

  const s1 = readers ?? 0
  const s2 = leads ?? 0
  const s3 = demos ?? 0
  const s4 = converted ?? 0

  // Top 3 contributing posts per stage
  const { data: topPosts } = await supabase
    .from('content_attribution')
    .select('post_id, blog_posts(title)')
    .gte('touched_at', since)
    .limit(3)

  const topTitles = (topPosts ?? []).map((p) => {
    const bp = p.blog_posts
    if (bp && typeof bp === 'object' && 'title' in bp) return String(bp.title)
    return 'Unknown'
  })

  const stages = [
    { label: 'Content Readers', count: s1, conversionRate: 0, color: 'jade', topPosts: topTitles },
    { label: 'Identified Leads', count: s2, conversionRate: s1 > 0 ? (s2 / s1) * 100 : 0, color: 'blue', topPosts: [] },
    { label: 'Demo Requests', count: s3, conversionRate: s2 > 0 ? (s3 / s2) * 100 : 0, color: 'amber', topPosts: [] },
    { label: 'Converted', count: s4, conversionRate: s3 > 0 ? (s4 / s3) * 100 : 0, color: 'green', topPosts: [] },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-heading-lg">Funnel</h1>
        <div className="flex gap-2">
          {(['30d', '90d', '12m', 'all'] as const).map((r) => (
            <Link
              key={r}
              href={`/analytics/funnel?range=${r}`}
              className={`btn-sm ${range === r ? 'btn-primary' : 'btn-secondary'}`}
            >
              {r === 'all' ? 'All' : r}
            </Link>
          ))}
        </div>
      </div>
      <FunnelChart stages={stages} />
    </div>
  )
}
