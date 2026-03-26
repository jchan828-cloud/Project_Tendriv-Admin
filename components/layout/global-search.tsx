'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SearchResult {
  type: 'post' | 'contact' | 'audit'
  id: string
  title: string
  subtitle?: string
  href: string
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results ?? [])
        setSelectedIndex(0)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 250)
    return () => clearTimeout(timer)
  }, [query, search])

  function navigate(result: SearchResult) {
    setOpen(false)
    router.push(result.href)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      navigate(results[selectedIndex])
    }
  }

  const typeLabels: Record<string, string> = { post: 'Post', contact: 'Contact', audit: 'Audit' }
  const typeBadge: Record<string, string> = { post: 'badge-jade', contact: 'badge-purple', audit: 'badge-neutral' }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface-input)', border: '1px solid var(--border-input)',
          borderRadius: 'var(--radius)', padding: '5px 12px',
          color: 'var(--text-label)', fontSize: 12, cursor: 'pointer',
          fontFamily: 'var(--body-font)', minWidth: 200,
        }}
      >
        <span style={{ flex: 1, textAlign: 'left' }}>Search...</span>
        <kbd style={{
          fontSize: 10, background: 'var(--surface-badge)', padding: '1px 5px',
          borderRadius: 3, border: '1px solid var(--border)', fontFamily: 'var(--mono-font)',
        }}>
          ⌘K
        </kbd>
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(10,12,16,0.4)',
          zIndex: 50, backdropFilter: 'blur(4px)',
        }}
      />
      {/* Dialog */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 520, zIndex: 51,
        background: 'var(--surface-card-solid)', border: '1px solid var(--border)',
        borderRadius: 'calc(var(--radius) * 2)', boxShadow: 'var(--card-shadow-hover)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search posts, contacts, audit logs..."
            className="input-base"
            style={{ border: 'none', boxShadow: 'none', padding: 0 }}
          />
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }} className="text-body-sm">
              Searching...
            </div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }} className="text-body-sm">
              No results found
            </div>
          )}
          {results.map((result, i) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => navigate(result)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '10px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                background: i === selectedIndex ? 'var(--surface-hover)' : 'transparent',
                color: 'var(--text-heading)', fontFamily: 'var(--body-font)',
              }}
            >
              <span className={`badge ${typeBadge[result.type] ?? 'badge-neutral'}`}>
                {typeLabels[result.type] ?? result.type}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="text-body-sm" style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {result.title}
                </div>
                {result.subtitle && (
                  <div className="text-mono-xs" style={{ color: 'var(--text-muted)' }}>{result.subtitle}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
