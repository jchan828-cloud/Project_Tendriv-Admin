import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FeedbackInbox } from '@/components/feedback/feedback-inbox'

export default async function FeedbackPage() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = await createServiceRoleClient()

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: items }, { data: stats }] = await Promise.all([
    supabase
      .from('feedback')
      .select('id, source, category, sentiment, rating, priority, status, body, title, submitter_email, submitter_name, created_at')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('feedback')
      .select('status, priority, rating, created_at, submitter_email'),
  ])

  const openStatuses = ['new', 'reviewed', 'in-progress']
  const openCount = (stats ?? []).filter((r) => openStatuses.includes(r.status as string)).length
  const criticalCount = (stats ?? []).filter((r) => r.priority === 'critical').length
  const customerCount = (stats ?? []).filter((r) => r.submitter_email != null).length
  const weekRatings = (stats ?? [])
    .filter((r) => r.rating != null && r.created_at >= weekAgo)
    .map((r) => r.rating as number)
  const avgRating = weekRatings.length > 0
    ? (weekRatings.reduce((s, v) => s + v, 0) / weekRatings.length).toFixed(1)
    : null

  type FeedbackItem = {
    id: string
    source: string
    category: string
    sentiment: string | null
    rating: number | null
    priority: string
    status: string
    body: string
    title: string | null
    submitter_email: string | null
    submitter_name: string | null
    created_at: string
  }

  return (
    <FeedbackInbox
      items={(items ?? []) as FeedbackItem[]}
      counts={{ open: openCount, critical: criticalCount, fromCustomers: customerCount, avgRating }}
    />
  )
}
