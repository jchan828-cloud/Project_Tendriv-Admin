/** Media library — list + upload */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { appendAuditLog } from '@/lib/audit/log'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function GET(request: NextRequest) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const url = new URL(request.url)
  const mime = url.searchParams.get('mime') ?? ''

  let query = supabase
    .from('media_assets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (mime) query = query.ilike('mime_type', `${mime}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate signed URLs for each asset
  const withUrls = await Promise.all(
    (data ?? []).map(async (asset) => {
      const { data: signedData } = await supabase.storage
        .from('media')
        .createSignedUrl(asset.storage_path, 3600)
      return { ...asset, url: signedData?.signedUrl ?? null }
    })
  )

  return NextResponse.json(withUrls)
}

export async function POST(request: NextRequest) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const altText = formData.get('alt_text') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `File type ${file.type} not allowed` }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()

  // Generate unique path
  const ext = file.name.split('.').pop() ?? 'bin'
  const storagePath = `uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadErr } = await supabase.storage
    .from('media')
    .upload(storagePath, buffer, { contentType: file.type })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  // Save metadata
  const { data: asset, error: dbErr } = await supabase
    .from('media_assets')
    .insert({
      filename: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
      alt_text: altText,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  await appendAuditLog(supabase, {
    event_type: 'media-uploaded',
    actor_id: user.id,
    actor_type: 'user',
    resource_type: 'media',
    resource_id: asset.id,
    metadata: { filename: file.name, mime_type: file.type, size_bytes: file.size },
  })

  // Return with signed URL
  const { data: signedData } = await supabase.storage
    .from('media')
    .createSignedUrl(storagePath, 3600)

  return NextResponse.json({ ...asset, url: signedData?.signedUrl ?? null }, { status: 201 })
}
