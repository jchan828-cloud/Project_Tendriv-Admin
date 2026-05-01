import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { VendorSpendView } from '@/components/finance/vendor-spend-view'

export default async function VendorSpendPage() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('billing_accounts')
    .select('*')
    .order('monthly_cost', { ascending: false, nullsFirst: false })

  type BillingRow = {
    id: string
    service_name: string
    plan_name: string | null
    monthly_cost: number
    currency: string
    billing_cycle: string | null
    next_billing_date: string | null
    status: string
    notes: string | null
    dashboard_url: string | null
  }

  const accounts = (data ?? []).map((a) => {
    const r = a as Record<string, unknown>
    return {
      id: r.id as string,
      service_name: r.service_name as string,
      plan_name: (r.plan_name ?? null) as string | null,
      monthly_cost: Number(r.monthly_cost ?? 0),
      currency: (r.currency as string) ?? 'CAD',
      billing_cycle: (r.billing_cycle ?? null) as string | null,
      next_billing_date: (r.next_billing_date ?? null) as string | null,
      status: r.status as string,
      notes: (r.notes ?? null) as string | null,
      dashboard_url: (r.dashboard_url ?? null) as string | null,
    } satisfies BillingRow
  })

  return <VendorSpendView accounts={accounts} />
}
