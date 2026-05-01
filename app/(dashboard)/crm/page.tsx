import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { ProspectsView } from '@/components/crm/prospects-view'

export default async function ProspectsPage() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = await createServiceRoleClient()

  const [{ data: contacts }, { data: scores }] = await Promise.all([
    supabase
      .from('outreach_contacts')
      .select('id, business_name, contact_email, pipeline, status, last_activity_at, casl_consent_date')
      .order('last_activity_at', { ascending: false, nullsFirst: false }),
    supabase
      .from('lead_scores')
      .select('contact_id, score'),
  ])

  const scoreMap = new Map<string, number>(
    (scores ?? []).map((s) => [s.contact_id as string, s.score as number])
  )

  const prospects = (contacts ?? []).map((c) => ({
    id: c.id as string,
    business_name: c.business_name as string,
    contact_email: (c.contact_email ?? null) as string | null,
    pipeline: c.pipeline as string,
    status: c.status as string,
    last_activity_at: (c.last_activity_at ?? null) as string | null,
    casl_consent_date: (c.casl_consent_date ?? null) as string | null,
    score: scoreMap.get(c.id as string) ?? null,
  }))

  return <ProspectsView prospects={prospects} />
}
