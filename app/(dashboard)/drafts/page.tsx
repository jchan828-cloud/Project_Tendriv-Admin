import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { DraftTable } from '@/components/drafts/draft-table'

export default async function DraftsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = await createServiceRoleClient()
  const { data: drafts } = await service
    .from('blog_drafts')
    .select('id, title, slug, tier, type, status, created_at, generated_by')
    .order('created_at', { ascending: false })

  const allDrafts = drafts ?? []
  const pendingCount = allDrafts.filter(d => d.status === 'pending').length

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-heading-md">Blog drafts</h1>
        {pendingCount > 0 && (
          <span className="badge badge-warning">{pendingCount} pending</span>
        )}
      </div>
      <DraftTable drafts={allDrafts} />
    </div>
  )
}
