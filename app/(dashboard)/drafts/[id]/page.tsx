import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { DraftIndexList } from '@/components/admin/draft-index-list'
import { DraftDeskClient } from '@/components/admin/draft-desk-client'
import { DraftSourcesSidebar } from '@/components/admin/draft-sources-sidebar'

export default async function DraftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const service = await createServiceRoleClient()

  const [{ data: draft }, { data: allDrafts }] = await Promise.all([
    service.from('blog_drafts').select('*').eq('id', id).single(),
    service.from('blog_drafts')
      .select('id, title, tier, type, status, created_at')
      .order('created_at', { ascending: false }),
  ])

  if (!draft) notFound()

  return (
    <div className="-m-6 flex h-[calc(100vh-49px)] overflow-hidden">
      <div className="w-[220px] flex-shrink-0 border-r border-border flex flex-col bg-[var(--surface-root)]">
        <DraftIndexList drafts={allDrafts ?? []} activeId={id} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <DraftDeskClient draft={draft} />
      </div>
      <div className="w-[192px] flex-shrink-0 border-l border-border overflow-y-auto">
        <DraftSourcesSidebar draft={draft} />
      </div>
    </div>
  )
}
