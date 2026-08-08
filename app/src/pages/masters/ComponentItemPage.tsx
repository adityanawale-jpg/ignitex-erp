import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon, EyeIcon, MagnifyingGlassIcon, XMarkIcon,
  ViewColumnsIcon, ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon,
  FunnelIcon, BarsArrowUpIcon, NoSymbolIcon, CheckCircleIcon,
  ArrowDownTrayIcon, CubeIcon,
} from '@heroicons/react/24/outline'
import Modal                  from '@/components/common/Modal'
import Badge                  from '@/components/common/Badge'
import ConfirmDialog          from '@/components/common/ConfirmDialog'
import DeactivateReasonDialog from '@/components/common/DeactivateReasonDialog'
import { formatDateTime, exportToCSV, exportToExcel, exportToPDF } from '@/utils/helpers'
import { apiService } from '@/api/apiService'
import { usePermission } from '@/hooks'

// ── Types ─────────────────────────────────────────────────────
interface ComponentItem {
  id:               number
  comp_code:        string
  comp_metal_type:  string | null
  comp_type:        string | null
  comp_karat_color: string | null
  comp_purity:      string | null
  comp_name:        string | null
  is_active:        boolean
  created_at:       string
}

interface LookupOption {
  lookup_code:   string
  lookup_name:   string
  display_order?: number
}

type FormValues = {
  comp_metal_type:  string
  comp_type:        string
  comp_karat_color: string
  comp_purity:      string
  comp_name:        string
  comp_code:        string
}

// ── Validation ────────────────────────────────────────────────
const schema = yup.object({
  comp_metal_type:  yup.string().required('Metal Type is required'),
  comp_type:        yup.string().required('Component Type is required'),
  comp_karat_color: yup.string().required('Karat/Color is required'),
  comp_purity:      yup.string().required('Purity is required'),
  comp_name:        yup.string().required('Component Name is required'),
  comp_code:        yup.string().default(''),   // display-only, set by DB trigger
})

// ── Constants ─────────────────────────────────────────────────
const PAGE_SIZES = [10, 25, 50, 100]
const Req = () => <span className="text-red-500 ml-0.5">*</span>

interface ColDef { key: string; label: string; sortKey?: string; visible: boolean; minW?: string }

const INITIAL_COLS: ColDef[] = [
  { key: 'comp_code',        label: 'Component Code', sortKey: 'comp_code',        visible: true, minW: '180px' },
  { key: 'comp_metal_type',  label: 'Metal Type',     sortKey: 'comp_metal_type',  visible: true, minW: '120px' },
  { key: 'comp_type',        label: 'Component Type', sortKey: 'comp_type',        visible: true, minW: '140px' },
  { key: 'comp_karat_color', label: 'Karat / Color',  sortKey: 'comp_karat_color', visible: true, minW: '120px' },
  { key: 'comp_purity',      label: 'Purity',         sortKey: 'comp_purity',      visible: true, minW: '100px' },
  { key: 'comp_name',        label: 'Component Name', sortKey: 'comp_name',        visible: true, minW: '140px' },
  { key: 'is_active',        label: 'Status',                                      visible: true, minW: '90px'  },
  { key: 'created_at',       label: 'Created',        sortKey: 'created_at',       visible: true, minW: '140px' },
]

// ── LOV types ─────────────────────────────────────────────────
const LOV_TYPES = ['METAL_TYPE', 'COMPONENT_TYPE', 'KARAT_COL', 'PURITY', 'COMPONENT_NAME'] as const
type LovType = typeof LOV_TYPES[number]

const FIELD_LOV: Record<keyof Omit<FormValues, 'comp_code'>, LovType> = {
  comp_metal_type:  'METAL_TYPE',
  comp_type:        'COMPONENT_TYPE',
  comp_karat_color: 'KARAT_COL',
  comp_purity:      'PURITY',
  comp_name:        'COMPONENT_NAME',
}

