'use client'

/** MK8-CMS-002: Rich editor with auto-save, word count, and preview */

import { useState, useEffect, useRef, useCallback } from 'react'
import { BlogPost } from '@/lib/types/cms'
import { FrontmatterPanel } from './frontmatter-panel'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface PostEditorProps {
  initialPost: BlogPost
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function PostEditor({ initialPost }: PostEditorProps) {
  const [post, setPost] = useState<BlogPost>(initialPost)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [showPreview, setShowPreview] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<Partial<BlogPost> | null>(null)

  const save = useCallback(async (fields: Partial<BlogPost>) => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/marketing/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) {
        setSaveStatus('error')
        return
      }
      setSaveStatus('saved')

      // Create auto-save version
      await fetch(`/api/marketing/posts/${post.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change_type: 'auto-save', content: { ...post, ...fields } }),
      })
    } catch {
      setSaveStatus('error')
    }
  }, [post])

  const scheduleSave = useCallback((fields: Partial<BlogPost>) => {
    pendingRef.current = { ...pendingRef.current, ...fields }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (pendingRef.current) {
        save(pendingRef.current)
        pendingRef.current = null
      }
    }, 1500)
  }, [save])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleFieldChange = useCallback((fields: Partial<BlogPost>) => {
    setPost((prev) => ({ ...prev, ...fields }))
    scheduleSave(fields)
  }, [scheduleSave])

  const handleContentChange = useCallback((content: string) => {
    const wordCount = countWords(content)
    setPost((prev) => ({ ...prev, content, word_count: wordCount }))
    scheduleSave({ content, word_count: wordCount })
  }, [scheduleSave])

  const handleSubmitForReview = useCallback(async () => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/marketing/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'review' }),
      })
      if (res.ok) {
        setPost((prev) => ({ ...prev, status: 'review' }))
        setSaveStatus('saved')

        await fetch(`/api/marketing/posts/${post.id}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ change_type: 'status-change', content: { ...post, status: 'review' } }),
        })
      } else {
        setSaveStatus('error')
      }
    } catch {
      setSaveStatus('error')
    }
  }, [post])

  const readingTime = Math.max(1, Math.floor(post.word_count / 200))

  return (
    <div className="flex gap-6">
      {/* Left — Front Matter */}
      <div className="w-80 flex-shrink-0 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface-sidebar)] p-4">
        <FrontmatterPanel post={post} onChange={handleFieldChange} />
      </div>

      {/* Right — Editor */}
      <div className="flex-1">
        {/* Toolbar */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className={`btn-sm ${!showPreview ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowPreview(false)}
            >
              Edit
            </button>
            <button
              className={`btn-sm ${showPreview ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowPreview(true)}
            >
              Preview
            </button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-mono-xs text-[var(--text-muted)]">
              {post.word_count} words · {readingTime} min read
            </span>
            <SaveIndicator status={saveStatus} />
            {post.status === 'draft' && (
              <button className="btn-primary btn-sm" onClick={handleSubmitForReview}>
                Submit for Review
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        {showPreview ? (
          <MarkdownPreview content={post.content ?? ''} />
        ) : (
          <textarea
            className="input-base min-h-[500px] font-mono text-sm leading-relaxed"
            value={post.content ?? ''}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Start writing in Markdown…"
          />
        )}
      </div>
    </div>
  )
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const config: Record<SaveStatus, { label: string; className: string }> = {
    idle: { label: '', className: '' },
    saving: { label: 'Saving…', className: 'text-[var(--text-muted)]' },
    saved: { label: 'Saved', className: 'text-[var(--status-success)]' },
    error: { label: 'Save failed', className: 'text-[var(--sovereign)]' },
  }
  const { label, className } = config[status]
  if (!label) return null
  return <span className={`text-mono-xs ${className}`}>{label}</span>
}

function MarkdownPreview({ content }: { content: string }) {
  const lines = content.split('\n')

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-card-solid)] p-6 space-y-3">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={i} className="h-3" />
        if (trimmed.startsWith('### '))
          return <h3 key={i} className="text-heading-sm mt-4 mb-2">{trimmed.slice(4)}</h3>
        if (trimmed.startsWith('## '))
          return <h2 key={i} className="text-heading-md mt-6 mb-2">{trimmed.slice(3)}</h2>
        if (trimmed.startsWith('# '))
          return <h1 key={i} className="text-heading-lg mt-6 mb-3">{trimmed.slice(2)}</h1>
        if (trimmed.startsWith('- ') || trimmed.startsWith('* '))
          return <li key={i} className="ml-4 text-body-md">{trimmed.slice(2)}</li>
        return <p key={i} className="text-body-md">{trimmed}</p>
      })}
    </div>
  )
}
