/** MK8-CMS-003: Posts page — content calendar + status workflow */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { CalendarBoard } from '@/components/cms/calendar-board'
import { BlogPost } from '@/lib/types/cms'

export default async function PostsPage() {
  const supabase = await createServiceRoleClient()

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*')
    .order('updated_at', { ascending: false })

  const typedPosts: BlogPost[] = posts ?? []

  // Summary counts
  const counts = {
    draft: typedPosts.filter((p) => p.status === 'draft').length,
    review: typedPosts.filter((p) => p.status === 'review').length,
    approved: typedPosts.filter((p) => p.status === 'approved').length,
    published: typedPosts.filter((p) => p.status === 'published').length,
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-heading-lg">Content Calendar</h1>
        <div className="flex gap-2">
          <span className="badge badge-neutral">{counts.draft} drafts</span>
          <span className="badge badge-warning">{counts.review} in review</span>
          <span className="badge badge-jade">{counts.approved} approved</span>
          <span className="badge badge-success">{counts.published} published</span>
        </div>
      </div>
      <CalendarBoard posts={typedPosts} />
    </div>
  )
}
