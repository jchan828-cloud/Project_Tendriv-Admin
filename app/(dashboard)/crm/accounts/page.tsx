import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { AccountsView } from '@/components/crm/accounts-view'

export default async function AccountsPage() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = await createServiceRoleClient()

  const { data } = await supabase
    .from('abm_accounts')
    .select(`
      id, name, organisation_type, province, naics_codes,
      annual_procurement_value_cad, updated_at,
      abm_account_contacts ( contact_id )
    `)
    .order('annual_procurement_value_cad', { ascending: false, nullsFirst: false })

  // Collect all contact IDs across all accounts for activity lookup
  const allContactIds = (data ?? []).flatMap(
    (a) => (a.abm_account_contacts as { contact_id: string }[]).map((r) => r.contact_id)
  )

  const { data: recentActivity } = allContactIds.length > 0
    ? await supabase
        .from('outreach_activity_log')
        .select('contact_id, occurred_at')
        .in('contact_id', allContactIds)
        .order('occurred_at', { ascending: false })
        .limit(2000)
    : { data: [] }

  // Map contact_id → most recent occurred_at (first row per contact, already sorted DESC)
  const contactLastActivity = new Map<string, string>()
  for (const row of (recentActivity ?? [])) {
    const cid = row.contact_id as string
    if (!contactLastActivity.has(cid)) contactLastActivity.set(cid, row.occurred_at as string)
  }

  const accounts = (data ?? []).map((a) => {
    const contacts = (a.abm_account_contacts as { contact_id: string }[])
    // Last activity = max occurred_at across all linked contacts
    const lastActivity = contacts.reduce<string | null>((best, r) => {
      const t = contactLastActivity.get(r.contact_id) ?? null
      if (!t) return best
      if (!best) return t
      return t > best ? t : best
    }, null)
    return {
      id: a.id as string,
      name: a.name as string,
      organisation_type: a.organisation_type as string,
      province: (a.province ?? null) as string | null,
      naics_codes: (a.naics_codes ?? []) as string[],
      annual_procurement_value_cad: (a.annual_procurement_value_cad ?? null) as number | null,
      updated_at: a.updated_at as string,
      contact_count: contacts.length,
      last_activity_at: lastActivity,
    }
  })

  return <AccountsView accounts={accounts} />
}
