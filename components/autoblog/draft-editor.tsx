'use client'

import { useState } from 'react'

interface DraftEditorProps {
  markdown: string
  onSave: (md: string) => void
  onCancel: () => void
}

export function DraftEditor({ markdown, onSave, onCancel }: DraftEditorProps) {
  const [value, setValue] = useState(markdown)

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        spellCheck={false}
        style={{
          flex: 1,
          resize: 'none',
          fontFamily: 'var(--mono-font)',
          fontSize: 13,
          lineHeight: 1.7,
          padding: '20px 24px',
          backgroundColor: 'var(--surface-input)',
          color: 'var(--text-heading)',
          border: 'none',
          outline: 'none',
          borderBottom: '1px solid var(--border)',
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 16px',
          flexShrink: 0,
          backgroundColor: 'var(--surface-sidebar)',
        }}
      >
        <button
          onClick={() => onSave(value)}
          className="btn-primary btn-sm"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="btn-secondary btn-sm"
        >
          Cancel
        </button>
        <span
          style={{
            fontFamily: 'var(--mono-font)',
            fontSize: 11,
            color: 'var(--text-muted)',
            marginLeft: 8,
          }}
        >
          {value.split(/\s+/).filter(Boolean).length} words
        </span>
      </div>
    </div>
  )
}
