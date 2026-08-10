import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon,
  MagnifyingGlassIcon, XMarkIcon, ViewColumnsIcon,
  ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon,
  FunnelIcon, BarsArrowUpIcon,
  NoSymbolIcon, CheckCircleIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import Modal                  from '@/components/common/Modal'
import Badge                  from '@/components/common/Badge'
import ConfirmDialog          from '@/components/common/ConfirmDialog'
import DeactivateReasonDialog from '@/components/common/DeactivateReasonDialog'
import PageBreadcrumb from '@/components/common/PageBreadcrumb'
import { formatDate, formatDateTime, exportToCSV, exportToExcel, exportToPDF } from '@/utils/helpers'
import { apiService } from '@/api/apiService'

// ── Types ──────────────────────────────────────────────────────
interface DeptEntry {
  id:         number
  dept_code:  string
  dept_name:  string
  sub_dept:   string | null
  is_active:  boolean
  deactivation_reason: string | null
  deactivated_at:      string | null
  used_elsewhere: boolean
  created_at: string
  updated_at: string | null
}

type FormValues = {
  dept_code: string
  dept_name: string
  sub_dept:  string
}

const schema = yup.object({
  dept_code: yup.string().required('Department Code is required'),
  dept_name: yup.string().required('Department Name is required'),
  sub_dept:  yup.string().default(''),
})

const PAGE_SIZES = [10, 25, 50, 100]
const Req = () => <span className="text-red-500 ml-0.5">*</span>

interface ColDef { key: string; label: string; sortKey?: string; visible: boolean; minW?: string }

const INITIAL_COLS: ColDef[] = [
  { key: 'dept_code',  label: 'Code',           sortKey: 'dept_code',  visible: true, minW: '120px' },
  { key: 'dept_name',  label: 'Department Name', sortKey: 'dept_name',  visible: true, minW: '200px' },
  { key: 'sub_dept',   label: 'Sub Department',                          visible: true, minW: '160px' },
  { key: 'is_active',           label: 'Status',                          visible: true, minW: '90px'  },
  { key: 'deactivation_reason', label: 'Deactive Reason',                 visible: true, minW: '160px' },
  { key: 'deactivated_at',      label: 'Deactive Date',                   visible: true, minW: '120px' },
  { key: 'created_at', label: 'Created',         sortKey: 'created_at', visible: true, minW: '130px' },
]

