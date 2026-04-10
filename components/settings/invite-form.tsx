'use client'

import { useState } from 'react'
import type { UserRole, ModuleKey } from '@/lib/auth/roles'

const ALL_MODULES: ModuleKey[] = ['content', 'analytics', 'crm', 'system']

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'crm-manager', label: 'CRM Manager' },
]

const DEFAULT_MODULES: Record<UserRole, ModuleKey[]> = {
  admin: ['content', 'analytics', 'crm', 'system'],
  editor: ['content', 'analytics'],
  analyst: ['analytics'],
  'crm-manager': ['crm'],
}

export function InviteForm() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('editor')
  const [modules, setModules] = useState<ModuleKey[]>(DEFAULT_MODULES['editor'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleRoleChange(r: UserRole) {
    setRole(r)
    setModules(DEFAULT_MODULES[r])
  }

  function toggleModule(m: ModuleKey) {
    setModules((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)
    const res = await fetch('/api/settings/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role, modules }),
    })
    const json = await res.json()
    setLoading(false)
    if (!json.success) { setError(json.error ?? 'Invite failed'); return }
    setSuccess(true)
    setEmail('')
    setRole('editor')
    setModules(DEFAULT_MODULES['editor'])
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', maxWidth: '480px' }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@example.com"
          required
          className="input-base"
        />
        <select
          value={role}
          onChange={(e) => handleRoleChange(e.target.value as UserRole)}
          className="input-base"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span className="section-label" style={{ minWidth: '56px' }}>Modules</span>
        {ALL_MODULES.map((m) => (
          <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={modules.includes(m)}
              onChange={() => toggleModule(m)}
            />
            <span className="text-mono-xs">{m}</span>
          </label>
        ))}
      </div>

      {error && <p className="text-mono-xs" style={{ color: 'var(--status-error)' }}>{error}</p>}
      {success && <p className="text-mono-xs" style={{ color: 'var(--status-success)' }}>Invite sent — they will receive an email to set their password.</p>}

      <div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? '…' : 'Send invite'}
        </button>
      </div>
    </form>
  )
}
