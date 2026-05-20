'use client'

import { useState, useCallback } from 'react'
import { DraftList } from './draft-list'
import { DraftPreview } from './draft-preview'
import { DraftEditor } from './draft-editor'
import type { AutoblogRun } from '@/lib/types/autoblog'

interface ReviewTabProps {
  initialRuns: AutoblogRun[]
}

export function ReviewTab({ initialRuns }: ReviewTabProps) {
  // Only show completed runs without a published slug
  const [runs, setRuns] = useState<AutoblogRun[]>(initialRuns)
  const drafts = runs.filter((r) => r.status === 'completed' && r.published_slug == null)

  const [selectedId, setSelectedId] = useState<string | null>(
    drafts[0]?.id ?? null
  )
  const [editMode, setEditMode] = useState(false)
  const [editedMarkdown, setEditedMarkdown] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const selectedDraft = drafts.find((d) => d.id === selectedId) ?? null

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
    setEditMode(false)
    setEditedMarkdown(null)
    setActionError(null)
  }, [])

  const handleEdit = useCallback(() => {
    setEditMode(true)
    setEditedMarkdown(selectedDraft?.draft_markdown ?? '')
    setActionError(null)
  }, [selectedDraft])

  const handleSave = useCallback((md: string) => {
    setEditedMarkdown(md)
    setEditMode(false)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditMode(false)
  }, [])

  const handlePublish = useCallback(async () => {
    if (!selectedDraft) return
    setActionError(null)
    try {
      const res = await fetch('/api/autoblog/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: selectedDraft.run_id,
          markdown: editedMarkdown ?? selectedDraft.draft_markdown,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      // Remove published draft from local state
      setRuns((prev) =>
        prev.map((r) =>
          r.id === selectedDraft.id ? { ...r, status: 'published' as const, published_slug: 'pending' } : r
        )
      )
      // Advance selection
      const remaining = drafts.filter((d) => d.id !== selectedDraft.id)
      setSelectedId(remaining[0]?.id ?? null)
      setEditedMarkdown(null)
      setEditMode(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Publish failed')
    }
  }, [selectedDraft, editedMarkdown, drafts])

  const handleReject = useCallback(async () => {
    if (!selectedDraft) return
    setActionError(null)
    try {
      const res = await fetch('/api/autoblog/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: `review:${selectedDraft.run_id}`,
          decision: 'reject',
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      // Remove rejected draft from local state
      setRuns((prev) =>
        prev.map((r) =>
          r.id === selectedDraft.id ? { ...r, status: 'rejected' as const } : r
        )
      )
      const remaining = drafts.filter((d) => d.id !== selectedDraft.id)
      setSelectedId(remaining[0]?.id ?? null)
      setEditedMarkdown(null)
      setEditMode(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Reject failed')
    }
  }, [selectedDraft, drafts])

  // Empty state
  if (drafts.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 240,
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p className="text-heading-sm" style={{ marginBottom: 8 }}>
            Review queue is empty
          </p>
          <p className="text-body-sm">
            Completed drafts will appear here for approval before publishing.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="card"
      style={{
        padding: 0,
        display: 'flex',
        height: 'calc(100vh - 220px)',
        minHeight: 400,
        overflow: 'hidden',
      }}
    >
      {/* Error banner */}
      {actionError && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--sovereign-pale)',
            border: '1px solid var(--sovereign-border)',
            color: 'var(--sovereign)',
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: 13,
            zIndex: 10,
          }}
        >
          {actionError}
        </div>
      )}

      {/* Left: draft list */}
      <DraftList
        drafts={drafts}
        selectedId={selectedId}
        onSelect={handleSelect}
      />

      {/* Right: preview or editor */}
      {selectedDraft ? (
        editMode ? (
          <DraftEditor
            markdown={editedMarkdown ?? selectedDraft.draft_markdown ?? ''}
            onSave={handleSave}
            onCancel={handleCancelEdit}
          />
        ) : (
          <DraftPreview
            draft={selectedDraft}
            editedMarkdown={editedMarkdown}
            onPublish={handlePublish}
            onEdit={handleEdit}
            onReject={handleReject}
          />
        )
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <p className="text-body-sm">Select a draft to review.</p>
        </div>
      )}
    </div>
  )
}
