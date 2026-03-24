'use client'

/** MK8-INT-003: Client component for audit log filter selects */

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

const EVENT_TYPES = [
  'post-created', 'post-updated', 'post-status-changed', 'post-published',
  'post-version-restored', 'gate-submission', 'utm-created', 'utm-click',
  'contact-score-computed', 'score-change-flagged', 'ai-brief-generated',
  'publish-channel-routed',
] as const

const RESOURCE_TYPES = [
  'post', 'contact', 'utm', 'gate', 'score', 'publish', 'ai-brief', 'version',
] as const

interface AuditFiltersProps {
  eventType: string
  resourceType: string
}

export function AuditFilters({ eventType, resourceType }: AuditFiltersProps) {
  const router = useRouter()

  const navigate = useCallback((overrides: Record<string, string>) => {
    const params = new URLSearchParams()
    const merged: Record<string, string> = {
      ...(eventType ? { event_type: eventType } : {}),
      ...(resourceType ? { resource_type: resourceType } : {}),
      ...overrides,
    }
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v)
    }
    params.set('page', '1')
    const qs = params.toString()
    router.push(qs ? `/audit?${qs}` : '/audit')
  }, [eventType, resourceType, router])

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-label-sm" htmlFor="event-filter">Event</label>
        <select
          id="event-filter"
          value={eventType}
          onChange={(e) => navigate({ event_type: e.target.value })}
          className="input-base py-1.5 pr-8 text-body-sm"
        >
          <option value="">All</option>
          {EVENT_TYPES.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-label-sm" htmlFor="resource-filter">Resource</label>
        <select
          id="resource-filter"
          value={resourceType}
          onChange={(e) => navigate({ resource_type: e.target.value })}
          className="input-base py-1.5 pr-8 text-body-sm"
        >
          <option value="">All</option>
          {RESOURCE_TYPES.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      {(eventType || resourceType) && (
        <button
          onClick={() => router.push('/audit')}
          className="btn-ghost btn-sm"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
