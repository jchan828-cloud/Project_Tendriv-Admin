import { NextRequest, NextResponse } from 'next/server';
import { proxyToEngine } from '@/lib/autoblog/proxy';
import { requireContentAccess } from '@/lib/autoblog/auth';

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requireContentAccess();
  if (auth instanceof NextResponse) return auth;

  const { runId } = await params;
  const res = await proxyToEngine(`/api/autoblog-run/${runId}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
