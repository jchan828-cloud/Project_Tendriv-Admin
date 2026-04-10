// components/blog/generation-settings-form.tsx
'use client'

import { useState, useTransition } from 'react'
import { saveSettings } from '@/lib/actions/blog-settings'

export function GenerationSettingsForm({ initialValue }: { initialValue: number }) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await saveSettings(value)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    })
  }

  return (
    <div className="card p-4 flex items-center gap-4">
      <label className="text-label-sm text-[var(--text-muted)]" htmlFor="blogs-per-day">
        Blogs per day
      </label>
      <input
        id="blogs-per-day"
        type="number"
        min={1}
        max={5}
        value={value}
        onChange={e => setValue(Number(e.target.value))}
        className="input-base w-20"
      />
      <button
        onClick={handleSave}
        disabled={isPending}
        className={`btn-primary btn-sm ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {isPending ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
      </button>
      {error && <p className="text-body-sm text-[var(--sovereign)]">{error}</p>}
    </div>
  )
}
