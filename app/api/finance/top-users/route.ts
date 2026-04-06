/**
 * Top users API — ranks subscribers by revenue, usage volume, and flags abuse.
 * Pulls from customers, customer_revenue, and service_usage tables.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const url = new URL(request.url)
  const period = url.searchParams.get('period') ?? 'current'

  const now = new Date()
  const periodStart = period === 'all'
    ? '2000-01-01'
    : new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

  // Fetch all data in parallel
  const [
    { data: customers },
    { data: revenue },
    { data: usage },
    { data: tiers },
  ] = await Promise.all([
    supabase.from('customers').select('*, customer_tiers(name, monthly_price)'),
    supabase.from('customer_revenue').select('*').gte('period', periodStart),
    supabase.from('service_usage').select('*').gte('period', periodStart),
    supabase.from('customer_tiers').select('*').order('display_order'),
  ])

  const customerRows = (customers ?? []) as Record<string, unknown>[]
  const revenueRows = (revenue ?? []) as Record<string, unknown>[]
  const usageRows = (usage ?? []) as Record<string, unknown>[]
  const tierMap = new Map((tiers ?? []).map((t) => [(t as Record<string, unknown>).id as string, t as Record<string, unknown>]))

  // --- Build per-customer aggregates ---
  const customerStats: Record<string, {
    id: string; name: string; email: string | null; tier: string; status: string;
    mrr: number; totalRevenue: number; totalUsage: number; totalCost: number;
    serviceBreakdown: Record<string, { quantity: number; cost: number }>;
    revenueHistory: { period: string; amount: number }[];
  }> = {}

  // Initialize from customer list
  for (const c of customerRows) {
    const tier = c.customer_tiers as Record<string, unknown> | null
    customerStats[c.id as string] = {
      id: c.id as string,
      name: c.name as string,
      email: (c.email as string) ?? null,
      tier: tier ? (tier.name as string) : 'No Tier',
      status: c.status as string,
      mrr: Number(c.mrr ?? 0),
      totalRevenue: 0,
      totalUsage: 0,
      totalCost: 0,
      serviceBreakdown: {},
      revenueHistory: [],
    }
  }

  // Aggregate revenue
  for (const r of revenueRows) {
    const cid = r.customer_id as string
    if (!customerStats[cid]) continue
    const amount = Number(r.amount ?? 0)
    customerStats[cid].totalRevenue += amount
    customerStats[cid].revenueHistory.push({
      period: r.period as string,
      amount,
    })
  }

  // For customers with no revenue records, use MRR as estimate
  for (const cid of Object.keys(customerStats)) {
    const cs = customerStats[cid]
    if (cs && cs.totalRevenue === 0) {
      cs.totalRevenue = cs.mrr
    }
  }

  // Aggregate usage
  for (const u of usageRows) {
    const cid = u.customer_id as string
    if (!customerStats[cid]) continue
    const service = u.service_name as string
    const quantity = Number(u.quantity ?? 0)
    const cost = Number(u.cost_allocated ?? 0)

    customerStats[cid].totalUsage += quantity
    customerStats[cid].totalCost += cost

    if (!customerStats[cid].serviceBreakdown[service]) {
      customerStats[cid].serviceBreakdown[service] = { quantity: 0, cost: 0 }
    }
    customerStats[cid].serviceBreakdown[service].quantity += quantity
    customerStats[cid].serviceBreakdown[service].cost += cost
  }

  const allCustomers = Object.values(customerStats)

  // --- Rankings ---
  const byRevenue = [...allCustomers].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 25)
  const byVolume = [...allCustomers].sort((a, b) => b.totalUsage - a.totalUsage).slice(0, 25)
  const byCost = [...allCustomers].sort((a, b) => b.totalCost - a.totalCost).slice(0, 25)

  // --- Abuse / Outlier Detection ---
  // Flag subscribers whose usage is >3x the average for their tier
  const tierAverages: Record<string, { avgUsage: number; avgCost: number; count: number }> = {}
  for (const c of allCustomers) {
    if (c.status !== 'active') continue
    if (!tierAverages[c.tier]) tierAverages[c.tier] = { avgUsage: 0, avgCost: 0, count: 0 }
    const ta = tierAverages[c.tier]!
    ta.avgUsage += c.totalUsage
    ta.avgCost += c.totalCost
    ta.count++
  }
  for (const tier of Object.keys(tierAverages)) {
    const t = tierAverages[tier]!
    if (t.count > 0) {
      t.avgUsage /= t.count
      t.avgCost /= t.count
    }
  }

  const abuseFlagged = allCustomers.filter((c) => {
    if (c.status !== 'active') return false
    const avg = tierAverages[c.tier]
    if (!avg || avg.avgUsage === 0) return false
    return c.totalUsage > avg.avgUsage * 3 || c.totalCost > avg.avgCost * 3
  }).map((c) => {
    const avg = tierAverages[c.tier]
    return {
      ...c,
      usageMultiple: avg ? Math.round((c.totalUsage / avg.avgUsage) * 10) / 10 : 0,
      costMultiple: avg ? Math.round((c.totalCost / avg.avgCost) * 10) / 10 : 0,
      tierAvgUsage: avg?.avgUsage ?? 0,
      tierAvgCost: avg?.avgCost ?? 0,
    }
  }).sort((a, b) => b.usageMultiple - a.usageMultiple)

  // --- Profitability per customer ---
  const profitability = allCustomers
    .filter((c) => c.totalRevenue > 0 || c.totalCost > 0)
    .map((c) => ({
      ...c,
      profit: c.totalRevenue - c.totalCost,
      margin: c.totalRevenue > 0 ? ((c.totalRevenue - c.totalCost) / c.totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.profit - a.profit)

  // --- Summary ---
  const totalRevenue = allCustomers.reduce((s, c) => s + c.totalRevenue, 0)
  const totalCost = allCustomers.reduce((s, c) => s + c.totalCost, 0)
  const activeCount = allCustomers.filter((c) => c.status === 'active').length

  // Revenue concentration: top 20% of customers by revenue
  const top20pct = Math.max(1, Math.ceil(allCustomers.length * 0.2))
  const top20Revenue = byRevenue.slice(0, top20pct).reduce((s, c) => s + c.totalRevenue, 0)
  const revenueConcentration = totalRevenue > 0 ? (top20Revenue / totalRevenue) * 100 : 0

  return NextResponse.json({
    summary: {
      totalSubscribers: allCustomers.length,
      activeSubscribers: activeCount,
      totalRevenue,
      totalCost,
      revenueConcentration: Math.round(revenueConcentration),
      abuseFlaggedCount: abuseFlagged.length,
    },
    topByRevenue: byRevenue,
    topByVolume: byVolume,
    topByCost: byCost,
    abuseFlagged,
    profitability: profitability.slice(0, 25),
    tierAverages,
  })
}
