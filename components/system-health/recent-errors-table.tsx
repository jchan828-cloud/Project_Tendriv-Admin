import type { ErrorEvent } from '@/lib/system-health/queries'

interface RecentErrorsTableProps {
  events: ErrorEvent[]
}

function severityBadge(severity: string | null): string {
  const s = (severity ?? '').toLowerCase()
  if (s === 'fatal' || s === 'error' || s === 'critical') return 'badge badge-sovereign'
  if (s === 'warn' || s === 'warning') return 'badge badge-warning'
  return 'badge badge-neutral'
}

export function RecentErrorsTable({ events }: RecentErrorsTableProps) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="text-heading-sm">Recent errors & warnings</div>
        <div className="text-body-xs" style={{ color: 'var(--text-muted)', marginTop: 2 }}>
          Last {events.length} events where severity is error/fatal/warn across both drains
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
              <th className="section-label px-4 py-3 text-left">Received</th>
              <th className="section-label px-4 py-3 text-left">Source</th>
              <th className="section-label px-4 py-3 text-left">Severity</th>
              <th className="section-label px-4 py-3 text-left">Project</th>
              <th className="section-label px-4 py-3 text-left">Message</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center"
                  style={{ color: 'var(--text-muted)' }}
                >
                  No error events in the ingestion stream.
                </td>
              </tr>
            )}
            {events.map((e) => (
              <tr
                key={e.id}
                style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
              >
                <td className="text-mono-sm px-4 py-3" style={{ whiteSpace: 'nowrap' }}>
                  {new Date(e.received_at).toLocaleString('en-CA', {
                    dateStyle: 'short',
                    timeStyle: 'medium',
                  })}
                </td>
                <td className="px-4 py-3">
                  <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                    {e.source}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={severityBadge(e.severity)}>
                    {e.severity ?? 'unknown'}
                  </span>
                </td>
                <td className="text-mono-xs px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                  {e.project_id ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <div
                    className="text-mono-xs"
                    style={{
                      maxWidth: 520,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={e.message ?? ''}
                  >
                    {e.message ?? '(no message)'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
