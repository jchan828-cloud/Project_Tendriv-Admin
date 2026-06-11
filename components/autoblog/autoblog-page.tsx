'use client'

import { useState } from 'react'
import { DashboardTab } from './dashboard-tab'
import { ReviewTab } from './review-tab'
import { ApprovalsTab } from './approvals-tab'
import { SettingsTab } from './settings-tab'
import type { AutoblogRun, AutoblogSettings, ReviewQueueItem } from '@/lib/types/autoblog'

type Tab = 'dashboard' | 'review' | 'approvals' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'review', label: 'Review Queue' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'settings', label: 'Settings' },
]

interface AutoblogPageProps {
  initialRuns: AutoblogRun[]
  initialSettings: AutoblogSettings | null
  initialQueue?: ReviewQueueItem[]
  queueWarning?: string | null
}

export function AutoblogPage({
  initialRuns,
  initialSettings,
  initialQueue = [],
  queueWarning = null,
}: AutoblogPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  // Badge count for review queue
  const reviewCount = initialRuns.filter(
    (r) => r.status === 'completed' && r.published_slug == null
  ).length

  // Badge count for approvals: marketing posts sitting in 'review'
  const approvalsCount = initialQueue.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <h1 className="text-heading-md">Autoblog</h1>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid var(--border)',
          marginBottom: 24,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 18px',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--text-heading)' : 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive
                  ? '2px solid var(--tab-active-border)'
                  : '2px solid transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: -1,
                transition: 'color var(--duration-fast) ease',
              }}
            >
              {tab.label}
              {((tab.id === 'review' && reviewCount > 0) ||
                (tab.id === 'approvals' && approvalsCount > 0)) && (
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: 'var(--mono-font)',
                    backgroundColor: 'var(--status-warning-bg)',
                    color: 'var(--status-warning)',
                    padding: '1px 6px',
                    borderRadius: 9999,
                    fontWeight: 600,
                  }}
                >
                  {tab.id === 'review' ? reviewCount : approvalsCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Active tab content */}
      {activeTab === 'dashboard' && (
        <DashboardTab
          initialRuns={initialRuns}
          onSwitchToReview={() => setActiveTab('review')}
        />
      )}
      {activeTab === 'review' && <ReviewTab initialRuns={initialRuns} />}
      {activeTab === 'approvals' && (
        <ApprovalsTab initialItems={initialQueue} queueWarning={queueWarning} />
      )}
      {activeTab === 'settings' && <SettingsTab initialSettings={initialSettings} />}
    </div>
  )
}
