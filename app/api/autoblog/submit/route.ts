import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireContentAccess } from '@/lib/autoblog/auth';
import { submitPostForReview } from '@/lib/autoblog/review-actions';

// W2: the draft → review transition has its own guarded surface — status is
// no longer settable through the generic PATCH on /api/marketing/posts/[id].
export async function POST(request: Request) {
  const auth = await requireContentAccess();
  if (auth instanceof NextResponse) return auth;

  const { slug } = await request.json();
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();
  const result = await submitPostForReview(supabase, slug, auth.userId);

  // 409: the draft-status guard found nothing to update — already actioned.
  if (result.conflict) return NextResponse.json(result, { status: 409 });
  if (!result.post.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