// ── Page ───────────────────────────────────────────────────────
const DeptMasterPage: React.FC = () => {

  const [saving,      setSaving]      = useState(false)
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editItem,    setEditItem]    = useState<DeptEntry | null>(null)
  const [toggleItem,  setToggleItem]  = useState<DeptEntry | null>(null)
  const isNew = !editItem

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<FormValues>({ resolver: yupResolver(schema) as never })

  // ── Grid state ─────────────────────────────────────────────
  const [items,        setItems]        = useState<DeptEntry[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetching,     setFetching]     = useState(false)
  const isFirstLoad    = useRef(true)
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active')
  const [stats,        setStats]        = useState({ active: 0, inactive: 0 })
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(25)
  const [searchInput,  setSearchInput]  = useState('')
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState('dept_code')
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('asc')
  const [total,        setTotal]        = useState(0)
  const [totalPages,   setTotalPages]   = useState(1)

  // ── Toolbar state ─────────────────────────────────────────
  const [cols,                setCols]                = useState<ColDef[]>(INITIAL_COLS)
  const [showColPicker,       setShowColPicker]       = useState(false)
  const [showFilterRow,       setShowFilterRow]       = useState(false)
  const [showSorting,         setShowSorting]         = useState(true)
  const [colFilters,          setColFilters]          = useState<Record<string, string>>({})
  const [debouncedColFilters, setDebouncedColFilters] = useState<Record<string, string>>({})
  const colPickerRef   = useRef<HTMLDivElement>(null)
  const searchTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const colFilterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [selectedRows, setSelectedRows] = useState<DeptEntry[]>([])
  const [exportOpen,   setExportOpen]   = useState(false)
  const [exporting,    setExporting]    = useState(false)
  const exportRef  = useRef<HTMLDivElement>(null)
  const masterCheckRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setShowColPicker(false)
      if (exportRef.current   && !exportRef.current.contains(e.target as Node))    setExportOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const onSearchInput = (val: string) => {
    setSearchInput(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1) }, 400)
  }

  useEffect(() => {
    if (colFilterTimer.current) clearTimeout(colFilterTimer.current)
    colFilterTimer.current = setTimeout(() => { setDebouncedColFilters(colFilters); setPage(1) }, 400)
  }, [colFilters]) // eslint-disable-line

  const loadStats = async () => {
    try {
      const res = await apiService.get('/departments/stats')
      setStats(res.data?.data ?? { active: 0, inactive: 0 })
    } catch { /* silent */ }
  }

  useEffect(() => { loadStats() }, []) // eslint-disable-line

  const loadItems = async () => {
    if (isFirstLoad.current) setLoading(true); else setFetching(true)
    try {
      const activeCF = Object.fromEntries(Object.entries(debouncedColFilters).filter(([, v]) => v.trim()))
      const res = await apiService.get('/departments', {
        params: {
          page, limit: pageSize, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter,
          ...(Object.keys(activeCF).length > 0 && { col_filters: JSON.stringify(activeCF) }),
        },
      })
      setItems(res.data?.data ?? [])
      setTotal(res.data?.meta?.total ?? 0)
      setTotalPages(res.data?.meta?.total_pages ?? 1)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to load departments')
    } finally { setLoading(false); setFetching(false); isFirstLoad.current = false }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadItems() }, [page, pageSize, search, sortBy, sortDir, debouncedColFilters, statusFilter])

  // ── Master checkbox indeterminate ─────────────────────────
  const currentPageIds   = items.map(r => r.id)
  const allPageSelected  = currentPageIds.length > 0 && currentPageIds.every(id => selectedRows.some(r => r.id === id))
  const somePageSelected = currentPageIds.some(id => selectedRows.some(r => r.id === id))
  useEffect(() => { if (masterCheckRef.current) masterCheckRef.current.indeterminate = somePageSelected && !allPageSelected }, [somePageSelected, allPageSelected])

  const toggleSelectPage = () => {
    if (allPageSelected) setSelectedRows(prev => prev.filter(r => !currentPageIds.includes(r.id)))
    else { const toAdd = items.filter(u => !selectedRows.some(r => r.id === u.id)); setSelectedRows(prev => [...prev, ...toAdd]) }
  }
  const toggleSelectRow = (item: DeptEntry) =>
    setSelectedRows(prev => prev.some(r => r.id === item.id) ? prev.filter(r => r.id !== item.id) : [...prev, item])

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
    setPage(1)
  }
  const handlePageSize = (size: number) => { setPageSize(size); setPage(1) }
  const toggleCol      = (key: string) => setCols(cs => cs.map(c => c.key === key ? { ...c, visible: !c.visible } : c))
  const gridCols = statusFilter === 'inactive' ? cols : cols.filter(c => c.key !== 'deactivation_reason' && c.key !== 'deactivated_at')
  const visibleCols    = gridCols.filter(c => c.visible)

  // ── Export ────────────────────────────────────────────────
  const getExportData = (rows: DeptEntry[]) =>
    rows.map(r => ({
      'Code': r.dept_code, 'Department Name': r.dept_name,
      'Sub Department': r.sub_dept || '',
      'Status': r.is_active ? 'Active' : 'Inactive',
      ...(statusFilter === 'inactive' && {
        'Deactive Reason': r.deactivation_reason || '',
        'Deactive Date': r.deactivated_at ? formatDate(String(r.deactivated_at)) : '',
      }),
      'Created At': formatDateTime(String(r.created_at)),
    }))

  const handleExport = async (scope: 'all' | 'selected', format: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false)
    let rows: DeptEntry[]
    if (scope === 'selected') {
      rows = selectedRows
      if (!rows.length) { toast.error('No rows selected'); return }
    } else {
      setExporting(true)
      try {
        const activeCF = Object.fromEntries(Object.entries(debouncedColFilters).filter(([, v]) => v.trim()))
        const res = await apiService.get('/departments', {
          params: { page: 1, limit: 9999, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter,
            ...(Object.keys(activeCF).length > 0 && { col_filters: JSON.stringify(activeCF) }) },
        })
        rows = res.data?.data ?? []
      } catch { toast.error('Failed to fetch export data'); setExporting(false); return }
      setExporting(false)
    }
    const fname = `department_master_${statusFilter}`
    const data  = getExportData(rows)
    if (format === 'csv')        exportToCSV(data, fname)
    else if (format === 'excel') void exportToExcel(data, fname)
    else                         void exportToPDF(data, fname, 'Department Master Report')
  }

  // ── Pagination ────────────────────────────────────────────
  const pageNumbers = useMemo((): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 4)              return [1, 2, 3, 4, 5, '...', totalPages]
    if (page >= totalPages - 3) return [1, '...', totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages]
    return [1, '...', page - 1, page, page + 1, '...', totalPages]
  }, [page, totalPages])
  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endRow   = Math.min(page * pageSize, total)

  // ── Modal helpers ─────────────────────────────────────────
  const openAdd = () => {
    setEditItem(null)
    reset({ dept_code: '', dept_name: '', sub_dept: '' })
    setModalOpen(true)
  }
  const openEdit = (item: DeptEntry) => {
    setEditItem(item)
    reset({ dept_code: item.dept_code, dept_name: item.dept_name, sub_dept: item.sub_dept ?? '' })
    setModalOpen(true)
  }

  const onSubmit = async (data: FormValues) => {
    setSaving(true)
    try {
      const payload = { ...data, dept_code: data.dept_code.trim().toUpperCase(), dept_name: data.dept_name.trim(), sub_dept: data.sub_dept.trim() }
      if (isNew) {
        await apiService.post('/departments', payload)
        toast.success('Department created successfully')
      } else {
        await apiService.put(`/departments/${editItem!.id}`, payload)
        toast.success('Department updated successfully')
      }
      setModalOpen(false); reset()
      await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  const confirmToggle = async (reason?: string) => {
    if (!toggleItem) return
    try {
      const res = await apiService.delete(`/departments/${toggleItem.id}`, reason ? { data: { reason } } : undefined)
      toast.success(res.data?.message || 'Status updated')
      setToggleItem(null)
      await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'
      toast.error(msg)
    }
  }

  const renderCell = (key: string, row: DeptEntry) => {
    switch (key) {
      case 'dept_code': return <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">{row.dept_code}</span>
      case 'is_active': return <Badge label={row.is_active ? 'Active' : 'Inactive'} variant={row.is_active ? 'success' : 'danger'} />
      case 'deactivation_reason': return row.deactivation_reason ? <span className="text-sm text-[var(--text-secondary)]">{row.deactivation_reason}</span> : <span className="text-[var(--text-muted)]">—</span>
      case 'deactivated_at': return row.deactivated_at ? <span className="text-xs text-[var(--text-muted)]">{formatDate(String(row.deactivated_at))}</span> : <span className="text-[var(--text-muted)]">—</span>
      case 'created_at': return <span className="text-xs text-[var(--text-muted)]">{formatDateTime(String(row.created_at))}</span>
      default: return <span className="text-sm text-[var(--text-secondary)]">{String((row as unknown as Record<string, unknown>)[key] ?? '') || '—'}</span>
    }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div>
      <PageBreadcrumb parent="Masters" current="Department Master" />

      {/* Top bar */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 pl-3">
          {(['active', 'inactive'] as const).map(s => (
            <button key={s}
              onClick={() => { setStatusFilter(s); setPage(1); setColFilters({}); setSearchInput(''); setSearch('') }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all w-36 ${statusFilter === s ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10' : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/50'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${s === 'active' ? 'bg-green-100' : 'bg-red-100'}`}>
                {s === 'active' ? <CheckCircleIcon className="w-3.5 h-3.5 text-green-600" /> : <NoSymbolIcon className="w-3.5 h-3.5 text-red-500" />}
              </div>
              <div className="text-left">
                <p className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{s === 'active' ? stats.active : stats.inactive}</p>
                <p className={`text-xs mt-0.5 font-medium ${s === 'active' ? 'text-green-600' : 'text-red-500'}`}>{s === 'active' ? 'Active' : 'Inactive'}</p>
              </div>
            </button>
          ))}
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Add Department
        </button>
      </div>

      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[var(--border-color)]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input value={searchInput} onChange={e => onSearchInput(e.target.value)}
              placeholder="Search departments…" className="form-input pl-9 pr-8 py-1.5 text-sm w-full" />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setShowFilterRow(s => !s)} title="Toggle Filters"
              className={`p-1.5 rounded-lg border transition-colors ${showFilterRow ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
              <FunnelIcon className="w-4 h-4" />
            </button>
            <button onClick={() => setShowSorting(s => !s)} title="Toggle Sorting"
              className={`p-1.5 rounded-lg border transition-colors ${showSorting ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
              <BarsArrowUpIcon className="w-4 h-4" />
            </button>
            <div ref={colPickerRef} className="relative">
              <button onClick={() => setShowColPicker(s => !s)} title="Columns"
                className={`p-1.5 rounded-lg border transition-colors ${showColPicker ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                <ViewColumnsIcon className="w-4 h-4" />
              </button>
              {showColPicker && (
                <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg p-1.5">
                  <p className="px-2 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Show / Hide</p>
                  {gridCols.map(col => (
                    <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer select-none">
                      <input type="checkbox" checked={col.visible} onChange={() => toggleCol(col.key)} className="w-3.5 h-3.5 accent-[var(--color-primary)]" />
                      <span className="text-sm text-[var(--text-secondary)]">{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div ref={exportRef} className="relative">
              <button onClick={() => setExportOpen(o => !o)} disabled={exporting} title="Export"
                className={`p-1.5 rounded-lg border transition-colors ${exportOpen ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                {exporting ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <ArrowDownTrayIcon className="w-4 h-4" />}
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg p-1.5">
                  <p className="px-2 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Export All</p>
                  {(['csv', 'excel', 'pdf'] as const).map(fmt => (
                    <button key={fmt} onClick={() => handleExport('all', fmt)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] text-left">
                      <span>{fmt === 'csv' ? '📄' : fmt === 'excel' ? '📊' : '📋'}</span>
                      <span className="font-medium">{fmt === 'csv' ? 'CSV' : fmt === 'excel' ? 'Excel' : 'PDF'}</span>
                    </button>
                  ))}
                  <div className="my-1.5 border-t border-[var(--border-color)]" />
                  <p className="px-2 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide flex items-center gap-1">
                    Export Selected
                    {selectedRows.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[var(--accent-gold)] text-white text-[10px] font-bold">{selectedRows.length}</span>}
                  </p>
                  {(['csv', 'excel', 'pdf'] as const).map(fmt => (
                    <button key={fmt} onClick={() => handleExport('selected', fmt)} disabled={!selectedRows.length}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] text-left disabled:opacity-40 disabled:cursor-not-allowed">
                      <span>{fmt === 'csv' ? '📄' : fmt === 'excel' ? '📊' : '📋'}</span>
                      <span className="font-medium">{fmt === 'csv' ? 'CSV' : fmt === 'excel' ? 'Excel' : 'PDF'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
              <span className="hidden sm:inline">Show</span>
              <select value={pageSize} onChange={e => handlePageSize(Number(e.target.value))} className="form-input py-1.5 text-sm" style={{ width: '72px' }}>
                {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="hidden sm:inline">per page</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                <th className="px-4 py-2.5 w-10">
                  <input type="checkbox" ref={masterCheckRef} checked={allPageSelected} onChange={toggleSelectPage} className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer" />
                </th>
                {visibleCols.map(col => (
                  <th key={col.key} style={{ minWidth: col.minW }}
                    onClick={() => showSorting && col.sortKey && handleSort(col.sortKey)}
                    className={`px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide select-none whitespace-nowrap ${showSorting && col.sortKey ? 'cursor-pointer hover:text-[var(--text-primary)]' : ''}`}>
                    <div className="flex items-center gap-1">
                      {col.label}
                      {showSorting && col.sortKey && (sortBy === col.sortKey
                        ? sortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5 text-[var(--accent-gold)]" /> : <ChevronDownIcon className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                        : <ChevronUpDownIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-2.5 w-28 text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide sticky right-0 z-10 bg-[var(--bg-secondary)] border-l border-[var(--border-color)]">Actions</th>
              </tr>
              {showFilterRow && (
                <tr className="border-b border-[var(--border-color)]" style={{ background: 'var(--bg-primary)' }}>
                  <th className="px-2 py-1.5 w-10" />
                  {visibleCols.map(col => (
                    <th key={col.key} className="px-2 py-1.5">
                      <input value={colFilters[col.key] ?? ''} onChange={e => setColFilters(f => ({ ...f, [col.key]: e.target.value }))}
                        placeholder="Filter…" className="w-full px-2 py-1 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]" />
                    </th>
                  ))}
                  <th className="px-2 py-1.5 text-center sticky right-0 z-10 border-l border-[var(--border-color)]" style={{ background: 'var(--bg-primary)' }}>
                    {Object.values(colFilters).some(v => v) && (
                      <button onClick={() => setColFilters({})} className="text-xs text-[var(--accent-gold)] hover:underline whitespace-nowrap">Clear</button>
                    )}
                  </th>
                </tr>
              )}
            </thead>
            <tbody className={fetching ? 'opacity-50 pointer-events-none' : ''}>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-color)]">
                    <td className="px-4 py-3"><div className="h-4 w-4 rounded animate-pulse bg-[var(--bg-tertiary)]" /></td>
                    {visibleCols.map(col => (
                      <td key={col.key} className="px-4 py-3"><div className="h-4 rounded animate-pulse bg-[var(--bg-tertiary)]" style={{ width: col.key === 'dept_name' ? '160px' : '80px' }} /></td>
                    ))}
                    <td className="px-4 py-3 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]"><div className="h-4 w-16 rounded animate-pulse bg-[var(--bg-tertiary)]" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length + 2} className="px-4 py-14 text-center text-sm text-[var(--text-muted)]">
                    {search || Object.values(colFilters).some(v => v) ? 'No records match the current filters.' : 'No departments found. Click "Add Department" to create one.'}
                  </td>
                </tr>
              ) : (
                items.map((row, idx) => (
                  <tr key={row.id}
                    className={`border-b border-[var(--border-color)] transition-colors hover:bg-[var(--bg-secondary)] ${idx % 2 !== 0 ? 'bg-[var(--bg-primary)]/40' : ''} ${selectedRows.some(r => r.id === row.id) ? 'bg-[var(--accent-gold)]/5' : ''}`}>
                    <td className="px-4 py-2.5">
                      <input type="checkbox" checked={selectedRows.some(r => r.id === row.id)} onChange={() => toggleSelectRow(row)} className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer" />
                    </td>
                    {visibleCols.map(col => <td key={col.key} className="px-4 py-2.5">{renderCell(col.key, row)}</td>)}
                    <td className="px-4 py-2.5 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(row)} className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500 ${(!row.is_active || row.used_elsewhere) ? 'invisible' : ''}`} title="Edit">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => setToggleItem(row)}
                          className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] ${row.is_active ? 'text-red-500' : 'text-green-600'} ${row.used_elsewhere ? 'invisible' : ''}`}
                          title={row.is_active ? 'Deactivate' : 'Activate'}>
                          {row.is_active ? <NoSymbolIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-muted)]">
              {total === 0 ? 'No records found' : `Showing ${startRow}–${endRow} of ${total} entries`}
            </span>
            {selectedRows.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent-gold)]">
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-gold)]/15 border border-[var(--accent-gold)]/30">{selectedRows.length} selected</span>
                <button onClick={() => setSelectedRows([])} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline underline-offset-2">Clear</button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage(1)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">«</button>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">‹</button>
            {pageNumbers.map((n, i) => n === '...' ? <span key={`d${i}`} className="px-1.5 text-xs text-[var(--text-muted)]">…</span> : (
              <button key={n} onClick={() => setPage(n as number)}
                className={`px-2.5 py-1 text-xs rounded border transition-colors ${page === n ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)] text-white font-semibold' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>{n}</button>
            ))}
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">›</button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">»</button>
          </div>
          <span className="text-sm text-[var(--text-muted)] hidden sm:block">Page {page} of {totalPages || 1}</span>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); reset() }}
        title={isNew ? 'Add Department' : 'Edit Department'}
        size="sm"
        footer={
          <>
            <button onClick={() => { setModalOpen(false); reset() }} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit(onSubmit)} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : isNew ? 'Create' : 'Update'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Department Code<Req /></label>
            {isNew ? (
              <input {...register('dept_code')} className="form-input" placeholder="e.g. MFG"
                onChange={e => { e.target.value = e.target.value.toUpperCase(); void register('dept_code').onChange(e) }} />
            ) : (
              <div className="form-input bg-[var(--bg-tertiary)] opacity-70 cursor-not-allowed font-mono font-semibold">{editItem?.dept_code}</div>
            )}
            {errors.dept_code && <p className="text-xs text-red-500 mt-1">{errors.dept_code.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Department Name<Req /></label>
            <input {...register('dept_name')} className="form-input" placeholder="e.g. Manufacturing" />
            {errors.dept_name && <p className="text-xs text-red-500 mt-1">{errors.dept_name.message}</p>}
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Sub Department <span className="text-[var(--text-muted)] font-normal text-xs">(optional)</span>
            </label>
            <input {...register('sub_dept')} className="form-input" placeholder="e.g. Casting" />
          </div>
        </div>
      </Modal>

      <DeactivateReasonDialog
        isOpen={!!toggleItem?.is_active}
        title="Deactivate Department"
        itemLabel={`"${toggleItem?.dept_name}" (${toggleItem?.dept_code})`}
        onConfirm={reason => confirmToggle(reason)}
        onCancel={() => setToggleItem(null)}
      />

      <ConfirmDialog
        isOpen={!!toggleItem && !toggleItem.is_active}
        title="Activate Department"
        message={`Activate "${toggleItem?.dept_name}" (${toggleItem?.dept_code})?`}
        confirmLabel="Activate"
        variant="info"
        onConfirm={() => confirmToggle()}
        onCancel={() => setToggleItem(null)}
      />
    </div>
  )
}

export default DeptMasterPage