// ── Component ─────────────────────────────────────────────────
const ComponentItemPage: React.FC = () => {
  // ── Permissions ──────────────────────────────────────────────
  const { canView, canCreate, canUpdate, canDelete } = usePermission('MM_COMP_ITEMS')

  // ── LOV state ────────────────────────────────────────────────
  const [lovMap, setLovMap] = useState<Record<LovType, LookupOption[]>>({
    METAL_TYPE: [], COMPONENT_TYPE: [], KARAT_COL: [], PURITY: [], COMPONENT_NAME: [],
  })

  // ── Grid state ───────────────────────────────────────────────
  const [items,        setItems]        = useState<ComponentItem[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetching,     setFetching]     = useState(false)
  const isFirstLoad                     = useRef(true)
  const [stats,        setStats]        = useState({ active: 0, inactive: 0 })
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active')
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(25)
  const [searchInput,  setSearchInput]  = useState('')
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState('comp_code')
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('asc')
  const [total,        setTotal]        = useState(0)
  const [totalPages,   setTotalPages]   = useState(1)

  // ── Toolbar state ─────────────────────────────────────────────
  const [cols,          setCols]          = useState<ColDef[]>(INITIAL_COLS)
  const [showColPicker, setShowColPicker] = useState(false)
  const [showFilterRow, setShowFilterRow] = useState(false)
  const [showSorting,   setShowSorting]   = useState(true)
  const [colFilters,    setColFilters]    = useState<Record<string, string>>({})
  const [debouncedCF,   setDebouncedCF]   = useState<Record<string, string>>({})
  const [selectedRows,  setSelectedRows]  = useState<ComponentItem[]>([])
  const [exportOpen,    setExportOpen]    = useState(false)
  const [exporting,     setExporting]     = useState(false)
  const colPickerRef  = useRef<HTMLDivElement>(null)
  const exportRef     = useRef<HTMLDivElement>(null)
  const masterCheckRef = useRef<HTMLInputElement>(null)
  const searchTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cfTimer       = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Modal / form state ────────────────────────────────────────
  const [modalOpen,  setModalOpen]  = useState(false)
  const [formMode,   setFormMode]   = useState<'add' | 'edit' | 'view'>('add')
  const [editItem,   setEditItem]   = useState<ComponentItem | null>(null)
  const [toggleItem, setToggleItem] = useState<ComponentItem | null>(null)
  const [saving,     setSaving]     = useState(false)
  const isNew      = formMode === 'add'
  const isViewMode = formMode === 'view'

  // ── Form ──────────────────────────────────────────────────────
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<FormValues>({ resolver: yupResolver(schema) as never })

  const watchMetal   = watch('comp_metal_type')
  const watchType    = watch('comp_type')
  const watchKarat   = watch('comp_karat_color')
  const watchPurity  = watch('comp_purity')
  const watchName    = watch('comp_name')

  // Auto-generate comp_code from all 5 LOV fields (add mode only)
  useEffect(() => {
    if (!isNew) return
    if (watchMetal && watchType && watchKarat && watchPurity && watchName) {
      setValue('comp_code', `${watchMetal}-${watchType}-${watchKarat}-${watchPurity}-${watchName}`)
    } else {
      setValue('comp_code', '')
    }
  }, [watchMetal, watchType, watchKarat, watchPurity, watchName, isNew, setValue])

  // ── Load LOVs ─────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const results = await Promise.all(
          LOV_TYPES.map(t => apiService.get(`/common/lookup/${t}`))
        )
        const map = {} as Record<LovType, LookupOption[]>
        LOV_TYPES.forEach((t, i) => { map[t] = results[i].data?.data ?? [] })
        setLovMap(map)
      } catch {
        toast.error('Failed to load lookup options')
      }
    }
    load()
  }, [])

  // ── LOV name resolver ─────────────────────────────────────────
  const lovName = (type: LovType, code: string | null): string => {
    if (!code) return '—'
    return lovMap[type]?.find(o => o.lookup_code === code)?.lookup_name ?? code
  }

  // ── Data loaders ──────────────────────────────────────────────
  const loadStats = async () => {
    try {
      const res = await apiService.get('/component-items/stats')
      setStats(res.data?.data ?? { active: 0, inactive: 0 })
    } catch { /* silent */ }
  }

  const loadItems = async () => {
    if (isFirstLoad.current) setLoading(true)
    else setFetching(true)
    try {
      const activeCF = Object.fromEntries(Object.entries(debouncedCF).filter(([, v]) => v.trim()))
      const res = await apiService.get('/component-items', {
        params: {
          page, limit: pageSize, search, sort_by: sortBy, sort_dir: sortDir,
          status: statusFilter,
          ...(Object.keys(activeCF).length > 0 && { col_filters: JSON.stringify(activeCF) }),
        },
      })
      setItems(res.data?.data ?? [])
      setTotal(res.data?.meta?.total ?? 0)
      setTotalPages(res.data?.meta?.total_pages ?? 1)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to load component items')
    } finally {
      setLoading(false); setFetching(false); isFirstLoad.current = false
    }
  }

  useEffect(() => { loadStats() }, []) // eslint-disable-line
  useEffect(() => { loadItems() }, [page, pageSize, search, sortBy, sortDir, debouncedCF, statusFilter]) // eslint-disable-line

  // ── Debounce ──────────────────────────────────────────────────
  const onSearchInput = (val: string) => {
    setSearchInput(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1) }, 400)
  }

  useEffect(() => {
    if (cfTimer.current) clearTimeout(cfTimer.current)
    cfTimer.current = setTimeout(() => { setDebouncedCF(colFilters); setPage(1) }, 400)
  }, [colFilters]) // eslint-disable-line

  // ── Close dropdowns on outside click ──────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setShowColPicker(false)
      if (exportRef.current    && !exportRef.current.contains(e.target as Node))    setExportOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Sort / page ───────────────────────────────────────────────
  const handleSort    = (key: string) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
    setPage(1)
  }
  const handlePageSize = (n: number) => { setPageSize(n); setPage(1) }

  // ── Columns ───────────────────────────────────────────────────
  const toggleCol   = (key: string) => setCols(cs => cs.map(c => c.key === key ? { ...c, visible: !c.visible } : c))
  const visibleCols = cols.filter(c => c.visible)

  // ── Row selection ─────────────────────────────────────────────
  const currentPageIds   = items.map(r => r.id)
  const allPageSelected  = currentPageIds.length > 0 && currentPageIds.every(id => selectedRows.some(r => r.id === id))
  const somePageSelected = currentPageIds.some(id => selectedRows.some(r => r.id === id))

  useEffect(() => {
    if (masterCheckRef.current)
      masterCheckRef.current.indeterminate = somePageSelected && !allPageSelected
  }, [somePageSelected, allPageSelected])

  const toggleSelectPage = () => {
    if (allPageSelected) setSelectedRows(p => p.filter(r => !currentPageIds.includes(r.id)))
    else setSelectedRows(p => [...p, ...items.filter(u => !p.some(r => r.id === u.id))])
  }
  const toggleSelectRow = (item: ComponentItem) =>
    setSelectedRows(p => p.some(r => r.id === item.id) ? p.filter(r => r.id !== item.id) : [...p, item])

  // ── Export ────────────────────────────────────────────────────
  const buildExportRows = (rows: ComponentItem[]) =>
    rows.map(r => ({
      'Component Code': r.comp_code,
      'Metal Type':     lovName('METAL_TYPE',     r.comp_metal_type),
      'Component Type': lovName('COMPONENT_TYPE', r.comp_type),
      'Karat / Color':  lovName('KARAT_COL',      r.comp_karat_color),
      'Purity':         lovName('PURITY',          r.comp_purity),
      'Component Name': lovName('COMPONENT_NAME',  r.comp_name),
      'Status':         r.is_active ? 'Active' : 'Inactive',
      'Created':        formatDateTime(String(r.created_at)),
    }))

  const handleExport = async (scope: 'all' | 'selected', format: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false)
    let rows: ComponentItem[]
    if (scope === 'selected') {
      rows = selectedRows
      if (!rows.length) { toast.error('No rows selected'); return }
    } else {
      setExporting(true)
      try {
        const res = await apiService.get('/component-items', {
          params: { page: 1, limit: 9999, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter },
        })
        rows = res.data?.data ?? []
      } catch { toast.error('Failed to fetch export data'); setExporting(false); return }
      setExporting(false)
    }
    const data  = buildExportRows(rows)
    const fname = `component_items_${statusFilter}`
    if (format === 'csv')        exportToCSV(data, fname)
    else if (format === 'excel') void exportToExcel(data, fname)
    else                         void exportToPDF(data, fname, 'Component Items Report')
  }

  // ── Cell renderer ─────────────────────────────────────────────
  const renderCell = (col: ColDef, row: ComponentItem) => {
    switch (col.key) {
      case 'comp_code':
        return <span className="font-mono text-sm font-semibold" style={{ color: 'var(--accent-gold)' }}>{row.comp_code}</span>
      case 'comp_metal_type':
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{lovName('METAL_TYPE', row.comp_metal_type)}</span>
      case 'comp_type':
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{lovName('COMPONENT_TYPE', row.comp_type)}</span>
      case 'comp_karat_color':
        return <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{lovName('KARAT_COL', row.comp_karat_color)}</span>
      case 'comp_purity':
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{lovName('PURITY', row.comp_purity)}</span>
      case 'comp_name':
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{lovName('COMPONENT_NAME', row.comp_name)}</span>
      case 'is_active':
        return <Badge label={row.is_active ? 'Active' : 'Inactive'} variant={row.is_active ? 'success' : 'danger'} />
      case 'created_at':
        return <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(String(row.created_at))}</span>
      default:
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>—</span>
    }
  }

  // ── Pagination numbers ─────────────────────────────────────────
  const pageNumbers = useMemo((): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 4) return [1, 2, 3, 4, 5, '...', totalPages]
    if (page >= totalPages - 3) return [1, '...', totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages]
    return [1, '...', page - 1, page, page + 1, '...', totalPages]
  }, [page, totalPages])

  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endRow   = Math.min(page * pageSize, total)

  // ── Modal helpers ─────────────────────────────────────────────
  const emptyForm: FormValues = { comp_metal_type: '', comp_type: '', comp_karat_color: '', comp_purity: '', comp_name: '', comp_code: '' }

  const openAdd = () => {
    setFormMode('add'); setEditItem(null); reset(emptyForm); setModalOpen(true)
  }
  const openEdit = (item: ComponentItem) => {
    setFormMode('edit'); setEditItem(item)
    reset({
      comp_metal_type:  item.comp_metal_type  ?? '',
      comp_type:        item.comp_type        ?? '',
      comp_karat_color: item.comp_karat_color ?? '',
      comp_purity:      item.comp_purity      ?? '',
      comp_name:        item.comp_name        ?? '',
      comp_code:        item.comp_code,
    })
    setModalOpen(true)
  }
  const openView = (item: ComponentItem) => {
    setFormMode('view'); setEditItem(item)
    reset({
      comp_metal_type:  item.comp_metal_type  ?? '',
      comp_type:        item.comp_type        ?? '',
      comp_karat_color: item.comp_karat_color ?? '',
      comp_purity:      item.comp_purity      ?? '',
      comp_name:        item.comp_name        ?? '',
      comp_code:        item.comp_code,
    })
    setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); reset(emptyForm) }

  const onSubmit = async (data: FormValues) => {
    setSaving(true)
    try {
      const { comp_code: _omit, ...payload } = data
      if (isNew) {
        await apiService.post('/component-items', payload)
        toast.success('Component item created successfully')
      } else {
        await apiService.put(`/component-items/${editItem!.id}`, payload)
        toast.success('Component item updated successfully')
      }
      closeModal()
      await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  const confirmToggle = async (reason?: string) => {
    if (!toggleItem) return
    try {
      const res = await apiService.delete(`/component-items/${toggleItem.id}`, reason ? { data: { reason } } : undefined)
      toast.success(res.data?.message || 'Status updated')
      setToggleItem(null)
      await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'
      toast.error(msg)
    }
  }

  // ── LOV Select helper ─────────────────────────────────────────
  const LovSelect = ({
    field, label, required,
  }: {
    field: keyof Omit<FormValues, 'comp_code'>
    label: string
    required?: boolean
  }) => {
    const lovType    = FIELD_LOV[field]
    const err        = errors[field]
    const isDisabled = isViewMode || !isNew
    return (
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          {label}{required && !isViewMode && <Req />}
        </label>
        <select
          {...register(field)}
          disabled={isDisabled}
          className={`form-input ${isDisabled ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
        >
          <option value="">Select {label}</option>
          {lovMap[lovType].map(opt => (
            <option key={opt.lookup_code} value={opt.lookup_code}>{opt.lookup_name}</option>
          ))}
        </select>
        {!isViewMode && err && <p className="text-xs text-red-500 mt-1">{err.message}</p>}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <span>Masters</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>Component Items</span>
      </div>

      {/* Stats + Add */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 pl-1">
          {(['active', 'inactive'] as const).map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); setColFilters({}); setSearchInput(''); setSearch('') }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 transition-all w-36 ${
                statusFilter === s
                  ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                  : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/50'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${s === 'active' ? 'bg-green-100' : 'bg-red-100'}`}>
                {s === 'active'
                  ? <CheckCircleIcon className="w-3.5 h-3.5 text-green-600" />
                  : <NoSymbolIcon    className="w-3.5 h-3.5 text-red-500" />
                }
              </div>
              <div className="text-left">
                <p className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                  {s === 'active' ? stats.active : stats.inactive}
                </p>
                <p className={`text-xs mt-0.5 font-medium ${s === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                  {s === 'active' ? 'Active' : 'Inactive'}
                </p>
              </div>
            </button>
          ))}
        </div>

        {canCreate && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Add Component
          </button>
        )}
      </div>

      {/* Card */}
      <div className="card overflow-hidden">

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[var(--border-color)]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              value={searchInput}
              onChange={e => onSearchInput(e.target.value)}
              placeholder="Search component items…"
              className="form-input pl-9 pr-8 py-1.5 text-sm w-full"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setShowFilterRow(s => !s)} title="Column Filters"
              className={`p-1.5 rounded-lg border transition-colors ${showFilterRow ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
            >
              <FunnelIcon className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowSorting(s => !s)} title="Column Sorting"
              className={`p-1.5 rounded-lg border transition-colors ${showSorting ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
            >
              <BarsArrowUpIcon className="w-4 h-4" />
            </button>

            <div ref={colPickerRef} className="relative">
              <button
                onClick={() => setShowColPicker(s => !s)} title="Show / Hide Columns"
                className={`p-1.5 rounded-lg border transition-colors ${showColPicker ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
              >
                <ViewColumnsIcon className="w-4 h-4" />
              </button>
              {showColPicker && (
                <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg p-1.5">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Show / Hide</p>
                  {cols.map(col => (
                    <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer select-none">
                      <input type="checkbox" checked={col.visible} onChange={() => toggleCol(col.key)} className="w-3.5 h-3.5 accent-[var(--color-primary)]" />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div ref={exportRef} className="relative">
              <button
                onClick={() => setExportOpen(o => !o)} disabled={exporting} title="Export"
                className={`p-1.5 rounded-lg border transition-colors ${exportOpen ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
              >
                {exporting
                  ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <ArrowDownTrayIcon className="w-4 h-4" />
                }
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg p-1.5">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Export All Records</p>
                  {(['csv', 'excel', 'pdf'] as const).map(fmt => (
                    <button key={fmt} onClick={() => handleExport('all', fmt)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] text-left">
                      <span className="text-base">{fmt === 'csv' ? '📄' : fmt === 'excel' ? '📊' : '📋'}</span>
                      <span className="font-medium">{fmt === 'csv' ? 'CSV' : fmt === 'excel' ? 'Excel (.xlsx)' : 'PDF'}</span>
                    </button>
                  ))}
                  {selectedRows.length > 0 && (
                    <>
                      <hr className="my-1 border-[var(--border-color)]" />
                      <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        Export Selected ({selectedRows.length})
                      </p>
                      {(['csv', 'excel', 'pdf'] as const).map(fmt => (
                        <button key={`s-${fmt}`} onClick={() => handleExport('selected', fmt)}
                          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] text-left">
                          <span className="text-base">{fmt === 'csv' ? '📄' : fmt === 'excel' ? '📊' : '📋'}</span>
                          <span className="font-medium">{fmt === 'csv' ? 'CSV' : fmt === 'excel' ? 'Excel (.xlsx)' : 'PDF'}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span className="hidden sm:inline">Show</span>
              <select value={pageSize} onChange={e => handlePageSize(Number(e.target.value))}
                className="form-input py-1.5 text-sm" style={{ width: '72px' }}>
                {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="hidden sm:inline">per page</span>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                <th className="px-4 py-2.5 w-10">
                  <input type="checkbox" ref={masterCheckRef} checked={allPageSelected} onChange={toggleSelectPage}
                    className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer" />
                </th>
                {visibleCols.map(col => (
                  <th key={col.key} style={{ minWidth: col.minW, color: 'var(--text-muted)' } as React.CSSProperties}
                    onClick={() => showSorting && col.sortKey && handleSort(col.sortKey)}
                    className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide select-none whitespace-nowrap ${showSorting && col.sortKey ? 'cursor-pointer hover:text-[var(--text-primary)]' : ''}`}>
                    <div className="flex items-center gap-1">
                      {col.label}
                      {showSorting && col.sortKey && (
                        sortBy === col.sortKey
                          ? sortDir === 'asc'
                            ? <ChevronUpIcon   className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                            : <ChevronDownIcon className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                          : <ChevronUpDownIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-2.5 w-28 text-center text-xs font-semibold uppercase tracking-wide sticky right-0 z-10 border-l border-[var(--border-color)] bg-[var(--bg-secondary)]"
                  style={{ color: 'var(--text-muted)' }}>
                  Actions
                </th>
              </tr>

              {showFilterRow && (
                <tr className="border-b border-[var(--border-color)]" style={{ background: 'var(--bg-primary)' }}>
                  <th className="px-2 py-1.5 w-10" />
                  {visibleCols.map(col => (
                    <th key={col.key} className="px-2 py-1.5">
                      <input value={colFilters[col.key] ?? ''} onChange={e => setColFilters(f => ({ ...f, [col.key]: e.target.value }))}
                        placeholder="Filter…"
                        className="w-full px-2 py-1 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]" />
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
                Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-color)]">
                    <td className="px-4 py-3"><div className="h-4 w-4 rounded animate-pulse bg-[var(--bg-tertiary)]" /></td>
                    {visibleCols.map(col => (
                      <td key={col.key} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse bg-[var(--bg-tertiary)]"
                          style={{ width: col.key === 'comp_code' ? '160px' : '80px' }} />
                      </td>
                    ))}
                    <td className="px-4 py-3 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]">
                      <div className="h-4 w-16 rounded animate-pulse bg-[var(--bg-tertiary)]" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length + 2} className="px-4 py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex flex-col items-center gap-3">
                      <CubeIcon className="w-10 h-10 opacity-30" />
                      {search || Object.values(colFilters).some(v => v)
                        ? 'No component items match the current filters.'
                        : `No ${statusFilter} component items found. Click "Add Component" to get started.`
                      }
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id}
                    className={`border-b border-[var(--border-color)] transition-colors hover:bg-[var(--bg-secondary)]
                      ${idx % 2 !== 0 ? 'bg-[var(--bg-primary)]/40' : ''}
                      ${selectedRows.some(r => r.id === item.id) ? 'bg-[var(--accent-gold)]/5' : ''}`}>
                    <td className="px-4 py-2.5">
                      <input type="checkbox" checked={selectedRows.some(r => r.id === item.id)} onChange={() => toggleSelectRow(item)}
                        className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer" />
                    </td>
                    {visibleCols.map(col => (
                      <td key={col.key} className="px-4 py-2.5">{renderCell(col, item)}</td>
                    ))}
                    <td className="px-4 py-2.5 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]">
                      <div className="flex items-center justify-center gap-1">
                        {/* Edit — canUpdate; invisible (not unmounted) when inactive, to keep icon columns aligned */}
                        {canUpdate && (
                          <button onClick={() => openEdit(item)} className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500 ${!item.is_active ? 'invisible' : ''}`} title="Edit">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {/* View — all rows + canView */}
                        {canView && (
                          <button onClick={() => openView(item)} className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]" title="View">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        )}
                        {/* Toggle status — canDelete */}
                        {canDelete && (
                          <button onClick={() => setToggleItem(item)}
                            className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] ${item.is_active ? 'text-red-500' : 'text-green-500'}`}
                            title={item.is_active ? 'Deactivate' : 'Activate'}>
                            {item.is_active ? <NoSymbolIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {total === 0 ? 'No records found' : `Showing ${startRow}–${endRow} of ${total} component items`}
            </span>
            {selectedRows.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent-gold)]">
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-gold)]/15 border border-[var(--accent-gold)]/30">
                  {selectedRows.length} selected
                </span>
                <button onClick={() => setSelectedRows([])} className="text-xs hover:text-[var(--text-primary)] underline underline-offset-2" style={{ color: 'var(--text-muted)' }}>
                  Clear
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage(1)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">«</button>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">‹</button>
            {pageNumbers.map((n, i) =>
              n === '...' ? (
                <span key={`d-${i}`} className="px-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>…</span>
              ) : (
                <button key={n} onClick={() => setPage(n as number)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${page === n ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)] text-white font-semibold' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                  {n}
                </button>
              )
            )}
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">›</button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">»</button>
          </div>

          <span className="text-sm hidden sm:block" style={{ color: 'var(--text-muted)' }}>
            Page {page} of {totalPages || 1}
          </span>
        </div>
      </div>

      {/* ── Add / Edit / View Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={
          isNew
            ? 'Add Component Item'
            : isViewMode
              ? `View Component — ${editItem?.comp_code}`
              : `Edit Component — ${editItem?.comp_code}`
        }
        size="lg"
        footer={
          isViewMode ? (
            <button onClick={closeModal} className="btn-secondary">Close</button>
          ) : (
            <>
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button onClick={handleSubmit(onSubmit)} disabled={saving} className="btn-primary">
                {saving
                  ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />Saving…</>
                  : isNew ? 'Create Component' : 'Update Component'
                }
              </button>
            </>
          )
        }
      >
        <div className="space-y-5">
          {/* View-mode banner */}
          {isViewMode && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
              <EyeIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Read-only view — no changes can be made.</p>
            </div>
          )}

          {/* LOV fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LovSelect field="comp_metal_type"  label="Metal Type"      required />
            <LovSelect field="comp_type"        label="Component Type"  required />
            <LovSelect field="comp_karat_color" label="Karat / Color"   required />
            <LovSelect field="comp_purity"      label="Purity"          required />
            <LovSelect field="comp_name"        label="Component Name"  required />

            {/* Component Code — always read-only, set by DB trigger — full width */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Component Code
                {isNew && (
                  <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--accent-gold)/10', color: 'var(--accent-gold)' }}>
                    Auto-generated
                  </span>
                )}
              </label>
              <input
                {...register('comp_code')}
                readOnly
                className="form-input font-mono font-semibold cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]"
                style={{ color: 'var(--accent-gold)' }}
                placeholder="Select all fields above…"
              />
            </div>
          </div>

          {/* Info note — add mode */}
          {isNew && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5">
              <CubeIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--accent-gold)]" />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Component Code is auto-generated from the combination of
                Metal Type · Component Type · Karat/Color · Purity · Component Name.
                Select all five fields to generate the code.
              </p>
            </div>
          )}
        </div>
      </Modal>

      <DeactivateReasonDialog
        isOpen={!!toggleItem?.is_active}
        title="Deactivate Component"
        itemLabel={`Component "${toggleItem?.comp_code}"`}
        onConfirm={reason => confirmToggle(reason)}
        onCancel={() => setToggleItem(null)}
      />

      <ConfirmDialog
        isOpen={!!toggleItem && !toggleItem.is_active}
        title="Activate Component"
        message={`Activate component "${toggleItem?.comp_code}"?`}
        confirmLabel="Activate"
        variant="info"
        onConfirm={() => confirmToggle()}
        onCancel={() => setToggleItem(null)}
      />
    </div>
  )
}

export default ComponentItemPage
