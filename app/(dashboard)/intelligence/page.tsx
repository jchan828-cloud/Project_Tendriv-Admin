import { redirect } from 'next/navigation'
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server'
import { IntelligenceView } from '@/components/intel/intelligence-view'
import type { IntelCompany, IntelPipelineRun } from '@/lib/types/intel'

export const dynamic = 'force-dynamic'

export default async function IntelligencePage() {
  const authClient = await createServerSupabaseClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = await createServiceRoleClient()

  const [{ data: runs }, { data: companies }] = await Promise.all([
    supabase
      .from('intel_pipeline_runs')
      .select(
        'id, query, status, seeds_found, companies_stored, contacts_extracted, technographics_extracted, cost_estimate_cad, error, created_at, finished_at',
      )
      .order('created_at', { ascending: false })
      .limit(15)
      .returns<Partial<IntelPipelineRun>[]>(),
    supabase
      .from('intel_companies')
      .select(
        'id, name, website, phone, city, province, naics_code, naics_title, estimated_revenue_cad, pipeline_stage, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(200)
      .returns<Partial<IntelCompany>[]>(),
  ])

  return (
    <IntelligenceView runs={runs ?? []} companies={companies ?? []} />
  )
}
