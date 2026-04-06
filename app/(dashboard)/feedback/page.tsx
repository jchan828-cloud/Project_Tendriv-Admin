/** Feedback dashboard — review, triage, and respond to customer feedback */

import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FeedbackDashboard } from '@/components/feedback/feedback-dashboard'

export default async function FeedbackPage() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = await createServiceRoleClient()

  const [
    { data: feedbackItems, count },
    { data: stats },
  ] = await Promise.all([
    supabase
      .from('feedback')
      .select('*, feedback_responses(id, body, is_public, created_at, author_id)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('feedback')
      .select('status, sentiment, category'),
  ])

  // Compute stats
  const statusCounts: Record<string, number> = {}
  const sentimentCounts: Record<string, number> = {}
  const categoryCounts: Record<string, number> = {}
  for (const row of stats ?? []) {
    const r = row as Record<string, unknown>
    const s = (r.status as string) ?? 'new'
    statusCounts[s] = (statusCounts[s] ?? 0) + 1
    if (r.sentiment) {
      const sent = r.sentiment as string
      sentimentCounts[sent] = (sentimentCounts[sent] ?? 0) + 1
    }
    const cat = (r.category as string) ?? 'general'
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-heading-xl" style={{ marginBottom: 4 }}>Customer Feedback</h1>
        <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
          Review, triage, and respond to feedback from customers.
        </p>
      </div>
      <FeedbackDashboard
        items={(feedbackItems ?? []).map((f) => {
          const r = f as Record<string, unknown>
          return {
            id: r.id as string,
            source: r.source as string,
            page_url: r.page_url as string | null,
            submitter_name: r.submitter_name as string | null,
            submitter_email: r.submitter_email as string | null,
            category: r.category as string,
            sentiment: r.sentiment as string | null,
            rating: r.rating as number | null,
            title: r.title as string | null,
            body: r.body as string,
            status: r.status as string,
            priority: r.priority as string,
            internal_notes: r.internal_notes as string | null,
            created_at: r.created_at as string,
            responses: ((r.feedback_responses as Record<string, unknown>[]) ?? []).map((resp) => ({
              id: resp.id as string,
              body: resp.body as string,
              is_public: resp.is_public as boolean,
              created_at: resp.created_at as string,
            })),
          }
        })}
        totalCount={count ?? 0}
        statusCounts={statusCounts}
        sentimentCounts={sentimentCounts}
        categoryCounts={categoryCounts}
      />
    </div>
  )
}
