import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createEngineClient } from '@/lib/supabase/engine';
import { requireContentAccess } from '@/lib/autoblog/auth';
import { fetchReviewQueue } from '@/lib/autoblog/review-queue';

export async function GET() {
  const auth = await requireContentAccess();
  if (auth instanceof NextResponse) return auth;

  const marketing = await createServiceRoleClient();
  const engine = createEngineClient();

  try {
    const queue = await fetchReviewQueue(marketing, engine);
    return NextResponse.json(queue);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Queue fetch failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
