/** MK8-CMS-003: Posts page — content calendar + status workflow.
 *  SEO-009: Surfaces queue states (queued / generating / failed) too.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { CalendarBoard } from '@/components/cms/calendar-board'
import { RunWorkerButton } from '@/components/blog/run-worker-button'
import { BlogPost } from '@/lib/types/cms'

// Disable caching so newly-generated drafts appear immediately on refresh.
export const dynamic = 'force-dynamic'

export default async function PostsPage() {
  const supabase = await createServiceRoleClient()

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*')
    .order('updated_at', { ascending: false })

  const typedPosts: BlogPost[] = posts ?? []

  const counts = {
    queued: typedPosts.filter((p) => p.status === 'queued').length,
    generating: typedPosts.filter((p) => p.status === 'generating').length,
    review: typedPosts.filter((p) => p.status === 'review').length,
    published: typedPosts.filter((p) => p.status === 'published').length,
    failed: typedPosts.filter((p) => p.status === 'failed').length,
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-heading-lg">Content Calendar</h1>
        <div className="flex flex-wrap gap-2">
          {counts.queued > 0 && <span className="badge badge-neutral">{counts.queued} queued</span>}
          {counts.generating > 0 && <span className="badge badge-jade">{counts.generating} generating</span>}
          <span className="badge badge-warning">{counts.review} in review</span>
          <span className="badge badge-success">{counts.published} published</span>
          {counts.failed > 0 && <span className="badge badge-danger">{counts.failed} failed</span>}
        </div>
      </div>
      {counts.queued > 0 && (
        <div className="mb-4">
          <RunWorkerButton />
        </div>
      )}
      <CalendarBoard posts={typedPosts} />
    </div>
  )
}
