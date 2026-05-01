'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { PasswordForm } from '@/components/settings/password-form'

interface ProfileClientProps {
  initialDisplayName: string
}

export function ProfileClient({ initialDisplayName }: ProfileClientProps) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSaveDisplayName(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveSuccess(false)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.updateUser({ data: { display_name: displayName } })
    setSaving(false)
    setSaveSuccess(true)
  }

  async function handleSignOutEverywhere() {
    setSigningOut(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/login')
  }

  return (
    <>
      {/* Display name */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div className="section-label" style={{ marginBottom: 14 }}>Display name</div>
        <form onSubmit={handleSaveDisplayName} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <input
            className="input-base"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setSaveSuccess(false) }}
            placeholder="Your name"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? '…' : 'Save'}
          </button>
        </form>
        {saveSuccess && (
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--status-success)', fontFamily: 'var(--mono-font)' }}>
            Display name saved.
          </p>
        )}
      </div>

      {/* Password */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div className="section-label" style={{ marginBottom: 14 }}>Password</div>
        <PasswordForm />
      </div>

      {/* Sessions + DangerRow */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div className="section-label" style={{ marginBottom: 14 }}>Sessions</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Active session tracking will be available once configured.
        </p>
        <div style={{ border: '1px solid var(--status-danger)', borderRadius: 8, padding: '14px 18px' }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-heading)', marginBottom: 4 }}>
            Sign out everywhere
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Ends every active session including this one. You&apos;ll need to sign in again on every device.
          </p>
          <button
            className="btn-danger"
            onClick={handleSignOutEverywhere}
            disabled={signingOut}
          >
            {signingOut ? '…' : 'Sign out everywhere'}
          </button>
        </div>
      </div>

      {/* Notifications placeholder */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div className="section-label" style={{ marginBottom: 12 }}>Notifications</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Notification preferences will appear here once event types are configured.
        </p>
      </div>
    </>
  )
}
