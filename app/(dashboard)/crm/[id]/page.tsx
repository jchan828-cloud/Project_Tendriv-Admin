import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { CrmContactList } from '@/components/admin/crm-contact-list'
import { CrmDetailClient } from '@/components/admin/crm-detail-client'

export default async function CrmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const service = await createServiceRoleClient()

  const [{ data: contact }, { data: contacts }, { data: activities }, { data: matches }] =
    await Promise.all([
      service.from('outreach_contacts').select('*').eq('id', id).single(),
      service.from('outreach_contacts')
        .select('id, business_name, province, pipeline, status, last_activity_at')
        .order('created_at', { ascending: false }),
      service.from('outreach_activity_log')
        .select('id, event_type, occurred_at')
        .eq('contact_id', id)
        .order('occurred_at', { ascending: false }),
      service.from('outreach_matches')
        .select('match_score, created_at, scout_notices(id, title, agency_canonical, closing_date, notice_type)')
        .eq('contact_id', id)
        .order('match_score', { ascending: false }),
    ])

  if (!contact) notFound()

  return (
    <div className="-m-6 flex h-[calc(100vh-49px)] overflow-hidden">
      <div className="w-[280px] flex-shrink-0 border-r border-border flex flex-col bg-[var(--surface-root)]">
        <CrmContactList contacts={contacts ?? []} activeId={id} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <CrmDetailClient contact={contact} activities={activities ?? []} matches={matches ?? []} />
      </div>
    </div>
  )
}
