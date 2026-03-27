/** Finance overview — income, expenses, net, billing, tech stack costs */

import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FinanceKpis } from '@/components/finance/finance-kpis'
import { ExpenseBreakdown } from '@/components/finance/expense-breakdown'
import { TransactionList } from '@/components/finance/transaction-list'
import { BillingOverview } from '@/components/finance/billing-overview'

export default async function FinancePage() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = await createServiceRoleClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)

  const [
    { data: allTx },
    { data: currentMonthTx },
    { data: prevMonthTx },
    { data: recentTx },
    { data: billingAccounts },
  ] = await Promise.all([
    supabase.from('finance_transactions').select('type, amount'),
    supabase.from('finance_transactions').select('type, amount, category, vendor').gte('transaction_date', monthStart).lte('transaction_date', monthEnd),
    supabase.from('finance_transactions').select('type, amount').gte('transaction_date', prevMonthStart).lte('transaction_date', prevMonthEnd),
    supabase.from('finance_transactions').select('*').order('transaction_date', { ascending: false }).limit(25),
    supabase.from('billing_accounts').select('*').order('service_name'),
  ])

  function sumByType(rows: Record<string, unknown>[] | null, type: string): number {
    return (rows ?? []).filter((r) => r.type === type).reduce((sum, r) => sum + Number(r.amount ?? 0), 0)
  }

  const allIncome = sumByType(allTx, 'income')
  const allExpenses = sumByType(allTx, 'expense')
  const currentIncome = sumByType(currentMonthTx, 'income')
  const currentExpenses = sumByType(currentMonthTx, 'expense')
  const prevIncome = sumByType(prevMonthTx, 'income')
  const prevExpenses = sumByType(prevMonthTx, 'expense')

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {}
  const vendorBreakdown: Record<string, number> = {}
  for (const tx of currentMonthTx ?? []) {
    if (tx.type === 'expense') {
      const cat = (tx.category as string) ?? 'other'
      categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + Number(tx.amount)
      if (tx.vendor) {
        const v = tx.vendor as string
        vendorBreakdown[v] = (vendorBreakdown[v] ?? 0) + Number(tx.amount)
      }
    }
  }

  // Estimated monthly from billing
  const estimatedMonthly = (billingAccounts ?? []).reduce((sum, a) => {
    if ((a as Record<string, unknown>).status !== 'active') return sum
    const cost = Number((a as Record<string, unknown>).monthly_cost ?? 0)
    if ((a as Record<string, unknown>).billing_cycle === 'yearly') return sum + cost / 12
    return sum + cost
  }, 0)

  const monthName = now.toLocaleString('en-CA', { month: 'long', year: 'numeric' })

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="text-heading-xl" style={{ marginBottom: 4 }}>Finance</h1>
        <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
          Income, expenses, and service billing for {monthName}.
        </p>
      </div>

      <FinanceKpis
        allTimeIncome={allIncome}
        allTimeExpenses={allExpenses}
        currentIncome={currentIncome}
        currentExpenses={currentExpenses}
        prevIncome={prevIncome}
        prevExpenses={prevExpenses}
        estimatedMonthly={estimatedMonthly}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 28 }}>
        <ExpenseBreakdown categoryBreakdown={categoryBreakdown} vendorBreakdown={vendorBreakdown} />
        <BillingOverview accounts={
          (billingAccounts ?? []).map((a) => ({
            id: (a as Record<string, unknown>).id as string,
            service_name: (a as Record<string, unknown>).service_name as string,
            billing_email: (a as Record<string, unknown>).billing_email as string | null,
            plan_name: (a as Record<string, unknown>).plan_name as string | null,
            monthly_cost: Number((a as Record<string, unknown>).monthly_cost ?? 0),
            currency: (a as Record<string, unknown>).currency as string,
            billing_cycle: (a as Record<string, unknown>).billing_cycle as string | null,
            next_billing_date: (a as Record<string, unknown>).next_billing_date as string | null,
            status: (a as Record<string, unknown>).status as string,
            dashboard_url: (a as Record<string, unknown>).dashboard_url as string | null,
          }))
        } />
      </div>

      <div style={{ marginTop: 28 }}>
        <TransactionList transactions={
          (recentTx ?? []).map((t) => ({
            id: (t as Record<string, unknown>).id as string,
            type: (t as Record<string, unknown>).type as string,
            category: (t as Record<string, unknown>).category as string,
            vendor: (t as Record<string, unknown>).vendor as string | null,
            description: (t as Record<string, unknown>).description as string | null,
            amount: Number((t as Record<string, unknown>).amount ?? 0),
            currency: (t as Record<string, unknown>).currency as string,
            recurring: Boolean((t as Record<string, unknown>).recurring),
            transaction_date: (t as Record<string, unknown>).transaction_date as string,
            invoice_url: (t as Record<string, unknown>).invoice_url as string | null,
          }))
        } />
      </div>
    </div>
  )
}
