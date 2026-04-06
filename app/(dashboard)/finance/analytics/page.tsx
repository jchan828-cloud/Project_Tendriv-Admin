/** Finance analytics — spend, CAC, margins, tier profitability, usage */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FinanceAnalyticsClient } from '@/components/finance/finance-analytics-client'

export default async function FinanceAnalyticsPage() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="text-heading-xl" style={{ marginBottom: 4 }}>Financial Analytics</h1>
        <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
          Spend analysis, subscriber acquisition costs, margins, and tier profitability.
        </p>
      </div>
      <FinanceAnalyticsClient />
    </div>
  )
}
