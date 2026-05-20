'use client'

import { useEffect, useRef, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, Zap } from 'lucide-react'
import type { AutoblogEvent } from '@/lib/types/autoblog'

interface LogEntry {
  ts: string
  event: AutoblogEvent
}

function eventIcon(type: string) {
  if (type === 'error' || type === 'failed') return <AlertCircle size={14} style={{ color: 'var(--sovereign)', flexShrink: 0 }} />
  if (type === 'completed' || type === 'published') return <CheckCircle size={14} style={{ color: 'var(--status-success)', flexShrink: 0 }} />
  if (type === 'started' || type === 'running') return <Zap size={14} style={{ color: 'var(--status-warning)', flexShrink: 0 }} />
  return <Info size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
}

function eventColor(type: string): string {
  if (type === 'error' || type === 'failed') return 'var(--sovereign)'
  if (type === 'completed' || type === 'published') return 'var(--status-success)'
  if (type === 'started' || type === 'running') return 'var(--status-warning)'
  return 'var(--text-body)'
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function eventMessage(event: AutoblogEvent): string {
  if (typeof event.message === 'string') return event.message
  if (typeof event.step === 'string') return event.step
  return event.type
}

interface LiveStreamPanelProps {
  runId: string
  onClose: () => void
}

export function LiveStreamPanel({ runId, onClose }: LiveStreamPanelProps) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [connected, setConnected] = useState(false)
  const [ended, setEnded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource(`/api/autoblog/stream/${runId}`)
    esRef.current = es

    es.onopen = () => setConnected(true)

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as AutoblogEvent
        setEntries((prev) => [...prev, { ts: new Date().toISOString(), event }])
        if (event.type === 'completed' || event.type === 'failed' || event.type === 'timeout') {
          setEnded(true)
          es.close()
        }
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      setConnected(false)
      setEnded(true)
      es.close()
    }

    return () => {
      es.close()
    }
  }, [runId])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 12, 16, 0.6)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 50,
        padding: '0 0 24px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 760,
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--surface-sidebar)',
            flexShrink: 0,
          }}
        >
          {!ended && connected && (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: 'var(--status-warning)',
                animation: 'pulse 2s infinite',
                flexShrink: 0,
              }}
            />
          )}
          <span className="text-label-sm" style={{ color: 'var(--text-heading)', flex: 1 }}>
            Live stream — run {runId.slice(0, 8)}
          </span>
          {ended && (
            <span className="badge badge-neutral" style={{ marginRight: 8 }}>
              Stream ended
            </span>
          )}
          <button
            onClick={onClose}
            className="btn-ghost btn-sm"
            style={{ padding: '4px 6px' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Log body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            fontFamily: 'var(--mono-font)',
            fontSize: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            backgroundColor: 'var(--surface-root)',
          }}
        >
          {entries.length === 0 && (
            <span style={{ color: 'var(--text-muted)' }}>
              {connected ? 'Waiting for events…' : 'Connecting…'}
            </span>
          )}
          {entries.map((entry, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontSize: 11 }}>
                {formatTime(entry.ts)}
              </span>
              {eventIcon(entry.event.type)}
              <span style={{ color: eventColor(entry.event.type), wordBreak: 'break-word' }}>
                {eventMessage(entry.event)}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
