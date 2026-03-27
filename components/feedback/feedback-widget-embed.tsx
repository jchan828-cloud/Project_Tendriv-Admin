/**
 * Embeddable feedback widget — drop this component into the customer-facing
 * Next.js app, or serve the script version from /api/feedback/widget/script.
 *
 * Usage in a Next.js app:
 *   import { FeedbackWidget } from '@tendriv/admin/components/feedback/feedback-widget-embed'
 *   <FeedbackWidget endpoint="https://admin.tendriv.ca/api/feedback/widget" />
 *
 * Usage as a script tag on any site:
 *   <script src="https://admin.tendriv.ca/api/feedback/widget/script?endpoint=https://admin.tendriv.ca/api/feedback/widget"></script>
 */

'use client'

import { useState } from 'react'

const CATEGORIES = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature-request', label: 'Feature Request' },
  { value: 'ux', label: 'UX / Design' },
  { value: 'performance', label: 'Performance' },
  { value: 'content', label: 'Content' },
  { value: 'billing', label: 'Billing' },
  { value: 'praise', label: 'Praise' },
  { value: 'general', label: 'General' },
]

interface FeedbackWidgetProps {
  endpoint?: string
  position?: 'bottom-right' | 'bottom-left'
  primaryColor?: string
}

export function FeedbackWidget({
  endpoint = '/api/feedback/widget',
  position = 'bottom-right',
  primaryColor = '#00C896',
}: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', category: 'general', rating: 0, title: '', body: '',
  })

  async function submit() {
    if (!form.body.trim()) return
    setLoading(true)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          rating: form.rating || null,
          page_url: typeof window !== 'undefined' ? window.location.href : null,
        }),
      })
      if (res.ok) {
        setSubmitted(true)
        setTimeout(() => { setOpen(false); setSubmitted(false); setForm({ name: '', email: '', category: 'general', rating: 0, title: '', body: '' }) }, 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  const posStyle = position === 'bottom-left' ? { left: 20 } : { right: 20 }

  return (
    <>
      {/* Trigger button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', bottom: 20, ...posStyle, zIndex: 9999,
            background: primaryColor, color: '#fff', border: 'none', borderRadius: 28,
            padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          Feedback
        </button>
      )}

      {/* Widget panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 20, ...posStyle, zIndex: 9999,
          width: 360, maxHeight: '80vh', overflowY: 'auto',
          background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)', fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: '#0A0C10' }}>Send Feedback</span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#8A97A8' }}>x</button>
          </div>

          {submitted ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>Thank you!</div>
              <div style={{ color: '#4A5668', fontSize: 14 }}>Your feedback has been received.</div>
            </div>
          ) : (
            <div style={{ padding: 16 }}>
              {/* Rating */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#4A5668', display: 'block', marginBottom: 4 }}>How is your experience?</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setForm({ ...form, rating: n })}
                      style={{
                        background: 'none', border: 'none', fontSize: 24, cursor: 'pointer',
                        color: n <= form.rating ? '#F59E0B' : '#C4CBD4',
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div style={{ marginBottom: 10 }}>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={{
                    width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 6,
                    border: '1px solid #C4CBD4', background: '#fff', color: '#0A0C10',
                  }}
                >
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              {/* Name + Email (optional) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <input
                  placeholder="Name (optional)"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ padding: '8px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #C4CBD4' }}
                />
                <input
                  placeholder="Email (optional)"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={{ padding: '8px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #C4CBD4' }}
                />
              </div>

              {/* Title */}
              <input
                placeholder="Subject"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #C4CBD4', marginBottom: 10 }}
              />

              {/* Body */}
              <textarea
                placeholder="Tell us what's on your mind..."
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={4}
                style={{
                  width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 6,
                  border: '1px solid #C4CBD4', resize: 'vertical', marginBottom: 12,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              />

              <button
                onClick={submit}
                disabled={loading || !form.body.trim()}
                style={{
                  width: '100%', padding: '10px 16px', fontSize: 14, fontWeight: 600,
                  borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: !form.body.trim() ? '#C4CBD4' : primaryColor,
                  color: '#fff',
                }}
              >
                {loading ? 'Sending...' : 'Submit Feedback'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
