import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon, EyeIcon, MagnifyingGlassIcon, XMarkIcon,
  ViewColumnsIcon, ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon,
  FunnelIcon, BarsArrowUpIcon, NoSymbolIcon, CheckCircleIcon,
  ArrowDownTrayIcon, SparklesIcon,
} from '@heroicons/react/24/outline'
import Modal                  from '@/components/common/Modal'
import Badge                  from '@/components/common/Badge'
import ConfirmDialog          from '@/components/common/ConfirmDialog'
import DeactivateReasonDialog from '@/components/common/DeactivateReasonDialog'
import { formatDate, formatDateTime, exportToCSV, exportToExcel, exportToPDF } from '@/utils/helpers'
import { apiService } from '@/api/apiService'
import { usePermission } from '@/hooks'

// ── Types ─────────────────────────────────────────────────────
interface StoneItem {
  id:          number
  stn_code:    string
  stn_type:    string | null
  stn_shape:   string | null
  stn_quality: string | null
  stn_color:   string | null
  stn_size:    string | null
  std_cts:     number | null
  is_active:   boolean
  deactivation_reason: string | null
  deactivated_at:      string | null
  used_in_bom: boolean
  created_at:  string
}

interface LookupOption {
  lookup_code:  string
  lookup_name:  string
  display_order?: number
}

type FormValues = {
  stn_type:    string
  stn_shape:   string
  stn_quality: string
  stn_color:   string
  stn_size:    string
  stn_code:    string
  std_cts:     string
}

// ── Validation ────────────────────────────────────────────────
const schema = yup.object({
  stn_type:    yup.string().required('Stone Type is required'),
  stn_shape:   yup.string().required('Stone Shape is required'),
  stn_quality: yup.string().required('Quality is required'),
  stn_color:   yup.string().required('Color is required'),
  stn_size:    yup.string().required('Size is required'),
  stn_code:    yup.string().default(''),   // display-only, set by DB trigger
  std_cts:     yup.string().default(''),
})

// ── Constants ─────────────────────────────────────────────────
const PAGE_SIZES = [10, 25, 50, 100]
const Req = () => <span className="text-red-500 ml-0.5">*</span>

interface ColDef { key: string; label: string; sortKey?: string; visible: boolean; minW?: string }

const INITIAL_COLS: ColDef[] = [
  { key: 'stn_code',    label: 'Stone Code',   sortKey: 'stn_code',    visible: true, minW: '160px' },
  { key: 'stn_type',    label: 'Stone Type',   sortKey: 'stn_type',    visible: true, minW: '120px' },
  { key: 'stn_shape',   label: 'Stone Shape',  sortKey: 'stn_shape',   visible: true, minW: '120px' },
  { key: 'stn_quality', label: 'Quality',      sortKey: 'stn_quality', visible: true, minW: '100px' },
  { key: 'stn_color',   label: 'Color',        sortKey: 'stn_color',   visible: true, minW: '100px' },
  { key: 'stn_size',    label: 'Size',         sortKey: 'stn_size',    visible: true, minW: '120px' },
  { key: 'std_cts',     label: 'Std Cts',     sortKey: 'std_cts',     visible: true, minW: '90px'  },
  { key: 'is_active',           label: 'Status',                       visible: true, minW: '90px'  },
  { key: 'deactivation_reason', label: 'Deactive Reason',              visible: true, minW: '160px' },
  { key: 'deactivated_at',      label: 'Deactive Date',                visible: true, minW: '120px' },
  { key: 'created_at',  label: 'Created',      sortKey: 'created_at',  visible: true, minW: '140px' },
]

// ── LOV lookup types needed ───────────────────────────────────
const LOV_TYPES = ['STONE_TYPE', 'STN_SHAPE', 'QUALITY', 'COLOR', 'SIZE'] as const
type LovType = typeof LOV_TYPES[number]

// Map form field → LOV type (excludes non-LOV fields stn_code and std_cts)
type LovField = keyof Omit<FormValues, 'stn_code' | 'std_cts'>
const FIELD_LOV: Record<LovField, LovType> = {
  stn_type:    'STONE_TYPE',
  stn_shape:   'STN_SHAPE',
  stn_quality: 'QUALITY',
  stn_color:   'COLOR',
  stn_size:    'SIZE',
}

