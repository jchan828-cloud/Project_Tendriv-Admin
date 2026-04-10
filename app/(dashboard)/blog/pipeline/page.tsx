// app/(dashboard)/blog/pipeline/page.tsx
import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { TopicTable } from '@/components/blog/topic-table'
import { AddTopicForm } from '@/components/blog/add-topic-form'
import { GenerationSettingsForm } from '@/components/blog/generation-settings-form'
import type { BlogPipelineTopic, BlogSettings } from '@/lib/types/blog-settings'

export default async function BlogSettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = await createServiceRoleClient()

  const [{ data: topics }, { data: settings, error: settingsError }] = await Promise.all([
    service
      .from('blog_pipeline_topics')
      .select('*')
      .order('relevance', { ascending: false }),
    service
      .from('blog_settings')
      .select('*')
      .eq('id', 1)
      .single(),
  ])

  // PGRST116 = "0 rows" — expected on first-run before seed is applied
  if (settingsError && settingsError.code !== 'PGRST116') {
    throw new Error(`Failed to load blog settings: ${settingsError.message}`)
  }

  const allTopics: BlogPipelineTopic[] = topics ?? []
  const blogsPerDay = (settings as BlogSettings | null)?.blogs_per_day ?? 1

  return (
    <div className="space-y-8">
      <h1 className="text-heading-md">Blog pipeline</h1>

      <section>
        <h2 className="text-heading-sm mb-4">Generation settings</h2>
        <GenerationSettingsForm initialValue={blogsPerDay} />
      </section>

      <section>
        <h2 className="text-heading-sm mb-4">Topic queue</h2>
        <p className="text-body-sm text-[var(--text-muted)] mb-4">
          Topics ordered by relevance — the cron generates drafts from the top of this list. Disabled topics are skipped.
        </p>
        <TopicTable topics={allTopics} />
        <div className="mt-4">
          <AddTopicForm />
        </div>
      </section>
    </div>
  )
}
