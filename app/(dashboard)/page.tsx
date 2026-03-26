/** Dashboard home — real KPI cards from Supabase */

import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { PipelineSummary } from '@/components/dashboard/pipeline-summary'

export default async function DashboardHome() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = await createServiceRoleClient()

  // Fetch KPIs in parallel
  const [
    { count: totalContacts },
    { count: activeLeads },
    { count: totalPosts },
    { count: publishedPosts },
    { count: gateSubmissions },
    { count: utmClicks },
    { data: recentActivity },
    { data: pipelineCounts },
  ] = await Promise.all([
    supabase.from('outreach_contacts').select('*', { count: 'exact', head: true }),
    supabase.from('outreach_contacts').select('*', { count: 'exact', head: true }).neq('status', 'unsubscribed'),
    supabase.from('blog_posts').select('*', { count: 'exact', head: true }),
    supabase.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('marketing_events').select('*', { count: 'exact', head: true }).eq('event_type', 'gate_submit'),
    supabase.from('utm_clicks').select('*', { count: 'exact', head: true }),
    supabase
      .from('audit_log')
      .select('id, event_type, resource_type, resource_id, created_at, actor_type')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('outreach_contacts')
      .select('pipeline, status'),
  ])

  // Compute pipeline breakdown
  const pipelines: Record<string, Record<string, number>> = {}
  for (const row of pipelineCounts ?? []) {
    const p = (row as { pipeline: string; status: string }).pipeline ?? 'unknown'
    const s = (row as { pipeline: string; status: string }).status ?? 'unknown'
    if (!pipelines[p]) pipelines[p] = {}
    pipelines[p][s] = (pipelines[p][s] ?? 0) + 1
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 className="text-heading-xl" style={{ marginBottom: 4 }}>Dashboard</h1>
        <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
          Overview of your marketing, content, and CRM metrics.
        </p>
      </div>

      <KpiCards
        totalContacts={totalContacts ?? 0}
        activeLeads={activeLeads ?? 0}
        totalPosts={totalPosts ?? 0}
        publishedPosts={publishedPosts ?? 0}
        gateSubmissions={gateSubmissions ?? 0}
        utmClicks={utmClicks ?? 0}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 32 }}>
        <PipelineSummary pipelines={pipelines} />
        <RecentActivity
          activity={(recentActivity ?? []).map((a) => ({
            id: (a as Record<string, unknown>).id as string,
            event_type: (a as Record<string, unknown>).event_type as string,
            resource_type: (a as Record<string, unknown>).resource_type as string,
            resource_id: (a as Record<string, unknown>).resource_id as string,
            created_at: (a as Record<string, unknown>).created_at as string,
            actor_type: (a as Record<string, unknown>).actor_type as string,
          }))}
        />
      </div>
    </div>
  )
}
