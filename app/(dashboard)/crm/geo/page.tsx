import { createServiceRoleClient } from '@/lib/supabase/server';
import { ContactTable } from '@/components/crm/contact-table';

export default async function GeoCrmPage() {
  const supabase = await createServiceRoleClient();
  const { data: contacts } = await supabase
    .from('outreach_contacts')
    .select('*')
    .eq('pipeline', 'geo')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-gray-900">
        Geo Pipeline — CRM
      </h1>
      <ContactTable contacts={contacts ?? []} />
    </div>
  );
}
