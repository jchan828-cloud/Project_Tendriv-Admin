'use client'

/** MK8-CMS-006: Gate configuration component for frontmatter panel */

import { TEMPLATE_IDS, type TemplateId } from '@/lib/types/gate-template'

interface GateConfigProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  assetIds: string[]
  onAssetIdsChange: (ids: string[]) => void
}

const ASSET_LABELS: Record<TemplateId, string> = {
  'tbips-checklist': 'TBIPS Checklist',
  'bid-no-bid-framework': 'Bid/No-Bid Framework',
  'psib-roadmap': 'PSIB Roadmap',
}

export function GateConfig({ enabled, onToggle, assetIds, onAssetIdsChange }: GateConfigProps) {
  function handleAssetToggle(id: string, checked: boolean) {
    if (checked) {
      onAssetIdsChange([...assetIds, id])
    } else {
      onAssetIdsChange(assetIds.filter((a) => a !== id))
    }
  }

  return (
    <div className="space-y-3">
      {/* Content-upgrade model (recommended) */}
      <div>
        <span className="text-label-sm block mb-2">Bonus Assets (content-upgrade gate)</span>
        <p className="text-xs text-[var(--text-muted)] mb-2">
          Post body stays fully indexable by search engines. Only the selected bonus downloads require an email gate.
        </p>
        <div className="space-y-1 ml-1">
          {TEMPLATE_IDS.map((id) => (
            <label key={id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={assetIds.includes(id)}
                onChange={(e) => handleAssetToggle(id, e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border)]"
              />
              <span className="text-sm">{ASSET_LABELS[id]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Legacy full-post gate */}
      <div className="border-t border-[var(--border)] pt-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--border)]"
          />
          <span className="text-label-sm">Full-post gate (legacy)</span>
        </label>
        {enabled && (
          <p className="text-xs text-[var(--text-muted)] ml-6 mt-1">
            Hides the entire post behind a lead capture form. This blocks search engine indexing — prefer content-upgrade assets above when possible.
          </p>
        )}
      </div>
    </div>
  )
}
