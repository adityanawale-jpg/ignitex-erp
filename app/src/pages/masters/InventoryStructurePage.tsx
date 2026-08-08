import React, { useState, useEffect, useRef, useMemo } from 'react'
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
interface InventoryStructure {
  id:              number
  inv_bu_code:     string
  bu_name:         string | null
  inv_org_code:    string
  org_name:        string | null
  sub_inv_code:    string
  sub_inv_name:    string
  store_type:      string | null
  store_type_name: string | null
  is_tracks_gold:  boolean
  is_tracks_wt:    boolean
  is_active:       boolean
  deactivation_reason: string | null
  deactivated_at:      string | null
  created_at:      string
}

interface LookupOption { lookup_code: string; lookup_name: string }

// ── Form state (controlled local state per project pattern) ────
type FormValues = {
  inv_bu_code:    string
  inv_org_code:   string
  sub_inv_code:   string
  sub_inv_name:   string
  store_type:     string
  is_tracks_gold: boolean
  is_tracks_wt:   boolean
}

const blankForm: FormValues = {
  inv_bu_code: '', inv_org_code: '',
  sub_inv_code: '', sub_inv_name: '',
  store_type: '',
  is_tracks_gold: false, is_tracks_wt: false,
}

// ── Constants ─────────────────────────────────────────────────
const PAGE_SIZES = [10, 25, 50, 100]
const Req = () => <span className="text-red-500 ml-0.5">*</span>

interface ColDef { key: string; label: string; sortKey?: string; visible: boolean; minW?: string }

const INITIAL_COLS: ColDef[] = [
  { key: 'bu_name',        label: 'BU',            sortKey: 'bu_name',      visible: true,  minW: '190px' },
  { key: 'org_name',       label: 'Inv Org',       sortKey: 'org_name',     visible: true,  minW: '190px' },
  { key: 'sub_inv_code',   label: 'Sub Inv Code',  sortKey: 'sub_inv_code', visible: true,  minW: '130px' },
  { key: 'sub_inv_name',   label: 'Sub Inv Name',  sortKey: 'sub_inv_name', visible: true,  minW: '170px' },
  { key: 'store_type',     label: 'Store Type',    sortKey: 'store_type',   visible: true,  minW: '120px' },
  { key: 'is_tracks_gold', label: 'Tracks Gold',                            visible: true,  minW: '100px' },
  { key: 'is_tracks_wt',   label: 'Tracks WT',                              visible: true,  minW: '100px' },
  { key: 'is_active',           label: 'Status',                            visible: true,  minW: '90px'  },
  { key: 'deactivation_reason', label: 'Deactive Reason',                   visible: true,  minW: '160px' },
  { key: 'deactivated_at',      label: 'Deactive Date',                     visible: true,  minW: '120px' },
  { key: 'created_at',     label: 'Created',       sortKey: 'created_at',   visible: false, minW: '140px' },
]

