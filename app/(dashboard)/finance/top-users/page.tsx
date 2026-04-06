/** Top users — revenue, volume, abuse detection */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopUsersClient } from '@/components/finance/top-users-client'

export default async function TopUsersPage() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="text-heading-xl" style={{ marginBottom: 4 }}>Top Users</h1>
        <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
          Identify your highest-value subscribers, heaviest platform users, and flag potential abuse.
        </p>
      </div>
      <TopUsersClient />
    </div>
  )
}
