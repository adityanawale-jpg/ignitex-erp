import React, { useState, useEffect, useRef, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon, EyeIcon, MagnifyingGlassIcon, XMarkIcon,
  ViewColumnsIcon, ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon,
  FunnelIcon, BarsArrowUpIcon, NoSymbolIcon, CheckCircleIcon,
  ArrowDownTrayIcon, ClockIcon, XCircleIcon, CubeIcon,
} from '@heroicons/react/24/outline'
import Modal                  from '@/components/common/Modal'
import Badge                  from '@/components/common/Badge'
import DeactivateReasonDialog from '@/components/common/DeactivateReasonDialog'
import WorkflowPanel          from '@/components/workflow/WorkflowPanel'
import { formatDate, formatDateTime, exportToCSV, exportToExcel, exportToPDF } from '@/utils/helpers'
import { apiService } from '@/api/apiService'
import { usePermission } from '@/hooks'

// ── Types ─────────────────────────────────────────────────────
interface MetalReceipt {
  id:                    number
  receipt_number:        string | null
  receipt_date:          string
  customer_id:           number
  customer_code:         string | null
  customer_company_name: string | null
  doc_number:            string | null
  shipment_location:     string | null
  item_id:               number | null
  sku_code:              string
  item_description:      string | null
  uid:                   string | null
  purity:                string | null
  received_weight:       string | number
  pure_weight:           string | number | null
  inward_inv_org:        string | null
  inward_sub_inv:        string | null
  remarks:               string | null
  receipt_status:        string
  cancel_reason:         string | null
  cancelled_at:          string | null
  created_at:            string
}

interface LookupOption { lookup_code: string; lookup_name: string }

// One row of the customer picker.
interface CustomerLovOpt { id: number; code: string | null; name: string | null }

// One row of the metal SKU picker. Shared shape with the Purchase Requisition
// LOV; a METAL row only ever fills in code / name / description / purity.
interface ItemLovOpt {
  id:           number
  code:         string
  name:         string
  description:  string | null
  purity:       string | null
}

// One active sub-inventory, as returned by /metal-receipts/inventory-structure.
interface InvStructRow {
  inv_org_code: string
  inv_org_name: string
  sub_inv_code: string
  sub_inv_name: string
}

// ── Form state (controlled local state per project pattern) ────
type ReceiptForm = {
  receipt_date:          string
  customer_id:           string
  customer_code:         string
  customer_company_name: string
  doc_number:            string
  shipment_location:     string
  item_id:               number | null
  sku_code:              string
  item_description:      string
  uid:                   string
  purity:                string
  received_weight:       string
  pure_weight:           string
  inward_inv_org:        string
  inward_sub_inv:        string
  remarks:               string
}

const today = () => new Date().toISOString().slice(0, 10)

const blankForm = (): ReceiptForm => ({
  receipt_date:          today(),
  customer_id:           '',
  customer_code:         '',
  customer_company_name: '',
  doc_number:            '',
  shipment_location:     '',
  item_id:               null,
  sku_code:              '',
  item_description:      '',
  uid:                   '',
  purity:                '',
  received_weight:       '',
  pure_weight:           '',
  inward_inv_org:        '',
  inward_sub_inv:        '',
  remarks:               '',
})

// ── Constants ─────────────────────────────────────────────────
const PAGE_SIZES = [10, 25, 50, 100]
const Req = () => <span className="text-red-500 ml-0.5">*</span>

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'danger' | 'info'> = {
  DRAFT: 'warning', PENDING_APPROVAL: 'info', APPROVED: 'success',
  REJECTED: 'danger', CANCELLED: 'danger',
}

// The status column stores the code; these are the words the screen shows.
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', PENDING_APPROVAL: 'Pending Approval', APPROVED: 'Approved',
  REJECTED: 'Rejected', CANCELLED: 'Cancelled',
}
const statusLabel = (s: string) => STATUS_LABEL[s] ?? (s.charAt(0) + s.slice(1).toLowerCase())

// The work list's tabs. Draft and Approved are the two the business asked for;
// the rest are here because the approval workflow can genuinely park a receipt
// in them, and a tab set that could not show those rows would hide them.
type StatusFilter = 'all' | 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled'

