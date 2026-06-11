import { NextResponse } from 'next/server';
import { createEngineClient } from '@/lib/supabase/engine';
import { requireContentAccess } from '@/lib/autoblog/auth';

export async function GET() {
  const auth = await requireContentAccess();
  if (auth instanceof NextResponse) return auth;

  // autoblog_runs lives in the engine DB (tendriv-blog-content), not the
  // marketing DB this app otherwise uses.
  const supabase = createEngineClient();
  const { data, error } = await supabase
    .from('autoblog_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
