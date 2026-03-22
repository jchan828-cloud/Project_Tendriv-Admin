import { createServiceRoleClient } from '@/lib/supabase/server';
import { ContactTable } from '@/components/crm/contact-table';

export default async function CrmPage() {
  const supabase = await createServiceRoleClient();
  const { data: contacts } = await supabase
    .from('outreach_contacts')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-gray-900">CRM Contacts</h1>
      <ContactTable contacts={contacts ?? []} />
    </div>
  );
}
