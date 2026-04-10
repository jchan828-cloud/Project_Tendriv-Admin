'use client'

import { useState } from 'react'
import type { UserRole, ModuleKey } from '@/lib/auth/roles'

export interface UserRow {
  id: string
  email: string
  createdAt: string
  lastSignIn: string | null | undefined
  role: string
  modules: string[]
  isCurrentUser: boolean
}

const ALL_MODULES: ModuleKey[] = ['content', 'analytics', 'crm', 'system']
const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'crm-manager', label: 'CRM Manager' },
]

function fmt(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function UserRoleEditor({ user }: { user: UserRow }) {
  const [editing, setEditing] = useState(false)
  const [role, setRole] = useState<UserRole>(user.role as UserRole)
  const [modules, setModules] = useState<ModuleKey[]>(user.modules as ModuleKey[])
  const [loading, setLoading] = useState(false)

  function toggleModule(m: ModuleKey) {
    setModules((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m])
  }

  async function handleSave() {
    setLoading(true)
    await fetch(`/api/settings/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, modules }),
    })
    setLoading(false)
    setEditing(false)
  }

  async function handleRevoke() {
    if (!confirm(`Revoke access for ${user.email}? This cannot be undone.`)) return
    setLoading(true)
    await fetch(`/api/settings/users/${user.id}`, { method: 'DELETE' })
    window.location.reload()
  }

  if (editing) {
    return (
      <tr style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--surface-hover)' }}>
        <td className="px-4 py-3 text-body-sm font-medium">{user.email}</td>
        <td className="px-4 py-3">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="input-base"
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3">
          <div style={{ display: 'flex', gap: '10px' }}>
            {ALL_MODULES.map((m) => (
              <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="checkbox" checked={modules.includes(m)} onChange={() => toggleModule(m)} />
                <span className="text-mono-xs">{m}</span>
              </label>
            ))}
          </div>
        </td>
        <td className="px-4 py-3 text-mono-xs" style={{ color: 'var(--text-muted)' }}>{fmt(user.createdAt)}</td>
        <td className="px-4 py-3 text-mono-xs" style={{ color: 'var(--text-muted)' }}>{fmt(user.lastSignIn)}</td>
        <td className="px-4 py-3">
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={handleSave} disabled={loading} className="btn-primary" style={{ fontSize: '11px', padding: '4px 10px' }}>
              {loading ? '…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }}>
              Cancel
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
      <td className="px-4 py-3 text-body-sm font-medium">
        {user.email}
        {user.isCurrentUser && <span className="badge badge-jade" style={{ marginLeft: '8px' }}>you</span>}
      </td>
      <td className="px-4 py-3">
        <span className="badge badge-neutral">{role}</span>
      </td>
      <td className="px-4 py-3">
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {modules.map((m) => <span key={m} className="badge badge-neutral">{m}</span>)}
        </div>
      </td>
      <td className="px-4 py-3 text-mono-xs" style={{ color: 'var(--text-muted)' }}>{fmt(user.createdAt)}</td>
      <td className="px-4 py-3 text-mono-xs" style={{ color: 'var(--text-muted)' }}>{fmt(user.lastSignIn)}</td>
      <td className="px-4 py-3">
        {!user.isCurrentUser && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setEditing(true)} className="btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }}>Edit</button>
            <button onClick={handleRevoke} disabled={loading} style={{ fontSize: '11px', padding: '4px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-error)' }}>
              Revoke
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
