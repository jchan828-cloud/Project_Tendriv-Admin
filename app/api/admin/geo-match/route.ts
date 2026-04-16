import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * MK8-GEO-004: Geo-match algorithm cron route.
 * Implements DEC-MK-076 scoring:
 *   final_score = region_match × 0.6 + unspsc_match × 0.4
 *
 * Schedule: daily at 10:00 UTC (vercel.json cron)
 */

type GeoContact = {
  id: string;
  province: string | null;
  region_cluster: string | null;
  unspsc_categories: string[];
};

type ScoutNotice = {
  id: string;
  region_province: string | null;
  region_cluster: string | null;
  unspsc_code: string | null;
  closing_date: string;
};

type MatchRow = {
  contact_id: string;
  notice_id: string;
  match_score: number;
  matched_unspsc: string | null;
};

function computeRegionScore(
  contact: GeoContact,
  notice: ScoutNotice,
): number {
  if (
    contact.province &&
    notice.region_province &&
    contact.province.toLowerCase() === notice.region_province.toLowerCase()
  ) {
    return 1.0;
  }
  if (
    contact.region_cluster &&
    notice.region_cluster &&
    contact.region_cluster === notice.region_cluster
  ) {
    return 0.6;
  }
  return 0;
}

function computeUnspscScore(
  contactCategories: string[],
  noticeCode: string | null,
): { score: number; matchedCode: string | null } {
  if (!noticeCode || contactCategories.length === 0) {
    return { score: 0, matchedCode: null };
  }

  // Class-level match (first 6 digits)
  const noticeClass = noticeCode.slice(0, 6);
  const classMatch = contactCategories.find(
    (c) => c.slice(0, 6) === noticeClass,
  );
  if (classMatch) return { score: 1.0, matchedCode: classMatch };

  // Family-level match (first 4 digits)
  const noticeFamily = noticeCode.slice(0, 4);
  const familyMatch = contactCategories.find(
    (c) => c.slice(0, 4) === noticeFamily,
  );
  if (familyMatch) return { score: 0.8, matchedCode: familyMatch };

  // Segment-level match (first 2 digits)
  const noticeSegment = noticeCode.slice(0, 2);
  const segmentMatch = contactCategories.find(
    (c) => c.slice(0, 2) === noticeSegment,
  );
  if (segmentMatch) return { score: 0.5, matchedCode: segmentMatch };

  return { score: 0, matchedCode: null };
}

const BATCH_SIZE = 500;

async function handler(request: NextRequest) {
  /* ── Auth: validate cron secret ─────────────────────────── */
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = await createServiceRoleClient();

  /* ── 1. Fetch eligible geo contacts ─────────────────────── */
  const { data: contacts, error: contactsErr } = await service
    .from('outreach_contacts')
    .select('id, province, region_cluster, unspsc_categories')
    .eq('pipeline', 'geo')
    .neq('status', 'unsubscribed')
    .returns<GeoContact[]>();

  if (contactsErr) {
    return NextResponse.json({ error: contactsErr.message }, { status: 500 });
  }

  /* ── 2. Fetch active notices with region data ───────────── */
  const today = new Date().toISOString().slice(0, 10);
  const { data: notices, error: noticesErr } = await service
    .from('scout_notices')
    .select('id, region_province, region_cluster, unspsc_code, closing_date')
    .gt('closing_date', today)
    .returns<ScoutNotice[]>();

  if (noticesErr) {
    return NextResponse.json({ error: noticesErr.message }, { status: 500 });
  }

  if (!contacts?.length || !notices?.length) {
    return NextResponse.json({ success: true, matched: 0 });
  }

  /* ── 3. Compute matches using DEC-MK-076 formula ────────── */
  const rows: MatchRow[] = [];

  for (const contact of contacts) {
    for (const notice of notices) {
      const regionScore = computeRegionScore(contact, notice);
      if (regionScore === 0) continue; // No region overlap — skip

      const { score: unspscScore, matchedCode } = computeUnspscScore(
        contact.unspsc_categories ?? [],
        notice.unspsc_code,
      );

      const finalScore = regionScore * 0.6 + unspscScore * 0.4;
      if (finalScore < 0.5) continue; // Below threshold

      rows.push({
        contact_id: contact.id,
        notice_id: notice.id,
        match_score: Math.round(finalScore * 100) / 100,
        matched_unspsc: matchedCode,
      });
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ success: true, matched: 0 });
  }

  /* ── 4. Batch upsert matches (with retry) ──────────────── */
  let upsertErrors = 0;
  const MAX_RETRIES = 2;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = i / BATCH_SIZE + 1;
    let success = false;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const { error } = await service
        .from('outreach_matches')
        .upsert(batch, {
          onConflict: 'contact_id,notice_id',
          ignoreDuplicates: false,
        });

      if (!error) {
        success = true;
        break;
      }

      console.error(`[geo-match] Batch ${batchNum} attempt ${attempt + 1} failed:`, error.message);
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    if (!success) upsertErrors++;
  }

  return NextResponse.json({
    success: upsertErrors === 0,
    matched: rows.length,
    batches: Math.ceil(rows.length / BATCH_SIZE),
    errors: upsertErrors,
  });
}

export { handler as GET, handler as POST }
