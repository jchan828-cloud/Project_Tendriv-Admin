import { NextResponse } from 'next/server';
import { proxyToEngine } from '@/lib/autoblog/proxy';
import { requireContentAccess } from '@/lib/autoblog/auth';

export async function POST() {
  const auth = await requireContentAccess();
  if (auth instanceof NextResponse) return auth;

  const res = await proxyToEngine('/api/autoblog', { method: 'POST' });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
