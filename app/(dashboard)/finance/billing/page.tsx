/** Billing accounts — full management page */

import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BillingManager } from '@/components/finance/billing-manager'

export default async function BillingPage() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = await createServiceRoleClient()
  const { data: accounts } = await supabase
    .from('billing_accounts')
    .select('*')
    .order('service_name')

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-heading-xl" style={{ marginBottom: 4 }}>Billing Accounts</h1>
        <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
          Manage all service subscriptions. Set a centralized billing email to keep invoices organized.
        </p>
      </div>
      <BillingManager accounts={
        (accounts ?? []).map((a) => ({
          id: (a as Record<string, unknown>).id as string,
          service_name: (a as Record<string, unknown>).service_name as string,
          billing_email: (a as Record<string, unknown>).billing_email as string | null,
          plan_name: (a as Record<string, unknown>).plan_name as string | null,
          monthly_cost: Number((a as Record<string, unknown>).monthly_cost ?? 0),
          currency: ((a as Record<string, unknown>).currency as string) ?? 'CAD',
          billing_cycle: (a as Record<string, unknown>).billing_cycle as string | null,
          next_billing_date: (a as Record<string, unknown>).next_billing_date as string | null,
          status: (a as Record<string, unknown>).status as string,
          dashboard_url: (a as Record<string, unknown>).dashboard_url as string | null,
          notes: (a as Record<string, unknown>).notes as string | null,
        }))
      } />
    </div>
  )
}
