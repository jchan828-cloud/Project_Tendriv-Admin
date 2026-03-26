/** Sales pipeline — kanban board for deals */

import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PipelineBoard } from '@/components/sales/pipeline-board'

export default async function SalesPage() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = await createServiceRoleClient()
  const { data: deals } = await supabase
    .from('deals')
    .select('*, outreach_contacts(business_name, contact_email), abm_accounts(name)')
    .order('updated_at', { ascending: false })

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="text-heading-xl" style={{ marginBottom: 4 }}>Sales Pipeline</h1>
          <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
            Drag deals between stages to update their status.
          </p>
        </div>
      </div>
      <PipelineBoard deals={deals ?? []} />
    </div>
  )
}
