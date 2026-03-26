'use client'

import { useState, useRef } from 'react'

interface MediaAsset {
  id: string
  filename: string
  storage_path: string
  mime_type: string
  size_bytes: number
  alt_text: string | null
  url: string | null
  created_at: string
}

interface MediaGridProps {
  assets: MediaAsset[]
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MediaGrid({ assets: initialAssets }: MediaGridProps) {
  const [assets, setAssets] = useState(initialAssets)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'image' | 'pdf'>('all')
  const [selected, setSelected] = useState<MediaAsset | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/media', { method: 'POST', body: form })
      if (res.ok) {
        const asset = await res.json()
        setAssets((prev) => [asset, ...prev])
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const filtered = assets.filter((a) => {
    if (filter === 'image') return a.mime_type.startsWith('image/')
    if (filter === 'pdf') return a.mime_type === 'application/pdf'
    return true
  })

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url)
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleUpload} style={{ display: 'none' }} />
        <button className="btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading...' : '+ Upload'}
        </button>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {(['all', 'image', 'pdf'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={filter === f ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
            >
              {f === 'all' ? 'All' : f === 'image' ? 'Images' : 'PDFs'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 12,
      }}>
        {filtered.map((asset) => (
          <div
            key={asset.id}
            onClick={() => setSelected(asset)}
            className="card"
            style={{
              padding: 0, cursor: 'pointer', overflow: 'hidden',
              outline: selected?.id === asset.id ? '2px solid var(--jade)' : 'none',
            }}
          >
            {asset.mime_type.startsWith('image/') && asset.url ? (
              <div style={{ height: 120, background: 'var(--surface-sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.url} alt={asset.alt_text ?? asset.filename} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{ height: 120, background: 'var(--surface-sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="text-data-md" style={{ color: 'var(--text-label)' }}>
                  {asset.mime_type.split('/')[1]?.toUpperCase()}
                </span>
              </div>
            )}
            <div style={{ padding: '8px 10px' }}>
              <div className="text-body-xs" style={{
                fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: 'var(--text-heading)',
              }}>
                {asset.filename}
              </div>
              <div className="text-mono-xs" style={{ color: 'var(--text-label)' }}>
                {formatSize(asset.size_bytes)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }} className="text-body-sm">
          No media assets yet. Upload your first file.
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="card" style={{ marginTop: 20, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div className="text-heading-sm" style={{ marginBottom: 8 }}>{selected.filename}</div>
            <div className="text-mono-xs" style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
              {selected.mime_type} &middot; {formatSize(selected.size_bytes)}
            </div>
            <div className="text-mono-xs" style={{ color: 'var(--text-label)', marginBottom: 12 }}>
              Uploaded {new Date(selected.created_at).toLocaleDateString()}
            </div>
            {selected.url && (
              <button className="btn-secondary btn-sm" onClick={() => copyUrl(selected.url!)}>
                Copy URL
              </button>
            )}
          </div>
          <button className="btn-ghost btn-sm" onClick={() => setSelected(null)}>Close</button>
        </div>
      )}
    </div>
  )
}
