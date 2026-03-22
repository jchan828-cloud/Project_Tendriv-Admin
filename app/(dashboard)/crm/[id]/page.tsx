import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ActivityTimeline } from '@/components/crm/activity-timeline';
import type { OutreachContact, OutreachActivityLog, OutreachMatch } from '@/lib/types/crm';

export default async function CrmContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServiceRoleClient();

  const { data: contact } = await supabase
    .from('outreach_contacts')
    .select('*')
    .eq('id', id)
    .single<OutreachContact>();

  if (!contact) {
    notFound();
  }

  const [{ data: activities }, { data: matches }] = await Promise.all([
    supabase
      .from('outreach_activity_log')
      .select('*')
      .eq('contact_id', id)
      .order('occurred_at', { ascending: false })
      .returns<OutreachActivityLog[]>(),
    supabase
      .from('outreach_matches')
      .select('*')
      .eq('contact_id', id)
      .returns<OutreachMatch[]>(),
  ]);

  return (
    <div className="space-y-8">
      <Link href="/crm" className="text-sm text-blue-600 hover:underline">&larr; Back to CRM</Link>

      <div>
        <h1 className="text-lg font-semibold text-gray-900">{contact.business_name}</h1>
        <p className="mt-1 text-sm capitalize text-gray-500">{contact.pipeline} pipeline &middot; {contact.status}</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">Contact Details</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-gray-500">Email</dt>
          <dd>{contact.contact_email ?? '—'}</dd>
          <dt className="text-gray-500">Website</dt>
          <dd>{contact.contact_website ?? '—'}</dd>
          <dt className="text-gray-500">Province</dt>
          <dd>{contact.province ?? '—'}</dd>
          <dt className="text-gray-500">Categories</dt>
          <dd>{contact.unspsc_categories.length > 0 ? contact.unspsc_categories.join(', ') : '—'}</dd>
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">CASL Consent</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-gray-500">Method</dt>
          <dd>{contact.casl_consent_method ?? '—'}</dd>
          <dt className="text-gray-500">Date</dt>
          <dd>{contact.casl_consent_date ? new Date(contact.casl_consent_date).toLocaleDateString() : '—'}</dd>
          <dt className="text-gray-500">Source</dt>
          <dd>{contact.casl_consent_source ?? '—'}</dd>
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">
          Matched Tenders
          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {matches?.length ?? 0}
          </span>
        </h2>
        {(!matches || matches.length === 0) && (
          <p className="text-sm text-gray-400">No matched tenders yet.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">Activity Timeline</h2>
        <ActivityTimeline activities={activities ?? []} />
      </section>
    </div>
  );
}
