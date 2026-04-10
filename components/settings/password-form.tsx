'use client'

import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export function PasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Minimum 8 characters'); return }
    setLoading(true)
    const supabase = createBrowserSupabaseClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSuccess(true)
    setPassword('')
    setConfirm('')
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '360px' }}>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password"
        minLength={8}
        required
        className="input-base"
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirm password"
        required
        className="input-base"
      />
      {error && <p className="text-mono-xs" style={{ color: 'var(--status-error)' }}>{error}</p>}
      {success && <p className="text-mono-xs" style={{ color: 'var(--status-success)' }}>Password updated.</p>}
      <button type="submit" disabled={loading} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
        {loading ? '…' : 'Update password'}
      </button>
    </form>
  )
}
