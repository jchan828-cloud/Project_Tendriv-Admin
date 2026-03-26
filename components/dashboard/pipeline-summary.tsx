'use client'

const STATUS_COLORS: Record<string, string> = {
  prospect: 'var(--blue)',
  contacted: 'var(--amber)',
  qualified: 'var(--jade)',
  unsubscribed: 'var(--text-label)',
  won: 'var(--green)',
  lost: 'var(--sovereign)',
}

interface PipelineSummaryProps {
  pipelines: Record<string, Record<string, number>>
}

export function PipelineSummary({ pipelines }: PipelineSummaryProps) {
  const pipelineNames = Object.keys(pipelines)

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div className="text-heading-sm">CRM Pipeline Breakdown</div>
      </div>
      <div style={{ padding: 20 }}>
        {pipelineNames.length === 0 ? (
          <div className="text-body-sm" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
            No contacts in pipelines
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {pipelineNames.map((pipeline) => {
              const statuses = pipelines[pipeline] ?? {}
              const total = Object.values(statuses).reduce((a: number, b: number) => a + b, 0)

              return (
                <div key={pipeline}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="text-label-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {pipeline}
                    </span>
                    <span className="text-mono-sm" style={{ color: 'var(--text-heading)' }}>{total}</span>
                  </div>

                  {/* Stacked bar */}
                  <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--progress-track)' }}>
                    {Object.entries(statuses).map(([status, count]) => (
                      <div
                        key={status}
                        style={{
                          width: `${(count / total) * 100}%`,
                          background: STATUS_COLORS[status] ?? 'var(--ink-20)',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    ))}
                  </div>

                  {/* Legend */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                    {Object.entries(statuses).map(([status, count]) => (
                      <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: STATUS_COLORS[status] ?? 'var(--ink-20)',
                        }} />
                        <span className="text-mono-xs" style={{ color: 'var(--text-muted)' }}>
                          {status} ({count})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
