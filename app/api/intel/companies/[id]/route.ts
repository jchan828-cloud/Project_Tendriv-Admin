import { NextResponse } from 'next/server'
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server'

/**
 * B2B-INTEL-001 — Full company profile (firmographics + contacts + tech stack).
 *
 * GET /api/intel/companies/[id]
 * OAuth-protected.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const service = await createServiceRoleClient()

  const { data: company, error: companyErr } = await service
    .from('intel_companies')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (companyErr) {
    return NextResponse.json({ error: companyErr.message }, { status: 500 })
  }
  if (!company) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const [{ data: contacts }, { data: technographics }] = await Promise.all([
    service
      .from('intel_contacts')
      .select('id, full_name, title, linkedin_url, source, confidence')
      .eq('company_id', id)
      .order('confidence', { ascending: false, nullsFirst: false }),
    service
      .from('intel_technographics')
      .select('id, tool_name, category, source, evidence_url')
      .eq('company_id', id)
      .order('tool_name', { ascending: true }),
  ])

  return NextResponse.json({
    company,
    contacts: contacts ?? [],
    technographics: technographics ?? [],
  })
}
