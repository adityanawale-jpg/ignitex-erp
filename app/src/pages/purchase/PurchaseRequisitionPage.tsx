import React, { useState, useEffect, useRef, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon, EyeIcon, MagnifyingGlassIcon, XMarkIcon,
  ViewColumnsIcon, ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon,
  FunnelIcon, BarsArrowUpIcon, NoSymbolIcon, CheckCircleIcon,
  ArrowDownTrayIcon, ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'
import Modal                  from '@/components/common/Modal'
import Badge                  from '@/components/common/Badge'
import ConfirmDialog          from '@/components/common/ConfirmDialog'
import DeactivateReasonDialog from '@/components/common/DeactivateReasonDialog'
import { formatDate, formatDateTime, exportToCSV, exportToExcel, exportToPDF } from '@/utils/helpers'
import { apiService } from '@/api/apiService'
import { usePermission } from '@/hooks'

// ── Types ─────────────────────────────────────────────────────
interface Requisition {
  id:                   number
  requisition_number:   string | null
  requisition_date:     string
  itemtype:             string
  item_id:              number | null
  sku_code:             string
  item_description:     string | null
  item_qty:             string | number
  uom:                  string | null
  gross_weight:         string | number | null
  net_weight:           string | number | null
  pure_weight:          string | number | null
  is_vendor_mapped:     boolean
  vendor_item_no:       string | null
  ref_request_number:   string | null
  ref_request_source:   string | null
  ref_source_reference: string | null
  required_date:        string | null
  remarks:              string | null
  is_active:            boolean
  deactivation_reason:  string | null
  deactivated_at:       string | null
  created_at:           string
}

interface LookupOption { lookup_code: string; lookup_name: string }

// One row of the SKU picker. Every item type returns this same shape; the
// columns a type has nothing for come back null (see getRequisitionItemLOV).
interface ItemLovOpt {
  id:             number
  code:           string
  name:           string
  description:    string | null
  gross_weight:   string | number | null
  net_weight:     string | number | null
  purity:         string | null
  std_cts:        string | number | null
  vendor_item_no: string | null
}

type ItemType = 'FG' | 'FINDING' | 'METAL' | 'STONE' | 'COMPONENT'

// ── Form state (controlled local state per project pattern) ────
type ReqForm = {
  requisition_date:     string
  itemtype:             ItemType
  item_id:              number | null
  sku_code:             string
  item_description:     string
  item_qty:             string
  uom:                  string
  gross_weight:         string
  net_weight:           string
  pure_weight:          string
  is_vendor_mapped:     boolean
  vendor_item_no:       string
  ref_request_number:   string
  ref_request_source:   string
  ref_source_reference: string
  required_date:        string
  remarks:              string
}

const today = () => new Date().toISOString().slice(0, 10)

const blankForm = (): ReqForm => ({
  requisition_date:     today(),
  itemtype:             'FG',
  item_id:              null,
  sku_code:             '',
  item_description:     '',
  item_qty:             '',
  uom:                  'PCS',
  gross_weight:         '',
  net_weight:           '',
  pure_weight:          '',
  is_vendor_mapped:     false,
  vendor_item_no:       '',
  ref_request_number:   '',
  ref_request_source:   '',
  ref_source_reference: '',
  required_date:        '',
  remarks:              '',
})

// ── Constants ─────────────────────────────────────────────────
const PAGE_SIZES = [10, 25, 50, 100]
const Req = () => <span className="text-red-500 ml-0.5">*</span>

const ITEM_TYPES: { code: ItemType; label: string }[] = [
  { code: 'FG',        label: 'Finished Goods' },
  { code: 'FINDING',   label: 'Finding / SFG'  },
  { code: 'METAL',     label: 'Metal'          },
  { code: 'STONE',     label: 'Stone'          },
  { code: 'COMPONENT', label: 'Component'      },
]
const itemTypeLabel = (code: string) => ITEM_TYPES.find(t => t.code === code)?.label ?? code

// The unit a type is normally bought in — metal by weight, stone by carat, the
// rest by piece. Pre-selected on a type change; the user can still override it.
const DEFAULT_UOM: Record<ItemType, string> = {
  FG: 'PCS', FINDING: 'PCS', COMPONENT: 'PCS', METAL: 'GM', STONE: 'CT',
}

// Only FG and Finding SKUs carry a BOM, so only they can have their weights
// filled in for them. The other three are typed by hand.
const WEIGHTS_FROM_BOM: ItemType[] = ['FG', 'FINDING']

// ── Number helpers ────────────────────────────────────────────
const n = (v: unknown): number => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}
const wt  = (v: unknown) => n(v).toFixed(4)
// item_qty is an INTEGER column — whole units only.
const qty = (v: unknown) => String(Math.trunc(n(v)))