// ── Component ─────────────────────────────────────────────────
const InventoryStructurePage: React.FC = () => {
  // ── LOV state ───────────────────────────────────────────────
  const [buOpts,        setBuOpts]        = useState<LookupOption[]>([])
  const [orgOpts,       setOrgOpts]       = useState<LookupOption[]>([])
  const [storeTypeOpts, setStoreTypeOpts] = useState<LookupOption[]>([])

  useEffect(() => {
    apiService.get('/common/lookup/INV_BU')
      .then(r => setBuOpts(r.data?.data ?? []))
      .catch(() => toast.error('Failed to load BU list'))
    apiService.get('/common/lookup/INV_ORG')
      .then(r => setOrgOpts(r.data?.data ?? []))
      .catch(() => toast.error('Failed to load Inv Org list'))
    apiService.get('/common/lookup/INV_STORE_TYPE')
      .then(r => setStoreTypeOpts(r.data?.data ?? []))
      .catch(() => toast.error('Failed to load Store Type list'))
  }, [])

  // ── Grid state ──────────────────────────────────────────────
  const [items,        setItems]        = useState<InventoryStructure[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetching,     setFetching]     = useState(false)
  const isFirstLoad                     = useRef(true)
  const [stats,        setStats]        = useState({ active: 0, inactive: 0 })
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active')
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(25)
  const [searchInput,  setSearchInput]  = useState('')
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState('bu_name')
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
  const [selectedRows,      setSelectedRows]      = useState<InventoryStructure[]>([])
  const [exportOpen,        setExportOpen]        = useState(false)
  const [exporting,         setExporting]         = useState(false)
  const colPickerRef                              = useRef<HTMLDivElement>(null)
  const exportRef                                 = useRef<HTMLDivElement>(null)
  const masterCheckRef                            = useRef<HTMLInputElement>(null)
  const searchTimer                               = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cfTimer                                   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Permissions ──────────────────────────────────────────────
  const { canView, canCreate, canUpdate, canDelete } = usePermission('MM_INV_STRUCTURE')

  // ── Modal / confirm state ────────────────────────────────────
  const [modalOpen,   setModalOpen]   = useState(false)
  const [formMode,    setFormMode]    = useState<'add' | 'edit' | 'view'>('add')
  const [editItem,    setEditItem]    = useState<InventoryStructure | null>(null)
  const [toggleItem,  setToggleItem]  = useState<InventoryStructure | null>(null)
  const [saving,      setSaving]      = useState(false)
  const isNew      = formMode === 'add'
  const isViewMode = formMode === 'view'

  // ── Form (controlled local state per project pattern) ────────
  const [form,        setForm]        = useState<FormValues>(blankForm)
  const [formErrors,  setFormErrors]  = useState<Partial<Record<keyof FormValues, string>>>({})

  const setField = <K extends keyof FormValues>(key: K, val: FormValues[K]) => {
    setForm(f => ({ ...f, [key]: val }))
    if (formErrors[key]) setFormErrors(e => ({ ...e, [key]: undefined }))
  }

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormValues, string>> = {}
    if (!form.inv_bu_code)   errs.inv_bu_code   = 'BU is required'
    if (!form.inv_org_code)  errs.inv_org_code  = 'Inv Org is required'
    if (!form.sub_inv_code.trim()) errs.sub_inv_code = 'Sub Inv Code is required'
    if (!form.sub_inv_name.trim()) errs.sub_inv_name = 'Sub Inv Name is required'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Data loaders ─────────────────────────────────────────────
  const loadStats = async () => {
    try {
      const res = await apiService.get('/inventory-structure/stats')
      setStats(res.data?.data ?? { active: 0, inactive: 0 })
    } catch { /* silent */ }
  }

  const loadItems = async () => {
    if (isFirstLoad.current) setLoading(true)
    else setFetching(true)
    try {
      const activeCF = Object.fromEntries(Object.entries(debouncedCF).filter(([, v]) => v.trim()))
      const res = await apiService.get('/inventory-structure', {
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
      toast.error(msg || 'Failed to load inventory structures')
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
  const toggleSelectRow = (item: InventoryStructure) =>
    setSelectedRows(prev =>
      prev.some(r => r.id === item.id)
        ? prev.filter(r => r.id !== item.id)
        : [...prev, item]
    )

  // ── Export ────────────────────────────────────────────────────
  const buildExportRows = (rows: InventoryStructure[]) =>
    rows.map(r => ({
      'BU':            r.bu_name ? `${r.inv_bu_code} - ${r.bu_name}` : r.inv_bu_code,
      'Inv Org':       r.org_name ? `${r.inv_org_code} - ${r.org_name}` : r.inv_org_code,
      'Sub Inv Code':  r.sub_inv_code,
      'Sub Inv Name':  r.sub_inv_name,
      'Store Type':    r.store_type_name ?? r.store_type ?? '',
      'Tracks Gold':   r.is_tracks_gold ? 'Yes' : 'No',
      'Tracks WT':     r.is_tracks_wt ? 'Yes' : 'No',
      'Status':        r.is_active ? 'Active' : 'Inactive',
      ...(statusFilter === 'inactive' && {
        'Deactive Reason': r.deactivation_reason || '',
        'Deactive Date': r.deactivated_at ? formatDate(String(r.deactivated_at)) : '',
      }),
      'Created':       formatDateTime(String(r.created_at)),
    }))

  const handleExport = async (scope: 'all' | 'selected', format: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false)
    let rows: InventoryStructure[]
    if (scope === 'selected') {
      rows = selectedRows
      if (!rows.length) { toast.error('No rows selected'); return }
    } else {
      setExporting(true)
      try {
        const res = await apiService.get('/inventory-structure', {
          params: { page: 1, limit: 9999, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter },
        })
        rows = res.data?.data ?? []
      } catch { toast.error('Failed to fetch export data'); setExporting(false); return }
      setExporting(false)
    }
    const data  = buildExportRows(rows)
    const fname = `inventory_structure_${statusFilter}`
    if (format === 'csv')   exportToCSV(data, fname)
    else if (format === 'excel') void exportToExcel(data, fname)
    else void exportToPDF(data, fname, 'Inventory Structure Report')
  }

  // ── Cell renderer ─────────────────────────────────────────────
  const renderCell = (col: ColDef, row: InventoryStructure) => {
    switch (col.key) {
      case 'bu_name':
        return (
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.bu_name ?? '—'}</p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{row.inv_bu_code}</p>
          </div>
        )
      case 'org_name':
        return (
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.org_name ?? '—'}</p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{row.inv_org_code}</p>
          </div>
        )
      case 'sub_inv_code':
        return <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.sub_inv_code}</span>
      case 'sub_inv_name':
        return <span className="text-sm">{row.sub_inv_name}</span>
      case 'store_type':
        return row.store_type ? <Badge label={row.store_type_name ?? row.store_type} variant="secondary" /> : <span className="text-sm">—</span>
      case 'is_tracks_gold':
        return <Badge label={row.is_tracks_gold ? 'Yes' : 'No'} variant={row.is_tracks_gold ? 'success' : 'secondary'} />
      case 'is_tracks_wt':
        return <Badge label={row.is_tracks_wt ? 'Yes' : 'No'} variant={row.is_tracks_wt ? 'success' : 'secondary'} />
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
    setForm(blankForm)
    setFormErrors({})
    setModalOpen(true)
  }

  const toFormValues = (item: InventoryStructure): FormValues => ({
    inv_bu_code:    item.inv_bu_code,
    inv_org_code:   item.inv_org_code,
    sub_inv_code:   item.sub_inv_code,
    sub_inv_name:   item.sub_inv_name,
    store_type:     item.store_type ?? '',
    is_tracks_gold: item.is_tracks_gold,
    is_tracks_wt:   item.is_tracks_wt,
  })

  const openEdit = (item: InventoryStructure) => {
    setFormMode('edit')
    setEditItem(item)
    setForm(toFormValues(item))
    setFormErrors({})
    setModalOpen(true)
  }

  const openView = (item: InventoryStructure) => {
    setFormMode('view')
    setEditItem(item)
    setForm(toFormValues(item))
    setFormErrors({})
    setModalOpen(true)
  }

  const closeModal = () => { setModalOpen(false); setForm(blankForm); setFormErrors({}) }

  const onSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        inv_bu_code:    form.inv_bu_code,
        inv_org_code:   form.inv_org_code,
        sub_inv_code:   form.sub_inv_code.trim(),
        sub_inv_name:   form.sub_inv_name.trim(),
        store_type:     form.store_type || null,
        is_tracks_gold: form.is_tracks_gold,
        is_tracks_wt:   form.is_tracks_wt,
      }
      if (isNew) {
        await apiService.post('/inventory-structure', payload)
        toast.success('Inventory structure created successfully')
      } else {
        await apiService.put(`/inventory-structure/${editItem!.id}`, payload)
        toast.success('Inventory structure updated successfully')
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
      const res = await apiService.delete(`/inventory-structure/${toggleItem.id}`, reason ? { data: { reason } } : undefined)
      toast.success(res.data?.message || 'Status updated')
      setToggleItem(null)
      await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'
      toast.error(msg)
    }
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <span>Masters</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>Inventory Structure</span>
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
            Add Inventory Structure
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
              placeholder="Search inventory structures…"
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
                          style={{ width: col.key === 'bu_name' ? '140px' : '80px' }}
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
                        ? 'No inventory structures match the current filters.'
                        : `No ${statusFilter} inventory structures found. Click "Add Inventory Structure" to get started.`
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
                        {canUpdate && (
                          <button
                            onClick={() => openEdit(item)}
                            className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500 ${!item.is_active ? 'invisible' : ''}`}
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canView && (
                          <button
                            onClick={() => openView(item)}
                            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                            title="View"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setToggleItem(item)}
                            className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] ${item.is_active ? 'text-red-500' : 'text-green-500'}`}
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
                : `Showing ${startRow}–${endRow} of ${total} inventory structures`
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
        onClose={closeModal}
        title={
          isNew
            ? 'Add Inventory Structure'
            : isViewMode
              ? `View Inventory Structure — ${editItem?.sub_inv_code}`
              : `Edit Inventory Structure — ${editItem?.sub_inv_code}`
        }
        size="lg"
        footer={
          isViewMode ? (
            <button onClick={closeModal} className="btn-secondary">
              Close
            </button>
          ) : (
            <>
              <button onClick={closeModal} className="btn-secondary">
                Cancel
              </button>
              <button onClick={onSubmit} disabled={saving} className="btn-primary">
                {saving
                  ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />Saving…</>
                  : isNew ? 'Create' : 'Update'
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

          {/* BU + Inv Org */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                BU<Req />
              </label>
              <select
                value={form.inv_bu_code}
                onChange={e => setField('inv_bu_code', e.target.value)}
                disabled={isViewMode}
                className={`form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
              >
                <option value="">Select BU</option>
                {buOpts.map(opt => (
                  <option key={opt.lookup_code} value={opt.lookup_code}>{opt.lookup_code} - {opt.lookup_name}</option>
                ))}
              </select>
              {formErrors.inv_bu_code && <p className="text-xs text-red-500 mt-1">{formErrors.inv_bu_code}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Inv Org<Req />
              </label>
              <select
                value={form.inv_org_code}
                onChange={e => setField('inv_org_code', e.target.value)}
                disabled={isViewMode}
                className={`form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
              >
                <option value="">Select Inv Org</option>
                {orgOpts.map(opt => (
                  <option key={opt.lookup_code} value={opt.lookup_code}>{opt.lookup_code} - {opt.lookup_name}</option>
                ))}
              </select>
              {formErrors.inv_org_code && <p className="text-xs text-red-500 mt-1">{formErrors.inv_org_code}</p>}
            </div>
          </div>

          {/* Sub Inv Code + Sub Inv Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Sub Inv Code<Req />
              </label>
              <input
                type="text"
                value={form.sub_inv_code}
                onChange={e => setField('sub_inv_code', e.target.value)}
                readOnly={isViewMode}
                className={`form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
                placeholder="e.g. SUB-001"
              />
              {formErrors.sub_inv_code && <p className="text-xs text-red-500 mt-1">{formErrors.sub_inv_code}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Sub Inv Name<Req />
              </label>
              <input
                type="text"
                value={form.sub_inv_name}
                onChange={e => setField('sub_inv_name', e.target.value)}
                readOnly={isViewMode}
                className={`form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
                placeholder="e.g. Main Store"
              />
              {formErrors.sub_inv_name && <p className="text-xs text-red-500 mt-1">{formErrors.sub_inv_name}</p>}
            </div>
          </div>

          {/* Store Type */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Store Type
            </label>
            <select
              value={form.store_type}
              onChange={e => setField('store_type', e.target.value)}
              disabled={isViewMode}
              className={`form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
            >
              <option value="">Select Store Type</option>
              {storeTypeOpts.map(opt => (
                <option key={opt.lookup_code} value={opt.lookup_code}>{opt.lookup_name}</option>
              ))}
            </select>
          </div>

          {/* Tracks Gold + Tracks WT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Tracks Gold ?
              </label>
              <div className="flex items-center gap-5">
                {([true, false] as const).map(val => (
                  <label key={String(val)} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      checked={form.is_tracks_gold === val}
                      onChange={() => setField('is_tracks_gold', val)}
                      disabled={isViewMode}
                      className="w-4 h-4 accent-[var(--color-primary)]"
                    />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{val ? 'Yes' : 'No'}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Tracks WT ?
              </label>
              <div className="flex items-center gap-5">
                {([true, false] as const).map(val => (
                  <label key={String(val)} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      checked={form.is_tracks_wt === val}
                      onChange={() => setField('is_tracks_wt', val)}
                      disabled={isViewMode}
                      className="w-4 h-4 accent-[var(--color-primary)]"
                    />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{val ? 'Yes' : 'No'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <DeactivateReasonDialog
        isOpen={!!toggleItem?.is_active}
        title="Deactivate Inventory Structure"
        itemLabel={`Inventory structure "${toggleItem?.sub_inv_code}"`}
        onConfirm={reason => confirmToggle(reason)}
        onCancel={() => setToggleItem(null)}
      />

      <ConfirmDialog
        isOpen={!!toggleItem && !toggleItem.is_active}
        title="Activate Inventory Structure"
        message={`Activate inventory structure "${toggleItem?.sub_inv_code}"?`}
        confirmLabel="Activate"
        variant="info"
        onConfirm={() => confirmToggle()}
        onCancel={() => setToggleItem(null)}
      />
    </div>
  )
}

export default InventoryStructurePage
