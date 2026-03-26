import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { OutreachContact, OutreachMatch } from '@/lib/types/crm';

/** scout_notices row shape — only the columns we SELECT */
type ScoutNoticeRow = {
  id: string;
  unspsc_code: string;
  closing_date: string;
};

/** Pending upsert row (without server-generated columns) */
type MatchUpsertRow = Pick<OutreachMatch, 'contact_id' | 'notice_id' | 'match_score' | 'matched_unspsc'>;

export async function POST(request: NextRequest) {
  /* ── Auth: validate cron secret ─────────────────────────── */
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = await createServiceRoleClient();

  /* ── 1. Fetch eligible PSIB contacts ────────────────────── */
  const { data: contacts, error: contactsErr } = await service
    .from('outreach_contacts')
    .select('id, unspsc_categories')
    .eq('pipeline', 'psib')
    .neq('status', 'unsubscribed')
    .returns<Pick<OutreachContact, 'id' | 'unspsc_categories'>[]>();

  if (contactsErr) {
    return NextResponse.json({ error: contactsErr.message }, { status: 500 });
  }

  /* ── 2. Fetch active PSIB notices ───────────────────────── */
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD for date column
  const { data: notices, error: noticesErr } = await service
    .from('scout_notices')
    .select('id, unspsc_code, closing_date')
    .eq('is_psib', true)
    .gt('closing_date', today)
    .returns<ScoutNoticeRow[]>();

  if (noticesErr) {
    return NextResponse.json({ error: noticesErr.message }, { status: 500 });
  }

  if (!contacts || contacts.length === 0 || !notices || notices.length === 0) {
    return NextResponse.json({ success: true, matched: 0 });
  }

  /* ── 3 + 4. Match contacts to notices by UNSPSC overlap ── */
  const upsertRows: MatchUpsertRow[] = [];

  for (const contact of contacts) {
    const categories = contact.unspsc_categories ?? [];
    if (categories.length === 0) continue;

    /** Pre-compute segment prefixes (first 2 digits) for the contact */
    const contactSegments = new Set(
      categories.map((code) => code.slice(0, 2)),
    );

    for (const notice of notices) {
      const noticeCode = notice.unspsc_code;
      if (!noticeCode) continue;

      const noticeSegment = noticeCode.slice(0, 2);

      /** Exact code match */
      if (categories.includes(noticeCode)) {
        upsertRows.push({
          contact_id: contact.id,
          notice_id: notice.id,
          match_score: 1.0,
          matched_unspsc: noticeCode,
        });
        continue;
      }

      /** Segment-level match (first 2 digits) */
      if (contactSegments.has(noticeSegment)) {
        // Find the first contact category that shares the segment
        const segmentMatch = categories.find(
          (code) => code.slice(0, 2) === noticeSegment,
        );
        upsertRows.push({
          contact_id: contact.id,
          notice_id: notice.id,
          match_score: 0.5,
          matched_unspsc: segmentMatch ?? noticeSegment,
        });
      }
    }
  }

  if (upsertRows.length === 0) {
    return NextResponse.json({ success: true, matched: 0 });
  }

  /* ── 5. Upsert matches (idempotent via unique constraint) ─ */
  const { error: upsertErr } = await service
    .from('outreach_matches')
    .upsert(upsertRows, {
      onConflict: 'contact_id,notice_id',
      ignoreDuplicates: false,
    });

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  /* ── 6. Return result ───────────────────────────────────── */
  return NextResponse.json({ success: true, matched: upsertRows.length });
}
