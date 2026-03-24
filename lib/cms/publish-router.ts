/** MK8-CMS-007: Multi-channel publish router */

import { SupabaseClient } from '@supabase/supabase-js'
import { BlogPost } from '@/lib/types/cms'

export type PublishChannel = 'blog' | 'cyberimpact' | 'linkedin-draft'

export interface ChannelResult {
  channel: PublishChannel
  success: boolean
  externalId: string | null
  error: string | null
}

async function publishToBlog(supabase: SupabaseClient, post: BlogPost): Promise<ChannelResult> {
  const { error } = await supabase
    .from('blog_posts')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', post.id)

  return {
    channel: 'blog',
    success: !error,
    externalId: error ? null : post.id,
    error: error?.message ?? null,
  }
}

async function publishToCyberimpact(post: BlogPost): Promise<ChannelResult> {
  const apiKey = process.env.CYBERIMPACT_API_KEY
  if (!apiKey) {
    return { channel: 'cyberimpact', success: false, externalId: null, error: 'CYBERIMPACT_API_KEY not set' }
  }

  try {
    const res = await fetch('https://app.cyberimpact.com/api/3/campaigns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        subject: post.title,
        body: `${post.excerpt ?? ''}\n\n[Read more](${post.canonical_url ?? ''})`,
        status: 'draft',
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return { channel: 'cyberimpact', success: false, externalId: null, error: text }
    }

    const data: unknown = await res.json()
    const campaignId = data && typeof data === 'object' && 'id' in data ? String((data as Record<string, unknown>).id) : null // ok-as
    return { channel: 'cyberimpact', success: true, externalId: campaignId, error: null }
  } catch (err) {
    return { channel: 'cyberimpact', success: false, externalId: null, error: String(err) }
  }
}

async function publishToLinkedIn(supabase: SupabaseClient, post: BlogPost): Promise<ChannelResult> {
  const copy = `${post.excerpt ?? post.title}\n\nRead more: ${post.canonical_url ?? ''}`

  const { data, error } = await supabase
    .from('linkedin_drafts')
    .insert({ post_id: post.id, copy })
    .select('id')
    .single()

  return {
    channel: 'linkedin-draft',
    success: !error,
    externalId: data?.id ?? null,
    error: error?.message ?? null,
  }
}

export async function publishToChannels(
  supabase: SupabaseClient,
  post: BlogPost,
  channels: PublishChannel[]
): Promise<ChannelResult[]> {
  const promises = channels.map((channel) => {
    switch (channel) {
      case 'blog': return publishToBlog(supabase, post)
      case 'cyberimpact': return publishToCyberimpact(post)
      case 'linkedin-draft': return publishToLinkedIn(supabase, post)
    }
  })

  const settled = await Promise.allSettled(promises)

  return settled.map((result, i): ChannelResult => {
    if (result.status === 'fulfilled') return result.value
    return {
      channel: channels[i] ?? 'blog',
      success: false,
      externalId: null,
      error: String(result.reason),
    }
  })
}
