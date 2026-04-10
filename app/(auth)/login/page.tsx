'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type Mode = 'password' | 'magic';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createBrowserSupabaseClient();

    if (mode === 'password') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (err) { setError(err.message); return; }
      router.push('/posts');
      router.refresh();
    } else {
      const { error: err } = await supabase.auth.signInWithOtp({
        email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      setLoading(false);
      if (err) { setError(err.message); return; }
      setSent(true);
    }
  }

  if (sent) return (
    <main className="flex min-h-screen items-center justify-center p-4" style={{ background: 'var(--surface-root)' }}>
      <div className="w-full max-w-sm text-center">
        <p className="text-sm" style={{ color: 'var(--text-body)' }}>Check your email for a sign-in link.</p>
        <button onClick={() => setSent(false)} className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          Back to login
        </button>
      </div>
    </main>
  );

  return (
    <main className="flex min-h-screen items-center justify-center p-4" style={{ background: 'var(--surface-root)' }}>
      <form onSubmit={handleSubmit} className="w-full max-w-sm" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ marginBottom: '8px' }}>
          <span className="text-heading-sm" style={{ color: 'var(--jade-dim)', fontWeight: 700, letterSpacing: '-0.02em' }}>tendriv</span>
          <span className="section-label" style={{ marginLeft: '8px' }}>admin</span>
        </div>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          required
          className="input-base"
        />

        {mode === 'password' && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            required
            className="input-base"
          />
        )}

        {error && <p className="text-mono-xs" style={{ color: 'var(--status-error)' }}>{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '4px' }}>
          {loading ? '…' : mode === 'password' ? 'Sign in' : 'Send magic link'}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === 'password' ? 'magic' : 'password'); setError(''); setPassword(''); }}
          className="text-mono-xs"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}
        >
          {mode === 'password' ? 'Use magic link instead' : 'Use password instead'}
        </button>
      </form>
    </main>
  );
}
