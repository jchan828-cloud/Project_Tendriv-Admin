import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createEngineClient } from '@/lib/supabase/engine';
import { requireContentAccess } from '@/lib/autoblog/auth';
import { promotePost } from '@/lib/autoblog/review-actions';

export async function POST(request: Request) {
  const auth = await requireContentAccess();
  if (auth instanceof NextResponse) return auth;

  const { slug } = await request.json();
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  const marketing = await createServiceRoleClient();
  const engine = createEngineClient();
  const result = await promotePost(marketing, engine, slug, auth.userId);

  // 409: the review-status guard found nothing to update — already actioned.
  if (result.conflict) return NextResponse.json(result, { status: 409 });
  if (!result.marketing.ok) return NextResponse.json(result, { status: 500 });
  // 200 even when ok=false: the post IS published; the body carries the
  // partial-state detail (engine mirror failed) for the UI to surface.
  return NextResponse.json(result);
}
