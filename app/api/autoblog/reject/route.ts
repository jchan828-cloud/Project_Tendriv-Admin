import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireContentAccess } from '@/lib/autoblog/auth';
import { rejectPost } from '@/lib/autoblog/review-actions';

export async function POST(request: Request) {
  const auth = await requireContentAccess();
  if (auth instanceof NextResponse) return auth;

  const { slug } = await request.json();
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();
  const result = await rejectPost(supabase, slug, auth.userId);

  // 409: the review-status guard found nothing to update — already actioned.
  if (result.conflict) return NextResponse.json(result, { status: 409 });
  if (!result.post.ok) return NextResponse.json(result, { status: 500 });
  // 200 even when ok=false: the post IS archived; the body carries the
  // partial-state detail (topic recycle failed) for the UI to surface.
  return NextResponse.json(result);
}
