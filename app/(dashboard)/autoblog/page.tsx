import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { fetchReviewQueue, type ReviewQueue } from '@/lib/autoblog/review-queue'
import { AutoblogPage } from '@/components/autoblog/autoblog-page'
import type { AutoblogRun, AutoblogSettings } from '@/lib/types/autoblog'

export default async function AutoblogServerPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Single DB since the blog consolidation: autoblog_runs/_settings and
  // blog_posts all live in the marketing DB, served by one service-role client.
  const marketing = await createServiceRoleClient()

  const [{ data: runs }, { data: settings }, queue] = await Promise.all([
    marketing.from('autoblog_runs').select('*').order('created_at', { ascending: false }).limit(50),
    marketing.from('autoblog_settings').select('*').eq('id', 1).single(),
    fetchReviewQueue(marketing).catch(
      (err): ReviewQueue => ({
        items: [],
        engineError: err instanceof Error ? err.message : 'Review queue unavailable',
      })
    ),
  ])

  return (
    <AutoblogPage
      initialRuns={(runs ?? []) as AutoblogRun[]}
      initialSettings={settings as AutoblogSettings | null}
      initialQueue={queue.items}
      queueWarning={queue.engineError}
    />
  )
}
