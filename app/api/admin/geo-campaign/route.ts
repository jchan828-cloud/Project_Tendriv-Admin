import { NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import type { OutreachContact, OutreachSequence } from '@/lib/types/crm';

/**
 * MK8-GEO-005: Geo campaign trigger route.
 * Pushes eligible geo contacts to Cyberimpact monitor-geo group.
 * OAuth-protected (requires authenticated admin user).
 */

const CYBERIMPACT_BASE_URL = 'https://api.cyberimpact.com';

type EligibleContact = Pick<
  OutreachContact,
  'id' | 'contact_email' | 'business_name' | 'city' | 'province' | 'pipeline' | 'status' | 'casl_consent_method'
>;

async function addMemberToGeoGroup(
  contact: EligibleContact,
  groupId: string,
  apiKey: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${CYBERIMPACT_BASE_URL}/members`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: contact.contact_email,
        firstname: contact.business_name,
        company: contact.business_name,
        language: 'en_ca',
        groups: groupId,
        customFields: {
          '1': contact.city ?? '',
          '2': contact.province ?? '',
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { ok: false, error: `Cyberimpact API ${response.status}: ${body}` };
    }

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

export async function POST() {
  /* ── 1. Auth check ─────────────────────────────────────────── */
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  /* ── 2. Validate env vars ──────────────────────────────────── */
  const apiKey = process.env.CYBERIMPACT_API_KEY;
  const groupId = process.env.CYBERIMPACT_GEO_GROUP_ID;

  if (!apiKey || !groupId) {
    return NextResponse.json(
      { error: 'Missing Cyberimpact configuration' },
      { status: 500 },
    );
  }

  const service = await createServiceRoleClient();

  /* ── 3. Fetch eligible geo contacts with email ─────────────── */
  const { data: contacts, error: contactsError } = await service
    .from('outreach_contacts')
    .select('id, contact_email, business_name, city, province, pipeline, status, casl_consent_method')
    .eq('pipeline', 'geo')
    .eq('status', 'prospect')
    .not('contact_email', 'is', null)
    .not('casl_consent_method', 'is', null)
    .returns<EligibleContact[]>();

  if (contactsError) {
    return NextResponse.json({ error: contactsError.message }, { status: 500 });
  }

  if (!contacts || contacts.length === 0) {
    return NextResponse.json({ success: true, queued: 0 });
  }

  /* ── 4. Fetch geo sequence templates ───────────────────────── */
  const { data: sequences, error: seqError } = await service
    .from('outreach_sequences')
    .select('id, pipeline, step, subject_template, body_template')
    .eq('pipeline', 'geo')
    .eq('is_active', true)
    .order('step', { ascending: true })
    .returns<OutreachSequence[]>();

  if (seqError) {
    return NextResponse.json({ error: seqError.message }, { status: 500 });
  }

  /* ── 5. Process each contact ───────────────────────────────── */
  let queued = 0;

  for (const contact of contacts) {
    if (!contact.contact_email) continue;

    try {
      /* 5a. Count prior 'sent' events to determine next step */
      const { count: priorSendCount, error: activityError } = await service
        .from('outreach_activity_log')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', contact.id)
        .eq('event_type', 'sent');

      if (activityError) {
        console.error(
          `[geo-campaign] Failed to fetch activity for contact ${contact.id}:`,
          activityError.message,
        );
        continue;
      }

      const nextStep = (priorSendCount ?? 0) + 1;

      /* 5b. Find the matching sequence template */
      const nextSequence = (sequences ?? []).find((s) => s.step === nextStep);

      if (!nextSequence) {
        /* All steps completed for this contact — skip */
        continue;
      }

      /* 5c. Add contact to Cyberimpact geo group */
      const result = await addMemberToGeoGroup(
        contact,
        groupId,
        apiKey,
      );

      if (!result.ok) {
        console.error(
          `[geo-campaign] Cyberimpact error for ${contact.contact_email}:`,
          result.error,
        );
        continue;
      }

      /* 5d. Log activity */
      const { error: logError } = await service
        .from('outreach_activity_log')
        .insert({
          contact_id: contact.id,
          sequence_id: nextSequence.id,
          event_type: 'sent',
          event_metadata: { step: nextStep, subject: nextSequence.subject_template },
          occurred_at: new Date().toISOString(),
        });

      if (logError) {
        console.error(
          `[geo-campaign] Failed to log activity for contact ${contact.id}:`,
          logError.message,
        );
        continue;
      }

      /* 5e. Update contact status to 'contacted' */
      const { error: updateError } = await service
        .from('outreach_contacts')
        .update({ status: 'contacted', last_activity_at: new Date().toISOString() })
        .eq('id', contact.id);

      if (updateError) {
        console.error(
          `[geo-campaign] Failed to update status for contact ${contact.id}:`,
          updateError.message,
        );
        continue;
      }

      queued++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[geo-campaign] Unexpected error for contact ${contact.id}:`,
        message,
      );
      continue;
    }
  }

  return NextResponse.json({ success: true, queued });
}