// PURITY lookup codes come in two spellings — millesimal ('916') and percent
// ('91.60%') — so both are read here rather than assuming one house style.
const purityFactor = (code: string | null | undefined): number | null => {
  const s = String(code ?? '').trim()
  if (!s) return null
  if (/^\d{3}$/.test(s))            return Number(s) / 1000
  const pct = s.match(/^([\d.]+)\s*%$/)
  if (pct && Number.isFinite(Number(pct[1]))) return Number(pct[1]) / 100
  return null
}

interface ColDef { key: string; label: string; sortKey?: string; visible: boolean; minW?: string }

const INITIAL_COLS: ColDef[] = [
  { key: 'requisition_number',   label: 'Requisition No',   sortKey: 'requisition_number', visible: true,  minW: '140px' },
  { key: 'requisition_date',     label: 'Req. Date',        sortKey: 'requisition_date',   visible: true,  minW: '110px' },
  { key: 'itemtype',             label: 'Item Type',        sortKey: 'itemtype',           visible: true,  minW: '130px' },
  { key: 'sku_code',             label: 'SKU / Item',       sortKey: 'sku_code',           visible: true,  minW: '170px' },
  { key: 'item_description',     label: 'Description',                                     visible: true,  minW: '200px' },
  { key: 'item_qty',             label: 'Qty',              sortKey: 'item_qty',           visible: true,  minW: '90px'  },
  { key: 'uom',                  label: 'UOM',                                             visible: true,  minW: '80px'  },
  { key: 'gross_weight',         label: 'Gr.Wt',            sortKey: 'gross_weight',       visible: true,  minW: '100px' },
  { key: 'net_weight',           label: 'Net Wt',           sortKey: 'net_weight',         visible: true,  minW: '100px' },
  { key: 'pure_weight',          label: 'Pure Wt',          sortKey: 'pure_weight',        visible: true,  minW: '100px' },
  { key: 'is_vendor_mapped',     label: 'Vendor Mapped',                                   visible: true,  minW: '120px' },
  { key: 'vendor_item_no',       label: 'Vendor Item No',   sortKey: 'vendor_item_no',     visible: true,  minW: '140px' },
  { key: 'ref_request_number',   label: 'Request No',       sortKey: 'ref_request_number', visible: true,  minW: '130px' },
  { key: 'ref_request_source',   label: 'Request Source',                                  visible: true,  minW: '150px' },
  { key: 'ref_source_reference', label: 'Source Reference',                                visible: false, minW: '160px' },
  { key: 'required_date',        label: 'Required By',      sortKey: 'required_date',      visible: false, minW: '110px' },
  { key: 'is_active',            label: 'Status',                                          visible: true,  minW: '100px' },
  { key: 'deactivation_reason',  label: 'Deactive Reason',                                 visible: true,  minW: '160px' },
  { key: 'deactivated_at',       label: 'Deactive Date',                                   visible: true,  minW: '120px' },
  { key: 'created_at',           label: 'Created',          sortKey: 'created_at',         visible: false, minW: '150px' },
]

