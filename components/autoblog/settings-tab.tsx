'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { PERSONA_OPTIONS, FREQUENCY_OPTIONS } from '@/lib/autoblog/constants'
import type { AutoblogSettings } from '@/lib/types/autoblog'

// ── Time conversion helpers ──────────────────────────────────────────────────
// run_time_utc is stored as "HH:MM" (24h UTC).
// Display converts to Mountain Time (America/Edmonton) via Intl.

function utcHHMMtoMT(hhmm: string): string {
  if (!hhmm) return ''
  const [hStr, mStr] = hhmm.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr ?? '0', 10)
  // Build a Date in UTC with today's date + that hour/minute
  const now = new Date()
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m, 0))
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Edmonton',
  }).format(d)
}

function mtHHMMtoUTC(hhmm: string): string {
  if (!hhmm) return ''
  const [hStr, mStr] = hhmm.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr ?? '0', 10)
  if (isNaN(h) || isNaN(m)) return ''

  // We need to find what UTC hour corresponds to this MT local time.
  // Strategy: construct a timestamp string that Intl would produce for an
  // America/Edmonton clock at HH:MM today, then back-convert to UTC.
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hPad = String(h).padStart(2, '0')
  const mPad = String(m).padStart(2, '0')

  // Parse as if it were a local MT ISO-style string using a trick:
  // create a UTC date then compute the offset at that time of day.
  // We use a binary search over the 24h range to find the UTC time whose
  // MT representation matches. But a simpler approach: use a fixed offset.
  // MDT (summer) = UTC-6, MST (winter) = UTC-7. We can determine which is
  // active right now and apply that offset.

  // Determine the current MT offset by formatting a known UTC time
  const probe = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0))
  const mtProbeStr = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Edmonton',
  }).format(probe)
  const probeHour = parseInt(mtProbeStr.split(':')[0], 10)
  const offsetHours = 12 - probeHour // positive = behind UTC

  let utcH = h + offsetHours
  if (utcH < 0) utcH += 24
  if (utcH >= 24) utcH -= 24
  return `${String(utcH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
      }}
    >
      <span
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative',
          display: 'inline-block',
          width: 44,
          height: 24,
          borderRadius: 12,
          backgroundColor: checked ? 'var(--jade)' : 'var(--surface-badge)',
          border: '1px solid',
          borderColor: checked ? 'var(--jade)' : 'var(--border)',
          transition: 'background-color var(--duration-base) ease',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 22 : 2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            backgroundColor: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'left var(--duration-base) ease',
          }}
        />
      </span>
      <span className="text-label-sm" style={{ color: 'var(--text-body)' }}>
        {label}
      </span>
    </label>
  )
}

// ── Pill selector ─────────────────────────────────────────────────────────────
function PillSelector<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 9999,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              border: '1.5px solid',
              borderColor: active ? 'var(--jade)' : 'var(--border)',
              backgroundColor: active ? 'var(--jade-pale)' : 'transparent',
              color: active ? 'var(--jade-dim)' : 'var(--text-body)',
              transition: 'all var(--duration-base) ease',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Posts per run pill selector (1–5) ──────────────────────────────────────
const POSTS_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n) as string, label: String(n) }))

// ── Field row ────────────────────────────────────────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '200px 1fr',
        alignItems: 'start',
        gap: 16,
        paddingBottom: 20,
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <span className="text-label-sm" style={{ color: 'var(--text-muted)', paddingTop: 6 }}>
        {label}
      </span>
      <div>{children}</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
interface SettingsTabProps {
  initialSettings: AutoblogSettings | null
}

export function SettingsTab({ initialSettings }: SettingsTabProps) {
  const defaults: AutoblogSettings = {
    id: 1,
    enabled: false,
    frequency: 'daily',
    run_time_utc: '11:00',
    posts_per_run: 1,
    target_persona: 'bid-manager',
    updated_at: new Date().toISOString(),
  }
  const seed = initialSettings ?? defaults

  const [enabled, setEnabled] = useState(seed.enabled)
  const [frequency, setFrequency] = useState<AutoblogSettings['frequency']>(seed.frequency)
  const [runTimeUTC, setRunTimeUTC] = useState(seed.run_time_utc)
  const [runTimeMT, setRunTimeMT] = useState(() => utcHHMMtoMT(seed.run_time_utc))
  const [postsPerRun, setPostsPerRun] = useState(String(seed.posts_per_run))
  const [persona, setPersona] = useState(seed.target_persona)

  const [engineStatus, setEngineStatus] = useState<'unknown' | 'healthy' | 'error'>('unknown')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Ping health endpoint on mount
  useEffect(() => {
    fetch('/api/autoblog/health')
      .then((r) => setEngineStatus(r.ok ? 'healthy' : 'error'))
      .catch(() => setEngineStatus('error'))
  }, [])

  useEffect(
    () => () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    },
    []
  )

  // Keep MT display in sync when UTC changes programmatically
  const handleMTChange = useCallback((val: string) => {
    setRunTimeMT(val)
    const utc = mtHHMMtoUTC(val)
    if (utc) setRunTimeUTC(utc)
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/autoblog/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          frequency,
          run_time_utc: runTimeUTC,
          posts_per_run: parseInt(postsPerRun, 10),
          target_persona: persona,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      setSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [enabled, frequency, runTimeUTC, postsPerRun, persona])

  return (
    <div className="card" style={{ maxWidth: 680 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Enabled toggle */}
        <FieldRow label="Autoblog engine">
          <ToggleSwitch
            checked={enabled}
            onChange={setEnabled}
            label={enabled ? 'Enabled — runs on schedule' : 'Disabled'}
          />
        </FieldRow>

        {/* Frequency */}
        <FieldRow label="Run frequency">
          <PillSelector
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={setFrequency}
          />
        </FieldRow>

        {/* Run time (MT) */}
        <FieldRow label="Run time (Mountain Time)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="time"
              value={runTimeMT}
              onChange={(e) => handleMTChange(e.target.value)}
              className="input-base"
              style={{ width: 140 }}
            />
            <span
              style={{
                fontFamily: 'var(--mono-font)',
                fontSize: 11,
                color: 'var(--text-muted)',
              }}
            >
              UTC {runTimeUTC}
            </span>
          </div>
        </FieldRow>

        {/* Posts per run */}
        <FieldRow label="Posts per run">
          <PillSelector
            options={POSTS_OPTIONS as readonly { value: string; label: string }[]}
            value={postsPerRun}
            onChange={setPostsPerRun}
          />
        </FieldRow>

        {/* Target persona */}
        <FieldRow label="Target persona">
          <select
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            className="input-base"
            style={{ maxWidth: 420 }}
          >
            {PERSONA_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FieldRow>

        {/* Engine status */}
        <FieldRow label="Engine status">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {engineStatus === 'healthy' && (
              <>
                <CheckCircle size={16} style={{ color: 'var(--status-success)' }} />
                <span className="text-body-sm" style={{ color: 'var(--status-success)' }}>
                  Engine reachable
                </span>
              </>
            )}
            {engineStatus === 'error' && (
              <>
                <XCircle size={16} style={{ color: 'var(--sovereign)' }} />
                <span className="text-body-sm" style={{ color: 'var(--sovereign)' }}>
                  Engine unreachable
                </span>
              </>
            )}
            {engineStatus === 'unknown' && (
              <span className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
                Checking…
              </span>
            )}
          </div>
        </FieldRow>

        {/* Save row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`btn-primary ${saving ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save settings'}
          </button>
          {saveError && (
            <p className="text-body-sm" style={{ color: 'var(--sovereign)' }}>
              {saveError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
