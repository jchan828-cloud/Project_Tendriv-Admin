/** MK8-CMS-002: Post editor page — handles new + existing posts */

import { redirect } from 'next/navigation'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { PostEditor } from '@/components/cms/post-editor'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PostEditorPage({ params }: PageProps) {
  const { id } = await params

  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = await createServiceRoleClient()

  // Handle "new" — create blank record and redirect
  if (id === 'new') {
    const { data: post, error } = await supabase
      .from('blog_posts')
      .insert({
        title: 'Untitled Post',
        slug: `untitled-${Date.now()}`,
        author_id: user.id,
        status: 'draft',
      })
      .select('id')
      .single()

    if (error || !post) {
      return <div className="text-[var(--sovereign)]">Failed to create post: {error?.message}</div>
    }
    redirect(`/posts/${post.id}`)
  }

  // Fetch existing post
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !post) {
    return <div className="text-[var(--sovereign)]">Post not found.</div>
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-heading-lg">Edit Post</h1>
        <span className={`badge ${statusBadge(post.status)}`}>{post.status}</span>
      </div>
      <PostEditor initialPost={post} />
    </div>
  )
}

function statusBadge(status: string): string {
  switch (status) {
    case 'draft': return 'badge-neutral'
    case 'review': return 'badge-warning'
    case 'approved': return 'badge-jade'
    case 'published': return 'badge-success'
    case 'archived': return 'badge-purple'
    default: return 'badge-neutral'
  }
}
