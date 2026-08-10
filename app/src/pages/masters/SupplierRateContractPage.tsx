import React, { useState, useEffect, useRef, useMemo } from 'react'
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
import PageBreadcrumb from '@/components/common/PageBreadcrumb'
import { formatDate, formatDateTime, exportToCSV, exportToExcel, exportToPDF } from '@/utils/helpers'
import { apiService } from '@/api/apiService'
import { usePermission } from '@/hooks'

// ── Types ─────────────────────────────────────────────────────
interface SupplierRateContract {
  id:                  number
  vendor_id:           number
  vendor_code:         string
  vendor_company_name: string
  itemtype:            string
  sku_code:            string
  rate_basis:          'PER_GM' | 'PER_PC'
  rate_type:           'AMOUNT' | 'PERCENTAGE'
  rate_value:          number
  uom:                 string
  remarks:             string | null
  is_active:           boolean
  deactivation_reason: string | null
  deactivated_at:      string | null
  created_at:          string
}

interface LookupOption { lookup_code: string; lookup_name: string }
interface LovOpt { id: number; code: string; name: string; [key: string]: unknown }

// ── Form state (controlled local state per project pattern) ────
type FormValues = {
  vendor_id:  string
  vendor_code: string
  itemtype:   string
  sku_code:   string
  rate_basis: 'PER_GM' | 'PER_PC'
  rate_type:  'AMOUNT' | 'PERCENTAGE'
  rate_value: string
  uom:        string
  remarks:    string
}

const blankForm: FormValues = {
  vendor_id: '', vendor_code: '',
  itemtype: '', sku_code: '',
  rate_basis: 'PER_GM', rate_type: 'AMOUNT', rate_value: '',
  uom: 'GM', remarks: '',
}

// UOM_RC lookup: PCS is only valid for Per Pc contracts; GM/CT for Per Weight.
const uomOptsForBasis = (opts: LookupOption[], basis: 'PER_GM' | 'PER_PC') =>
  opts.filter(o => basis === 'PER_PC' ? o.lookup_code === 'PCS' : o.lookup_code !== 'PCS')

// ── Constants ─────────────────────────────────────────────────
const PAGE_SIZES = [10, 25, 50, 100]
const Req = () => <span className="text-red-500 ml-0.5">*</span>

interface ColDef { key: string; label: string; sortKey?: string; visible: boolean; minW?: string }

const INITIAL_COLS: ColDef[] = [
  { key: 'vendor_company_name', label: 'Vendor',      sortKey: 'vendor_company_name', visible: true,  minW: '170px' },
  { key: 'itemtype',            label: 'Item Type',   sortKey: 'itemtype',            visible: true,  minW: '110px' },
  { key: 'sku_code',            label: 'SKU Code',    sortKey: 'sku_code',            visible: true,  minW: '150px' },
  { key: 'rate_basis',          label: 'Rate Basis',  sortKey: 'rate_basis',          visible: true,  minW: '100px' },
  { key: 'rate_type',           label: 'Rate Type',   sortKey: 'rate_type',           visible: true,  minW: '100px' },
  { key: 'rate_value',          label: 'Rate',         sortKey: 'rate_value',         visible: true,  minW: '100px' },
  { key: 'uom',                 label: 'UOM',          sortKey: 'uom',                visible: true,  minW: '80px'  },
  { key: 'is_active',           label: 'Status',                                       visible: true,  minW: '90px'  },
  { key: 'deactivation_reason', label: 'Deactive Reason',                              visible: true,  minW: '160px' },
  { key: 'deactivated_at',      label: 'Deactive Date',                                visible: true,  minW: '120px' },
  { key: 'created_at',          label: 'Created',      sortKey: 'created_at',         visible: false, minW: '140px' },
]

// Item Type → LOV type for /fg-bom/lov/:type (same mapping Min/Max Planning uses)
const LOV_BY_ITEM_TYPE: Record<string, string> = {
  FG:        'fg',
  FINDING:   'findings',
  STONE:     'stones',
  METAL:     'metals',
  COMPONENT: 'components',
}

