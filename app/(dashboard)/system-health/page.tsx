/** System Health — operational signals for admins.
 *
 *  Surfaces drain ingest heartbeats, recent error events, audit activity,
 *  and the current deployment identity. Admin-gated following the same
 *  pattern as /settings/users.
 */

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/roles'
import { getSystemHealthSnapshot } from '@/lib/system-health/queries'
import { SignalTile } from '@/components/system-health/signal-tile'
import { IngestStatusPanel } from '@/components/system-health/ingest-status-panel'
import { RecentErrorsTable } from '@/components/system-health/recent-errors-table'
import { DeploymentInfo } from '@/components/system-health/deployment-info'
import { RefreshButton } from '@/components/system-health/refresh-button'

export const dynamic = 'force-dynamic'

export default async function SystemHealthPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const record = await getUserRole(supabase, user.id)
  if (record.role !== 'admin') redirect('/settings/profile')

  const snapshot = await getSystemHealthSnapshot()
  const now = new Date(snapshot.generatedAt)

  const vercel = snapshot.ingest.find((s) => s.source === 'vercel')
  const supa = snapshot.ingest.find((s) => s.source === 'supabase')

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          gap: 16,
        }}
      >
        <div>
          <h1 className="text-heading-lg">System health</h1>
          <p
            className="text-body-sm"
            style={{ color: 'var(--text-muted)', marginTop: 4 }}
          >
            Live ingest and error signals for the admin portal.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="text-body-xs" style={{ color: 'var(--text-muted)' }}>
            as of {now.toLocaleTimeString('en-CA')}
          </span>
          <RefreshButton />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <SignalTile
          label="Vercel ingest (1h)"
          value={vercel?.count1h ?? 0}
          subtitle={vercel ? `last event ${relativeAge(vercel.lastReceivedAt, now)}` : undefined}
          status={vercel?.status}
        />
        <SignalTile
          label="Supabase ingest (1h)"
          value={supa?.count1h ?? 0}
          subtitle={supa ? `last event ${relativeAge(supa.lastReceivedAt, now)}` : undefined}
          status={supa?.status}
        />
        <SignalTile
          label="Errors (24h)"
          value={snapshot.totalErrors24h}
          subtitle="severity error/fatal/warn across drains"
          accent={snapshot.totalErrors24h > 0 ? 'var(--sovereign)' : 'var(--green)'}
        />
        <SignalTile
          label="Audit activity (24h)"
          value={snapshot.auditActivity24h}
          subtitle="rows written to audit_log"
          accent="var(--jade)"
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <IngestStatusPanel stats={snapshot.ingest} now={now} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <RecentErrorsTable events={snapshot.recentErrors} />
      </div>

      <DeploymentInfo
        sha={process.env.VERCEL_GIT_COMMIT_SHA ?? null}
        env={process.env.VERCEL_ENV ?? null}
        region={process.env.VERCEL_REGION ?? null}
        nodeVersion={process.version}
      />
    </div>
  )
}

function relativeAge(iso: string | null, now: Date): string {
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
