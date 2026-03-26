'use client'

interface ActivityRow {
  id: string
  event_type: string
  resource_type: string
  resource_id: string
  created_at: string
  actor_type: string
}

function formatEventType(type: string): string {
  return type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function badgeClass(actorType: string): string {
  switch (actorType) {
    case 'cron': return 'badge-warning'
    case 'system': return 'badge-neutral'
    case 'user': return 'badge-jade'
    default: return 'badge-neutral'
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function RecentActivity({ activity }: { activity: ActivityRow[] }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div className="text-heading-sm">Recent Activity</div>
      </div>
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {activity.length === 0 ? (
          <div style={{ padding: 20, color: 'var(--text-muted)', textAlign: 'center' }} className="text-body-sm">
            No activity yet
          </div>
        ) : (
          activity.map((row) => (
            <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="text-body-sm" style={{ fontWeight: 500, color: 'var(--text-heading)' }}>
                  {formatEventType(row.event_type)}
                </div>
                <div className="text-mono-xs" style={{ color: 'var(--text-muted)' }}>
                  {row.resource_type}/{row.resource_id?.slice(0, 8)}
                </div>
              </div>
              <span className={`badge ${badgeClass(row.actor_type)}`}>{row.actor_type}</span>
              <div className="text-mono-xs" style={{ color: 'var(--text-label)', whiteSpace: 'nowrap' }}>
                {timeAgo(row.created_at)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
