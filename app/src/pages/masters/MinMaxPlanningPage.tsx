import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon, EyeIcon, MagnifyingGlassIcon, XMarkIcon,
  ViewColumnsIcon, ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon,
  FunnelIcon, BarsArrowUpIcon, NoSymbolIcon, CheckCircleIcon,
  ArrowDownTrayIcon, ArrowUpTrayIcon, SparklesIcon,
} from '@heroicons/react/24/outline'
import Modal                  from '@/components/common/Modal'
import Badge                  from '@/components/common/Badge'
import ConfirmDialog          from '@/components/common/ConfirmDialog'
import DeactivateReasonDialog from '@/components/common/DeactivateReasonDialog'
import { formatDate, formatDateTime, exportToCSV, exportToExcel, exportToPDF } from '@/utils/helpers'
import { apiService } from '@/api/apiService'
import { usePermission } from '@/hooks'

// ── Types ─────────────────────────────────────────────────────
interface MinMaxPlan {
  id:           number
  itemtype:     string
  sku_code:     string
  min_quantity: number
  max_quantity: number
  moq_quantity: number
  min_weight:   number
  max_weight:   number
  moq_weight:   number
  order_base:   'QUANTITY' | 'WEIGHT'
  remarks:      string | null
  is_active:    boolean
  deactivation_reason: string | null
  deactivated_at:      string | null
  created_at:   string
}

interface LookupOption { lookup_code: string; lookup_name: string }
interface LovOpt { id: number; code: string; name: string; [key: string]: unknown }

type FormValues = {
  itemtype:     string
  sku_code:     string
  min_quantity: string
  max_quantity: string
  moq_quantity: string
  min_weight:   string
  max_weight:   string
  moq_weight:   string
  order_base:   'QUANTITY' | 'WEIGHT'
  remarks:      string
}

const blankForm = (): FormValues => ({
  itemtype: '', sku_code: '',
  min_quantity: '', max_quantity: '', moq_quantity: '',
  min_weight: '', max_weight: '', moq_weight: '',
  order_base: 'QUANTITY', remarks: '',
})

// ── Validation ────────────────────────────────────────────────
// Fields stay strings (react-hook-form register() on <input type="number">
// yields string values) — validate negativity without coercing the form type.
const nonNegative = (label: string) =>
  yup.string().default('').test('non-negative', `${label} cannot be negative`, v =>
    v === undefined || v === null || v === '' || Number(v) >= 0
  )

// Blank or zero values are treated as unset for cross-field comparisons
const posNum = (v: unknown): number | null =>
  v !== undefined && v !== null && v !== '' && Number(v) > 0 ? Number(v) : null

// MOQ must sit within [Min, Max] of its own planning section
const moqWithinRange = (label: string, minKey: string, maxKey: string, minMsg: string, maxMsg: string) =>
  nonNegative(label)
    .test('moq-gte-min', minMsg, function (v) {
      const moq = posNum(v), min = posNum((this.parent as Record<string, string>)[minKey])
      return moq === null || min === null || moq >= min
    })
    .test('moq-lte-max', maxMsg, function (v) {
      const moq = posNum(v), max = posNum((this.parent as Record<string, string>)[maxKey])
      return moq === null || max === null || moq <= max
    })

// Quantity fields (Min/Max/MOQ Qty) are whole numbers only — no decimals
const wholeNumberTest = function (this: yup.TestContext, v: string | undefined) {
  return v === undefined || v === null || v === '' || Number.isInteger(Number(v))
}

// Field is mandatory only when Order Base matches the given section (Quantity or Weight)
const requiredForBasis = (basis: 'QUANTITY' | 'WEIGHT') =>
  function (this: yup.TestContext, v: string | undefined) {
    const orderBase = (this.parent as Record<string, string>).order_base
    return orderBase !== basis || (v !== undefined && v !== null && v !== '')
  }

