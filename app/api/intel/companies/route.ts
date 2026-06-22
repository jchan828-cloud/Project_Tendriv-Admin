import { NextResponse, type NextRequest } from 'next/server'
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server'
import type { IntelCompany } from '@/lib/types/intel'

/**
 * B2B-INTEL-001 — List enriched companies from the warehouse.
 *
 * GET /api/intel/companies?province=&naics=&q=&limit=
 * OAuth-protected.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const province = searchParams.get('province')
  const naics = searchParams.get('naics')
  const q = searchParams.get('q')
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200)

  const service = await createServiceRoleClient()
  let query = service
    .from('intel_companies')
    .select(
      'id, place_id, name, website, formatted_address, phone, business_status, city, province, iso_3166_2, naics_code, naics_title, employee_estimate, estimated_revenue_cad, pipeline_stage, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (province) query = query.eq('province', province)
  if (naics) query = query.eq('naics_code', naics)
  if (q) query = query.ilike('name', `%${q}%`)

  const { data, error } = await query.returns<Partial<IntelCompany>[]>()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ companies: data ?? [] })
}
