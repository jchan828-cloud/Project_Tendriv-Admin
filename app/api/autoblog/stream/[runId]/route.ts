import { NextRequest, NextResponse } from 'next/server';
import { proxyToEngine } from '@/lib/autoblog/proxy';
import { requireContentAccess } from '@/lib/autoblog/auth';

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requireContentAccess();
  if (auth instanceof NextResponse) return auth;

  const { runId } = await params;
  const res = await proxyToEngine(`/api/autoblog-readable/${runId}`);

  if (!res.ok || !res.body) {
    return NextResponse.json({ error: 'Stream not available' }, { status: res.status });
  }

  return new Response(res.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
