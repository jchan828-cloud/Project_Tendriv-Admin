import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireContentAccess } from '@/lib/autoblog/auth';
import { fetchReviewQueue } from '@/lib/autoblog/review-queue';

export async function GET() {
  const auth = await requireContentAccess();
  if (auth instanceof NextResponse) return auth;

  // Single-DB now: blog_posts and autoblog_runs share the marketing DB, so the
  // review-queue join runs through one client.
  const supabase = await createServiceRoleClient();

  try {
    const queue = await fetchReviewQueue(supabase);
    return NextResponse.json(queue);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Queue fetch failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
