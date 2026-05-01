import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/roles'
import { Topbar } from '@/components/layout/topbar'
import { ResizableShell } from '@/components/layout/resizable-shell'

export default async function DashboardLayout({ children }: { readonly children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const roleRecord = user
    ? await getUserRole(supabase, user.id)
    : { role: 'admin' as const, modules: ['content', 'analytics', 'crm', 'sales', 'finance', 'feedback', 'system'] as const }

  return (
    <div className="shell">
      <Topbar email={user?.email} role={roleRecord.role} />
      <ResizableShell modules={[...roleRecord.modules]} role={roleRecord.role}>
        {children}
      </ResizableShell>
    </div>
  )
}
