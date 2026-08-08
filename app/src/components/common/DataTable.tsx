import React, { useState, useMemo } from 'react'
import {
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import { exportToCSV } from '@/utils/helpers'

interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  width?: string
  render?: (value: unknown, row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  searchable?: boolean
  exportable?: boolean
  pageSize?: number
  onRowClick?: (row: T) => void
  actions?: (row: T) => React.ReactNode
  emptyMessage?: string
  title?: string
  rowClassName?: (row: T) => string
}

function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  searchable = true,
  exportable = false,
  pageSize = 15,
  onRowClick,
  actions,
  emptyMessage = 'No records found',
  title,
  rowClassName,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter((row) =>
      Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(q))
    )
  }, [data, search])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const handleSearch = (v: string) => { setSearch(v); setPage(1) }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)] flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          {title && <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>}
          <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">
            {filtered.length} records
          </span>
        </div>
        <div className="flex items-center gap-2">
          {searchable && (
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="form-input pl-8 py-1.5 text-sm w-52"
              />
            </div>
          )}
          {exportable && (
            <button
              onClick={() => exportToCSV(data as Record<string, unknown>[], title || 'export')}
              className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-10">#</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={col.sortable ? 'cursor-pointer select-none' : ''}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="flex flex-col">
                        <ChevronUpIcon
                          className={`w-3 h-3 -mb-1 ${sortKey === col.key && sortDir === 'asc' ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'}`}
                        />
                        <ChevronDownIcon
                          className={`w-3 h-3 ${sortKey === col.key && sortDir === 'desc' ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'}`}
                        />
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && <th className="w-24">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={columns.length + (actions ? 2 : 1)}>
                    <div className="h-4 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 2 : 1)} className="text-center py-16">
                  <FunnelIcon className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-[var(--text-muted)] text-sm">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              paged.map((row, idx) => (
                <tr
                  key={idx}
                  className={[onRowClick ? 'cursor-pointer' : '', rowClassName ? rowClassName(row) : ''].filter(Boolean).join(' ')}
                  onClick={() => onRowClick?.(row)}
                >
                  <td className="text-[var(--text-muted)] text-xs">
                    {(page - 1) * pageSize + idx + 1}
                  </td>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] ?? '-')}
                    </td>
                  ))}
                  {actions && (
                    <td onClick={(e) => e.stopPropagation()}>{actions(row)}</td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between">
          <span className="text-sm text-[var(--text-muted)]">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-sm px-3 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = page <= 3 ? i + 1 : page - 2 + i
              if (pg > totalPages) return null
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`text-sm px-3 py-1 rounded ${pg === page ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {pg}
                </button>
              )
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary text-sm px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
