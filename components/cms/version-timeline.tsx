'use client'

/** MK8-CMS-008: Version timeline with diff view + restore */

import { useState, useEffect, useCallback } from 'react'

interface VersionSummary {
  id: string
  version_number: number
  change_type: string
  changed_by: string | null
  created_at: string
}

interface VersionTimelineProps {
  postId: string
}

export function VersionTimeline({ postId }: VersionTimelineProps) {
  const [versions, setVersions] = useState<VersionSummary[]>([])
  const [expandedPair, setExpandedPair] = useState<[number, number] | null>(null)
  const [diff, setDiff] = useState<{ additions: string[]; removals: string[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/marketing/posts/${postId}/versions`)
      .then((r) => r.json())
      .then((data) => {
        setVersions(data)
        setLoading(false)
      })
  }, [postId])

  const loadDiff = useCallback(async (v1: number, v2: number) => {
    if (expandedPair && expandedPair[0] === v1 && expandedPair[1] === v2) {
      setExpandedPair(null)
      setDiff(null)
      return
    }
    setExpandedPair([v1, v2])
    const res = await fetch(`/api/marketing/posts/${postId}/versions?v1=${v1}&v2=${v2}`)
    const data = await res.json()
    setDiff(data)
  }, [postId, expandedPair])

  const handleRestore = useCallback(async (versionNumber: number) => {
    const res = await fetch(`/api/marketing/posts/${postId}/versions?v1=${versionNumber}&v2=${versionNumber}`)
    if (!res.ok) return

    // Create restore version
    await fetch(`/api/marketing/posts/${postId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ change_type: 'restore', content: {} }),
    })

    window.location.reload()
  }, [postId])

  const changeTypeBadge = (type: string): string => {
    switch (type) {
      case 'auto-save': return 'badge-neutral'
      case 'manual-save': return 'badge-jade'
      case 'status-change': return 'badge-warning'
      case 'approval': return 'badge-success'
      case 'restore': return 'badge-purple'
      default: return 'badge-neutral'
    }
  }

  if (loading) {
    return <p className="text-body-sm text-[var(--text-muted)]">Loading versions…</p>
  }

  if (versions.length === 0) {
    return <p className="text-body-sm text-[var(--text-muted)]">No versions yet.</p>
  }

  return (
    <div className="space-y-2">
      {versions.map((v, i) => {
        const prevVersion = versions[i + 1]
        const canDiff = !!prevVersion
        const isExpanded = expandedPair && expandedPair[0] === (prevVersion?.version_number ?? 0) && expandedPair[1] === v.version_number

        return (
          <div key={v.id} className="rounded-lg border border-[var(--border)] p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-data-sm">v{v.version_number}</span>
                <span className={`badge ${changeTypeBadge(v.change_type)}`}>{v.change_type}</span>
                <span className="text-mono-xs text-[var(--text-label)]">
                  {new Date(v.created_at).toLocaleString('en-CA', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
              <div className="flex gap-2">
                {canDiff && (
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => loadDiff(prevVersion.version_number, v.version_number)}
                  >
                    {isExpanded ? 'Hide diff' : 'Show diff'}
                  </button>
                )}
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => handleRestore(v.version_number)}
                >
                  Restore
                </button>
              </div>
            </div>

            {isExpanded && diff && (
              <div className="mt-3 space-y-1">
                {diff.additions.map((line, j) => (
                  <div key={`add-${j}`} className="rounded px-2 py-1 text-mono-xs bg-[var(--green-bg)] text-[var(--green)]">
                    + {line}
                  </div>
                ))}
                {diff.removals.map((line, j) => (
                  <div key={`rem-${j}`} className="rounded px-2 py-1 text-mono-xs bg-[var(--sovereign-pale)] text-[var(--sovereign)]">
                    - {line}
                  </div>
                ))}
                {diff.additions.length === 0 && diff.removals.length === 0 && (
                  <p className="text-body-xs text-[var(--text-muted)]">No changes detected.</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
