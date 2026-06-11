import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { createEngineClient } from '@/lib/supabase/engine'
import { fetchReviewQueue, type ReviewQueue } from '@/lib/autoblog/review-queue'
import { AutoblogPage } from '@/components/autoblog/autoblog-page'
import type { AutoblogRun, AutoblogSettings } from '@/lib/types/autoblog'

export default async function AutoblogServerPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Two databases: runs/settings live in the engine DB (tendriv-blog-content);
  // the approval queue reads blog_posts from the marketing DB and joins the
  // engine run in code.
  const engine = createEngineClient()
  const marketing = await createServiceRoleClient()

  const [{ data: runs }, { data: settings }, queue] = await Promise.all([
    engine.from('autoblog_runs').select('*').order('created_at', { ascending: false }).limit(50),
    engine.from('autoblog_settings').select('*').eq('id', 1).single(),
    fetchReviewQueue(marketing, engine).catch(
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