// ── CSV import helpers (no deps, mirrors Min/Max Planning) ──────
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
  const headers = ['vendor_code', 'itemtype', 'sku_code', 'rate_basis', 'rate_type', 'rate_value', 'uom', 'remarks']
  const example  = ['VEN-0001', 'STONE', 'RD-ROUND-VVS1-DWHITE-1MM', 'PER_GM', 'AMOUNT', '1250.00', 'CT', '']
  const csv = [headers.join(','), example.join(',')].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'supplier_rate_contract_import_template.csv'
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────────────
// LovSearch — type-ahead item picker (shared shape with Min/Max Planning)
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
const SupplierRateContractPage: React.FC = () => {
  // ── LOV state ───────────────────────────────────────────────
  const [itemTypeOpts, setItemTypeOpts] = useState<LookupOption[]>([])
  const [uomOpts,      setUomOpts]      = useState<LookupOption[]>([])

  useEffect(() => {
    apiService.get('/common/lookup/FG_ITEM_TYPE')
      .then(r => setItemTypeOpts(r.data?.data ?? []))
      .catch(() => toast.error('Failed to load item types'))
    apiService.get('/common/lookup/UOM_RC')
      .then(r => setUomOpts(r.data?.data ?? []))
      .catch(() => toast.error('Failed to load UOM options'))
  }, [])

  const uomLabel = (code: string) => uomOpts.find(o => o.lookup_code === code)?.lookup_name ?? code

  // ── Grid state ──────────────────────────────────────────────
  const [items,        setItems]        = useState<SupplierRateContract[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetching,     setFetching]     = useState(false)
  const isFirstLoad                     = useRef(true)
  const [stats,        setStats]        = useState({ active: 0, inactive: 0 })
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active')
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(25)
  const [searchInput,  setSearchInput]  = useState('')
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState('vendor_company_name')
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
  const [selectedRows,      setSelectedRows]      = useState<SupplierRateContract[]>([])
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
  const { canView, canCreate, canUpdate, canDelete } = usePermission('MM_SUPP_RATE')

  // ── Modal / confirm state ────────────────────────────────────
  const [modalOpen,   setModalOpen]   = useState(false)
  const [formMode,    setFormMode]    = useState<'add' | 'edit' | 'view'>('add')
  const [editItem,    setEditItem]    = useState<SupplierRateContract | null>(null)
  const [toggleItem,  setToggleItem]  = useState<SupplierRateContract | null>(null)
  const [saving,      setSaving]      = useState(false)
  const isNew      = formMode === 'add'
  const isViewMode = formMode === 'view'

  // ── Form (controlled local state per project pattern) ────────
  const [form,        setForm]        = useState<FormValues>(blankForm)
  const [formErrors,  setFormErrors]  = useState<Partial<Record<keyof FormValues, string>>>({})

  const setField = (key: keyof FormValues, val: string) => {
    setForm(f => ({ ...f, [key]: val }))
    if (formErrors[key]) setFormErrors(e => ({ ...e, [key]: undefined }))
  }

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormValues, string>> = {}
    if (!form.vendor_id)   errs.vendor_id = 'Vendor is required'
    if (!form.itemtype)    errs.itemtype  = 'Item Type is required'
    if (!form.sku_code)    errs.sku_code  = 'Item is required'
    if (form.rate_value !== '' && Number(form.rate_value) < 0) errs.rate_value = 'Rate cannot be negative'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Vendor LOV (searches /suppliers) ──────────────────────────
  const searchVendor = async (q: string): Promise<LovOpt[]> => {
    const r = await apiService.get('/suppliers', { params: { page: 1, limit: 20, status: 'active', search: q } })
    const rows: { id: number; vendor_code: string; vendor_company_name: string }[] = r.data?.data ?? []
    return rows.map(v => ({ id: v.id, code: v.vendor_code, name: v.vendor_company_name }))
  }
  const handleVendorSelect = (id: number, code: string) => {
    setField('vendor_id', String(id))
    setField('vendor_code', code)
    if (formErrors.vendor_id) setFormErrors(e => ({ ...e, vendor_id: undefined }))
  }
  const handleVendorClear = () => {
    setField('vendor_id', '')
    setField('vendor_code', '')
  }

  // ── Item cascade ─────────────────────────────────────────────
  const searchSkuLov = async (q: string, itemType: string): Promise<LovOpt[]> => {
    const lovType = LOV_BY_ITEM_TYPE[itemType]
    if (!lovType) return []
    const params = new URLSearchParams({ search: q })
    const r = await apiService.get(`/fg-bom/lov/${lovType}?${params}`)
    return r.data?.data ?? []
  }

  const handleItemTypeChange = (newType: string) => {
    setField('itemtype', newType)
    setField('sku_code', '')
  }

  const handleSkuSelect = (_id: number, code: string) => {
    setField('sku_code', code)
  }

  const handleSkuClear = () => setField('sku_code', '')

  // Switching Rate Basis changes which UOMs are valid — PCS only for Per Pc,
  // GM/CT only for Per Weight — so the current selection is reconciled here.
  const handleRateBasisChange = (val: 'PER_GM' | 'PER_PC') => {
    setForm(f => ({
      ...f,
      rate_basis: val,
      uom: val === 'PER_PC' ? 'PCS' : (f.uom === 'PCS' ? 'GM' : f.uom),
    }))
  }

  // ── Data loaders ─────────────────────────────────────────────
  const loadStats = async () => {
    try {
      const res = await apiService.get('/supplier-rate-contract/stats')
      setStats(res.data?.data ?? { active: 0, inactive: 0 })
    } catch { /* silent */ }
  }

  const loadItems = async () => {
    if (isFirstLoad.current) setLoading(true)
    else setFetching(true)
    try {
      const activeCF = Object.fromEntries(Object.entries(debouncedCF).filter(([, v]) => v.trim()))
      const res = await apiService.get('/supplier-rate-contract', {
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
      toast.error(msg || 'Failed to load supplier rate contracts')
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
  const toggleSelectRow = (item: SupplierRateContract) =>
    setSelectedRows(prev =>
      prev.some(r => r.id === item.id)
        ? prev.filter(r => r.id !== item.id)
        : [...prev, item]
    )

  // ── Export ────────────────────────────────────────────────────
  const fmtRate = (row: SupplierRateContract) => {
    const v = Number(row.rate_value)
    return row.rate_type === 'PERCENTAGE'
      ? `${v.toFixed(2).padStart(6, '0')}%`
      : `₹ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const buildExportRows = (rows: SupplierRateContract[]) =>
    rows.map(r => ({
      'Vendor':      r.vendor_company_name,
      'Item Type':   r.itemtype,
      'SKU Code':    r.sku_code,
      'Rate Basis':  r.rate_basis === 'PER_PC' ? 'Per Pc' : 'Per Weight',
      'Rate Type':   r.rate_type === 'PERCENTAGE' ? '%' : 'Amount',
      'Rate':        fmtRate(r),
      'UOM':         uomLabel(r.uom),
      'Status':      r.is_active ? 'Active' : 'Inactive',
      ...(statusFilter === 'inactive' && {
        'Deactive Reason': r.deactivation_reason || '',
        'Deactive Date': r.deactivated_at ? formatDate(String(r.deactivated_at)) : '',
      }),
      'Created':     formatDateTime(String(r.created_at)),
    }))

  const handleExport = async (scope: 'all' | 'selected', format: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false)
    let rows: SupplierRateContract[]
    if (scope === 'selected') {
      rows = selectedRows
      if (!rows.length) { toast.error('No rows selected'); return }
    } else {
      setExporting(true)
      try {
        const res = await apiService.get('/supplier-rate-contract', {
          params: { page: 1, limit: 9999, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter },
        })
        rows = res.data?.data ?? []
      } catch { toast.error('Failed to fetch export data'); setExporting(false); return }
      setExporting(false)
    }
    const data  = buildExportRows(rows)
    const fname = `supplier_rate_contract_${statusFilter}`
    if (format === 'csv')   exportToCSV(data, fname)
    else if (format === 'excel') void exportToExcel(data, fname)
    else void exportToPDF(data, fname, 'Supplier Rate Contract Report')
  }

  // ── Cell renderer ─────────────────────────────────────────────
  const renderCell = (col: ColDef, row: SupplierRateContract) => {
    switch (col.key) {
      case 'vendor_company_name':
        return (
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.vendor_company_name}</p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{row.vendor_code}</p>
          </div>
        )
      case 'itemtype':
        return <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--accent-gold)/10', color: 'var(--accent-gold)' }}>{row.itemtype}</span>
      case 'sku_code':
        return <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.sku_code}</span>
      case 'rate_basis':
        return <Badge label={row.rate_basis === 'PER_PC' ? 'Per Pc' : 'Per Weight'} variant="secondary" />
      case 'rate_type':
        return <Badge label={row.rate_type === 'PERCENTAGE' ? '%' : 'Amount'} variant="secondary" />
      case 'rate_value':
        return <span className="text-sm font-mono font-semibold">{fmtRate(row)}</span>
      case 'uom':
        return <span className="text-sm">{uomLabel(row.uom)}</span>
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

  const toFormValues = (item: SupplierRateContract): FormValues => ({
    vendor_id:   String(item.vendor_id),
    vendor_code: item.vendor_code,
    itemtype:    item.itemtype,
    sku_code:    item.sku_code,
    rate_basis:  item.rate_basis,
    rate_type:   item.rate_type,
    rate_value:  String(item.rate_value ?? ''),
    uom:         item.uom,
    remarks:     item.remarks ?? '',
  })

  const openEdit = (item: SupplierRateContract) => {
    setFormMode('edit')
    setEditItem(item)
    setForm(toFormValues(item))
    setFormErrors({})
    setModalOpen(true)
  }

  const openView = (item: SupplierRateContract) => {
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
        vendor_id:  Number(form.vendor_id),
        itemtype:   form.itemtype,
        sku_code:   form.sku_code,
        rate_basis: form.rate_basis,
        rate_type:  form.rate_type,
        rate_value: form.rate_value !== '' ? Number(form.rate_value) : 0,
        uom:        form.uom,
        remarks:    form.remarks.trim() || null,
      }
      if (isNew) {
        await apiService.post('/supplier-rate-contract', payload)
        toast.success('Supplier rate contract created successfully')
      } else {
        await apiService.put(`/supplier-rate-contract/${editItem!.id}`, payload)
        toast.success('Supplier rate contract updated successfully')
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
      const res = await apiService.delete(`/supplier-rate-contract/${toggleItem.id}`, reason ? { data: { reason } } : undefined)
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
      const res = await apiService.post('/supplier-rate-contract/import', { rows })
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
      <PageBreadcrumb parent="Masters" current="Supplier Rate Contract" />

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
            Add Rate Contract
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
              placeholder="Search rate contracts…"
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
                          style={{ width: col.key === 'vendor_company_name' ? '140px' : '80px' }}
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
                        ? 'No rate contracts match the current filters.'
                        : `No ${statusFilter} rate contracts found. Click "Add Rate Contract" to get started.`
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
                : `Showing ${startRow}–${endRow} of ${total} rate contracts`
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
            ? 'Add Rate Contract'
            : isViewMode
              ? `View Rate Contract — ${editItem?.vendor_company_name}`
              : `Edit Rate Contract — ${editItem?.vendor_company_name}`
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
                  : isNew ? 'Create Contract' : 'Update Contract'
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

          {/* Vendor */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Vendor<Req />
            </label>
            <LovSearch
              display={form.vendor_code}
              placeholder="Search vendor by code or name…"
              fetch={searchVendor}
              onSelect={handleVendorSelect}
              onClear={handleVendorClear}
              disabled={isViewMode}
              error={!!formErrors.vendor_id}
              hint="Type % to show all vendors"
            />
          </div>

          {/* Item Type + SKU Code cascade */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Item Type<Req />
              </label>
              <select
                value={form.itemtype}
                onChange={e => handleItemTypeChange(e.target.value)}
                disabled={isViewMode}
                className={`form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
              >
                <option value="">Select Item Type</option>
                {itemTypeOpts.map(opt => (
                  <option key={opt.lookup_code} value={opt.lookup_code}>{opt.lookup_name}</option>
                ))}
              </select>
              {formErrors.itemtype && <p className="text-xs text-red-500 mt-1">{formErrors.itemtype}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                SKU Code<Req />
              </label>
              <LovSearch
                key={form.itemtype}
                display={form.sku_code}
                placeholder={form.itemtype ? `Search ${form.itemtype === 'FG' ? 'FG' : form.itemtype.toLowerCase()}…` : 'Select Item Type first'}
                fetch={q => searchSkuLov(q, form.itemtype)}
                onSelect={handleSkuSelect}
                onClear={handleSkuClear}
                disabled={isViewMode || !form.itemtype}
                error={!!formErrors.sku_code}
                hint="Type % to show all items"
              />
            </div>
          </div>

          {/* Rate Basis + Rate Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Rate Basis
              </label>
              <div className="flex items-center gap-5">
                {(['PER_GM', 'PER_PC'] as const).map(val => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      value={val}
                      checked={form.rate_basis === val}
                      onChange={() => handleRateBasisChange(val)}
                      disabled={isViewMode}
                      className="w-4 h-4 accent-[var(--color-primary)]"
                    />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{val === 'PER_PC' ? 'Per Pc' : 'Per Weight'}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Rate Type
              </label>
              <div className="flex items-center gap-5">
                {(['AMOUNT', 'PERCENTAGE'] as const).map(val => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      value={val}
                      checked={form.rate_type === val}
                      onChange={() => setField('rate_type', val)}
                      disabled={isViewMode}
                      className="w-4 h-4 accent-[var(--color-primary)]"
                    />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{val === 'PERCENTAGE' ? '%' : 'Amount'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Rate + UOM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Rate {form.rate_type === 'PERCENTAGE' ? '(%)' : '(₹)'}
              </label>
              <input
                type="number" step="0.01" min="0"
                value={form.rate_value}
                onChange={e => setField('rate_value', e.target.value)}
                readOnly={isViewMode}
                className={`form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
                placeholder="0.00"
              />
              {formErrors.rate_value && <p className="text-xs text-red-500 mt-1">{formErrors.rate_value}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                UOM
              </label>
              <select
                value={form.uom}
                onChange={e => setField('uom', e.target.value)}
                disabled={isViewMode}
                className={`form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
              >
                {uomOptsForBasis(uomOpts, form.rate_basis).map(opt => (
                  <option key={opt.lookup_code} value={opt.lookup_code}>{opt.lookup_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Remarks
            </label>
            <textarea
              value={form.remarks}
              onChange={e => setField('remarks', e.target.value)}
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
        title="Import Rate Contracts from CSV"
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
        title="Deactivate Rate Contract"
        itemLabel={`Rate contract for "${toggleItem?.vendor_company_name}"`}
        onConfirm={reason => confirmToggle(reason)}
        onCancel={() => setToggleItem(null)}
      />

      <ConfirmDialog
        isOpen={!!toggleItem && !toggleItem.is_active}
        title="Activate Rate Contract"
        message={`Activate rate contract for "${toggleItem?.vendor_company_name}"?`}
        confirmLabel="Activate"
        variant="info"
        onConfirm={() => confirmToggle()}
        onCancel={() => setToggleItem(null)}
      />
    </div>
  )
}

export default SupplierRateContractPage
