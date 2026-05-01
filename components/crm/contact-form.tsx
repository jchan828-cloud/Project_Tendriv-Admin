'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { STATUS_LABEL, SOURCE_LABEL } from '@/lib/crm/labels'

const PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT']

type ContactInit = {
  id: string
  business_name: string
  contact_email: string | null
  status: string
  pipeline: string
  province: string | null
  contact_website: string | null
  notes: string | null
  casl_consent_date: string | null
  casl_consent_method: string | null
  casl_consent_source: string | null
}

interface ContactFormProps {
  initial?: ContactInit
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

export function ContactForm({ initial, onClose }: ContactFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fields, setFields] = useState({
    business_name: initial?.business_name ?? '',
    contact_email: initial?.contact_email ?? '',
    status: initial?.status ?? 'prospect',
    pipeline: initial?.pipeline ?? 'manual',
    province: initial?.province ?? '',
    contact_website: initial?.contact_website ?? '',
    notes: initial?.notes ?? '',
    casl_consent_date: initial?.casl_consent_date?.slice(0, 10) ?? '',
    casl_consent_method: initial?.casl_consent_method ?? '',
    casl_consent_source: initial?.casl_consent_source ?? '',
  })

  function set(key: keyof typeof fields, value: string) {
    setFields((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fields.business_name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)

    const url = initial ? `/api/admin/crm/${initial.id}` : '/api/admin/crm'
    const res = await fetch(url, {
      method: initial ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: fields.business_name,
        contact_email: fields.contact_email || null,
        status: fields.status,
        pipeline: fields.pipeline,
        province: fields.province || null,
        contact_website: fields.contact_website || null,
        notes: fields.notes || null,
        casl_consent_date: fields.casl_consent_date || null,
        casl_consent_method: fields.casl_consent_method || null,
        casl_consent_source: fields.casl_consent_source || null,
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
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
        background: 'var(--surface-panel)', borderLeft: '0.5px solid var(--border)',
        zIndex: 50, display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '0.5px solid var(--border)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-heading)', margin: 0 }}>
            {initial ? 'Edit contact' : 'New contact'}
          </h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '4px 6px', lineHeight: 1 }}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <Field label="Organization name *">
            <input className="input-base" style={inputStyle} value={fields.business_name} onChange={(e) => set('business_name', e.target.value)} placeholder="Acme Corp" />
          </Field>

          <Field label="Contact email">
            <input className="input-base" style={inputStyle} type="email" value={fields.contact_email} onChange={(e) => set('contact_email', e.target.value)} placeholder="contact@example.com" />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Status">
              <select style={selectStyle} value={fields.status} onChange={(e) => set('status', e.target.value)}>
                {Object.entries(STATUS_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Source">
              <select style={selectStyle} value={fields.pipeline} onChange={(e) => set('pipeline', e.target.value)}>
                {Object.entries(SOURCE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Province">
            <select style={selectStyle} value={fields.province} onChange={(e) => set('province', e.target.value)}>
              <option value="">— None —</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>

          <Field label="Website">
            <input className="input-base" style={inputStyle} type="url" value={fields.contact_website} onChange={(e) => set('contact_website', e.target.value)} placeholder="https://" />
          </Field>

          <Field label="Notes">
            <textarea
              style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
              value={fields.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Internal notes…"
            />
          </Field>

          <div style={{ borderTop: '0.5px solid var(--border)', marginBottom: 14, paddingTop: 14 }}>
            <div className="section-label" style={{ marginBottom: 12 }}>CASL consent</div>
          </div>

          <Field label="Consent date">
            <input className="input-base" style={inputStyle} type="date" value={fields.casl_consent_date} onChange={(e) => set('casl_consent_date', e.target.value)} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Method">
              <input className="input-base" style={inputStyle} value={fields.casl_consent_method} onChange={(e) => set('casl_consent_method', e.target.value)} placeholder="e.g. form" />
            </Field>
            <Field label="Source">
              <input className="input-base" style={inputStyle} value={fields.casl_consent_source} onChange={(e) => set('casl_consent_source', e.target.value)} placeholder="e.g. website" />
            </Field>
          </div>

          {error && (
            <p style={{ fontSize: 12, color: 'var(--status-danger)', marginBottom: 12 }}>{error}</p>
          )}
        </form>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 24px', borderTop: '0.5px solid var(--border)' }}>
          <button type="button" className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button
            type="submit"
            form=""
            className="btn-primary"
            style={{ flex: 1 }}
            disabled={saving}
            onClick={(e) => { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent) }}
          >
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Create contact'}
          </button>
        </div>
      </div>
    </>
  )
}
