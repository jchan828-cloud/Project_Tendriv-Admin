'use client'

import { useState, useCallback } from 'react'
import { Play, Loader2 } from 'lucide-react'
import { ActiveRunBanner } from './active-run-banner'
import { LiveStreamPanel } from './live-stream-panel'
import { RunHistoryTable } from './run-history-table'
import type { AutoblogRun } from '@/lib/types/autoblog'

interface DashboardTabProps {
  initialRuns: AutoblogRun[]
}

export function DashboardTab({ initialRuns }: DashboardTabProps) {
  const [runs, setRuns] = useState<AutoblogRun[]>(initialRuns)
  const [triggering, setTriggering] = useState(false)
  const [triggerError, setTriggerError] = useState<string | null>(null)
  const [liveRunId, setLiveRunId] = useState<string | null>(null)

  const activeRun = runs.find((r) => r.status === 'running') ?? null

  const handleRunNow = useCallback(async () => {
    setTriggering(true)
    setTriggerError(null)
    try {
      const res = await fetch('/api/autoblog/trigger', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      // Refetch runs list
      const runsRes = await fetch('/api/autoblog/runs')
      if (runsRes.ok) {
        const data = await runsRes.json() as AutoblogRun[]
        setRuns(data)
      }
    } catch (err) {
      setTriggerError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setTriggering(false)
    }
  }, [])

  const handleViewLive = useCallback((runId?: string) => {
    setLiveRunId(runId ?? activeRun?.run_id ?? null)
  }, [activeRun])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Active run banner */}
      {activeRun && (
        <ActiveRunBanner
          run={activeRun}
          onViewLive={() => handleViewLive(activeRun.run_id)}
        />
      )}

      {/* Header row: title + Run Now */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 className="text-heading-sm" style={{ flex: 1 }}>
          Run history
        </h2>
        <button
          onClick={handleRunNow}
          disabled={triggering || !!activeRun}
          className="btn-primary btn-sm"
          style={{
            opacity: triggering || activeRun ? 0.6 : 1,
            pointerEvents: triggering || activeRun ? 'none' : 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {triggering ? (
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Play size={14} />
          )}
          {triggering ? 'Triggering…' : 'Run now'}
        </button>
      </div>

      {triggerError && (
        <p
          className="text-body-sm"
          style={{ color: 'var(--sovereign)', marginTop: -8 }}
        >
          {triggerError}
        </p>
      )}

      <RunHistoryTable
        runs={runs}
        onSelectRun={(runId) => {
          const run = runs.find((r) => r.run_id === runId)
          if (run?.status === 'running') handleViewLive(runId)
        }}
      />

      {/* Live stream overlay */}
      {liveRunId && (
        <LiveStreamPanel
          runId={liveRunId}
          onClose={() => setLiveRunId(null)}
        />
      )}
    </div>
  )
}
