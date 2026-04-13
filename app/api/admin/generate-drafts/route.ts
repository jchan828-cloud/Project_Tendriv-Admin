/** Admin API — trigger blog draft generation on the marketing site.
 *  Proxies to POST {MARKETING_URL}/api/marketing/blog-writer with the
 *  x-vercel-cron header so it passes the auth check.
 */

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL
  if (!marketingUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_MARKETING_URL not configured' }, { status: 503 })
  }

  try {
    const res = await fetch(`${marketingUrl}/api/marketing/blog-writer`, {
      method: 'POST',
      headers: { 'x-vercel-cron': '1' },
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? `Marketing site returned ${res.status}` },
        { status: res.status },
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to reach marketing site' },
      { status: 502 },
    )
  }
}
