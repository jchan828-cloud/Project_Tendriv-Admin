'use client'

/** MK8-CMS-002: Front-matter panel for post editor */

import { BlogPost, BuyerStage, BuyerStageValues, ContentType, ContentTypeValues } from '@/lib/types/cms'
import { GateConfig } from '@/components/cms/gate-config'

function toBuyerStage(val: string): BuyerStage | null {
  return BuyerStageValues.includes(val as never) ? (val as never) : null // ok-as
}

function toContentType(val: string): ContentType | null {
  return ContentTypeValues.includes(val as never) ? (val as never) : null // ok-as
}

interface FrontmatterPanelProps {
  post: BlogPost
  onChange: (fields: Partial<BlogPost>) => void
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function FrontmatterPanel({ post, onChange }: FrontmatterPanelProps) {
  const metaLen = post.meta_description?.length ?? 0

  return (
    <div className="flex flex-col gap-4">
      <div className="section-label">Front Matter</div>

      {/* Title */}
      <div>
        <label className="text-label-sm mb-1 block" htmlFor="fm-title">
          Title <span className="text-[var(--text-label)]">({post.title.length}/500)</span>
        </label>
        <input
          id="fm-title"
          className="input-base"
          value={post.title}
          onChange={(e) => {
            const title = e.target.value
            const shouldUpdateSlug = post.slug === '' || post.slug === slugify(post.title)
            onChange({
              title,
              ...(shouldUpdateSlug ? { slug: slugify(title) } : {}),
            })
          }}
          maxLength={500}
        />
      </div>

      {/* Slug */}
      <div>
        <label className="text-label-sm mb-1 block" htmlFor="fm-slug">Slug</label>
        <input
          id="fm-slug"
          className="input-base text-mono-sm"
          value={post.slug}
          onChange={(e) => onChange({ slug: slugify(e.target.value) })}
        />
      </div>

      {/* Meta Description */}
      <div>
        <label className="text-label-sm mb-1 block" htmlFor="fm-meta">
          Meta Description{' '}
          <span className={metaLen > 160 ? 'text-[var(--sovereign)]' : 'text-[var(--text-label)]'}>
            ({metaLen}/160)
          </span>
        </label>
        <textarea
          id="fm-meta"
          className="input-base min-h-[60px]"
          value={post.meta_description ?? ''}
          onChange={(e) => onChange({ meta_description: e.target.value || null })}
          maxLength={200}
          rows={2}
        />
      </div>

      {/* Target Keyword */}
      <div>
        <label className="text-label-sm mb-1 block" htmlFor="fm-keyword">Target Keyword</label>
        <input
          id="fm-keyword"
          className="input-base"
          value={post.target_keyword ?? ''}
          onChange={(e) => onChange({ target_keyword: e.target.value || null })}
        />
      </div>

      {/* Secondary Keywords */}
      <div>
        <label className="text-label-sm mb-1 block" htmlFor="fm-secondary">
          Secondary Keywords <span className="text-[var(--text-label)]">(comma-separated)</span>
        </label>
        <input
          id="fm-secondary"
          className="input-base"
          value={post.secondary_keywords.join(', ')}
          onChange={(e) =>
            onChange({
              secondary_keywords: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </div>

      {/* Buyer Stage */}
      <div>
        <label className="text-label-sm mb-1 block" htmlFor="fm-stage">Buyer Stage</label>
        <select
          id="fm-stage"
          className="input-base"
          value={post.buyer_stage ?? ''}
          onChange={(e) => onChange({ buyer_stage: toBuyerStage(e.target.value) })}
        >
          <option value="">Select…</option>
          {BuyerStageValues.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Content Type */}
      <div>
        <label className="text-label-sm mb-1 block" htmlFor="fm-type">Content Type</label>
        <select
          id="fm-type"
          className="input-base"
          value={post.content_type ?? ''}
          onChange={(e) => onChange({ content_type: toContentType(e.target.value) })}
        >
          <option value="">Select…</option>
          {ContentTypeValues.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* OG Image URL */}
      <div>
        <label className="text-label-sm mb-1 block" htmlFor="fm-og">OG Image URL</label>
        <input
          id="fm-og"
          className="input-base"
          value={post.og_image_url ?? ''}
          onChange={(e) => onChange({ og_image_url: e.target.value || null })}
          placeholder="https://…"
        />
      </div>

      {/* Scheduled At */}
      <div>
        <label className="text-label-sm mb-1 block" htmlFor="fm-scheduled">Schedule Publish</label>
        <input
          id="fm-scheduled"
          type="datetime-local"
          className="input-base"
          value={post.scheduled_at ? post.scheduled_at.slice(0, 16) : ''}
          onChange={(e) =>
            onChange({ scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null })
          }
        />
      </div>

      {/* Gating — content-upgrade model + legacy full-post gate */}
      <GateConfig
        enabled={post.is_gated}
        onToggle={(val) => onChange({ is_gated: val })}
        assetIds={post.gate_asset_ids ?? []}
        onAssetIdsChange={(ids) => onChange({ gate_asset_ids: ids })}
      />

      {/* Gate CTA — shown when gated or has bonus assets */}
      {(post.is_gated || (post.gate_asset_ids ?? []).length > 0) && (
        <div>
          <label className="text-label-sm mb-1 block" htmlFor="fm-cta">Gate CTA Label</label>
          <input
            id="fm-cta"
            className="input-base"
            value={post.gate_cta ?? ''}
            onChange={(e) => onChange({ gate_cta: e.target.value || null })}
            placeholder="Download the full guide"
          />
        </div>
      )}
    </div>
  )
}
