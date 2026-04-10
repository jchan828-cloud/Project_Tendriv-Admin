/** Agency RFX Analytics — identifies which agencies issue the most procurement documents
 *  for building targeted marketing campaigns. */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { AgencyRankingTable } from '@/components/analytics/agency-ranking-table'
import { AgencyKpiStrip } from '@/components/analytics/agency-kpi-strip'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ range?: string; type?: string }>
}

export default async function AgencyAnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const range = params.range ?? '90d'
  const noticeType = params.type ?? 'all'

  const supabase = await createServiceRoleClient()

  const intervalDays: Record<string, number> = { '30d': 30, '90d': 90, '12m': 365, 'all': 36500 }
  const days = intervalDays[range] ?? 90
  const since = new Date(Date.now() - days * 86400_000).toISOString()

  let query = supabase
    .from('scout_notices')
    .select('id, agency, agency_canonical, notice_type, is_psib, is_acan, is_smb_stream, awarded_value_cad, estimated_value_cad, unspsc_segment, unspsc_family, region_province, closing_date, award_date, publication_date, created_at')
    .neq('agency', 'Unknown')
    .gte('created_at', since)

  if (noticeType === 'tender') query = query.eq('notice_type', 'tender')
  if (noticeType === 'award') query = query.eq('notice_type', 'award')

  const { data: notices } = await query
  const rows = notices ?? []

  const agencyMap = new Map<string, {
    name: string; tenders: number; awards: number; total: number;
    psibCount: number; acanCount: number; smbCount: number;
    totalAwardValue: number; awardValueCount: number;
    segments: Set<string>; provinces: Set<string>
  }>()

  for (const n of rows) {
    const name = n.agency_canonical || n.agency
    const existing = agencyMap.get(name) ?? {
      name, tenders: 0, awards: 0, total: 0, psibCount: 0, acanCount: 0, smbCount: 0,
      totalAwardValue: 0, awardValueCount: 0, segments: new Set<string>(), provinces: new Set<string>(),
    }
    existing.total++
    if (n.notice_type === 'tender') existing.tenders++
    if (n.notice_type === 'award') existing.awards++
    if (n.is_psib) existing.psibCount++
    if (n.is_acan) existing.acanCount++
    if (n.is_smb_stream) existing.smbCount++
    if (n.awarded_value_cad) {
      existing.totalAwardValue += Number(n.awarded_value_cad)
      existing.awardValueCount++
    }
    if (n.unspsc_segment) existing.segments.add(n.unspsc_segment)
    if (n.region_province) existing.provinces.add(n.region_province)
    agencyMap.set(name, existing)
  }

  const agencies = [...agencyMap.values()]
    .sort((a, b) => b.total - a.total)
    .map((a) => ({
      ...a,
      psibPct: a.total > 0 ? Math.round((a.psibCount / a.total) * 100) : 0,
      avgAwardValue: a.awardValueCount > 0 ? Math.round(a.totalAwardValue / a.awardValueCount) : null,
      segmentCount: a.segments.size,
      provinces: [...a.provinces],
    }))

  const totalNotices = rows.length
  const totalAgencies = agencies.length
  const totalTenders = rows.filter((n) => n.notice_type === 'tender').length
  const totalAwards = rows.filter((n) => n.notice_type === 'award').length
  const psibTotal = rows.filter((n) => n.is_psib).length
  const psibPct = totalNotices > 0 ? Math.round((psibTotal / totalNotices) * 100) : 0

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-heading-lg">Agency Procurement Analytics</h1>
          <p className="text-body-sm text-[var(--text-muted)] mt-1">
            Which agencies issue the most RFX documents — use this to target marketing campaigns.
          </p>
        </div>
        <div className="flex gap-2">
          {(['30d', '90d', '12m', 'all'] as const).map((r) => (
            <Link key={r} href={`/analytics/agencies?range=${r}&type=${noticeType}`}
              className={`btn-sm ${range === r ? 'btn-primary' : 'btn-secondary'}`}>
              {r === 'all' ? 'All' : r}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', 'tender', 'award'] as const).map((t) => (
          <Link key={t} href={`/analytics/agencies?range=${range}&type=${t}`}
            className={`btn-sm ${noticeType === t ? 'btn-primary' : 'btn-secondary'}`}>
            {t === 'all' ? 'All Notices' : t === 'tender' ? 'Tenders Only' : 'Awards Only'}
          </Link>
        ))}
      </div>

      <AgencyKpiStrip totalNotices={totalNotices} totalAgencies={totalAgencies}
        totalTenders={totalTenders} totalAwards={totalAwards} psibPct={psibPct} />

      <div className="mt-6">
        <AgencyRankingTable agencies={agencies} />
      </div>
    </div>
  )
}
