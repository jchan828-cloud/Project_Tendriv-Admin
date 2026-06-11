import { NextResponse } from 'next/server';
import { createEngineClient } from '@/lib/supabase/engine';
import { requireContentAccess } from '@/lib/autoblog/auth';

export async function GET() {
  const auth = await requireContentAccess();
  if (auth instanceof NextResponse) return auth;

  // autoblog_settings lives in the engine DB — the workflow reads its schedule
  // from there, so the admin UI must edit the same row.
  const supabase = createEngineClient();
  const { data, error } = await supabase
    .from('autoblog_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const auth = await requireContentAccess();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const supabase = createEngineClient();

  const { error } = await supabase
    .from('autoblog_settings')
    .update({
      enabled: body.enabled,
      frequency: body.frequency,
      run_time_utc: body.run_time_utc,
      posts_per_run: body.posts_per_run,
      target_persona: body.target_persona,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
