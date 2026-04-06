/** Media library page */

import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MediaGrid } from '@/components/media/media-grid'

export default async function MediaPage() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const supabase = await createServiceRoleClient()
  const { data: assets } = await supabase
    .from('media_assets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  // Generate signed URLs
  const withUrls = await Promise.all(
    (assets ?? []).map(async (asset) => {
      const { data: signedData } = await supabase.storage
        .from('media')
        .createSignedUrl(asset.storage_path, 3600)
      return { ...asset, url: signedData?.signedUrl ?? null }
    })
  )

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-heading-xl" style={{ marginBottom: 4 }}>Media Library</h1>
        <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
          Upload and manage images and documents.
        </p>
      </div>
      <MediaGrid assets={withUrls} />
    </div>
  )
}
