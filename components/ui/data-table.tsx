'use client'

import { useState, useMemo } from 'react'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
  width?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  pageSize?: number
  searchable?: boolean
  searchKeys?: string[]
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

type SortDir = 'asc' | 'desc'

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  pageSize = 20,
  searchable = false,
  searchKeys = [],
  emptyMessage = 'No data',
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const filtered = useMemo(() => {
    if (!search || searchKeys.length === 0) return data
    const q = search.toLowerCase()
    return data.filter((row) =>
      searchKeys.some((key) => {
        const val = row[key]
        return typeof val === 'string' && val.toLowerCase().includes(q)
      })
    )
  }, [data, search, searchKeys])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div>
      {searchable && (
        <div style={{ marginBottom: 12 }}>
          <input
            className="input-base"
            placeholder="Filter..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            style={{ maxWidth: 300 }}
          />
        </div>
      )}

      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface-sidebar)', borderBottom: '1px solid var(--border)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  style={{
                    padding: '8px 12px', textAlign: 'left', fontWeight: 600,
                    color: 'var(--text-heading)', cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none', whiteSpace: 'nowrap',
                    width: col.width,
                    fontFamily: 'var(--mono-font)', fontSize: 11, letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr
                  key={String(row.id ?? i)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background var(--duration-fast) ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
                >
                  {columns.map((col) => (
                    <td key={col.key} style={{ padding: '8px 12px', color: 'var(--text-body)' }}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <span className="text-mono-xs" style={{ color: 'var(--text-muted)' }}>
            {sorted.length} result{sorted.length !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="btn-ghost btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </button>
            <span className="text-mono-xs" style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>
              {page}/{totalPages}
            </span>
            <button
              className="btn-ghost btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