const schema = yup.object({
  itemtype:     yup.string().required('Item Type is required'),
  sku_code:     yup.string().required('Item is required'),
  min_quantity: nonNegative('Min Quantity')
    .test('integer', 'Min Quantity must be a whole number', wholeNumberTest)
    .test('required-for-basis', 'Min Quantity is required', requiredForBasis('QUANTITY')),
  max_quantity: nonNegative('Max Quantity')
    .test('integer', 'Max Quantity must be a whole number', wholeNumberTest)
    .test('required-for-basis', 'Max Quantity is required', requiredForBasis('QUANTITY')),
  moq_quantity: moqWithinRange('MOQ Quantity', 'min_quantity', 'max_quantity',
    'MOQ Qty cannot be less than Min Qty.', 'MOQ Qty cannot be greater than Max Qty.')
    .test('integer', 'MOQ Quantity must be a whole number', wholeNumberTest)
    .test('required-for-basis', 'MOQ Quantity is required', requiredForBasis('QUANTITY')),
  min_weight:   nonNegative('Min Weight')
    .test('required-for-basis', 'Min Weight is required', requiredForBasis('WEIGHT')),
  max_weight:   nonNegative('Max Weight')
    .test('required-for-basis', 'Max Weight is required', requiredForBasis('WEIGHT')),
  moq_weight:   moqWithinRange('MOQ Weight', 'min_weight', 'max_weight',
    'MOQ weight cannot be less than Min weight.', 'MOQ weight cannot be greater than Max weight.')
    .test('required-for-basis', 'MOQ Weight is required', requiredForBasis('WEIGHT')),
  order_base:   yup.string().oneOf(['QUANTITY', 'WEIGHT']).default('QUANTITY'),
  remarks:      yup.string().default(''),
})

// ── Constants ─────────────────────────────────────────────────
const PAGE_SIZES = [10, 25, 50, 100]
const Req = () => <span className="text-red-500 ml-0.5">*</span>

interface ColDef { key: string; label: string; sortKey?: string; visible: boolean; minW?: string }

const INITIAL_COLS: ColDef[] = [
  { key: 'itemtype',     label: 'Item Type',  sortKey: 'itemtype',     visible: true,  minW: '110px' },
  { key: 'sku_code',     label: 'SKU Code',   sortKey: 'sku_code',     visible: true,  minW: '160px' },
  { key: 'min_quantity', label: 'Min Qty',    sortKey: 'min_quantity', visible: true,  minW: '90px'  },
  { key: 'max_quantity', label: 'Max Qty',    sortKey: 'max_quantity', visible: true,  minW: '90px'  },
  { key: 'moq_quantity', label: 'MOQ Qty',    sortKey: 'moq_quantity', visible: false, minW: '90px'  },
  { key: 'min_weight',   label: 'Min Wt',     sortKey: 'min_weight',   visible: true,  minW: '90px'  },
  { key: 'max_weight',   label: 'Max Wt',     sortKey: 'max_weight',   visible: true,  minW: '90px'  },
  { key: 'moq_weight',   label: 'MOQ Wt',     sortKey: 'moq_weight',   visible: false, minW: '90px'  },
  { key: 'order_base',   label: 'Order Base', sortKey: 'order_base',   visible: true,  minW: '110px' },
  { key: 'is_active',           label: 'Status',                       visible: true,  minW: '90px'  },
  { key: 'deactivation_reason', label: 'Deactive Reason',              visible: true,  minW: '160px' },
  { key: 'deactivated_at',      label: 'Deactive Date',                visible: true,  minW: '120px' },
  { key: 'created_at',   label: 'Created',    sortKey: 'created_at',   visible: false, minW: '140px' },
]

// Item Type → LOV type for /fg-bom/lov/:type (same mapping FGBOMPage uses for BOM lines)
const LOV_BY_ITEM_TYPE: Record<string, string> = {
  FINDING:   'findings',
  STONE:     'stones',
  METAL:     'metals',
  COMPONENT: 'components',
}

// ── CSV import helpers (no deps, mirrors AlloyMasterPage) ───────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
    return obj
  })
}

