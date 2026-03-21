'use client';

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createBrowserSupabaseClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) { setError(err.message); return; }
    setSent(true);
  }

  if (sent) return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <p className="text-center text-gray-600">Check your email for a sign-in link.</p>
    </main>
  );

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold text-gray-900">tendriv admin</h1>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com" required className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full rounded bg-gray-900 px-3 py-2 text-sm text-white">Send magic link</button>
      </form>
    </main>
  );
}
