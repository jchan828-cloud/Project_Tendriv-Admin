import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { CrmContactList } from '@/components/admin/crm-contact-list'

export default async function CrmPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = await createServiceRoleClient()
  const { data: contacts } = await service
    .from('outreach_contacts')
    .select('id, business_name, province, pipeline, status, last_activity_at')
    .order('created_at', { ascending: false })

  return (
    <div className="-m-6 flex h-[calc(100vh-49px)] overflow-hidden">
      <div className="w-[280px] flex-shrink-0 border-r border-border flex flex-col bg-[var(--surface-root)]">
        <CrmContactList contacts={contacts ?? []} />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-body-sm text-[var(--text-muted)]">Select a contact to view details</p>
      </div>
    </div>
  )
}
