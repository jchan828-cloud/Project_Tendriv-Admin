import type { IngestStats, HealthStatus } from '@/lib/system-health/queries'

interface IngestStatusPanelProps {
  stats: IngestStats[]
  now: Date
}

const LABELS: Record<IngestStats['source'], string> = {
  vercel: 'Vercel drain',
  supabase: 'Supabase drain',
}

function dotColor(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'var(--green)'
    case 'stale':
      return 'var(--amber)'
    case 'dead':
      return 'var(--sovereign)'
  }
}

function statusLabel(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'Healthy'
    case 'stale':
      return 'Stale'
    case 'dead':
      return 'No recent events'
  }
}

function ageString(iso: string | null, now: Date): string {
  if (!iso) return 'never'
  const ms = now.getTime() - new Date(iso).getTime()
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function IngestStatusPanel({ stats, now }: IngestStatusPanelProps) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="text-heading-sm">Drain ingest</div>
        <div className="text-body-xs" style={{ color: 'var(--text-muted)', marginTop: 2 }}>
          Heartbeat thresholds: healthy &lt; 5m · stale 5–30m · dead &gt; 30m
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
            <th className="section-label px-4 py-3 text-left">Source</th>
            <th className="section-label px-4 py-3 text-left">Status</th>
            <th className="section-label px-4 py-3 text-left">Last event</th>
            <th className="section-label px-4 py-3 text-right">5m</th>
            <th className="section-label px-4 py-3 text-right">1h</th>
            <th className="section-label px-4 py-3 text-right">24h</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.source} style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
              <td className="px-4 py-3">
                <span style={{ textTransform: 'capitalize' }}>{LABELS[s.source]}</span>
              </td>
              <td className="px-4 py-3">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: dotColor(s.status),
                      display: 'inline-block',
                    }}
                  />
                  <span>{statusLabel(s.status)}</span>
                </span>
              </td>
              <td className="text-mono-sm px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                {ageString(s.lastReceivedAt, now)}
              </td>
              <td className="text-mono-sm px-4 py-3 text-right">{s.count5m.toLocaleString()}</td>
              <td className="text-mono-sm px-4 py-3 text-right">{s.count1h.toLocaleString()}</td>
              <td className="text-mono-sm px-4 py-3 text-right">{s.count24h.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
