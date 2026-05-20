import { NextResponse } from 'next/server';
import { proxyToEngine } from '@/lib/autoblog/proxy';
import { requireContentAccess } from '@/lib/autoblog/auth';

export async function GET() {
  const auth = await requireContentAccess();
  if (auth instanceof NextResponse) return auth;

  try {
    const res = await proxyToEngine('/api/autoblog-health');
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, error: 'Engine unreachable' }, { status: 502 });
  }
}
