'use client'

/** MK8-CMS-006: Gate configuration component for frontmatter panel */

interface GateConfigProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
}

export function GateConfig({ enabled, onToggle }: GateConfigProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--border)]"
        />
        <span className="text-label-sm">Gated Content</span>
      </label>
      {enabled && (
        <p className="text-xs text-[var(--text-muted)] ml-6">
          Readers must submit their email (with CASL consent) to access this post beyond the excerpt.
        </p>
      )}
    </div>
  )
}
