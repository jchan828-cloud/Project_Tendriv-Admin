import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { CustomerRevenueView } from '@/components/finance/customer-revenue-view'

export default async function CustomerRevenuePage() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = await createServiceRoleClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().slice(0, 10)

  const [
    { data: customerData },
    { data: tierData },
    { data: revenueData },
    { data: monthlyRevData },
  ] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, tier_id, status, mrr, currency, acquisition_cost, first_payment_date, created_at')
      .order('mrr', { ascending: false, nullsFirst: false }),
    supabase
      .from('customer_tiers')
      .select('id, name, monthly_price, display_order')
      .order('display_order'),
    // Lifetime revenue per customer
    supabase
      .from('customer_revenue')
      .select('customer_id, amount'),
    // Current month revenue for MRR KV
    supabase
      .from('customer_revenue')
      .select('customer_id, amount')
      .gte('period', monthStart)
      .lte('period', monthStart),
  ])

  const tierMap = new Map(
    (tierData ?? []).map((t) => [
      t.id as string,
      { name: t.name as string, monthly_price: Number(t.monthly_price ?? 0), display_order: t.display_order as number },
    ])
  )

  // Lifetime revenue per customer
  const lifetimeMap = new Map<string, number>()
  for (const r of revenueData ?? []) {
    const cid = r.customer_id as string
    lifetimeMap.set(cid, (lifetimeMap.get(cid) ?? 0) + Number(r.amount ?? 0))
  }

  const customers = (customerData ?? []).map((c) => {
    const r = c as Record<string, unknown>
    const tierId = r.tier_id as string | null
    const tier = tierId ? tierMap.get(tierId) : null
    const mrr = Number(r.mrr ?? 0)
    const cac = Number(r.acquisition_cost ?? 0)
    const lifetime = lifetimeMap.get(r.id as string) ?? mrr * 6
    const marginPct = lifetime > 0
      ? Math.round(((lifetime - cac) / lifetime) * 100)
      : null

    return {
      id: r.id as string,
      name: r.name as string,
      tier_id: tierId,
      tier_name: tier?.name ?? null,
      plan: tier?.name ?? 'Untiered',
      status: r.status as string,
      mrr_cad: mrr,
      lifetime_revenue_cad: lifetime,
      cac_cad: cac > 0 ? cac : null,
      margin_pct: marginPct,
      started_at: (r.first_payment_date ?? r.created_at) as string | null,
    }
  })

  // Current-month MRR from customer_revenue (or fall back to sum of customers.mrr)
  const monthlyRevSum = (monthlyRevData ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const currentMRR = monthlyRevSum > 0
    ? monthlyRevSum
    : customers.filter((c) => c.status === 'active').reduce((s, c) => s + c.mrr_cad, 0)

  const activeCustomers = customers.filter((c) => c.status === 'active')
  const avgRevPerCustomer = activeCustomers.length > 0
    ? currentMRR / activeCustomers.length
    : 0

  // Per-tier aggregation
  const tiers = (tierData ?? []).map((t) => {
    const r = t as Record<string, unknown>
    const id = r.id as string
    const members = activeCustomers.filter((c) => c.tier_id === id)
    const tierMRR = members.reduce((s, c) => s + c.mrr_cad, 0)
    const avgMargin = members.length > 0
      ? Math.round(members.reduce((s, c) => s + (c.margin_pct ?? 0), 0) / members.length)
      : null
    const top3 = members.slice(0, 3)
    return {
      id,
      name: r.name as string,
      count: members.length,
      total_mrr: tierMRR,
      avg_margin: avgMargin,
      top_customers: top3.map((c) => ({ name: c.name, mrr: c.mrr_cad })),
    }
  }).filter((t) => t.count > 0)

  // 12-month trend from customer_revenue
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10)
  const { data: trendData } = await supabase
    .from('customer_revenue')
    .select('period, amount')
    .gte('period', twelveMonthsAgo)
    .order('period')

  const trendByMonth = new Map<string, number>()
  for (const r of trendData ?? []) {
    const key = (r.period as string).slice(0, 7)
    trendByMonth.set(key, (trendByMonth.get(key) ?? 0) + Number(r.amount ?? 0))
  }
  const trend = Array.from(trendByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, mrr]) => ({ month, mrr }))

  return (
    <CustomerRevenueView
      customers={customers}
      kpis={{ mrr: currentMRR, arr: currentMRR * 12, activeCount: activeCustomers.length, avgRevPerCustomer }}
      tiers={tiers}
      trend={trend}
    />
  )
}
