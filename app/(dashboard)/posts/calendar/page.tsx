/** Content calendar — separate page for sidebar nav */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { CalendarBoard } from '@/components/cms/calendar-board'

export default async function CalendarPage() {
  const supabase = await createServiceRoleClient()

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, status, buyer_stage, content_type, target_keyword, word_count, scheduled_at, updated_at')
    .order('updated_at', { ascending: false })

  return (
    <div>
      <h1 className="text-heading-lg mb-6">Content Calendar</h1>
      <CalendarBoard posts={posts ?? []} />
    </div>
  )
}