// ─────────────────────────────────────────────────────────────────
// Modal form furniture. Module scope, not nested in the page component:
// a component declared inside a render is a new type on every render, so
// React remounts its subtree and a controlled input loses focus after each
// keystroke.
// ─────────────────────────────────────────────────────────────────
const Field = ({ label, required, readOnly, hint, children }: {
  label: string; required?: boolean; readOnly?: boolean
  hint?: string; children: React.ReactNode
}) => (
  <div>
    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
      {label}{required && !readOnly && <Req />}
    </label>
    {children}
    {hint && <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
  </div>
)

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold uppercase tracking-wide pb-1.5 mb-3 border-b"
    style={{ color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>
    {children}
  </p>
)

// ─────────────────────────────────────────────────────────────────
// ItemSearch — type-ahead SKU picker (same shape as Sales Order's)
// ─────────────────────────────────────────────────────────────────
interface ItemSearchProps {
  value:    string
  disabled?: boolean
  error?:   boolean
  fetch:    (q: string) => Promise<ItemLovOpt[]>
  onSelect: (opt: ItemLovOpt) => void
  onClear:  () => void
}
function ItemSearch({ value, disabled, error, fetch, onSelect, onClear }: ItemSearchProps) {
  const [q,    setQ]    = useState(value)
  const [opts, setOpts] = useState<ItemLovOpt[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => setQ(value), [value])

  const doSearch = async (val: string) => {
    setQ(val)
    if (!val.length) { setOpts([]); setOpen(false); return }
    setBusy(true)
    try {
      const r = await fetch(val === '%' ? '' : val)
      setOpts(r); setOpen(true)
    } catch { /* the toast is raised by the caller */ }
    finally { setBusy(false) }
  }

  const showClear = !!q && !disabled

  return (
    <div className="relative">
      <input
        value={q}
        onChange={e => doSearch(e.target.value)}
        onFocus={() => { if (q.length && opts.length) setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="Type to search, or % to list all…"
        disabled={disabled}
        className={`w-full text-sm pl-3 ${showClear ? 'pr-8' : 'pr-3'} py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] disabled:opacity-60 disabled:cursor-not-allowed`}
        style={{
          borderColor: error ? '#ef4444' : 'var(--border-color)',
          background: 'var(--bg-primary)', color: 'var(--text-primary)',
        }}
      />
      {busy && (
        <span className="absolute right-8 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />
      )}
      {showClear && (
        <button type="button" title="Clear"
          onClick={() => { setQ(''); setOpts([]); setOpen(false); onClear() }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
      {open && opts.length > 0 && (
        <div className="absolute z-50 top-full left-0 w-full border shadow-lg rounded-lg max-h-56 overflow-y-auto text-sm mt-0.5"
          style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)' }}>
          {opts.map(o => (
            <div key={o.id}
              className="px-3 py-2 cursor-pointer hover:bg-[var(--bg-secondary)]"
              onMouseDown={() => { onSelect(o); setQ(o.code); setOpen(false) }}>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-xs" style={{ color: 'var(--accent-gold)' }}>{o.code}</span>
                {o.vendor_item_no && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[var(--accent-gold)]/30 text-[var(--accent-gold)]">
                    vendor mapped
                  </span>
                )}
              </div>
              {o.description && o.description !== o.code && (
                <div className="truncate text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{o.description}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────
const PurchaseRequisitionPage: React.FC = () => {
  // ── Permissions ──────────────────────────────────────────────
  const { canView, canCreate, canUpdate, canDelete } = usePermission('PM_REQUISITIONS')

  // ── Lookups ──────────────────────────────────────────────────
  const [uomOpts,    setUomOpts]    = useState<LookupOption[]>([])
  const [sourceOpts, setSourceOpts] = useState<LookupOption[]>([])

  // ── Grid state ───────────────────────────────────────────────
  const [items,        setItems]        = useState<Requisition[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetching,     setFetching]     = useState(false)
  const isFirstLoad                     = useRef(true)
  const [stats,        setStats]        = useState({ active: 0, inactive: 0 })
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active')
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(25)
  const [searchInput,  setSearchInput]  = useState('')
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState('created_at')
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('desc')
  const [total,        setTotal]        = useState(0)
  const [totalPages,   setTotalPages]   = useState(1)

  // ── Toolbar state ─────────────────────────────────────────────
  const [cols,          setCols]          = useState<ColDef[]>(INITIAL_COLS)
  const [showColPicker, setShowColPicker] = useState(false)
  const [showFilterRow, setShowFilterRow] = useState(false)
  const [showSorting,   setShowSorting]   = useState(true)
  const [colFilters,    setColFilters]    = useState<Record<string, string>>({})
  const [debouncedCF,   setDebouncedCF]   = useState<Record<string, string>>({})
  const [selectedRows,  setSelectedRows]  = useState<Requisition[]>([])
  const [exportOpen,    setExportOpen]    = useState(false)
  const [exporting,     setExporting]     = useState(false)
  const colPickerRef   = useRef<HTMLDivElement>(null)
  const exportRef      = useRef<HTMLDivElement>(null)
  const masterCheckRef = useRef<HTMLInputElement>(null)
  const searchTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cfTimer        = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Modal / form state ────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [formMode,  setFormMode]  = useState<'add' | 'edit' | 'view'>('add')
  const [editItem,  setEditItem]  = useState<Requisition | null>(null)
  const [form,      setForm]      = useState<ReqForm>(blankForm)
  const [formErr,   setFormErr]   = useState<Record<string, boolean>>({})
  const [saving,    setSaving]    = useState(false)
  // Purity of the picked METAL row, which is what Pure Wt is derived from. Not
  // a form field: it belongs to the master, not to the requisition.
  const [itemPurity, setItemPurity] = useState<string | null>(null)

  const isNew      = formMode === 'add'
  const isViewMode = formMode === 'view'
  const readOnly   = isViewMode

  // ── Row action state ──────────────────────────────────────────
  const [toggleItem, setToggleItem] = useState<Requisition | null>(null)

  // ── Load lookups ──────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [uom, src] = await Promise.all([
          apiService.get('/common/lookup/UOM'),
          apiService.get('/common/lookup/PR_REQUEST_SOURCE'),
        ])
        setUomOpts(uom.data?.data ?? [])
        setSourceOpts(src.data?.data ?? [])
      } catch {
        toast.error('Failed to load lookup options')
      }
    }
    load()
  }, [])

  const lookupName = (opts: LookupOption[], code: string | null) =>
    code ? (opts.find(o => o.lookup_code === code)?.lookup_name ?? code) : '—'

  // ── Data loaders ──────────────────────────────────────────────
  const loadStats = async () => {
    try {
      const res = await apiService.get('/purchase-requisitions/stats')
      setStats(res.data?.data ?? { active: 0, inactive: 0 })
    } catch { /* silent — the grid is the page, the tiles are decoration */ }
  }

  const loadItems = async () => {
    if (isFirstLoad.current) setLoading(true)
    else setFetching(true)
    try {
      const activeCF = Object.fromEntries(Object.entries(debouncedCF).filter(([, v]) => v.trim()))
      const res = await apiService.get('/purchase-requisitions', {
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
      toast.error(msg || 'Failed to load purchase requisitions')
    } finally {
      setLoading(false); setFetching(false); isFirstLoad.current = false
    }
  }

  useEffect(() => { loadStats() }, []) // eslint-disable-line
  useEffect(() => { loadItems() }, [page, pageSize, search, sortBy, sortDir, debouncedCF, statusFilter]) // eslint-disable-line

  const reload = () => Promise.all([loadItems(), loadStats()])

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
  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
    setPage(1)
  }
  const handlePageSize = (v: number) => { setPageSize(v); setPage(1) }
  const toggleCol = (key: string) => setCols(cs => cs.map(c => c.key === key ? { ...c, visible: !c.visible } : c))
  // The two deactivation columns are only ever populated on an inactive row, so
  // they stay out of the way while the Active list is showing.
  const gridCols    = statusFilter === 'inactive'
    ? cols
    : cols.filter(c => c.key !== 'deactivation_reason' && c.key !== 'deactivated_at')
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
    if (allPageSelected) setSelectedRows(p => p.filter(r => !currentPageIds.includes(r.id)))
    else setSelectedRows(p => [...p, ...items.filter(u => !p.some(r => r.id === u.id))])
  }
  const toggleSelectRow = (item: Requisition) =>
    setSelectedRows(p => p.some(r => r.id === item.id) ? p.filter(r => r.id !== item.id) : [...p, item])

  // ── Export ────────────────────────────────────────────────────
  const buildExportRows = (rows: Requisition[]) =>
    rows.map(r => ({
      'Requisition No':   r.requisition_number ?? '',
      'Req. Date':        formatDate(String(r.requisition_date)),
      'Item Type':        itemTypeLabel(r.itemtype),
      'SKU / Item':       r.sku_code,
      'Description':      r.item_description ?? '',
      'Qty':              qty(r.item_qty),
      'UOM':              lookupName(uomOpts, r.uom),
      'Gr.Wt':            wt(r.gross_weight),
      'Net Wt':           wt(r.net_weight),
      'Pure Wt':          wt(r.pure_weight),
      'Vendor Mapped':    r.is_vendor_mapped ? 'Yes' : 'No',
      'Vendor Item No':   r.vendor_item_no ?? '',
      'Request No':       r.ref_request_number ?? '',
      'Request Source':   lookupName(sourceOpts, r.ref_request_source),
      'Source Reference': r.ref_source_reference ?? '',
      'Required By':      r.required_date ? formatDate(String(r.required_date)) : '',
      'Status':           r.is_active ? 'Active' : 'Inactive',
      ...(statusFilter === 'inactive' && {
        'Deactive Reason': r.deactivation_reason || '',
        'Deactive Date':   r.deactivated_at ? formatDate(String(r.deactivated_at)) : '',
      }),
      'Created':          formatDateTime(String(r.created_at)),
    }))

  const handleExport = async (scope: 'all' | 'selected', format: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false)
    let rows: Requisition[]
    if (scope === 'selected') {
      rows = selectedRows
      if (!rows.length) { toast.error('No rows selected'); return }
    } else {
      setExporting(true)
      try {
        const res = await apiService.get('/purchase-requisitions', {
          params: { page: 1, limit: 9999, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter },
        })
        rows = res.data?.data ?? []
      } catch { toast.error('Failed to fetch export data'); setExporting(false); return }
      setExporting(false)
    }
    const data  = buildExportRows(rows)
    const fname = `purchase_requisition_${statusFilter}`
    if (format === 'csv')        exportToCSV(data, fname)
    else if (format === 'excel') void exportToExcel(data, fname)
    else                         void exportToPDF(data, fname, 'Purchase Requisition Report')
  }

  // ── Cell renderer ─────────────────────────────────────────────
  const renderCell = (col: ColDef, row: Requisition) => {
    const muted = { color: 'var(--text-muted)' }
    const dash  = <span style={muted}>—</span>
    switch (col.key) {
      case 'requisition_number':
        return <span className="font-mono text-sm font-semibold" style={{ color: 'var(--accent-gold)' }}>{row.requisition_number ?? '—'}</span>
      case 'requisition_date':
        return <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(String(row.requisition_date))}</span>
      case 'required_date':
        return row.required_date
          ? <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(String(row.required_date))}</span>
          : dash
      case 'itemtype':
        return <Badge label={itemTypeLabel(row.itemtype)} variant="secondary" />
      case 'sku_code':
        return <span className="font-mono text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{row.sku_code}</span>
      case 'item_description':
        return row.item_description
          ? <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.item_description}</span>
          : dash
      case 'item_qty':
        return <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>{qty(row.item_qty)}</span>
      case 'uom':
        return <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{lookupName(uomOpts, row.uom)}</span>
      case 'gross_weight':
      case 'net_weight':
      case 'pure_weight': {
        const v = n(row[col.key as 'gross_weight' | 'net_weight' | 'pure_weight'])
        return v ? <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>{wt(v)}</span> : dash
      }
      case 'is_vendor_mapped':
        return <Badge label={row.is_vendor_mapped ? 'Yes' : 'No'} variant={row.is_vendor_mapped ? 'success' : 'secondary'} />
      case 'vendor_item_no':
        return row.vendor_item_no
          ? <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{row.vendor_item_no}</span>
          : dash
      case 'ref_request_number':
        return row.ref_request_number
          ? <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{row.ref_request_number}</span>
          : dash
      case 'ref_request_source':
        return row.ref_request_source
          ? <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{lookupName(sourceOpts, row.ref_request_source)}</span>
          : dash
      case 'ref_source_reference':
        return row.ref_source_reference
          ? <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{row.ref_source_reference}</span>
          : dash
      case 'is_active':
        return <Badge label={row.is_active ? 'Active' : 'Inactive'} variant={row.is_active ? 'success' : 'danger'} />
      case 'deactivation_reason':
        return row.deactivation_reason
          ? <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.deactivation_reason}</span>
          : dash
      case 'deactivated_at':
        return row.deactivated_at
          ? <span className="text-xs" style={muted}>{formatDate(String(row.deactivated_at))}</span>
          : dash
      case 'created_at':
        return <span className="text-xs" style={muted}>{formatDateTime(String(row.created_at))}</span>
      default:
        return dash
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

  // ── Form helpers ──────────────────────────────────────────────
  const setField = <K extends keyof ReqForm>(key: K, val: ReqForm[K]) => {
    setForm(f => ({ ...f, [key]: val }))
    setFormErr(e => (e[key as string] ? { ...e, [key as string]: false } : e))
  }

  // Pure Wt is the fine-metal content of Net Wt. Derived rather than typed when
  // the picked metal's purity is readable, and left alone otherwise — a purity
  // spelled in a form neither branch of purityFactor() handles must not quietly
  // zero the figure the user entered.
  const applyPure = (netValue: string, purity: string | null) => {
    const f = purityFactor(purity)
    if (f === null) return
    const net = n(netValue)
    setForm(fm => ({ ...fm, pure_weight: net ? (net * f).toFixed(4) : '' }))
  }

  const onNetChange = (val: string) => {
    setField('net_weight', val)
    if (form.itemtype === 'METAL') applyPure(val, itemPurity)
  }

  const onItemTypeChange = (t: ItemType) => {
    // The SKU belongs to the old master, so it goes with it — keeping it would
    // save a code that the new type's picker could never have produced.
    setForm(f => ({
      ...f,
      itemtype: t,
      item_id: null, sku_code: '', item_description: '',
      gross_weight: '', net_weight: '', pure_weight: '',
      is_vendor_mapped: false, vendor_item_no: '',
      uom: DEFAULT_UOM[t],
    }))
    setItemPurity(null)
    setFormErr(e => ({ ...e, sku_code: false }))
  }

  const searchItems = async (q: string): Promise<ItemLovOpt[]> => {
    try {
      const res = await apiService.get(`/purchase-requisitions/lov/${form.itemtype}`, {
        params: { search: q || '%' },
      })
      return res.data?.data ?? []
    } catch {
      toast.error('Failed to search items')
      return []
    }
  }

  const onItemSelect = (opt: ItemLovOpt) => {
    const gross = n(opt.gross_weight)
    const net   = n(opt.net_weight)
    const pure  = purityFactor(opt.purity) !== null ? net * purityFactor(opt.purity)! : 0
    setItemPurity(opt.purity)
    setForm(f => ({
      ...f,
      item_id:          opt.id,
      sku_code:         opt.code,
      item_description: opt.description ?? f.item_description,
      // Only the BOM-backed types have weights to offer; for the rest these stay
      // as the user left them.
      gross_weight: WEIGHTS_FROM_BOM.includes(f.itemtype) ? (gross ? gross.toFixed(4) : '') : f.gross_weight,
      net_weight:   WEIGHTS_FROM_BOM.includes(f.itemtype) ? (net   ? net.toFixed(4)   : '') : f.net_weight,
      pure_weight:  pure ? pure.toFixed(4) : f.pure_weight,
      // Qty is whole units, so a stone's fractional std_cts is no use as a
      // default here — it is left for the user to enter.
      is_vendor_mapped: !!opt.vendor_item_no,
      vendor_item_no:   opt.vendor_item_no ?? '',
    }))
    setFormErr(e => ({ ...e, sku_code: false }))
  }

  const onItemClear = () => {
    setItemPurity(null)
    setForm(f => ({ ...f, item_id: null, sku_code: '', is_vendor_mapped: false, vendor_item_no: '' }))
  }

  // ── Modal open / close ────────────────────────────────────────
  const openAdd = () => {
    setFormMode('add'); setEditItem(null); setForm(blankForm())
    setItemPurity(null); setFormErr({}); setModalOpen(true)
  }

  const fillFrom = (item: Requisition): ReqForm => ({
    requisition_date:     String(item.requisition_date).slice(0, 10),
    itemtype:             item.itemtype as ItemType,
    item_id:              item.item_id,
    sku_code:             item.sku_code,
    item_description:     item.item_description ?? '',
    item_qty:             qty(item.item_qty),
    uom:                  item.uom ?? '',
    gross_weight:         n(item.gross_weight) ? wt(item.gross_weight) : '',
    net_weight:           n(item.net_weight)   ? wt(item.net_weight)   : '',
    pure_weight:          n(item.pure_weight)  ? wt(item.pure_weight)  : '',
    is_vendor_mapped:     item.is_vendor_mapped,
    vendor_item_no:       item.vendor_item_no ?? '',
    ref_request_number:   item.ref_request_number ?? '',
    ref_request_source:   item.ref_request_source ?? '',
    ref_source_reference: item.ref_source_reference ?? '',
    required_date:        item.required_date ? String(item.required_date).slice(0, 10) : '',
    remarks:              item.remarks ?? '',
  })

  const openEdit = (item: Requisition) => {
    setFormMode('edit'); setEditItem(item); setForm(fillFrom(item))
    setItemPurity(null); setFormErr({}); setModalOpen(true)
  }
  const openView = (item: Requisition) => {
    setFormMode('view'); setEditItem(item); setForm(fillFrom(item))
    setItemPurity(null); setFormErr({}); setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setForm(blankForm()); setFormErr({}) }

  // ── Save ──────────────────────────────────────────────────────
  const validate = (): string | null => {
    const q    = n(form.item_qty)
    const errs: Record<string, boolean> = {}
    if (!form.sku_code.trim())            errs.sku_code = true
    if (q <= 0 || !Number.isInteger(q))   errs.item_qty = true
    if (form.is_vendor_mapped && !form.vendor_item_no.trim()) errs.vendor_item_no = true
    setFormErr(errs)

    if (errs.sku_code)       return 'SKU / Item is required'
    if (errs.item_qty)       return 'Qty must be a whole number greater than 0'
    if (errs.vendor_item_no) return 'Vendor Item No is required when the item is vendor mapped'

    // The same two weight relationships the server enforces, checked here so the
    // message lands next to the fields rather than after a round trip.
    const g = n(form.gross_weight), nw = n(form.net_weight), p = n(form.pure_weight)
    if (g > 0 && nw > g)  { setFormErr({ net_weight: true });  return 'Net Wt cannot be greater than Gr.Wt' }
    if (nw > 0 && p > nw) { setFormErr({ pure_weight: true }); return 'Pure Wt cannot be greater than Net Wt' }
    return null
  }

  const onSubmitForm = async () => {
    const err = validate()
    if (err) { toast.error(err); return }

    setSaving(true)
    try {
      const payload = {
        ...form,
        item_qty:     Math.trunc(n(form.item_qty)),
        gross_weight: n(form.gross_weight),
        net_weight:   n(form.net_weight),
        pure_weight:  n(form.pure_weight),
        uom:                  form.uom || null,
        ref_request_source:   form.ref_request_source || null,
        required_date:        form.required_date || null,
      }
      if (isNew) {
        const res = await apiService.post('/purchase-requisitions', payload)
        toast.success(`Requisition ${res.data?.data?.requisition_number ?? ''} created`)
      } else {
        await apiService.put(`/purchase-requisitions/${editItem!.id}`, payload)
        toast.success('Purchase requisition updated')
      }
      closeModal()
      await reload()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to save purchase requisition')
    } finally { setSaving(false) }
  }

  // ── Activate / deactivate ─────────────────────────────────────
  const confirmToggle = async (reason?: string) => {
    if (!toggleItem) return
    try {
      const res = await apiService.delete(
        `/purchase-requisitions/${toggleItem.id}`,
        reason ? { data: { reason } } : undefined,
      )
      toast.success(res.data?.message || 'Status updated')
      setToggleItem(null)
      await reload()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to update status')
    }
  }

  // ── Field wrappers ────────────────────────────────────────────
  const inputCls = (bad?: boolean) =>
    `form-input ${readOnly ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''} ${bad ? 'border-red-500' : ''}`

  // ── Render ────────────────────────────────────────────────────
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <span>Purchase Management</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>Purchase Requisition</span>
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
            New Requisition
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
              placeholder="Search requisitions…"
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
                <div className="absolute right-0 top-full mt-1 z-50 w-56 max-h-80 overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg p-1.5">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Show / Hide</p>
                  {gridCols.map(col => (
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
                {PAGE_SIZES.map(v => <option key={v} value={v}>{v}</option>)}
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
                <th className="px-4 py-2.5 w-36 text-center text-xs font-semibold uppercase tracking-wide sticky right-0 z-10 border-l border-[var(--border-color)] bg-[var(--bg-secondary)]"
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
                          style={{ width: col.key === 'requisition_number' ? '120px' : '80px' }} />
                      </td>
                    ))}
                    <td className="px-4 py-3 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]">
                      <div className="h-4 w-20 rounded animate-pulse bg-[var(--bg-tertiary)]" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length + 2} className="px-4 py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex flex-col items-center gap-3">
                      <ClipboardDocumentListIcon className="w-10 h-10 opacity-30" />
                      {search || Object.values(colFilters).some(v => v)
                        ? 'No requisitions match the current filters.'
                        : `No ${statusFilter} requisitions found. Click "New Requisition" to raise one.`
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
                        {canUpdate && (
                          <button onClick={() => openEdit(item)}
                            className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500 ${!item.is_active ? 'invisible' : ''}`}
                            title="Edit">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canView && (
                          <button onClick={() => openView(item)} className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]" title="View">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        )}
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
              {total === 0 ? 'No records found' : `Showing ${startRow}–${endRow} of ${total} requisitions`}
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
            {pageNumbers.map((p, i) =>
              p === '...' ? (
                <span key={`d-${i}`} className="px-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>…</span>
              ) : (
                <button key={p} onClick={() => setPage(p as number)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${page === p ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)] text-white font-semibold' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                  {p}
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
            ? 'New Purchase Requisition'
            : `${isViewMode ? 'View' : 'Edit'} Requisition — ${editItem?.requisition_number ?? ''}`
        }
        size="3xl"
        footer={
          isViewMode ? (
            <button onClick={closeModal} className="btn-secondary">Close</button>
          ) : (
            <>
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button onClick={onSubmitForm} disabled={saving} className="btn-primary">
                {saving
                  ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />Saving…</>
                  : isNew ? 'Create Requisition' : 'Update Requisition'
                }
              </button>
            </>
          )
        }
      >
        <div className="space-y-6">
          {isViewMode && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
              <EyeIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Read-only view — no changes can be made.</p>
            </div>
          )}

          {!isNew && editItem && !editItem.is_active && editItem.deactivation_reason && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
              <NoSymbolIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-semibold text-red-500">Deactivated — </span>{editItem.deactivation_reason}
              </p>
            </div>
          )}

          {/* ── Requisition ── */}
          <div>
            <SectionTitle>Requisition</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field
                label="Requisition Number"
                hint={isNew ? 'Assigned by the system when the requisition is saved.' : undefined}
              >
                <input
                  value={editItem?.requisition_number ?? ''}
                  readOnly
                  placeholder="PR-000000 (auto)"
                  className="form-input font-mono font-semibold cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]"
                  style={{ color: 'var(--accent-gold)' }}
                />
              </Field>

              <Field label="Requisition Date">
                <input
                  type="date"
                  value={form.requisition_date}
                  readOnly
                  className="form-input cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]"
                />
              </Field>

              <Field label="Status">
                <div className="flex items-center h-[38px]">
                  <Badge
                    label={(editItem?.is_active ?? true) ? 'Active' : 'Inactive'}
                    variant={(editItem?.is_active ?? true) ? 'success' : 'danger'}
                  />
                </div>
              </Field>
            </div>
          </div>

          {/* ── Item ── */}
          <div>
            <SectionTitle>Item</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Item Type" required readOnly={readOnly}>
                <select
                  value={form.itemtype}
                  disabled={readOnly}
                  onChange={e => onItemTypeChange(e.target.value as ItemType)}
                  className={inputCls()}
                >
                  {ITEM_TYPES.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                </select>
              </Field>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  SKU / Item{!readOnly && <Req />}
                </label>
                <ItemSearch
                  key={form.itemtype}
                  value={form.sku_code}
                  disabled={readOnly}
                  error={!!formErr.sku_code}
                  fetch={searchItems}
                  onSelect={onItemSelect}
                  onClear={onItemClear}
                />
              </div>

              <div className="sm:col-span-3">
                <Field label="Description">
                  <input
                    value={form.item_description}
                    readOnly={readOnly}
                    onChange={e => setField('item_description', e.target.value)}
                    placeholder="Filled from the item; edit if this requisition needs a different note"
                    className={inputCls()}
                  />
                </Field>
              </div>

              <Field label="Qty" required readOnly={readOnly}>
                <input
                  type="number" min="1" step="1"
                  value={form.item_qty}
                  readOnly={readOnly}
                  // Strip anything that isn't a digit as it is typed: the column
                  // is INTEGER, so a decimal point here only ever ends in a
                  // rejected save.
                  onChange={e => setField('item_qty', e.target.value.replace(/[^\d]/g, ''))}
                  className={inputCls(!!formErr.item_qty)}
                />
              </Field>

              <Field label="UOM">
                <select
                  value={form.uom}
                  disabled={readOnly}
                  onChange={e => setField('uom', e.target.value)}
                  className={inputCls()}
                >
                  <option value="">—</option>
                  {uomOpts.map(o => <option key={o.lookup_code} value={o.lookup_code}>{o.lookup_name}</option>)}
                </select>
              </Field>

              <Field label="Required By">
                <input
                  type="date"
                  value={form.required_date}
                  readOnly={readOnly}
                  onChange={e => setField('required_date', e.target.value)}
                  className={inputCls()}
                />
              </Field>
            </div>
          </div>

          {/* ── Weights ── */}
          <div>
            <SectionTitle>Weights (grams)</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field
                label="Gr.Wt"
                hint={WEIGHTS_FROM_BOM.includes(form.itemtype) ? 'From the item’s active BOM' : undefined}
              >
                <input
                  type="number" min="0" step="0.0001"
                  value={form.gross_weight}
                  readOnly={readOnly}
                  onChange={e => setField('gross_weight', e.target.value)}
                  className={inputCls(!!formErr.gross_weight)}
                />
              </Field>

              <Field
                label="Net Wt"
                hint={WEIGHTS_FROM_BOM.includes(form.itemtype) ? 'From the item’s active BOM' : undefined}
              >
                <input
                  type="number" min="0" step="0.0001"
                  value={form.net_weight}
                  readOnly={readOnly}
                  onChange={e => onNetChange(e.target.value)}
                  className={inputCls(!!formErr.net_weight)}
                />
              </Field>

              <Field
                label="Pure Wt"
                hint={form.itemtype === 'METAL' && itemPurity ? `Net Wt × purity (${itemPurity})` : undefined}
              >
                <input
                  type="number" min="0" step="0.0001"
                  value={form.pure_weight}
                  readOnly={readOnly}
                  onChange={e => setField('pure_weight', e.target.value)}
                  className={inputCls(!!formErr.pure_weight)}
                />
              </Field>
            </div>
          </div>

          {/* ── Vendor ── */}
          <div>
            <SectionTitle>Vendor</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Vendor Mapped">
                <label className={`flex items-center gap-2 h-[38px] ${readOnly ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={form.is_vendor_mapped}
                    disabled={readOnly}
                    onChange={e => setField('is_vendor_mapped', e.target.checked)}
                    className="w-4 h-4 accent-[var(--color-primary)]"
                  />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {form.is_vendor_mapped ? 'Yes' : 'No'}
                  </span>
                </label>
              </Field>

              <div className="sm:col-span-2">
                <Field
                  label="Vendor Item No"
                  required={form.is_vendor_mapped}
                  readOnly={readOnly}
                  hint="Filled from the item’s vendor variant code when it has one."
                >
                  <input
                    value={form.vendor_item_no}
                    readOnly={readOnly}
                    onChange={e => setField('vendor_item_no', e.target.value)}
                    className={inputCls(!!formErr.vendor_item_no)}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* ── Originating request ── */}
          <div>
            <SectionTitle>Originating Request</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Request No">
                <input
                  value={form.ref_request_number}
                  readOnly={readOnly}
                  onChange={e => setField('ref_request_number', e.target.value)}
                  placeholder="e.g. SO-000123"
                  className={inputCls()}
                />
              </Field>

              <Field label="Request Source">
                <select
                  value={form.ref_request_source}
                  disabled={readOnly}
                  onChange={e => setField('ref_request_source', e.target.value)}
                  className={inputCls()}
                >
                  <option value="">Select Source</option>
                  {sourceOpts.map(o => <option key={o.lookup_code} value={o.lookup_code}>{o.lookup_name}</option>)}
                </select>
              </Field>

              <Field label="Source Reference">
                <input
                  value={form.ref_source_reference}
                  readOnly={readOnly}
                  onChange={e => setField('ref_source_reference', e.target.value)}
                  placeholder="Line / document reference"
                  className={inputCls()}
                />
              </Field>

              <div className="sm:col-span-3">
                <Field label="Remarks">
                  <textarea
                    value={form.remarks}
                    readOnly={readOnly}
                    onChange={e => setField('remarks', e.target.value)}
                    rows={2}
                    className={`${inputCls()} resize-none`}
                  />
                </Field>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <DeactivateReasonDialog
        isOpen={!!toggleItem?.is_active}
        title="Deactivate Requisition"
        itemLabel={`Requisition "${toggleItem?.requisition_number}" for ${toggleItem?.sku_code}`}
        onConfirm={reason => confirmToggle(reason)}
        onCancel={() => setToggleItem(null)}
      />

      <ConfirmDialog
        isOpen={!!toggleItem && !toggleItem.is_active}
        title="Activate Requisition"
        message={`Activate requisition "${toggleItem?.requisition_number}"?`}
        confirmLabel="Activate"
        variant="info"
        onConfirm={() => confirmToggle()}
        onCancel={() => setToggleItem(null)}
      />
    </div>
  )
}

export default PurchaseRequisitionPage