function downloadCSVTemplate() {
  const headers = ['itemtype', 'sku_code', 'min_quantity', 'max_quantity', 'moq_quantity', 'min_weight', 'max_weight', 'moq_weight', 'order_base', 'remarks']
  const example  = ['STONE', 'RD-ROUND-VVS1-DWHITE-1MM', '10', '100', '20', '5', '50', '10', 'QUANTITY', '']
  const csv = [headers.join(','), example.join(',')].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'min_max_planning_import_template.csv'
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────────────
// LovSearch — type-ahead item picker (copied from FGBOMPage's BOM line editor)
// ─────────────────────────────────────────────────────────────────
interface LovSearchProps {
  display: string; placeholder: string
  fetch: (q: string) => Promise<LovOpt[]>
  onSelect: (id: number, code: string, name: string, opt: LovOpt) => void
  onClear?: () => void
  disabled?: boolean
  error?: boolean
  hint?: string
}
function LovSearch({ display, placeholder, fetch, onSelect, onClear, disabled, error, hint }: LovSearchProps) {
  const [q,    setQ]    = useState(display)
  const [opts, setOpts] = useState<LovOpt[]>([])
  const [open, setOpen] = useState(false)
  useEffect(() => setQ(display), [display])
  const doSearch = async (val: string) => {
    setQ(val)
    const q2 = (val === '%') ? '' : val
    if (val.length < 1) { setOpts([]); setOpen(false); return }
    try { const r = await fetch(q2); setOpts(r); setOpen(true) } catch { /* */ }
  }
  const showClear = !!onClear && !!q && !disabled
  const handleClear = () => { setQ(''); setOpts([]); setOpen(false); onClear!() }
  return (
    <div>
      <div className="relative">
        <input value={q} onChange={e => doSearch(e.target.value)}
          onFocus={() => { if (q.length >= 1 && opts.length) setOpen(true) }}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder={placeholder} disabled={disabled}
          className={`w-full text-sm pl-3 ${showClear ? 'pr-8' : 'pr-3'} py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] disabled:opacity-50`}
          style={{
            borderColor: error ? '#ef4444' : 'var(--border-color)',
            background: 'var(--bg-primary)', color: 'var(--text-primary)',
            boxShadow: error ? '0 0 0 1px #ef4444' : undefined,
          }} />
        {showClear && (
          <button
            type="button"
            title="Clear"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
        {open && opts.length > 0 && (
          <div className="absolute z-50 top-full left-0 w-full border shadow-lg rounded-lg max-h-52 overflow-y-auto text-sm"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)' }}>
            {opts.map(o => (
              <div key={o.id}
                className="px-3 py-2 cursor-pointer flex gap-2 items-center hover:bg-[var(--bg-secondary)]"
                onMouseDown={() => { onSelect(o.id, o.code, o.name, o); setQ(o.code); setOpen(false) }}>
                <span className="font-mono font-semibold text-xs" style={{ color: 'var(--accent-gold)' }}>{o.code}</span>
                {o.name !== o.code && <span className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{o.name}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      {hint && !error && (
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-500">Required — select an item</p>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────
const MinMaxPlanningPage: React.FC = () => {
  // ── LOV state ───────────────────────────────────────────────
  const [itemTypeOpts, setItemTypeOpts] = useState<LookupOption[]>([])

  useEffect(() => {
    apiService.get('/common/lookup/FG_ITEM_TYPE')
      .then(r => setItemTypeOpts(r.data?.data ?? []))
      .catch(() => toast.error('Failed to load item types'))
  }, [])

  // ── Grid state ──────────────────────────────────────────────
  const [items,        setItems]        = useState<MinMaxPlan[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetching,     setFetching]     = useState(false)
  const isFirstLoad                     = useRef(true)
  const [stats,        setStats]        = useState({ active: 0, inactive: 0 })
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active')
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(25)
  const [searchInput,  setSearchInput]  = useState('')
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState('sku_code')
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
  const [selectedRows,      setSelectedRows]      = useState<MinMaxPlan[]>([])
  const [exportOpen,        setExportOpen]        = useState(false)
  const [exporting,         setExporting]         = useState(false)
  const colPickerRef                              = useRef<HTMLDivElement>(null)
  const exportRef                                 = useRef<HTMLDivElement>(null)
  const masterCheckRef                            = useRef<HTMLInputElement>(null)
  const searchTimer                               = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cfTimer                                   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Import state ────────────────────────────────────────────
  const [importOpen,    setImportOpen]    = useState(false)
  const [importFile,    setImportFile]    = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([])
  const [importing,     setImporting]     = useState(false)
  const importFileRef  = useRef<HTMLInputElement>(null)

  // ── Permissions ──────────────────────────────────────────────
  const { canView, canCreate, canUpdate, canDelete } = usePermission('MM_MIN_MAX')

  // ── Modal / confirm state ────────────────────────────────────
  const [modalOpen,   setModalOpen]   = useState(false)
  const [formMode,    setFormMode]    = useState<'add' | 'edit' | 'view'>('add')
  const [editItem,    setEditItem]    = useState<MinMaxPlan | null>(null)
  const [toggleItem,  setToggleItem]  = useState<MinMaxPlan | null>(null)
  const [saving,      setSaving]      = useState(false)
  const isNew     = formMode === 'add'
  const isViewMode = formMode === 'view'

  // ── Form ─────────────────────────────────────────────────────
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<FormValues>({ resolver: yupResolver(schema) as never, defaultValues: blankForm() })

  const watchItemType  = watch('itemtype')
  const watchSkuCode   = watch('sku_code')
  const watchOrderBase = watch('order_base')

  // Order Base drives which planning fields are editable:
  // QUANTITY → only qty fields, WEIGHT → only weight fields.
  const qtyFieldsOff = watchOrderBase !== 'QUANTITY'
  const wtFieldsOff  = watchOrderBase !== 'WEIGHT'

  // ── Item cascade ─────────────────────────────────────────────
  const searchLov = async (q: string, itemType: string): Promise<LovOpt[]> => {
    const lovType = LOV_BY_ITEM_TYPE[itemType]
    if (!lovType) return []
    const params = new URLSearchParams({ search: q })
    const r = await apiService.get(`/fg-bom/lov/${lovType}?${params}`)
    return r.data?.data ?? []
  }

  const handleItemTypeChange = (newType: string) => {
    setValue('itemtype', newType, { shouldValidate: true })
    setValue('sku_code', '')
  }

  const handleItemSelect = (_id: number, code: string) => {
    setValue('sku_code', code, { shouldValidate: true })
  }

  const handleSkuClear = () => {
    setValue('sku_code', '', { shouldValidate: true })
  }

  // Quantity fields are whole numbers only — strip any non-digit character as the user types/pastes
  const registerInt = (field: 'min_quantity' | 'max_quantity' | 'moq_quantity') => {
    const r = register(field)
    return {
      ...r,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        e.target.value = e.target.value.replace(/[^\d]/g, '')
        return r.onChange(e)
      },
    }
  }

  // ── Data loaders ─────────────────────────────────────────────
  const loadStats = async () => {
    try {
      const res = await apiService.get('/min-max-planning/stats')
      setStats(res.data?.data ?? { active: 0, inactive: 0 })
    } catch { /* silent */ }
  }

  const loadItems = async () => {
    if (isFirstLoad.current) setLoading(true)
    else setFetching(true)
    try {
      const activeCF = Object.fromEntries(Object.entries(debouncedCF).filter(([, v]) => v.trim()))
      const res = await apiService.get('/min-max-planning', {
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
      toast.error(msg || 'Failed to load min/max planning')
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
  const toggleSelectRow = (item: MinMaxPlan) =>
    setSelectedRows(prev =>
      prev.some(r => r.id === item.id)
        ? prev.filter(r => r.id !== item.id)
        : [...prev, item]
    )

  // ── Export ────────────────────────────────────────────────────
  const buildExportRows = (rows: MinMaxPlan[]) =>
    rows.map(r => ({
      'Item Type':    r.itemtype,
      'SKU Code':     r.sku_code,
      'Min Qty':      r.min_quantity,
      'Max Qty':      r.max_quantity,
      'MOQ Qty':      r.moq_quantity,
      'Min Wt':       r.min_weight,
      'Max Wt':       r.max_weight,
      'MOQ Wt':       r.moq_weight,
      'Order Base':   r.order_base,
      'Status':       r.is_active ? 'Active' : 'Inactive',
      ...(statusFilter === 'inactive' && {
        'Deactive Reason': r.deactivation_reason || '',
        'Deactive Date': r.deactivated_at ? formatDate(String(r.deactivated_at)) : '',
      }),
      'Created':      formatDateTime(String(r.created_at)),
    }))

  const handleExport = async (scope: 'all' | 'selected', format: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false)
    let rows: MinMaxPlan[]
    if (scope === 'selected') {
      rows = selectedRows
      if (!rows.length) { toast.error('No rows selected'); return }
    } else {
      setExporting(true)
      try {
        const res = await apiService.get('/min-max-planning', {
          params: { page: 1, limit: 9999, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter },
        })
        rows = res.data?.data ?? []
      } catch { toast.error('Failed to fetch export data'); setExporting(false); return }
      setExporting(false)
    }
    const data  = buildExportRows(rows)
    const fname = `min_max_planning_${statusFilter}`
    if (format === 'csv')   exportToCSV(data, fname)
    else if (format === 'excel') void exportToExcel(data, fname)
    else void exportToPDF(data, fname, 'Min/Max Planning Report')
  }

  // ── Cell renderer ─────────────────────────────────────────────
  const fmtNum = (v: number) => (v != null ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—')
  const fmtInt = (v: number) => (v != null ? Math.round(Number(v)).toLocaleString() : '—')

  const renderCell = (col: ColDef, row: MinMaxPlan) => {
    switch (col.key) {
      case 'itemtype':
        return <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--accent-gold)/10', color: 'var(--accent-gold)' }}>{row.itemtype}</span>
      case 'sku_code':
        return <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.sku_code}</span>
      case 'min_quantity': return <span className="text-sm font-mono">{fmtInt(row.min_quantity)}</span>
      case 'max_quantity': return <span className="text-sm font-mono">{fmtInt(row.max_quantity)}</span>
      case 'moq_quantity': return <span className="text-sm font-mono">{fmtInt(row.moq_quantity)}</span>
      case 'min_weight':   return <span className="text-sm font-mono">{fmtNum(row.min_weight)}</span>
      case 'max_weight':   return <span className="text-sm font-mono">{fmtNum(row.max_weight)}</span>
      case 'moq_weight':   return <span className="text-sm font-mono">{fmtNum(row.moq_weight)}</span>
      case 'order_base':
        return <Badge label={row.order_base === 'WEIGHT' ? 'Weight' : 'Quantity'} variant="secondary" />
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
    reset(blankForm())
    setModalOpen(true)
  }

  const openEdit = (item: MinMaxPlan) => {
    setFormMode('edit')
    setEditItem(item)
    reset({
      itemtype:     item.itemtype,
      sku_code:     item.sku_code,
      min_quantity: String(item.min_quantity ?? ''),
      max_quantity: String(item.max_quantity ?? ''),
      moq_quantity: String(item.moq_quantity ?? ''),
      min_weight:   String(item.min_weight ?? ''),
      max_weight:   String(item.max_weight ?? ''),
      moq_weight:   String(item.moq_weight ?? ''),
      order_base:   item.order_base,
      remarks:      item.remarks ?? '',
    })
    setModalOpen(true)
  }

  const openView = (item: MinMaxPlan) => {
    setFormMode('view')
    setEditItem(item)
    reset({
      itemtype:     item.itemtype,
      sku_code:     item.sku_code,
      min_quantity: String(item.min_quantity ?? ''),
      max_quantity: String(item.max_quantity ?? ''),
      moq_quantity: String(item.moq_quantity ?? ''),
      min_weight:   String(item.min_weight ?? ''),
      max_weight:   String(item.max_weight ?? ''),
      moq_weight:   String(item.moq_weight ?? ''),
      order_base:   item.order_base,
      remarks:      item.remarks ?? '',
    })
    setModalOpen(true)
  }

  const onSubmit = async (data: FormValues) => {
    setSaving(true)
    try {
      const payload = {
        ...data,
        min_quantity: data.min_quantity !== '' ? Number(data.min_quantity) : 0,
        max_quantity: data.max_quantity !== '' ? Number(data.max_quantity) : 0,
        moq_quantity: data.moq_quantity !== '' ? Number(data.moq_quantity) : 0,
        min_weight:   data.min_weight   !== '' ? Number(data.min_weight)   : 0,
        max_weight:   data.max_weight   !== '' ? Number(data.max_weight)   : 0,
        moq_weight:   data.moq_weight   !== '' ? Number(data.moq_weight)   : 0,
      }
      if (isNew) {
        await apiService.post('/min-max-planning', payload)
        toast.success('Min/Max plan created successfully')
      } else {
        await apiService.put(`/min-max-planning/${editItem!.id}`, payload)
        toast.success('Min/Max plan updated successfully')
      }
      setModalOpen(false); reset(blankForm())
      await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  const confirmToggle = async (reason?: string) => {
    if (!toggleItem) return
    try {
      const res = await apiService.delete(`/min-max-planning/${toggleItem.id}`, reason ? { data: { reason } } : undefined)
      toast.success(res.data?.message || 'Status updated')
      setToggleItem(null)
      await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'
      toast.error(msg)
    }
  }

  // ── Import handlers ────────────────────────────────────────
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const rows = parseCSV((ev.target?.result as string) || '')
      setImportPreview(rows.slice(0, 5))
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!importFile) { toast.error('Please select a CSV file'); return }
    setImporting(true)
    try {
      const text = await importFile.text()
      const rows = parseCSV(text)
      if (!rows.length) { toast.error('No data rows found in the file'); setImporting(false); return }
      const res = await apiService.post('/min-max-planning/import', { rows })
      const result = res.data?.data
      toast.success(`Import complete: ${result?.created ?? 0} created, ${result?.skipped ?? 0} skipped`)
      if (result?.errors?.length) toast.error(`${result.errors.length as number} row(s) had errors`)
      setImportOpen(false); setImportFile(null); setImportPreview([])
      if (importFileRef.current) importFileRef.current.value = ''
      await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Import failed')
    } finally { setImporting(false) }
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <span>Masters</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>Min Max Planning</span>
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
            Add Min/Max Plan
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
              placeholder="Search min/max planning…"
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

            {/* Import */}
            {canCreate && (
              <button
                onClick={() => setImportOpen(true)}
                title="Bulk import from CSV"
                className="p-1.5 rounded-lg border transition-colors border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
              </button>
            )}

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
                          style={{ width: col.key === 'sku_code' ? '140px' : '80px' }}
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
                        ? 'No min/max plans match the current filters.'
                        : `No ${statusFilter} min/max plans found. Click "Add Min/Max Plan" to get started.`
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
                : `Showing ${startRow}–${endRow} of ${total} min/max plans`
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
        onClose={() => { setModalOpen(false); reset(blankForm()) }}
        title={
          isNew
            ? 'Add Min/Max Plan'
            : isViewMode
              ? `View Min/Max Plan — ${editItem?.sku_code}`
              : `Edit Min/Max Plan — ${editItem?.sku_code}`
        }
        size="lg"
        footer={
          isViewMode ? (
            <button onClick={() => { setModalOpen(false); reset(blankForm()) }} className="btn-secondary">
              Close
            </button>
          ) : (
            <>
              <button onClick={() => { setModalOpen(false); reset(blankForm()) }} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSubmit(onSubmit)} disabled={saving} className="btn-primary">
                {saving
                  ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />Saving…</>
                  : isNew ? 'Create Plan' : 'Update Plan'
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

          {/* Item Type + SKU Code cascade */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Item Type<Req />
              </label>
              <select
                value={watchItemType}
                onChange={e => handleItemTypeChange(e.target.value)}
                disabled={isViewMode}
                className={`form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
              >
                <option value="">Select Item Type</option>
                {itemTypeOpts.map(opt => (
                  <option key={opt.lookup_code} value={opt.lookup_code}>{opt.lookup_name}</option>
                ))}
              </select>
              {errors.itemtype && <p className="text-xs text-red-500 mt-1">{errors.itemtype.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                SKU Code<Req />
              </label>
              <LovSearch
                key={watchItemType}
                display={watchSkuCode}
                placeholder={watchItemType ? `Search ${watchItemType.toLowerCase()}…` : 'Select Item Type first'}
                fetch={q => searchLov(q, watchItemType)}
                onSelect={handleItemSelect}
                onClear={handleSkuClear}
                disabled={isViewMode || !watchItemType}
                error={!!errors.sku_code}
                hint="Type % to show all items"
              />
            </div>
          </div>

          {/* Quantity Planning */}
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${qtyFieldsOff ? 'opacity-50' : ''}`} style={{ color: 'var(--text-muted)' }}>
              Quantity Planning
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(['min_quantity', 'max_quantity', 'moq_quantity'] as const).map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    {field === 'min_quantity' ? 'Min Qty' : field === 'max_quantity' ? 'Max Qty' : 'MOQ Qty'}
                    {!qtyFieldsOff && !isViewMode && <Req />}
                  </label>
                  <input
                    type="number" step="1" min="0" inputMode="numeric"
                    {...registerInt(field)}
                    readOnly={isViewMode || qtyFieldsOff}
                    title={!isViewMode && qtyFieldsOff ? 'Enabled only when Order Base is Quantity' : undefined}
                    className={`form-input ${isViewMode || qtyFieldsOff ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
                    placeholder="0"
                  />
                  {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]?.message}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Weight Planning */}
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${wtFieldsOff ? 'opacity-50' : ''}`} style={{ color: 'var(--text-muted)' }}>
              Weight Planning
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(['min_weight', 'max_weight', 'moq_weight'] as const).map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    {field === 'min_weight' ? 'Min Wt' : field === 'max_weight' ? 'Max Wt' : 'MOQ Wt'}
                    {!wtFieldsOff && !isViewMode && <Req />}
                  </label>
                  <input
                    type="number" step="0.0001" min="0"
                    {...register(field)}
                    readOnly={isViewMode || wtFieldsOff}
                    title={!isViewMode && wtFieldsOff ? 'Enabled only when Order Base is Weight' : undefined}
                    className={`form-input ${isViewMode || wtFieldsOff ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
                    placeholder="0"
                  />
                  {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]?.message}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Order Base */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Order Base
            </label>
            <div className="flex items-center gap-5">
              {(['QUANTITY', 'WEIGHT'] as const).map(val => (
                <label key={val} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    value={val}
                    checked={watchOrderBase === val}
                    onChange={() => {
                      setValue('order_base', val)
                      // Clear the now-inactive side so stale values aren't saved
                      const inactive = val === 'QUANTITY'
                        ? (['min_weight', 'max_weight', 'moq_weight'] as const)
                        : (['min_quantity', 'max_quantity', 'moq_quantity'] as const)
                      inactive.forEach(f => setValue(f, ''))
                    }}
                    disabled={isViewMode}
                    className="w-4 h-4 accent-[var(--color-primary)]"
                  />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{val === 'QUANTITY' ? 'Quantity' : 'Weight'}</span>
                </label>
              ))}
            </div>
            {errors.order_base && <p className="text-xs text-red-500 mt-1">{errors.order_base.message}</p>}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Remarks
            </label>
            <textarea
              {...register('remarks')}
              rows={2}
              readOnly={isViewMode}
              className={`form-input resize-none ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
              placeholder="Optional notes…"
            />
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={importOpen}
        onClose={() => { setImportOpen(false); setImportFile(null); setImportPreview([]) }}
        title="Import Min/Max Plans from CSV"
        size="xl"
        footer={
          <>
            <button onClick={() => { setImportOpen(false); setImportFile(null); setImportPreview([]) }} className="btn-secondary">Cancel</button>
            <button onClick={handleImport} disabled={importing || !importFile} className="btn-primary">
              {importing ? 'Importing…' : 'Import'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
            <span className="text-sm text-[var(--text-secondary)]">Download the CSV template with required columns</span>
            <button onClick={downloadCSVTemplate} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
              <ArrowDownTrayIcon className="w-3.5 h-3.5" /> Template
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Select CSV File</label>
            <input ref={importFileRef} type="file" accept=".csv" onChange={handleImportFileChange}
              className="block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[var(--accent-gold)]/10 file:text-[var(--accent-gold)] hover:file:bg-[var(--accent-gold)]/20 cursor-pointer" />
          </div>
          {importPreview.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">Preview (first {importPreview.length} rows)</p>
              <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--bg-secondary)]">
                    <tr>
                      {Object.keys(importPreview[0]).map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row, i) => (
                      <tr key={i} className="border-t border-[var(--border-color)]">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-3 py-1.5 text-[var(--text-secondary)] whitespace-nowrap">{val || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <DeactivateReasonDialog
        isOpen={!!toggleItem?.is_active}
        title="Deactivate Min/Max Plan"
        itemLabel={`Min/Max plan "${toggleItem?.sku_code}"`}
        onConfirm={reason => confirmToggle(reason)}
        onCancel={() => setToggleItem(null)}
      />

      <ConfirmDialog
        isOpen={!!toggleItem && !toggleItem.is_active}
        title="Activate Min/Max Plan"
        message={`Activate min/max plan "${toggleItem?.sku_code}"?`}
        confirmLabel="Activate"
        variant="info"
        onConfirm={() => confirmToggle()}
        onCancel={() => setToggleItem(null)}
      />
    </div>
  )
}

export default MinMaxPlanningPage
