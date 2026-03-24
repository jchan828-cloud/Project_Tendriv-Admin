/** MK8-ANL-003: Per-post analytics card */

interface PostStats {
  id: string
  title: string
  is_gated: boolean
  views: number
  avgScrollDepth: number
  ctaClickRate: number
  utmSources: string[]
  firstTouchCount: number
  lastTouchCount: number
  gateConversion: number
}

interface PostStatsCardProps {
  stats: PostStats
}

export function PostStatsCard({ stats }: PostStatsCardProps) {
  return (
    <div className="card p-4">
      <h3 className="text-heading-sm mb-3 truncate">{stats.title}</h3>
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Views" value={String(stats.views)} />
        <Metric label="Avg Scroll" value={`${stats.avgScrollDepth.toFixed(0)}%`} />
        <Metric label="CTA Rate" value={`${stats.ctaClickRate.toFixed(1)}%`} />
        <Metric label="First Touch" value={String(stats.firstTouchCount)} />
        <Metric label="Last Touch" value={String(stats.lastTouchCount)} />
        {stats.is_gated && (
          <Metric label="Gate Conv" value={`${stats.gateConversion.toFixed(1)}%`} />
        )}
      </div>
      {stats.utmSources.length > 0 && (
        <div className="mt-3">
          <span className="text-label-sm block mb-1">Top UTM Sources</span>
          <div className="flex flex-wrap gap-1">
            {stats.utmSources.map((src) => (
              <span key={src} className="badge badge-neutral">{src}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-label-sm block text-[var(--text-label)]">{label}</span>
      <span className="text-data-md">{value}</span>
    </div>
  )
}
