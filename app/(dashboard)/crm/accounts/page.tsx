/** MK8-CRM-003: ABM account map page */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { AccountMap } from '@/components/crm/account-map'

export default async function AccountsPage() {
  const supabase = await createServiceRoleClient()

  const { data } = await supabase
    .from('abm_accounts')
    .select('id, name, organisation_type, province, naics_codes, website, annual_procurement_value_cad')
    .order('name')

  return (
    <div>
      <h1 className="text-heading-lg mb-6">ABM Accounts</h1>
      <AccountMap accounts={data ?? []} />
    </div>
  )
}
