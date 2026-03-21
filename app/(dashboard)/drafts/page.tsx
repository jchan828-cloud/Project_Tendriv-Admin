import { createServiceRoleClient } from '@/lib/supabase/server';
import { DraftTable } from '@/components/drafts/draft-table';

export default async function DraftsPage() {
  const supabase = await createServiceRoleClient();
  const { data: drafts } = await supabase
    .from('blog_drafts')
    .select('id, title, slug, tier, type, status, created_at, generated_by')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-gray-900">Drafts</h1>
      <DraftTable drafts={drafts ?? []} />
    </div>
  );
}
