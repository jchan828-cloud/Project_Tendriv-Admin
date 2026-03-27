/** Finance summary — aggregated income/expense/net for dashboard KPIs */

import { NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()

  // Current month boundaries
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

  // Previous month boundaries
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)

  // All-time totals
  const { data: allTx } = await supabase
    .from('finance_transactions')
    .select('type, amount')

  // Current month
  const { data: currentTx } = await supabase
    .from('finance_transactions')
    .select('type, amount, category, vendor')
    .gte('transaction_date', monthStart)
    .lte('transaction_date', monthEnd)

  // Previous month
  const { data: prevTx } = await supabase
    .from('finance_transactions')
    .select('type, amount')
    .gte('transaction_date', prevMonthStart)
    .lte('transaction_date', prevMonthEnd)

  // Monthly recurring costs
  const { data: recurringTx } = await supabase
    .from('finance_transactions')
    .select('type, amount, vendor, category')
    .eq('recurring', true)

  // Billing accounts
  const { data: billingAccounts } = await supabase
    .from('billing_accounts')
    .select('service_name, monthly_cost, status, billing_cycle')
    .eq('status', 'active')

  function sumByType(rows: { type: string; amount: number }[] | null, type: string): number {
    return (rows ?? []).filter((r) => r.type === type).reduce((sum, r) => sum + Number(r.amount), 0)
  }

  const allIncome = sumByType(allTx, 'income')
  const allExpenses = sumByType(allTx, 'expense')
  const currentIncome = sumByType(currentTx, 'income')
  const currentExpenses = sumByType(currentTx, 'expense')
  const prevIncome = sumByType(prevTx, 'income')
  const prevExpenses = sumByType(prevTx, 'expense')
  const recurringExpenses = sumByType(recurringTx, 'expense')

  // Monthly estimated from billing accounts
  const estimatedMonthlyFromBilling = (billingAccounts ?? []).reduce((sum, a) => {
    if (a.billing_cycle === 'yearly') return sum + Number(a.monthly_cost) / 12
    return sum + Number(a.monthly_cost)
  }, 0)

  // Expense breakdown by category (current month)
  const categoryBreakdown: Record<string, number> = {}
  for (const tx of currentTx ?? []) {
    if (tx.type === 'expense') {
      const cat = tx.category ?? 'other'
      categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + Number(tx.amount)
    }
  }

  // Expense breakdown by vendor (current month)
  const vendorBreakdown: Record<string, number> = {}
  for (const tx of currentTx ?? []) {
    if (tx.type === 'expense' && tx.vendor) {
      vendorBreakdown[tx.vendor] = (vendorBreakdown[tx.vendor] ?? 0) + Number(tx.amount)
    }
  }

  return NextResponse.json({
    allTime: { income: allIncome, expenses: allExpenses, net: allIncome - allExpenses },
    currentMonth: { income: currentIncome, expenses: currentExpenses, net: currentIncome - currentExpenses },
    previousMonth: { income: prevIncome, expenses: prevExpenses, net: prevIncome - prevExpenses },
    recurring: { monthlyExpenses: recurringExpenses, estimatedBilling: estimatedMonthlyFromBilling },
    categoryBreakdown,
    vendorBreakdown,
    activeBillingAccounts: (billingAccounts ?? []).length,
  })
}
