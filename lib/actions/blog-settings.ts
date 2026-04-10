// lib/actions/blog-settings.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { BlogPipelineTopic } from '@/lib/types/blog-settings'

// Create or update a topic.
// Pass id=null to insert; pass id=string to update.
export async function upsertTopic(
  id: string | null,
  data: Omit<BlogPipelineTopic, 'id' | 'created_at' | 'active'>
): Promise<{ error: string | null }> {
  const supabase = await createServiceRoleClient()
  if (id !== null) {
    const { error } = await supabase
      .from('blog_pipeline_topics')
      .update({ ...data })
      .eq('id', id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('blog_pipeline_topics')
      .insert({ ...data, active: true })
    if (error) return { error: error.message }
  }
  revalidatePath('/blog/pipeline')
  return { error: null }
}

export async function setTopicActive(id: string, active: boolean): Promise<{ error: string | null }> {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('blog_pipeline_topics')
    .update({ active })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/blog/pipeline')
  return { error: null }
}

export async function deleteTopic(id: string): Promise<{ error: string | null }> {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('blog_pipeline_topics')
    .delete()
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/blog/pipeline')
  return { error: null }
}

export async function saveSettings(blogs_per_day: number): Promise<{ error: string | null }> {
  if (blogs_per_day < 1 || blogs_per_day > 5) return { error: 'blogs_per_day must be 1–5' }
  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('blog_settings')
    .upsert({ id: 1, blogs_per_day, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) return { error: error.message }
  revalidatePath('/blog/pipeline')
  return { error: null }
}
