import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/roles'
import { Shell } from '@/components/layout/shell'

export default async function DashboardLayout({ children }: { readonly children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const roleRecord = user
    ? await getUserRole(supabase, user.id)
    : { role: 'admin' as const, modules: ['content', 'analytics', 'crm', 'sales', 'finance', 'feedback', 'system'] as const }

  return (
    <div className="shell">
      <Shell email={user?.email} role={roleRecord.role} modules={[...roleRecord.modules]}>
        {children}
      </Shell>
    </div>
  )
}
