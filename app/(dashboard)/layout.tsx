import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/roles'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { ResizableShell } from '@/components/layout/resizable-shell'

export default async function DashboardLayout({ children }: { readonly children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const role = user
    ? await getUserRole(supabase, user.id)
    : { role: 'admin' as const, modules: ['content', 'analytics', 'crm', 'system'] as const }

  return (
    <div className="shell">
      <Topbar email={user?.email} />
      <ResizableShell sidebar={<Sidebar modules={[...role.modules]} role={role.role} />}>
        {children}
      </ResizableShell>
    </div>
  )
}
