import type { HealthStatus } from '@/lib/system-health/queries'

interface SignalTileProps {
  label: string
  value: number | string
  subtitle?: string
  status?: HealthStatus
  accent?: string
}

function colorForStatus(status: HealthStatus | undefined, fallback: string): string {
  switch (status) {
    case 'healthy':
      return 'var(--green)'
    case 'stale':
      return 'var(--amber)'
    case 'dead':
      return 'var(--sovereign)'
    default:
      return fallback
  }
}

export function SignalTile({ label, value, subtitle, status, accent = 'var(--jade)' }: SignalTileProps) {
  const color = colorForStatus(status, accent)
  const display = typeof value === 'number' ? value.toLocaleString() : value
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div className="card-kicker">{label}</div>
      <div className="text-data-lg" style={{ color }}>
        {display}
      </div>
      {subtitle && (
        <div className="text-body-xs" style={{ color: 'var(--text-muted)' }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}