// Mirrors ORDER_EDITABLE on the API: the clerk holds the receipt in these two
// states and nowhere else.
const EDITABLE_STATUSES: readonly string[] = ['DRAFT', 'REJECTED']

// ── Number helpers ────────────────────────────────────────────
const n = (v: unknown): number => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}
const wt = (v: unknown) => n(v).toFixed(4)

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

// Column order follows the screen the business drew, with the auto receipt
// number and the workflow status added on either end.
const INITIAL_COLS: ColDef[] = [
  { key: 'receipt_number',        label: 'Receipt No',      sortKey: 'receipt_number',  visible: true,  minW: '130px' },
  { key: 'customer_company_name', label: 'Customer',                                    visible: true,  minW: '190px' },
  { key: 'doc_number',            label: 'Doc Number',      sortKey: 'doc_number',      visible: true,  minW: '130px' },
  { key: 'shipment_location',     label: 'Shipment Location',                           visible: true,  minW: '180px' },
  { key: 'receipt_date',          label: 'Date',            sortKey: 'receipt_date',    visible: true,  minW: '110px' },
  { key: 'sku_code',              label: 'SKU',             sortKey: 'sku_code',        visible: true,  minW: '160px' },
  { key: 'received_weight',       label: 'Received Wt',     sortKey: 'received_weight', visible: true,  minW: '120px' },
  { key: 'uid',                   label: 'UID',             sortKey: 'uid',             visible: true,  minW: '120px' },
  { key: 'purity',                label: 'Purity',          sortKey: 'purity',          visible: true,  minW: '110px' },
  { key: 'pure_weight',           label: 'Pure Wt',         sortKey: 'pure_weight',     visible: true,  minW: '110px' },
  { key: 'inward_inv_org',        label: 'Inward Inv Org',                              visible: true,  minW: '150px' },
  { key: 'inward_sub_inv',        label: 'Inward Sub Inv',                              visible: true,  minW: '160px' },
  { key: 'item_description',      label: 'Description',                                 visible: false, minW: '200px' },
  { key: 'receipt_status',        label: 'Status',          sortKey: 'receipt_status',  visible: true,  minW: '130px' },
  { key: 'cancel_reason',         label: 'Cancel Reason',                               visible: true,  minW: '170px' },
  { key: 'created_at',            label: 'Created',         sortKey: 'created_at',      visible: false, minW: '150px' },
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
// LovSearch — type-ahead picker, shared by the Customer and SKU fields
// (same shape as Purchase Requisition's ItemSearch)
// ─────────────────────────────────────────────────────────────────
interface LovOption { id: number; code: string | null; name: string | null; sub?: string | null }
interface LovSearchProps {
  value:       string
  placeholder?: string
  disabled?:   boolean
  error?:      boolean
  fetch:       (q: string) => Promise<LovOption[]>
  onSelect:    (opt: LovOption) => void
  onClear:     () => void
}
function LovSearch({ value, placeholder, disabled, error, fetch, onSelect, onClear }: LovSearchProps) {
  const [q,    setQ]    = useState(value)
  const [opts, setOpts] = useState<LovOption[]>([])
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
        placeholder={placeholder ?? 'Type to search, or % to list all…'}
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
              onMouseDown={() => { onSelect(o); setQ(o.code ?? ''); setOpen(false) }}>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-xs" style={{ color: 'var(--accent-gold)' }}>{o.code}</span>
                {o.sub && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[var(--accent-gold)]/30 text-[var(--accent-gold)]">
                    {o.sub}
                  </span>
                )}
              </div>
              {o.name && o.name !== o.code && (
                <div className="truncate text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{o.name}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────
const MetalReceiptPage: React.FC = () => {
  // ── Permissions ──────────────────────────────────────────────
  const { canView, canCreate, canUpdate, canDelete } = usePermission('IM_METAL_RECEIPT')

  // ── Lookups ──────────────────────────────────────────────────
  const [purityOpts, setPurityOpts] = useState<LookupOption[]>([])
  const [invStruct,  setInvStruct]  = useState<InvStructRow[]>([])

  // ── Grid state ───────────────────────────────────────────────
  const [items,        setItems]        = useState<MetalReceipt[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetching,     setFetching]     = useState(false)
  const isFirstLoad                     = useRef(true)
  const [stats,        setStats]        = useState({ draft: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 })
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
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
  const [selectedRows,  setSelectedRows]  = useState<MetalReceipt[]>([])
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
  const [editItem,  setEditItem]  = useState<MetalReceipt | null>(null)
  const [form,      setForm]      = useState<ReceiptForm>(blankForm)
  const [formErr,   setFormErr]   = useState<Record<string, boolean>>({})
  const [saving,    setSaving]    = useState(false)

  const isNew      = formMode === 'add'
  const isViewMode = formMode === 'view'
  const readOnly   = isViewMode

  // ── Row action state ──────────────────────────────────────────
  const [cancelItem, setCancelItem] = useState<MetalReceipt | null>(null)

  // ── Load lookups ──────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [pur, inv] = await Promise.all([
          apiService.get('/common/lookup/PURITY'),
          apiService.get('/metal-receipts/inventory-structure'),
        ])
        setPurityOpts(pur.data?.data ?? [])
        setInvStruct(inv.data?.data ?? [])
      } catch {
        toast.error('Failed to load lookup options')
      }
    }
    load()
  }, [])

  const lookupName = (opts: LookupOption[], code: string | null) =>
    code ? (opts.find(o => o.lookup_code === code)?.lookup_name ?? code) : '—'

  // The two inward selects are dependent: the Sub Inventory list is whatever the
  // chosen Inventory Org actually holds.
  const orgOpts = useMemo(() => {
    const seen = new Map<string, string>()
    for (const r of invStruct) if (!seen.has(r.inv_org_code)) seen.set(r.inv_org_code, r.inv_org_name)
    return [...seen].map(([code, name]) => ({ code, name }))
  }, [invStruct])

  const subInvOpts = useMemo(
    () => invStruct.filter(r => r.inv_org_code === form.inward_inv_org),
    [invStruct, form.inward_inv_org],
  )

  const orgName = (code: string | null) =>
    code ? (orgOpts.find(o => o.code === code)?.name ?? code) : '—'
  const subInvName = (code: string | null) =>
    code ? (invStruct.find(r => r.sub_inv_code === code)?.sub_inv_name ?? code) : '—'

  // ── Data loaders ──────────────────────────────────────────────
  const loadStats = async () => {
    try {
      const res = await apiService.get('/metal-receipts/stats')
      setStats(res.data?.data ?? { draft: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 })
    } catch { /* silent — the grid is the page, the tiles are decoration */ }
  }

  const loadItems = async () => {
    if (isFirstLoad.current) setLoading(true)
    else setFetching(true)
    try {
      const activeCF = Object.fromEntries(Object.entries(debouncedCF).filter(([, v]) => v.trim()))
      const res = await apiService.get('/metal-receipts', {
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
      toast.error(msg || 'Failed to load metal receipts')
    } finally {
      setLoading(false); setFetching(false); isFirstLoad.current = false
    }
  }

  useEffect(() => { loadStats() }, []) // eslint-disable-line
  useEffect(() => { loadItems() }, [page, pageSize, search, sortBy, sortDir, debouncedCF, statusFilter]) // eslint-disable-line

  const reload = () => Promise.all([loadItems(), loadStats()])

  // Re-reads the open receipt after a workflow action so the modal's badge and
  // its footer buttons describe the status the record is actually in.
  const refreshEditItem = async () => {
    if (!editItem) return
    try {
      const res = await apiService.get(`/metal-receipts/${editItem.id}`)
      const row: MetalReceipt | null = res.data?.data ?? null
      if (row) {
        setEditItem(row)
        // An approved receipt is no longer the clerk's to edit, so the form
        // follows the record into read-only rather than offering a Save that
        // the API would refuse.
        if (!EDITABLE_STATUSES.includes(row.receipt_status)) setFormMode('view')
      }
    } catch { /* best-effort — the grid behind the modal is reloaded either way */ }
  }

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
  // Cancel Reason is only ever populated on a cancelled row, so it stays out of
  // the way until that tab is the one showing.
  const gridCols    = statusFilter === 'cancelled' ? cols : cols.filter(c => c.key !== 'cancel_reason')
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
  const toggleSelectRow = (item: MetalReceipt) =>
    setSelectedRows(p => p.some(r => r.id === item.id) ? p.filter(r => r.id !== item.id) : [...p, item])

  // ── Export ────────────────────────────────────────────────────
  const buildExportRows = (rows: MetalReceipt[]) =>
    rows.map(r => ({
      'Receipt No':        r.receipt_number ?? '',
      'Customer':          r.customer_company_name ?? r.customer_code ?? '',
      'Doc Number':        r.doc_number ?? '',
      'Shipment Location': r.shipment_location ?? '',
      'Date':              formatDate(String(r.receipt_date)),
      'SKU':               r.sku_code,
      'Received Wt':       wt(r.received_weight),
      'UID':               r.uid ?? '',
      'Purity':            lookupName(purityOpts, r.purity),
      'Pure Wt':           wt(r.pure_weight),
      'Inward Inv Org':    orgName(r.inward_inv_org),
      'Inward Sub Inv':    subInvName(r.inward_sub_inv),
      'Status':            statusLabel(r.receipt_status),
      ...(statusFilter === 'cancelled' && { 'Cancel Reason': r.cancel_reason ?? '' }),
      'Created':           formatDateTime(String(r.created_at)),
    }))

  const handleExport = async (scope: 'all' | 'selected', format: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false)
    let rows: MetalReceipt[]
    if (scope === 'selected') {
      rows = selectedRows
      if (!rows.length) { toast.error('No rows selected'); return }
    } else {
      setExporting(true)
      try {
        const res = await apiService.get('/metal-receipts', {
          params: { page: 1, limit: 9999, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter },
        })
        rows = res.data?.data ?? []
      } catch { toast.error('Failed to fetch export data'); setExporting(false); return }
      setExporting(false)
    }
    const data  = buildExportRows(rows)
    const fname = `metal_receipt_${statusFilter}`
    if (format === 'csv')        exportToCSV(data, fname)
    else if (format === 'excel') void exportToExcel(data, fname)
    else                         void exportToPDF(data, fname, 'Metal Receipt Report')
  }

  // ── Cell renderer ─────────────────────────────────────────────
  const renderCell = (col: ColDef, row: MetalReceipt) => {
    const muted = { color: 'var(--text-muted)' }
    const dash  = <span style={muted}>—</span>
    switch (col.key) {
      case 'receipt_number':
        return <span className="font-mono text-sm font-semibold" style={{ color: 'var(--accent-gold)' }}>{row.receipt_number ?? '—'}</span>
      case 'customer_company_name':
        return (
          <div className="leading-tight">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {row.customer_company_name ?? '—'}
            </p>
            {row.customer_code && (
              <p className="font-mono text-[11px] mt-0.5" style={muted}>{row.customer_code}</p>
            )}
          </div>
        )
      case 'doc_number':
        return row.doc_number
          ? <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{row.doc_number}</span>
          : dash
      case 'shipment_location':
        return row.shipment_location
          ? <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.shipment_location}</span>
          : dash
      case 'receipt_date':
        return <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(String(row.receipt_date))}</span>
      case 'sku_code':
        return <span className="font-mono text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{row.sku_code}</span>
      case 'item_description':
        return row.item_description
          ? <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.item_description}</span>
          : dash
      case 'received_weight':
        return <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>{wt(row.received_weight)}</span>
      case 'uid':
        return row.uid
          ? <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{row.uid}</span>
          : dash
      case 'purity':
        return row.purity
          ? <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{lookupName(purityOpts, row.purity)}</span>
          : dash
      case 'pure_weight':
        return n(row.pure_weight)
          ? <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>{wt(row.pure_weight)}</span>
          : dash
      case 'inward_inv_org':
        return row.inward_inv_org
          ? <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{orgName(row.inward_inv_org)}</span>
          : dash
      case 'inward_sub_inv':
        return row.inward_sub_inv
          ? <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{subInvName(row.inward_sub_inv)}</span>
          : dash
      case 'receipt_status':
        return <Badge label={statusLabel(row.receipt_status)} variant={STATUS_BADGE[row.receipt_status]} />
      case 'cancel_reason':
        return row.cancel_reason
          ? <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.cancel_reason}</span>
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
  const setField = <K extends keyof ReceiptForm>(key: K, val: ReceiptForm[K]) => {
    setForm(f => ({ ...f, [key]: val }))
    setFormErr(e => (e[key as string] ? { ...e, [key as string]: false } : e))
  }

  // Pure Wt is the fine-metal content of Received Wt. Derived rather than typed
  // when the purity is readable, and left alone otherwise — a purity spelled in
  // a form neither branch of purityFactor() handles must not quietly zero the
  // figure the user entered.
  const applyPure = (receivedValue: string, purity: string) => {
    const f = purityFactor(purity)
    if (f === null) return
    const rec = n(receivedValue)
    setForm(fm => ({ ...fm, pure_weight: rec ? (rec * f).toFixed(4) : '' }))
  }

  const onReceivedChange = (val: string) => {
    setField('received_weight', val)
    applyPure(val, form.purity)
  }
  const onPurityChange = (val: string) => {
    setField('purity', val)
    applyPure(form.received_weight, val)
  }

  // ── LOV fetchers ──────────────────────────────────────────────
  const searchCustomers = async (q: string): Promise<LovOption[]> => {
    try {
      const res = await apiService.get('/metal-receipts/lov/customers', { params: { search: q || '%' } })
      const rows: CustomerLovOpt[] = res.data?.data ?? []
      return rows.map(c => ({ id: c.id, code: c.code, name: c.name }))
    } catch {
      toast.error('Failed to search customers')
      return []
    }
  }

  const searchItems = async (q: string): Promise<LovOption[]> => {
    try {
      const res = await apiService.get('/metal-receipts/lov/items', { params: { search: q || '%' } })
      const rows: ItemLovOpt[] = res.data?.data ?? []
      return rows.map(i => ({ id: i.id, code: i.code, name: i.description ?? i.name, sub: i.purity }))
    } catch {
      toast.error('Failed to search metal items')
      return []
    }
  }

  const onCustomerSelect = (opt: LovOption) => {
    setForm(f => ({
      ...f,
      customer_id:           String(opt.id),
      customer_code:         opt.code ?? '',
      customer_company_name: opt.name ?? '',
    }))
    setFormErr(e => ({ ...e, customer_id: false }))
  }
  const onCustomerClear = () =>
    setForm(f => ({ ...f, customer_id: '', customer_code: '', customer_company_name: '' }))

  const onItemSelect = (opt: LovOption) => {
    // The metal master's purity is the one this SKU is normally received at, so
    // it seeds the field — and Pure Wt with it when a weight is already typed.
    const purity = opt.sub ?? ''
    const factor = purityFactor(purity)
    setForm(f => ({
      ...f,
      item_id:          opt.id,
      sku_code:         opt.code ?? '',
      item_description: opt.name ?? f.item_description,
      purity:           purity || f.purity,
      pure_weight:      factor !== null && n(f.received_weight)
        ? (n(f.received_weight) * factor).toFixed(4)
        : f.pure_weight,
    }))
    setFormErr(e => ({ ...e, sku_code: false }))
  }
  const onItemClear = () =>
    setForm(f => ({ ...f, item_id: null, sku_code: '' }))

  // ── Modal open / close ────────────────────────────────────────
  const openAdd = () => {
    setFormMode('add'); setEditItem(null); setForm(blankForm())
    setFormErr({}); setModalOpen(true)
  }

  const fillFrom = (item: MetalReceipt): ReceiptForm => ({
    receipt_date:          String(item.receipt_date).slice(0, 10),
    customer_id:           String(item.customer_id),
    customer_code:         item.customer_code ?? '',
    customer_company_name: item.customer_company_name ?? '',
    doc_number:            item.doc_number ?? '',
    shipment_location:     item.shipment_location ?? '',
    item_id:               item.item_id,
    sku_code:              item.sku_code,
    item_description:      item.item_description ?? '',
    uid:                   item.uid ?? '',
    purity:                item.purity ?? '',
    received_weight:       n(item.received_weight) ? wt(item.received_weight) : '',
    pure_weight:           n(item.pure_weight)     ? wt(item.pure_weight)     : '',
    inward_inv_org:        item.inward_inv_org ?? '',
    inward_sub_inv:        item.inward_sub_inv ?? '',
    remarks:               item.remarks ?? '',
  })

  const openEdit = (item: MetalReceipt) => {
    setFormMode('edit'); setEditItem(item); setForm(fillFrom(item))
    setFormErr({}); setModalOpen(true)
  }
  const openView = (item: MetalReceipt) => {
    setFormMode('view'); setEditItem(item); setForm(fillFrom(item))
    setFormErr({}); setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setForm(blankForm()); setFormErr({}); setEditItem(null) }

  // ── Save ──────────────────────────────────────────────────────
  const validate = (): string | null => {
    const errs: Record<string, boolean> = {}
    if (!form.customer_id)            errs.customer_id     = true
    if (!form.sku_code.trim())        errs.sku_code        = true
    if (n(form.received_weight) <= 0) errs.received_weight = true
    setFormErr(errs)

    if (errs.customer_id)     return 'Customer is required'
    if (errs.sku_code)        return 'SKU / Metal is required'
    if (errs.received_weight) return 'Received Wt must be greater than 0'

    // The same relationship the server enforces, checked here so the message
    // lands next to the field rather than after a round trip.
    if (n(form.pure_weight) > n(form.received_weight)) {
      setFormErr({ pure_weight: true })
      return 'Pure Wt cannot be greater than Received Wt'
    }
    return null
  }

  const onSubmitForm = async (action: 'draft' | 'submit') => {
    const err = validate()
    if (err) { toast.error(err); return }

    setSaving(true)
    try {
      const payload = {
        action,
        receipt_date:      form.receipt_date,
        customer_id:       Number(form.customer_id),
        doc_number:        form.doc_number || null,
        shipment_location: form.shipment_location || null,
        item_id:           form.item_id,
        sku_code:          form.sku_code,
        item_description:  form.item_description || null,
        uid:               form.uid || null,
        purity:            form.purity || null,
        received_weight:   n(form.received_weight),
        pure_weight:       n(form.pure_weight),
        inward_inv_org:    form.inward_inv_org || null,
        inward_sub_inv:    form.inward_sub_inv || null,
        remarks:           form.remarks || null,
      }
      const res = isNew
        ? await apiService.post('/metal-receipts', payload)
        : await apiService.put(`/metal-receipts/${editItem!.id}`, payload)
      toast.success(res.data?.message || 'Metal receipt saved')
      closeModal()
      await reload()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to save metal receipt')
    } finally { setSaving(false) }
  }

  // ── Cancel ────────────────────────────────────────────────────
  const confirmCancel = async (reason: string) => {
    if (!cancelItem) return
    try {
      const res = await apiService.delete(`/metal-receipts/${cancelItem.id}`, { data: { reason } })
      toast.success(res.data?.message || 'Metal receipt cancelled')
      setCancelItem(null)
      await reload()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to cancel metal receipt')
    }
  }

  // ── Stat cards config ─────────────────────────────────────────
  const statCards: Array<{ key: StatusFilter; label: string; count: number; icon: React.ReactNode; iconBg: string }> = [
    { key: 'all',              label: 'All',              count: stats.draft + stats.pending + stats.approved + stats.rejected + stats.cancelled, icon: <CubeIcon className="w-3.5 h-3.5 text-blue-500" />,        iconBg: 'bg-blue-100'  },
    { key: 'draft',            label: 'Draft',            count: stats.draft,     icon: <PencilIcon className="w-3.5 h-3.5 text-amber-600" />,      iconBg: 'bg-amber-100' },
    { key: 'pending_approval', label: 'Pending Approval', count: stats.pending,   icon: <ClockIcon className="w-3.5 h-3.5 text-blue-600" />,        iconBg: 'bg-blue-100'  },
    { key: 'approved',         label: 'Approved',         count: stats.approved,  icon: <CheckCircleIcon className="w-3.5 h-3.5 text-green-600" />, iconBg: 'bg-green-100' },
    { key: 'rejected',         label: 'Rejected',         count: stats.rejected,  icon: <XCircleIcon className="w-3.5 h-3.5 text-red-600" />,       iconBg: 'bg-red-100'   },
    { key: 'cancelled',        label: 'Cancelled',        count: stats.cancelled, icon: <NoSymbolIcon className="w-3.5 h-3.5 text-red-500" />,      iconBg: 'bg-red-100'   },
  ]

  // ── Field wrappers ────────────────────────────────────────────
  const inputCls = (bad?: boolean) =>
    `form-input ${readOnly ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''} ${bad ? 'border-red-500' : ''}`

  // ── Render ────────────────────────────────────────────────────
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <span>Inventory Management</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>Metal Receipt</span>
      </div>

      {/* Work list + Add */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 pl-1 flex-wrap">
          {statCards.map(s => (
            <button
              key={s.key}
              onClick={() => { setStatusFilter(s.key); setPage(1); setColFilters({}); setSearchInput(''); setSearch('') }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 transition-all w-32 ${
                statusFilter === s.key
                  ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                  : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/50'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>{s.icon}</div>
              <div className="text-left">
                <p className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{s.count}</p>
                <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            </button>
          ))}
        </div>

        {canCreate && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            New Metal Receipt
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
              placeholder="Search receipt no, customer, doc, SKU, UID…"
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
                          style={{ width: col.key === 'receipt_number' ? '120px' : '80px' }} />
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
                      <CubeIcon className="w-10 h-10 opacity-30" />
                      {search || Object.values(colFilters).some(v => v)
                        ? 'No metal receipts match the current filters.'
                        : `No ${statusFilter === 'all' ? '' : statusLabel(statusFilter.toUpperCase()).toLowerCase()} metal receipts found. Click "New Metal Receipt" to book one in.`
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
                            className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500 ${EDITABLE_STATUSES.includes(item.receipt_status) ? '' : 'invisible'}`}
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
                          <button onClick={() => setCancelItem(item)}
                            className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-red-500 ${item.receipt_status === 'CANCELLED' ? 'invisible' : ''}`}
                            title="Cancel">
                            <NoSymbolIcon className="w-4 h-4" />
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
              {total === 0 ? 'No records found' : `Showing ${startRow}–${endRow} of ${total} receipts`}
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
            ? 'New Metal Receipt'
            : `${isViewMode ? 'View' : 'Edit'} Metal Receipt — ${editItem?.receipt_number ?? ''}`
        }
        size="3xl"
        footer={
          isViewMode ? (
            <button onClick={closeModal} className="btn-secondary">Close</button>
          ) : (
            <>
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button onClick={() => onSubmitForm('draft')} disabled={saving} className="btn-secondary">
                Save Draft
              </button>
              <button onClick={() => onSubmitForm('submit')} disabled={saving} className="btn-primary">
                {saving
                  ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />Saving…</>
                  : 'Save & Submit'
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
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Read-only view — no changes can be made.
                {editItem?.receipt_status === 'PENDING_APPROVAL' && ' Receipts awaiting approval cannot be edited.'}
                {editItem?.receipt_status === 'APPROVED' && ' Approved receipts cannot be edited.'}
              </p>
            </div>
          )}

          {!isNew && editItem?.receipt_status === 'CANCELLED' && editItem.cancel_reason && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
              <NoSymbolIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-semibold text-red-500">Cancelled — </span>{editItem.cancel_reason}
              </p>
            </div>
          )}

          {/* ── Approval workflow ── */}
          {/* Only on a saved receipt: the panel acts on a record id, and a brand
              new row has nothing to submit yet. */}
          {editItem && (
            <WorkflowPanel
              recordType="METAL_RECEIPT"
              recordId={editItem.id}
              compact
              onActionComplete={async () => { await reload(); await refreshEditItem() }}
            />
          )}

          {/* ── Receipt ── */}
          <div>
            <SectionTitle>Receipt</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field
                label="Receipt Number"
                hint={isNew ? 'Assigned by the system when the receipt is saved.' : undefined}
              >
                <input
                  value={editItem?.receipt_number ?? ''}
                  readOnly
                  placeholder="MR-000000 (auto)"
                  className="form-input font-mono font-semibold cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]"
                  style={{ color: 'var(--accent-gold)' }}
                />
              </Field>

              <Field label="Date" required readOnly={readOnly}>
                <input
                  type="date"
                  value={form.receipt_date}
                  readOnly={readOnly}
                  onChange={e => setField('receipt_date', e.target.value)}
                  className={inputCls()}
                />
              </Field>

              <Field label="Status">
                <div className="flex items-center h-[38px]">
                  <Badge
                    label={statusLabel(editItem?.receipt_status ?? 'DRAFT')}
                    variant={STATUS_BADGE[editItem?.receipt_status ?? 'DRAFT']}
                  />
                </div>
              </Field>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Customer{!readOnly && <Req />}
                </label>
                <LovSearch
                  value={form.customer_code}
                  placeholder="Type a customer code or name, or % to list all…"
                  disabled={readOnly}
                  error={!!formErr.customer_id}
                  fetch={searchCustomers}
                  onSelect={onCustomerSelect}
                  onClear={onCustomerClear}
                />
                {form.customer_company_name && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{form.customer_company_name}</p>
                )}
              </div>

              <Field label="Doc Number" hint="The customer's own document number for this shipment.">
                <input
                  value={form.doc_number}
                  readOnly={readOnly}
                  onChange={e => setField('doc_number', e.target.value)}
                  className={inputCls()}
                />
              </Field>

              <div className="sm:col-span-3">
                <Field label="Shipment Location">
                  <input
                    value={form.shipment_location}
                    readOnly={readOnly}
                    onChange={e => setField('shipment_location', e.target.value)}
                    placeholder="Where the metal was shipped from…"
                    className={inputCls()}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* ── Metal ── */}
          <div>
            <SectionTitle>Metal</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  SKU{!readOnly && <Req />}
                </label>
                <LovSearch
                  value={form.sku_code}
                  disabled={readOnly}
                  error={!!formErr.sku_code}
                  fetch={searchItems}
                  onSelect={onItemSelect}
                  onClear={onItemClear}
                />
              </div>

              <Field label="UID" hint="Lot / bar / tag identifier.">
                <input
                  value={form.uid}
                  readOnly={readOnly}
                  onChange={e => setField('uid', e.target.value)}
                  className={`${inputCls()} font-mono`}
                />
              </Field>

              <div className="sm:col-span-3">
                <Field label="Description">
                  <input
                    value={form.item_description}
                    readOnly={readOnly}
                    onChange={e => setField('item_description', e.target.value)}
                    placeholder="Filled from the metal master; edit if this lot needs a different note"
                    className={inputCls()}
                  />
                </Field>
              </div>

              <Field label="Received Wt" required readOnly={readOnly} hint="Grams, as weighed in.">
                <input
                  type="number" min="0" step="0.0001"
                  value={form.received_weight}
                  readOnly={readOnly}
                  onChange={e => onReceivedChange(e.target.value)}
                  className={inputCls(!!formErr.received_weight)}
                />
              </Field>

              <Field label="Purity">
                <select
                  value={form.purity}
                  disabled={readOnly}
                  onChange={e => onPurityChange(e.target.value)}
                  className={inputCls()}
                >
                  <option value="">Select Purity</option>
                  {purityOpts.map(o => <option key={o.lookup_code} value={o.lookup_code}>{o.lookup_name}</option>)}
                </select>
              </Field>

              <Field
                label="Pure Wt"
                hint={purityFactor(form.purity) !== null ? `Received Wt × purity (${form.purity})` : 'Enter the assayed fine weight.'}
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

          {/* ── Inward ── */}
          <div>
            <SectionTitle>Inward</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Inward Inv Org">
                <select
                  value={form.inward_inv_org}
                  disabled={readOnly}
                  // The sub-inventory belongs to the old org, so it goes with it —
                  // keeping it would store a pairing that does not exist.
                  onChange={e => setForm(f => ({ ...f, inward_inv_org: e.target.value, inward_sub_inv: '' }))}
                  className={inputCls()}
                >
                  <option value="">Select Inventory Org</option>
                  {orgOpts.map(o => <option key={o.code} value={o.code}>{o.name}</option>)}
                </select>
              </Field>

              <div className="sm:col-span-2">
                <Field
                  label="Inward Sub Inv"
                  hint={!form.inward_inv_org ? 'Pick an Inventory Org first.' : undefined}
                >
                  <select
                    value={form.inward_sub_inv}
                    disabled={readOnly || !form.inward_inv_org}
                    onChange={e => setField('inward_sub_inv', e.target.value)}
                    className={inputCls()}
                  >
                    <option value="">Select Sub Inventory</option>
                    {subInvOpts.map(o => (
                      <option key={o.sub_inv_code} value={o.sub_inv_code}>{o.sub_inv_name}</option>
                    ))}
                  </select>
                </Field>
              </div>

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
        isOpen={!!cancelItem}
        title="Cancel Metal Receipt"
        itemLabel={`Receipt "${cancelItem?.receipt_number}" for ${cancelItem?.sku_code}`}
        onConfirm={confirmCancel}
        onCancel={() => setCancelItem(null)}
      />
    </div>
  )
}

export default MetalReceiptPage
