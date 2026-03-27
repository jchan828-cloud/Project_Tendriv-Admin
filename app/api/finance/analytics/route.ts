/**
 * Finance analytics — top spend, CAC, margins, tier profitability, usage breakdown
 * All computed server-side from finance_transactions, customers, customer_revenue,
 * service_usage, and billing_accounts tables.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const url = new URL(request.url)
  const period = url.searchParams.get('period') ?? 'current' // current | all | YYYY-MM

  const now = new Date()
  let dateFrom: string
  let dateTo: string

  if (period === 'all') {
    dateFrom = '2000-01-01'
    dateTo = '2099-12-31'
  } else if (/^\d{4}-\d{2}$/.test(period)) {
    const parts = period.split('-').map(Number)
    const y = parts[0] ?? 2026
    const m = parts[1] ?? 1
    dateFrom = `${y}-${String(m).padStart(2, '0')}-01`
    dateTo = new Date(y, m, 0).toISOString().slice(0, 10)
  } else {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  }

  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

  // Parallel fetch all data
  const [
    { data: transactions },
    { data: customers },
    { data: tiers },
    { data: revenue },
    { data: usage },
    { data: billingAccounts },
    { data: expenseMappings },
  ] = await Promise.all([
    supabase.from('finance_transactions').select('*').gte('transaction_date', dateFrom).lte('transaction_date', dateTo),
    supabase.from('customers').select('*, customer_tiers(name, monthly_price)'),
    supabase.from('customer_tiers').select('*').order('display_order'),
    supabase.from('customer_revenue').select('*').gte('period', dateFrom).lte('period', dateTo),
    supabase.from('service_usage').select('*').gte('period', periodStart),
    supabase.from('billing_accounts').select('*').eq('status', 'active'),
    supabase.from('expense_service_mapping').select('*'),
  ])

  const txRows = (transactions ?? []) as Record<string, unknown>[]
  const customerRows = (customers ?? []) as Record<string, unknown>[]
  const tierRows = (tiers ?? []) as Record<string, unknown>[]
  const revenueRows = (revenue ?? []) as Record<string, unknown>[]
  const usageRows = (usage ?? []) as Record<string, unknown>[]
  const billingRows = (billingAccounts ?? []) as Record<string, unknown>[]
  const mappingRows = (expenseMappings ?? []) as Record<string, unknown>[]

  // ── 1. TOP SPEND BY SUPPLIER ──────────────────────────────
  const supplierSpend: Record<string, number> = {}
  const categorySpend: Record<string, number> = {}
  let totalExpenses = 0
  let totalIncome = 0

  for (const tx of txRows) {
    const amount = Number(tx.amount ?? 0)
    if (tx.type === 'expense') {
      totalExpenses += amount
      const vendor = (tx.vendor as string) ?? 'Unknown'
      supplierSpend[vendor] = (supplierSpend[vendor] ?? 0) + amount
      const cat = (tx.category as string) ?? 'other'
      categorySpend[cat] = (categorySpend[cat] ?? 0) + amount
    } else {
      totalIncome += amount
    }
  }

  const topSuppliers = Object.entries(supplierSpend)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({ name, amount, pct: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0 }))

  const topCategories = Object.entries(categorySpend)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({ name, amount, pct: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0 }))

  // Monthly billing burn
  const monthlyBurn = billingRows.reduce((sum, a) => {
    const cost = Number(a.monthly_cost ?? 0)
    if (a.billing_cycle === 'yearly') return sum + cost / 12
    return sum + cost
  }, 0)

  // ── 2. CUSTOMER ACQUISITION COST (CAC) ────────────────────
  const activeCustomers = customerRows.filter((c) => c.status === 'active')
  const totalAcquisitionCost = customerRows.reduce((sum, c) => sum + Number(c.acquisition_cost ?? 0), 0)
  const avgCac = activeCustomers.length > 0 ? totalAcquisitionCost / customerRows.length : 0

  // CAC by channel
  const cacByChannel: Record<string, { count: number; totalCost: number; totalMrr: number }> = {}
  for (const c of customerRows) {
    const channel = (c.acquisition_channel as string) ?? 'unknown'
    if (!cacByChannel[channel]) cacByChannel[channel] = { count: 0, totalCost: 0, totalMrr: 0 }
    cacByChannel[channel].count++
    cacByChannel[channel].totalCost += Number(c.acquisition_cost ?? 0)
    cacByChannel[channel].totalMrr += Number(c.mrr ?? 0)
  }

  const channelMetrics = Object.entries(cacByChannel).map(([channel, data]) => ({
    channel,
    customers: data.count,
    avgCac: data.count > 0 ? data.totalCost / data.count : 0,
    totalMrr: data.totalMrr,
    ltv: data.totalMrr > 0 ? (data.totalMrr * 12) : 0, // simple 12-month LTV
    ltvCacRatio: data.totalCost > 0 ? (data.totalMrr * 12) / (data.totalCost / data.count) : 0,
  }))

  // ── 3. MARGINS ────────────────────────────────────────────
  const totalMrr = activeCustomers.reduce((sum, c) => sum + Number(c.mrr ?? 0), 0)
  const totalRevenue = revenueRows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0) || totalMrr
  const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0

  // COGS vs OpEx split using expense mappings
  const cogsVendors = new Set(mappingRows.filter((m) => m.cost_type === 'cogs').map((m) => m.vendor as string))
  let totalCogs = 0
  let totalOpex = 0
  for (const tx of txRows) {
    if (tx.type !== 'expense') continue
    const amount = Number(tx.amount ?? 0)
    if (cogsVendors.has(tx.vendor as string)) {
      totalCogs += amount
    } else {
      totalOpex += amount
    }
  }
  const grossMarginAfterCogs = totalRevenue > 0 ? ((totalRevenue - totalCogs) / totalRevenue) * 100 : 0

  // ── 4. PROFITABILITY BY CUSTOMER TIER ─────────────────────
  const tierMap = new Map(tierRows.map((t) => [t.id as string, t]))

  const tierProfitability: Record<string, {
    tierName: string; customerCount: number; totalMrr: number;
    avgMrr: number; totalRevenue: number; allocatedCost: number;
    profit: number; margin: number;
  }> = {}

  for (const tier of tierRows) {
    const tierId = tier.id as string
    const tierName = tier.name as string
    const tierCustomers = customerRows.filter((c) => c.tier_id === tierId)
    const tierMrr = tierCustomers.reduce((sum, c) => sum + Number(c.mrr ?? 0), 0)
    const tierRevenue = revenueRows
      .filter((r) => tierCustomers.some((c) => (c.id as string) === r.customer_id))
      .reduce((sum, r) => sum + Number(r.amount ?? 0), 0) || tierMrr

    // Allocate costs proportionally by MRR share
    const mrrShare = totalMrr > 0 ? tierMrr / totalMrr : 0
    const allocatedCost = totalExpenses * mrrShare
    const profit = tierRevenue - allocatedCost

    tierProfitability[tierId] = {
      tierName,
      customerCount: tierCustomers.length,
      totalMrr: tierMrr,
      avgMrr: tierCustomers.length > 0 ? tierMrr / tierCustomers.length : 0,
      totalRevenue: tierRevenue,
      allocatedCost,
      profit,
      margin: tierRevenue > 0 ? (profit / tierRevenue) * 100 : 0,
    }
  }

  // ── 5. USAGE BY CUSTOMER TIER ─────────────────────────────
  const servicesByTier: Record<string, Record<string, { quantity: number; cost: number; customerCount: number }>> = {}

  for (const u of usageRows) {
    const customerId = u.customer_id as string
    const customer = customerRows.find((c) => (c.id as string) === customerId)
    if (!customer) continue
    const tierId = (customer.tier_id as string) ?? 'none'
    const tier = tierMap.get(tierId)
    const tierName = tier ? (tier.name as string) : 'No Tier'
    const serviceName = u.service_name as string

    if (!servicesByTier[tierName]) servicesByTier[tierName] = {}
    if (!servicesByTier[tierName][serviceName]) servicesByTier[tierName][serviceName] = { quantity: 0, cost: 0, customerCount: 0 }

    servicesByTier[tierName][serviceName].quantity += Number(u.quantity ?? 0)
    servicesByTier[tierName][serviceName].cost += Number(u.cost_allocated ?? 0)
  }

  // Count unique customers per tier per service
  const tierServiceCustomers: Record<string, Record<string, Set<string>>> = {}
  for (const u of usageRows) {
    const customerId = u.customer_id as string
    const customer = customerRows.find((c) => (c.id as string) === customerId)
    if (!customer) continue
    const tierId = (customer.tier_id as string) ?? 'none'
    const tier = tierMap.get(tierId)
    const tierName = tier ? (tier.name as string) : 'No Tier'
    const serviceName = u.service_name as string

    if (!tierServiceCustomers[tierName]) tierServiceCustomers[tierName] = {}
    if (!tierServiceCustomers[tierName][serviceName]) tierServiceCustomers[tierName][serviceName] = new Set()
    tierServiceCustomers[tierName][serviceName].add(customerId)
  }

  // Merge customer counts
  for (const [tierName, services] of Object.entries(tierServiceCustomers)) {
    for (const [svc, customers_set] of Object.entries(services)) {
      if (servicesByTier[tierName]?.[svc]) {
        servicesByTier[tierName][svc].customerCount = customers_set.size
      }
    }
  }

  // Global service usage totals
  const globalServiceUsage: Record<string, { quantity: number; cost: number; customerCount: number }> = {}
  for (const u of usageRows) {
    const svc = u.service_name as string
    if (!globalServiceUsage[svc]) globalServiceUsage[svc] = { quantity: 0, cost: 0, customerCount: 0 }
    globalServiceUsage[svc].quantity += Number(u.quantity ?? 0)
    globalServiceUsage[svc].cost += Number(u.cost_allocated ?? 0)
  }
  // Count unique customers per service globally
  const globalServiceCustomers: Record<string, Set<string>> = {}
  for (const u of usageRows) {
    const svc = u.service_name as string
    if (!globalServiceCustomers[svc]) globalServiceCustomers[svc] = new Set()
    globalServiceCustomers[svc].add(u.customer_id as string)
  }
  for (const [svc, customers_set] of Object.entries(globalServiceCustomers)) {
    if (globalServiceUsage[svc]) globalServiceUsage[svc].customerCount = customers_set.size
  }

  return NextResponse.json({
    period: { from: dateFrom, to: dateTo },
    topSpend: { bySupplier: topSuppliers, byCategory: topCategories, monthlyBurn },
    acquisition: { avgCac, totalAcquisitionCost, totalCustomers: customerRows.length, byChannel: channelMetrics },
    margins: {
      totalRevenue, totalExpenses, totalCogs, totalOpex,
      grossMargin: Math.round(grossMargin * 10) / 10,
      grossMarginAfterCogs: Math.round(grossMarginAfterCogs * 10) / 10,
      netMargin: Math.round(grossMargin * 10) / 10,
      totalMrr, monthlyBurn,
    },
    tierProfitability: Object.values(tierProfitability),
    usage: { byTier: servicesByTier, global: globalServiceUsage },
    summary: {
      activeCustomers: activeCustomers.length,
      totalMrr,
      arr: totalMrr * 12,
    },
  })
}
