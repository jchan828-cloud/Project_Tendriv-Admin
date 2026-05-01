'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { ORG_TYPE_LABEL } from '@/lib/crm/labels'

const PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT']

type AccountInit = {
  id: string
  name: string
  organisation_type: string
  province: string | null
  naics_codes: string[]
  annual_procurement_value_cad: number | null
}

interface AccountFormProps {
  initial?: AccountInit
  onClose: () => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--mono-font)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-label)', marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

export function AccountForm({ initial, onClose }: AccountFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fields, setFields] = useState({
    name: initial?.name ?? '',
    organisation_type: initial?.organisation_type ?? 'enterprise',
    province: initial?.province ?? '',
    naics_codes: initial?.naics_codes.join(', ') ?? '',
    annual_procurement_value_cad: initial?.annual_procurement_value_cad?.toString() ?? '',
  })

  function set(key: keyof typeof fields, value: string) {
    setFields((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fields.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)

    const url = initial ? `/api/admin/crm/accounts/${initial.id}` : '/api/admin/crm/accounts'
    const res = await fetch(url, {
      method: initial ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fields.name,
        organisation_type: fields.organisation_type,
        province: fields.province || null,
        naics_codes: fields.naics_codes,
        annual_procurement_value_cad: fields.annual_procurement_value_cad
          ? parseFloat(fields.annual_procurement_value_cad)
          : null,
      }),
    })

    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError((data as { error?: string }).error ?? 'Something went wrong')
      return
    }
    router.refresh()
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '7px 10px', fontSize: 13,
    background: 'var(--surface-root)', border: '0.5px solid var(--border)',
    borderRadius: 6, color: 'var(--text-body)',
    fontFamily: 'inherit', outline: 'none',
  }
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 440,
        background: 'var(--surface-panel)', borderLeft: '0.5px solid var(--border)',
        zIndex: 50, display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '0.5px solid var(--border)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)', margin: 0 }}>
            {initial ? 'Edit account' : 'New account'}
          </h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '4px 6px', lineHeight: 1 }}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <Field label="Organization name *">
            <input className="input-base" style={inputStyle} value={fields.name} onChange={(e) => set('name', e.target.value)} placeholder="Department of Finance" />
          </Field>

          <Field label="Type">
            <select style={selectStyle} value={fields.organisation_type} onChange={(e) => set('organisation_type', e.target.value)}>
              {Object.entries(ORG_TYPE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>

          <Field label="Province">
            <select style={selectStyle} value={fields.province} onChange={(e) => set('province', e.target.value)}>
              <option value="">— None —</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>

          <Field label="Annual procurement value (CAD)">
            <input
              className="input-base"
              style={{ ...inputStyle, fontFamily: 'var(--mono-font)' }}
              type="number"
              min="0"
              step="0.01"
              value={fields.annual_procurement_value_cad}
              onChange={(e) => set('annual_procurement_value_cad', e.target.value)}
              placeholder="0.00"
            />
          </Field>

          <Field label="NAICS codes (comma-separated)">
            <input
              className="input-base"
              style={{ ...inputStyle, fontFamily: 'var(--mono-font)' }}
              value={fields.naics_codes}
              onChange={(e) => set('naics_codes', e.target.value)}
              placeholder="541511, 541512"
            />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Separate multiple codes with commas.
            </p>
          </Field>

          {error && (
            <p style={{ fontSize: 12, color: 'var(--status-danger)', marginBottom: 12 }}>{error}</p>
          )}
        </form>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 24px', borderTop: '0.5px solid var(--border)' }}>
          <button type="button" className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button
            className="btn-primary"
            style={{ flex: 1 }}
            disabled={saving}
            onClick={(e) => { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent) }}
          >
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Create account'}
          </button>
        </div>
      </div>
    </>
  )
}