// ── Component ─────────────────────────────────────────────────
const StoneItemPage: React.FC = () => {
  // ── LOV state ───────────────────────────────────────────────
  const [lovMap, setLovMap] = useState<Record<LovType, LookupOption[]>>({
    STONE_TYPE: [], STN_SHAPE: [], QUALITY: [], COLOR: [], SIZE: [],
  })

  // ── Grid state ──────────────────────────────────────────────
  const [items,        setItems]        = useState<StoneItem[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetching,     setFetching]     = useState(false)
  const isFirstLoad                     = useRef(true)
  const [stats,        setStats]        = useState({ active: 0, inactive: 0 })
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active')
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(25)
  const [searchInput,  setSearchInput]  = useState('')
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState('stn_code')
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('asc')
  const [total,        setTotal]        = useState(0)
  const [totalPages,   setTotalPages]   = useState(1)

  // ── Toolbar state ────────────────────────────────────────────
  const [cols,              setCols]              = useState<ColDef[]>(INITIAL_COLS)
  const [showColPicker,     setShowColPicker]     = useState(false)
  const [showFilterRow,     setShowFilterRow]     = useState(false)
  const [showSorting,       setShowSorting]       = useState(true)
  const [colFilters,        setColFilters]        = useState<Record<string, string>>({})
  const [debouncedCF,       setDebouncedCF]       = useState<Record<string, string>>({})
  const [selectedRows,      setSelectedRows]      = useState<StoneItem[]>([])
  const [exportOpen,        setExportOpen]        = useState(false)
  const [exporting,         setExporting]         = useState(false)
  const colPickerRef                              = useRef<HTMLDivElement>(null)
  const exportRef                                 = useRef<HTMLDivElement>(null)
  const masterCheckRef                            = useRef<HTMLInputElement>(null)
  const searchTimer                               = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cfTimer                                   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Permissions ──────────────────────────────────────────────
  const { canView, canCreate, canUpdate, canDelete } = usePermission('MM_STONE_ITEMS')

  // ── Modal / confirm state ────────────────────────────────────
  const [modalOpen,   setModalOpen]   = useState(false)
  const [formMode,    setFormMode]    = useState<'add' | 'edit' | 'view'>('add')
  const [editItem,    setEditItem]    = useState<StoneItem | null>(null)
  const [toggleItem,  setToggleItem]  = useState<StoneItem | null>(null)
  const [saving,      setSaving]      = useState(false)
  const isNew     = formMode === 'add'
  const isViewMode = formMode === 'view'

  // ── Form ─────────────────────────────────────────────────────
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<FormValues>({ resolver: yupResolver(schema) as never })

  const watchType    = watch('stn_type')
  const watchShape   = watch('stn_shape')
  const watchQuality = watch('stn_quality')
  const watchColor   = watch('stn_color')
  const watchSize    = watch('stn_size')

  // Auto-generate stone code when all 5 LOV fields are selected (add mode only)
  useEffect(() => {
    if (!isNew) return
    if (watchType && watchShape && watchQuality && watchColor && watchSize) {
      setValue('stn_code', `${watchType}-${watchShape}-${watchQuality}-${watchColor}-${watchSize}`)
    } else {
      setValue('stn_code', '')
    }
  }, [watchType, watchShape, watchQuality, watchColor, watchSize, isNew, setValue])

  // ── Load LOVs ────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const results = await Promise.all(
          LOV_TYPES.map(type => apiService.get(`/common/lookup/${type}`))
        )
        const map = {} as Record<LovType, LookupOption[]>
        LOV_TYPES.forEach((type, i) => {
          map[type] = results[i].data?.data ?? []
        })
        setLovMap(map)
      } catch {
        toast.error('Failed to load lookup options')
      }
    }
    load()
  }, [])

  // ── Lookup name resolver ─────────────────────────────────────
  const lovName = (type: LovType, code: string | null): string => {
    if (!code) return '—'
    const opt = lovMap[type]?.find(o => o.lookup_code === code)
    return opt?.lookup_name ?? code
  }

  // ── Data loaders ─────────────────────────────────────────────
  const loadStats = async () => {
    try {
      const res = await apiService.get('/stone-items/stats')
      setStats(res.data?.data ?? { active: 0, inactive: 0 })
    } catch { /* silent */ }
  }

  const loadItems = async () => {
    if (isFirstLoad.current) setLoading(true)
    else setFetching(true)
    try {
      const activeCF = Object.fromEntries(Object.entries(debouncedCF).filter(([, v]) => v.trim()))
      const res = await apiService.get('/stone-items', {
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
      toast.error(msg || 'Failed to load stone items')
    } finally {
      setLoading(false); setFetching(false); isFirstLoad.current = false
    }
  }

  useEffect(() => { loadStats() }, []) // eslint-disable-line
  useEffect(() => { loadItems() }, [page, pageSize, search, sortBy, sortDir, debouncedCF, statusFilter]) // eslint-disable-line

  // ── Debounce handlers ─────────────────────────────────────────
  const onSearchInput = (val: string) => {
    setSearchInput(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1) }, 400)
  }

  useEffect(() => {
    if (cfTimer.current) clearTimeout(cfTimer.current)
    cfTimer.current = setTimeout(() => { setDebouncedCF(colFilters); setPage(1) }, 400)
  }, [colFilters]) // eslint-disable-line

  // ── Close dropdowns on outside click ─────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node))
        setShowColPicker(false)
      if (exportRef.current && !exportRef.current.contains(e.target as Node))
        setExportOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Sort ──────────────────────────────────────────────────────
  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
    setPage(1)
  }

  // ── Page size ─────────────────────────────────────────────────
  const handlePageSize = (size: number) => { setPageSize(size); setPage(1) }

  // ── Column visibility ─────────────────────────────────────────
  const toggleCol  = (key: string) => setCols(cs => cs.map(c => c.key === key ? { ...c, visible: !c.visible } : c))
  const gridCols = statusFilter === 'inactive' ? cols : cols.filter(c => c.key !== 'deactivation_reason' && c.key !== 'deactivated_at')
  const visibleCols = gridCols.filter(c => c.visible)

  // ── Row selection ─────────────────────────────────────────────
  const currentPageIds   = items.map(r => r.id)
  const allPageSelected  = currentPageIds.length > 0 && currentPageIds.every(id => selectedRows.some(r => r.id === id))
  const somePageSelected = currentPageIds.some(id => selectedRows.some(r => r.id === id))

  useEffect(() => {
    if (masterCheckRef.current)
      masterCheckRef.current.indeterminate = somePageSelected && !allPageSelected
  }, [somePageSelected, allPageSelected])

  const toggleSelectPage = () => {
    if (allPageSelected) setSelectedRows(prev => prev.filter(r => !currentPageIds.includes(r.id)))
    else {
      const toAdd = items.filter(u => !selectedRows.some(r => r.id === u.id))
      setSelectedRows(prev => [...prev, ...toAdd])
    }
  }
  const toggleSelectRow = (item: StoneItem) =>
    setSelectedRows(prev =>
      prev.some(r => r.id === item.id)
        ? prev.filter(r => r.id !== item.id)
        : [...prev, item]
    )

  // ── Export ────────────────────────────────────────────────────
  const buildExportRows = (rows: StoneItem[]) =>
    rows.map(r => ({
      'Stone Code':  r.stn_code,
      'Stone Type':  lovName('STONE_TYPE', r.stn_type),
      'Stone Shape': lovName('STN_SHAPE',  r.stn_shape),
      'Quality':     lovName('QUALITY',    r.stn_quality),
      'Color':       lovName('COLOR',      r.stn_color),
      'Size':        lovName('SIZE',       r.stn_size),
      'Std Cts':     r.std_cts ?? '',
      'Status':      r.is_active ? 'Active' : 'Inactive',
      ...(statusFilter === 'inactive' && {
        'Deactive Reason': r.deactivation_reason || '',
        'Deactive Date': r.deactivated_at ? formatDate(String(r.deactivated_at)) : '',
      }),
      'Created':     formatDateTime(String(r.created_at)),
    }))

  const handleExport = async (scope: 'all' | 'selected', format: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false)
    let rows: StoneItem[]
    if (scope === 'selected') {
      rows = selectedRows
      if (!rows.length) { toast.error('No rows selected'); return }
    } else {
      setExporting(true)
      try {
        const res = await apiService.get('/stone-items', {
          params: { page: 1, limit: 9999, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter },
        })
        rows = res.data?.data ?? []
      } catch { toast.error('Failed to fetch export data'); setExporting(false); return }
      setExporting(false)
    }
    const data  = buildExportRows(rows)
    const fname = `stone_items_${statusFilter}`
    if (format === 'csv')   exportToCSV(data, fname)
    else if (format === 'excel') void exportToExcel(data, fname)
    else void exportToPDF(data, fname, 'Stone Items Report')
  }

  // ── Cell renderer ─────────────────────────────────────────────
  const renderCell = (col: ColDef, row: StoneItem) => {
    switch (col.key) {
      case 'stn_code':
        return (
          <span className="font-mono text-sm font-semibold" style={{ color: 'var(--accent-gold)' }}>
            {row.stn_code}
          </span>
        )
      case 'stn_type':
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{lovName('STONE_TYPE', row.stn_type)}</span>
      case 'stn_shape':
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{lovName('STN_SHAPE', row.stn_shape)}</span>
      case 'stn_quality':
        return <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{lovName('QUALITY', row.stn_quality)}</span>
      case 'stn_color':
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{lovName('COLOR', row.stn_color)}</span>
      case 'stn_size':
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{lovName('SIZE', row.stn_size)}</span>
      case 'std_cts':
        return <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{row.std_cts != null ? row.std_cts : '—'}</span>
      case 'is_active':
        return <Badge label={row.is_active ? 'Active' : 'Inactive'} variant={row.is_active ? 'success' : 'danger'} />
      case 'deactivation_reason':
        return row.deactivation_reason ? <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.deactivation_reason}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>
      case 'deactivated_at':
        return row.deactivated_at ? <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(String(row.deactivated_at))}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>
      case 'created_at':
        return <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(String(row.created_at))}</span>
      default:
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>—</span>
    }
  }

  // ── Pagination numbers ────────────────────────────────────────
  const pageNumbers = useMemo((): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 4) return [1, 2, 3, 4, 5, '...', totalPages]
    if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, '...', page - 1, page, page + 1, '...', totalPages]
  }, [page, totalPages])

  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endRow   = Math.min(page * pageSize, total)

  // ── Modal helpers ─────────────────────────────────────────────
  const openAdd = () => {
    setFormMode('add')
    setEditItem(null)
    reset({ stn_type: '', stn_shape: '', stn_quality: '', stn_color: '', stn_size: '', stn_code: '', std_cts: '' })
    setModalOpen(true)
  }

  const openEdit = (item: StoneItem) => {
    setFormMode('edit')
    setEditItem(item)
    reset({
      stn_type:    item.stn_type    ?? '',
      stn_shape:   item.stn_shape   ?? '',
      stn_quality: item.stn_quality ?? '',
      stn_color:   item.stn_color   ?? '',
      stn_size:    item.stn_size    ?? '',
      stn_code:    item.stn_code,
      std_cts:     item.std_cts != null ? String(item.std_cts) : '',
    })
    setModalOpen(true)
  }

  const openView = (item: StoneItem) => {
    setFormMode('view')
    setEditItem(item)
    reset({
      stn_type:    item.stn_type    ?? '',
      stn_shape:   item.stn_shape   ?? '',
      stn_quality: item.stn_quality ?? '',
      stn_color:   item.stn_color   ?? '',
      stn_size:    item.stn_size    ?? '',
      stn_code:    item.stn_code,
      std_cts:     item.std_cts != null ? String(item.std_cts) : '',
    })
    setModalOpen(true)
  }

  const onSubmit = async (data: FormValues) => {
    setSaving(true)
    try {
      // stn_code is generated by DB trigger — never sent to API
      const { stn_code: _omit, std_cts: stdCtsStr, ...rest } = data
      const payload = { ...rest, std_cts: stdCtsStr !== '' ? Number(stdCtsStr) : null }
      if (isNew) {
        await apiService.post('/stone-items', payload)
        toast.success('Stone item created successfully')
      } else {
        await apiService.put(`/stone-items/${editItem!.id}`, payload)
        toast.success('Stone item updated successfully')
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
      const res = await apiService.delete(`/stone-items/${toggleItem.id}`, reason ? { data: { reason } } : undefined)
      toast.success(res.data?.message || 'Status updated')
      setToggleItem(null)
      await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'
      toast.error(msg)
    }
  }

  // ── LOV select helper ─────────────────────────────────────────
  const LovSelect = ({
    field, label, required,
  }: {
    field: LovField
    label: string
    required?: boolean
  }) => {
    const lovType = FIELD_LOV[field]
    const err     = errors[field]
    const isDisabled = isViewMode
    return (
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          {label}{required && !isViewMode && <Req />}
        </label>
        <select
          {...register(field)}
          className={`form-input ${isDisabled ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
          disabled={isDisabled}
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
        <span style={{ color: 'var(--accent-gold)' }}>Stone Items</span>
      </div>

      {/* Stats + Add button */}
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
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                s === 'active' ? 'bg-green-100' : 'bg-red-100'
              }`}>
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
            Add Stone Item
          </button>
        )}
      </div>

      {/* Card */}
      <div className="card overflow-hidden">

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[var(--border-color)]">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              value={searchInput}
              onChange={e => onSearchInput(e.target.value)}
              placeholder="Search stone items…"
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
            {/* Filter row toggle */}
            <button
              onClick={() => setShowFilterRow(s => !s)}
              title="Column Filters"
              className={`p-1.5 rounded-lg border transition-colors ${
                showFilterRow
                  ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]'
                  : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
            </button>

            {/* Sorting toggle */}
            <button
              onClick={() => setShowSorting(s => !s)}
              title="Column Sorting"
              className={`p-1.5 rounded-lg border transition-colors ${
                showSorting
                  ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]'
                  : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <BarsArrowUpIcon className="w-4 h-4" />
            </button>

            {/* Column picker */}
            <div ref={colPickerRef} className="relative">
              <button
                onClick={() => setShowColPicker(s => !s)}
                title="Show / Hide Columns"
                className={`p-1.5 rounded-lg border transition-colors ${
                  showColPicker
                    ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <ViewColumnsIcon className="w-4 h-4" />
              </button>
              {showColPicker && (
                <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg p-1.5">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Show / Hide
                  </p>
                  {gridCols.map(col => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={col.visible}
                        onChange={() => toggleCol(col.key)}
                        className="w-3.5 h-3.5 accent-[var(--color-primary)]"
                      />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Export */}
            <div ref={exportRef} className="relative">
              <button
                onClick={() => setExportOpen(o => !o)}
                disabled={exporting}
                title="Export"
                className={`p-1.5 rounded-lg border transition-colors ${
                  exportOpen
                    ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                {exporting
                  ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <ArrowDownTrayIcon className="w-4 h-4" />
                }
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg p-1.5">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Export All Records
                  </p>
                  {(['csv', 'excel', 'pdf'] as const).map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => handleExport('all', fmt)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] text-left"
                    >
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
                        <button
                          key={`sel-${fmt}`}
                          onClick={() => handleExport('selected', fmt)}
                          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] text-left"
                        >
                          <span className="text-base">{fmt === 'csv' ? '📄' : fmt === 'excel' ? '📊' : '📋'}</span>
                          <span className="font-medium">{fmt === 'csv' ? 'CSV' : fmt === 'excel' ? 'Excel (.xlsx)' : 'PDF'}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Page size */}
            <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span className="hidden sm:inline">Show</span>
              <select
                value={pageSize}
                onChange={e => handlePageSize(Number(e.target.value))}
                className="form-input py-1.5 text-sm"
                style={{ width: '72px' }}
              >
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
              {/* Header row */}
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                <th className="px-4 py-2.5 w-10">
                  <input
                    type="checkbox"
                    ref={masterCheckRef}
                    checked={allPageSelected}
                    onChange={toggleSelectPage}
                    className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
                  />
                </th>
                {visibleCols.map(col => (
                  <th
                    key={col.key}
                    style={{ minWidth: col.minW, color: 'var(--text-muted)' } as React.CSSProperties}
                    onClick={() => showSorting && col.sortKey && handleSort(col.sortKey)}
                    className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide select-none whitespace-nowrap
                      ${showSorting && col.sortKey ? 'cursor-pointer hover:text-[var(--text-primary)]' : ''}`}
                  >
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
                <th
                  className="px-4 py-2.5 w-28 text-center text-xs font-semibold uppercase tracking-wide sticky right-0 z-10 border-l border-[var(--border-color)] bg-[var(--bg-secondary)]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Actions
                </th>
              </tr>

              {/* Filter row */}
              {showFilterRow && (
                <tr className="border-b border-[var(--border-color)]" style={{ background: 'var(--bg-primary)' }}>
                  <th className="px-2 py-1.5 w-10" />
                  {visibleCols.map(col => (
                    <th key={col.key} className="px-2 py-1.5">
                      <input
                        value={colFilters[col.key] ?? ''}
                        onChange={e => setColFilters(f => ({ ...f, [col.key]: e.target.value }))}
                        placeholder="Filter…"
                        className="w-full px-2 py-1 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                      />
                    </th>
                  ))}
                  <th
                    className="px-2 py-1.5 text-center sticky right-0 z-10 border-l border-[var(--border-color)]"
                    style={{ background: 'var(--bg-primary)' }}
                  >
                    {Object.values(colFilters).some(v => v) && (
                      <button
                        onClick={() => setColFilters({})}
                        className="text-xs text-[var(--accent-gold)] hover:underline whitespace-nowrap"
                      >
                        Clear
                      </button>
                    )}
                  </th>
                </tr>
              )}
            </thead>

            <tbody className={fetching ? 'opacity-50 pointer-events-none' : ''}>
              {loading ? (
                Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-color)]">
                    <td className="px-4 py-3">
                      <div className="h-4 w-4 rounded animate-pulse bg-[var(--bg-tertiary)]" />
                    </td>
                    {visibleCols.map(col => (
                      <td key={col.key} className="px-4 py-3">
                        <div
                          className="h-4 rounded animate-pulse bg-[var(--bg-tertiary)]"
                          style={{ width: col.key === 'stn_code' ? '140px' : '80px' }}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]">
                      <div className="h-4 w-16 rounded animate-pulse bg-[var(--bg-tertiary)]" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleCols.length + 2}
                    className="px-4 py-16 text-center text-sm"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <SparklesIcon className="w-10 h-10 opacity-30" />
                      {search || Object.values(colFilters).some(v => v)
                        ? 'No stone items match the current filters.'
                        : `No ${statusFilter} stone items found. Click "Add Stone Item" to get started.`
                      }
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-[var(--border-color)] transition-colors hover:bg-[var(--bg-secondary)]
                      ${idx % 2 !== 0 ? 'bg-[var(--bg-primary)]/40' : ''}
                      ${selectedRows.some(r => r.id === item.id) ? 'bg-[var(--accent-gold)]/5' : ''}`}
                  >
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedRows.some(r => r.id === item.id)}
                        onChange={() => toggleSelectRow(item)}
                        className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
                      />
                    </td>
                    {visibleCols.map(col => (
                      <td key={col.key} className="px-4 py-2.5">{renderCell(col, item)}</td>
                    ))}
                    <td className="px-4 py-2.5 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]">
                      <div className="flex items-center justify-center gap-1">
                        {/* Edit — canUpdate; invisible (not unmounted) when active/used conditions fail, to keep icon columns aligned */}
                        {canUpdate && (
                          <button
                            onClick={() => openEdit(item)}
                            className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500 ${(!item.is_active || item.used_in_bom) ? 'invisible' : ''}`}
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {/* View — all rows, canView */}
                        {canView && (
                          <button
                            onClick={() => openView(item)}
                            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                            title="View"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        )}
                        {/* Toggle status — canDelete; invisible when used in any BOM */}
                        {canDelete && (
                          <button
                            onClick={() => setToggleItem(item)}
                            className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] ${item.is_active ? 'text-red-500' : 'text-green-500'} ${item.used_in_bom ? 'invisible' : ''}`}
                            title={item.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {item.is_active
                              ? <NoSymbolIcon    className="w-4 h-4" />
                              : <CheckCircleIcon className="w-4 h-4" />
                            }
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
              {total === 0
                ? 'No records found'
                : `Showing ${startRow}–${endRow} of ${total} stone items`
              }
            </span>
            {selectedRows.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent-gold)]">
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-gold)]/15 border border-[var(--accent-gold)]/30">
                  {selectedRows.length} selected
                </span>
                <button
                  onClick={() => setSelectedRows([])}
                  className="text-xs hover:text-[var(--text-primary)] underline underline-offset-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Clear
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(1)}
              className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
            >«</button>
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
            >‹</button>

            {pageNumbers.map((n, i) =>
              n === '...' ? (
                <span key={`dots-${i}`} className="px-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>…</span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(n as number)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                    page === n
                      ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)] text-white font-semibold'
                      : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  {n}
                </button>
              )
            )}

            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
            >›</button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
              className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
            >»</button>
          </div>

          <span className="text-sm hidden sm:block" style={{ color: 'var(--text-muted)' }}>
            Page {page} of {totalPages || 1}
          </span>
        </div>
      </div>

      {/* ── Add / Edit / View Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); reset() }}
        title={
          isNew
            ? 'Add Stone Item'
            : isViewMode
              ? `View Stone Item — ${editItem?.stn_code}`
              : `Edit Stone Item — ${editItem?.stn_code}`
        }
        size="lg"
        footer={
          isViewMode ? (
            <button onClick={() => { setModalOpen(false); reset() }} className="btn-secondary">
              Close
            </button>
          ) : (
            <>
              <button onClick={() => { setModalOpen(false); reset() }} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSubmit(onSubmit)} disabled={saving} className="btn-primary">
                {saving
                  ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />Saving…</>
                  : isNew ? 'Create Stone Item' : 'Update Stone Item'
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
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Read-only view — no changes can be made.
              </p>
            </div>
          )}

          {/* LOV Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LovSelect field="stn_type"    label="Stone Type"   required />
            <LovSelect field="stn_shape"   label="Stone Shape"  required />
            <LovSelect field="stn_quality" label="Quality"      required />
            <LovSelect field="stn_color"   label="Color"        required />
            <LovSelect field="stn_size"    label="Size"         required />

            {/* Std Cts — optional numeric field */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Std Cts
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                {...register('std_cts')}
                className={`form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
                readOnly={isViewMode}
                placeholder="e.g. 0.1000"
              />
            </div>

            {/* Stone Code (always read-only — set by DB trigger) */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Stone Code
                {isNew && (
                  <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--accent-gold)/10', color: 'var(--accent-gold)' }}>
                    Auto-generated
                  </span>
                )}
              </label>
              <input
                {...register('stn_code')}
                className="form-input font-mono font-semibold cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]"
                style={{ color: 'var(--accent-gold)' }}
                readOnly
                placeholder="Select all fields above…"
              />
            </div>
          </div>

          {/* Info note — add mode only */}
          {isNew && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5">
              <SparklesIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--accent-gold)]" />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Stone Code is auto-generated from the combination of Type · Shape · Quality · Color · Size.
                Select all five fields to generate the code.
              </p>
            </div>
          )}
        </div>
      </Modal>

      <DeactivateReasonDialog
        isOpen={!!toggleItem?.is_active}
        title="Deactivate Stone Item"
        itemLabel={`Stone item "${toggleItem?.stn_code}"`}
        onConfirm={reason => confirmToggle(reason)}
        onCancel={() => setToggleItem(null)}
      />

      <ConfirmDialog
        isOpen={!!toggleItem && !toggleItem.is_active}
        title="Activate Stone Item"
        message={`Activate stone item "${toggleItem?.stn_code}"?`}
        confirmLabel="Activate"
        variant="info"
        onConfirm={() => confirmToggle()}
        onCancel={() => setToggleItem(null)}
      />
    </div>
  )
}

export default StoneItemPage
