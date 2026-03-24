'use client'

/** MK8-ANL-004: Funnel visualisation — horizontal bar chart */

import { useRef, useEffect } from 'react'

interface FunnelStage {
  label: string
  count: number
  conversionRate: number
  color: string
  topPosts: string[]
}

interface FunnelChartProps {
  stages: FunnelStage[]
}

const bgColorClass: Record<string, string> = {
  jade: 'bg-[var(--jade)]',
  blue: 'bg-[var(--blue)]',
  amber: 'bg-[var(--amber)]',
  green: 'bg-[var(--green)]',
}

function FunnelBar({ widthPct, color }: { widthPct: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.style.width = `${widthPct}%`
  }, [widthPct])
  return <div ref={ref} className={`h-8 rounded transition-all ${bgColorClass[color] ?? bgColorClass.jade}`} />
}

export function FunnelChart({ stages }: FunnelChartProps) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1)

  return (
    <div className="space-y-4">
      {stages.map((stage, i) => {
        const widthPct = maxCount > 0 ? Math.max(2, (stage.count / maxCount) * 100) : 2
        return (
          <div key={stage.label}>
            <div className="flex items-center gap-4">
              <span className="text-label-sm w-[130px] flex-shrink-0">{stage.label}</span>
              <div className="flex-1">
                <FunnelBar widthPct={widthPct} color={stage.color} />
              </div>
              <div className="flex-shrink-0 text-right w-[120px]">
                <span className="text-data-sm">{stage.count.toLocaleString()}</span>
                {i > 0 && (
                  <span className="text-mono-xs text-[var(--text-muted)] ml-2">
                    {stage.conversionRate.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            {stage.topPosts.length > 0 && (
              <div className="ml-[146px] mt-1 flex flex-wrap gap-1">
                {stage.topPosts.map((title) => (
                  <span key={title} className="badge badge-neutral truncate max-w-[200px]">{title}</span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
