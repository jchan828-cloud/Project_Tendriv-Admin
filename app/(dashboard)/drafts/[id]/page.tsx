import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { DraftActions } from '@/components/drafts/draft-actions';
import { CopyMdxButton } from '@/components/drafts/copy-mdx-button';

export default async function DraftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServiceRoleClient();
  const { data: draft } = await supabase.from('blog_drafts').select('*').eq('id', id).single();
  if (!draft) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{draft.title}</h1>
          <p className="text-sm text-gray-500">
            {draft.tier} / {draft.type} — by {draft.generated_by} on{' '}
            {new Date(draft.created_at).toLocaleDateString()}
          </p>
        </div>
        <CopyMdxButton content={draft.content ?? ''} />
      </div>
      <article className="prose prose-sm max-w-none rounded border border-gray-200 bg-white p-6">
        <MDXRemote source={draft.content ?? ''} />
      </article>
      <DraftActions id={draft.id} status={draft.status} />
    </div>
  );
}
