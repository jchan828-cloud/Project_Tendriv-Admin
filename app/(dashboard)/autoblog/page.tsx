import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { AutoblogPage } from '@/components/autoblog/autoblog-page'
import type { AutoblogRun, AutoblogSettings } from '@/lib/types/autoblog'

export default async function AutoblogServerPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = await createServiceRoleClient()

  const [{ data: runs }, { data: settings }] = await Promise.all([
    service.from('autoblog_runs').select('*').order('created_at', { ascending: false }).limit(50),
    service.from('autoblog_settings').select('*').eq('id', 1).single(),
  ])

  return (
    <AutoblogPage
      initialRuns={(runs ?? []) as AutoblogRun[]}
      initialSettings={settings as AutoblogSettings | null}
    />
  )
}
