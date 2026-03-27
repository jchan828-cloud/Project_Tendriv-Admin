/** Customer management page */

import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CustomerManager } from '@/components/finance/customer-manager'

export default async function CustomersPage() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = await createServiceRoleClient()
  const [{ data: customers }, { data: tiers }] = await Promise.all([
    supabase.from('customers').select('*, customer_tiers(name, monthly_price)').order('created_at', { ascending: false }),
    supabase.from('customer_tiers').select('*').order('display_order'),
  ])

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-heading-xl" style={{ marginBottom: 4 }}>Customers</h1>
        <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
          Manage customers, assign tiers, and track acquisition costs.
        </p>
      </div>
      <CustomerManager
        customers={(customers ?? []).map((c) => {
          const r = c as Record<string, unknown>
          const tier = r.customer_tiers as Record<string, unknown> | null
          return {
            id: r.id as string, name: r.name as string, email: (r.email as string) ?? '',
            tier_id: (r.tier_id as string) ?? '', tier_name: tier ? (tier.name as string) : null,
            status: r.status as string, mrr: Number(r.mrr ?? 0),
            acquisition_channel: (r.acquisition_channel as string) ?? '',
            acquisition_cost: Number(r.acquisition_cost ?? 0),
            first_payment_date: (r.first_payment_date as string) ?? '',
            notes: (r.notes as string) ?? '',
          }
        })}
        tiers={(tiers ?? []).map((t) => {
          const r = t as Record<string, unknown>
          return { id: r.id as string, name: r.name as string, monthly_price: Number(r.monthly_price ?? 0) }
        })}
      />
    </div>
  )
}
