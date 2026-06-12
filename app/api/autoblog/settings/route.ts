import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireContentAccess } from '@/lib/autoblog/auth';

export async function GET() {
  const auth = await requireContentAccess();
  if (auth instanceof NextResponse) return auth;

  // Since the blog DB consolidation, autoblog_settings lives in the same
  // marketing DB — read through the single service-role client.
  const supabase = await createServiceRoleClient();
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
  const supabase = await createServiceRoleClient();

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
