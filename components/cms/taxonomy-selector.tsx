'use client'

/** MK8-CMS-004: Tag + Topic selector with autocomplete */

import { useState, useEffect, useCallback } from 'react'
import { BlogTag, BlogTopic } from '@/lib/types/cms'

interface TaxonomySelectorProps {
  postId: string
}

export function TaxonomySelector({ postId }: TaxonomySelectorProps) {
  const [tags, setTags] = useState<BlogTag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [tagQuery, setTagQuery] = useState('')
  const [tagResults, setTagResults] = useState<BlogTag[]>([])

  const [topics, setTopics] = useState<BlogTopic[]>([])
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])

  // Load all topics and current post associations
  useEffect(() => {
    Promise.all([
      fetch('/api/marketing/tags').then((r) => r.json()),
      fetch('/api/marketing/topics').then((r) => r.json()),
    ]).then(([tagsData, topicsData]) => {
      setTags(tagsData)
      setTopics(topicsData)
    })
  }, [])

  // Tag autocomplete
  useEffect(() => {
    if (!tagQuery.trim()) {
      setTagResults([])
      return
    }
    const q = tagQuery.toLowerCase()
    setTagResults(tags.filter((t) => t.name.toLowerCase().includes(q) && !selectedTagIds.includes(t.id)))
  }, [tagQuery, tags, selectedTagIds])

  const addTag = useCallback((tagId: string) => {
    const next = [...selectedTagIds, tagId]
    setSelectedTagIds(next)
    setTagQuery('')
    fetch(`/api/marketing/posts/${postId}/tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    })
  }, [selectedTagIds, postId])

  const createAndAddTag = useCallback(async (name: string) => {
    const res = await fetch('/api/marketing/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const newTag: BlogTag = await res.json()
      setTags((prev) => [...prev, newTag])
      addTag(newTag.id)
    }
  }, [addTag])

  const removeTag = useCallback((tagId: string) => {
    const next = selectedTagIds.filter((id) => id !== tagId)
    setSelectedTagIds(next)
    fetch(`/api/marketing/posts/${postId}/tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    })
  }, [selectedTagIds, postId])

  const toggleTopic = useCallback((topicId: string) => {
    const next = selectedTopicIds.includes(topicId)
      ? selectedTopicIds.filter((id) => id !== topicId)
      : [...selectedTopicIds, topicId]
    setSelectedTopicIds(next)
    fetch(`/api/marketing/posts/${postId}/topics`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    })
  }, [selectedTopicIds, postId])

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagQuery.trim()) {
      e.preventDefault()
      const existing = tags.find((t) => t.name.toLowerCase() === tagQuery.trim().toLowerCase())
      if (existing) {
        addTag(existing.id)
      } else {
        createAndAddTag(tagQuery.trim())
      }
    }
  }

  // Build topic tree
  const rootTopics = topics.filter((t) => !t.parent_id)
  const childTopics = (parentId: string) => topics.filter((t) => t.parent_id === parentId)

  return (
    <div className="flex flex-col gap-4">
      {/* Tags */}
      <div>
        <div className="section-label">Tags</div>
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedTagIds.map((id) => {
            const tag = tags.find((t) => t.id === id)
            if (!tag) return null
            return (
              <span key={id} className="badge badge-neutral flex items-center gap-1">
                {tag.name}
                <button onClick={() => removeTag(id)} className="text-[var(--text-muted)] hover:text-[var(--text-heading)]">×</button>
              </span>
            )
          })}
        </div>
        <div className="relative">
          <input
            className="input-base text-body-sm"
            value={tagQuery}
            onChange={(e) => setTagQuery(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add tag…"
          />
          {tagResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-card-solid)] shadow-lg">
              {tagResults.slice(0, 8).map((t) => (
                <button
                  key={t.id}
                  className="block w-full px-3 py-2 text-left text-body-sm hover:bg-[var(--surface-hover)]"
                  onClick={() => addTag(t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Topics */}
      <div>
        <div className="section-label">Topics</div>
        <div className="space-y-1">
          {rootTopics.map((topic) => (
            <div key={topic.id}>
              <TopicRow
                topic={topic}
                selected={selectedTopicIds.includes(topic.id)}
                onToggle={() => toggleTopic(topic.id)}
                depth={0}
              />
              {childTopics(topic.id).map((child) => (
                <TopicRow
                  key={child.id}
                  topic={child}
                  selected={selectedTopicIds.includes(child.id)}
                  onToggle={() => toggleTopic(child.id)}
                  depth={1}
                />
              ))}
            </div>
          ))}
          {rootTopics.length === 0 && (
            <p className="text-body-xs text-[var(--text-label)]">No topics created yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function TopicRow({
  topic,
  selected,
  onToggle,
  depth,
}: {
  topic: BlogTopic
  selected: boolean
  onToggle: () => void
  depth: number
}) {
  return (
    <button
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-body-sm hover:bg-[var(--surface-hover)] ${
        selected ? 'bg-[var(--surface-active)]' : ''
      }`}
      onClick={onToggle}
    >
      {depth > 0 && <span className="ml-4" />}
      <span className={`h-3 w-3 rounded border ${selected ? 'bg-[var(--jade)] border-[var(--jade)]' : 'border-[var(--border-input)]'}`} />
      {topic.name}
    </button>
  )
}
