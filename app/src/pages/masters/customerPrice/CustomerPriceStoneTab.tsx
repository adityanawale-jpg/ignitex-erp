import React, { useState, useEffect, useRef, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon, EyeIcon, MagnifyingGlassIcon, XMarkIcon,
  ViewColumnsIcon, ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon,
  FunnelIcon, BarsArrowUpIcon, NoSymbolIcon, CheckCircleIcon,
  ArrowDownTrayIcon, ArrowUpTrayIcon, SparklesIcon, ArrowLeftIcon, TrashIcon,
} from '@heroicons/react/24/outline'
import Modal                  from '@/components/common/Modal'
import Badge                  from '@/components/common/Badge'
import ConfirmDialog          from '@/components/common/ConfirmDialog'
import DeactivateReasonDialog from '@/components/common/DeactivateReasonDialog'
import { formatDate, formatDateTime, exportToCSV, exportToExcel, exportToPDF } from '@/utils/helpers'
import { apiService } from '@/api/apiService'
import { usePermission } from '@/hooks'

// ── Types ─────────────────────────────────────────────────────
// A price sheet is a customer header with many stone price lines. The grid
// lists the headers; the full-page form edits one header and its whole line set.
interface CustomerPriceStone {
  id:                     number
  customer_id:            number
  customer_code:          string
  customer_company_name:  string
  remarks:                string | null
  line_count:             number
  is_active:              boolean
  deactivation_reason:    string | null
  deactivated_at:         string | null
  created_at:             string
}

interface StoneLine {
  id?:         number
  line_no?:    number
  stone_name:  string
  stone_code:  string
  rate_basis:  'PER_GM' | 'PER_PC'
  rate_type:   'AMOUNT' | 'PERCENTAGE'
  rate_value:  number | string
  uom:         string
  remarks:     string | null
}

interface LookupOption { lookup_code: string; lookup_name: string }
interface LovOpt { id: number; code: string; name: string; [key: string]: unknown }

// ── Form state (controlled local state per project pattern) ────
type HeaderForm = {
  customer_id:           string
  customer_code:         string
  customer_company_name: string
  remarks:               string
}

type LineForm = {
  stone_name:   string
  stone_code:   string
  applyAllCode: boolean
  rate_basis:   'PER_GM' | 'PER_PC'
  rate_type:    'AMOUNT' | 'PERCENTAGE'
  rate_value:   string
  uom:          string
  remarks:      string
}

const blankHeader: HeaderForm = {
  customer_id: '', customer_code: '', customer_company_name: '', remarks: '',
}

const blankLine: LineForm = {
  stone_name: '', stone_code: '', applyAllCode: false,
  rate_basis: 'PER_GM', rate_type: 'AMOUNT', rate_value: '',
  uom: 'CT', remarks: '',
}

// Price line grid columns; `req` marks exactly what validate() enforces.
const LINE_COLS: { label: string; req?: boolean }[] = [
  { label: '#' },
  { label: 'Stone Name', req: true },
  { label: 'Stone Code', req: true },
  { label: 'Rate Basis' },
  { label: 'Rate Type' },
  { label: 'Rate' },
  { label: 'UOM' },
  { label: 'Remarks' },
  { label: '' },
]

// Line input styling, shared by the plain cells and the picker
const lineInputCls = 'w-full text-xs px-2 py-1.5 border border-[var(--border-color)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-gold)] disabled:opacity-60'
const lineInputStyle: React.CSSProperties = { background: 'var(--bg-primary)', color: 'var(--text-primary)' }

// UOM_RC lookup: PCS is only valid for Per Pc prices; GM/CT for Per Weight.
const uomOptsForBasis = (opts: LookupOption[], basis: 'PER_GM' | 'PER_PC') =>
  opts.filter(o => basis === 'PER_PC' ? o.lookup_code === 'PCS' : o.lookup_code !== 'PCS')

// ── Constants ─────────────────────────────────────────────────
const PAGE_SIZES = [10, 25, 50, 100]
const Req = () => <span className="text-red-500 ml-0.5">*</span>

interface ColDef { key: string; label: string; sortKey?: string; visible: boolean; minW?: string }

const INITIAL_COLS: ColDef[] = [
  { key: 'customer_company_name', label: 'Customer',      sortKey: 'customer_company_name', visible: true,  minW: '200px' },
  { key: 'customer_code',         label: 'Customer Code', sortKey: 'customer_code',         visible: true,  minW: '130px' },
  { key: 'line_count',            label: 'Price Lines',                                       visible: true,  minW: '110px' },
  { key: 'remarks',               label: 'Remarks',                                           visible: false, minW: '180px' },
  { key: 'is_active',             label: 'Status',                                          visible: true,  minW: '90px'  },
  { key: 'deactivation_reason',   label: 'Deactive Reason',                                 visible: true,  minW: '160px' },
  { key: 'deactivated_at',        label: 'Deactive Date',                                   visible: true,  minW: '120px' },
  { key: 'created_at',            label: 'Created',     sortKey: 'created_at',             visible: false, minW: '140px' },
]

// ── CSV import helpers (no deps, mirrors Supplier Rate Contract) ─
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
  const headers = ['customer_code', 'stone_name', 'stone_code', 'rate_basis', 'rate_type', 'rate_value', 'uom', 'remarks']
  const example  = ['CUST-000001', 'DIAMOND', 'ALL', 'PER_GM', 'AMOUNT', '1250.00', 'CT', '']
  const csv = [headers.join(','), example.join(',')].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'customer_price_stone_import_template.csv'
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────────────
// LovSearch — type-ahead item picker (shared shape with Supplier Rate Contract)
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
  // display is typed string but arrives from API rows — coalesce so a missing
  // field can't throw on q.length and take the whole modal down with it.
  const [q,    setQ]    = useState(display ?? '')
  const [opts, setOpts] = useState<LovOpt[]>([])
  const [open, setOpen] = useState(false)
  const inputRef        = useRef<HTMLInputElement>(null)
  useEffect(() => setQ(display ?? ''), [display])
  const doSearch = async (val: string) => {
    setQ(val)
    const q2 = (val === '%') ? '' : val
    if (val.length < 1) { setOpts([]); setOpen(false); return }
    try { const r = await fetch(q2); setOpts(r); setOpen(true) } catch { /* */ }
  }
  // Clears both the typed text and the selected value, then refocuses for retyping
  const handleClear = () => {
    setQ(''); setOpts([]); setOpen(false)
    onClear?.()
    inputRef.current?.focus()
  }
  const showClear = !!onClear && !disabled && q.length > 0
  return (
    <div>
      <div className="relative">
        <input ref={inputRef} value={q} onChange={e => doSearch(e.target.value)}
          onFocus={() => { if (q.length >= 1 && opts.length) setOpen(true) }}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder={placeholder} disabled={disabled}
          className={`w-full text-sm pl-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] disabled:opacity-50 ${showClear ? 'pr-9' : 'pr-3'}`}
          style={{
            borderColor: error ? '#ef4444' : 'var(--border-color)',
            background: 'var(--bg-primary)', color: 'var(--text-primary)',
            boxShadow: error ? '0 0 0 1px #ef4444' : undefined,
          }} />
        {showClear && (
          // onMouseDown + preventDefault so the input's blur-close doesn't swallow the click
          <button type="button" title="Clear"
            onMouseDown={e => { e.preventDefault(); handleClear() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--bg-secondary)]"
            style={{ color: 'var(--text-muted)' }}>
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


// ─────────────────────────────────────────────────────────────────
// LineLovSearch — the same type-ahead sized for a grid cell.
//
// The line grid scrolls horizontally, and an overflow-x container clips
// absolutely-positioned children vertically too, so the dropdown is rendered
// fixed and anchored to the input's measured rect instead.
// ─────────────────────────────────────────────────────────────────
interface LineLovSearchProps {
  value:       string
  placeholder: string
  disabled?:   boolean
  fetch:       (q: string) => Promise<LovOpt[]>
  onSelect:    (code: string, opt: LovOpt) => void
  onClear:     () => void
}
function LineLovSearch({ value, placeholder, disabled, fetch, onSelect, onClear }: LineLovSearchProps) {
  const [q,    setQ]    = useState(value ?? '')
  const [opts, setOpts] = useState<LovOpt[]>([])
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setQ(value ?? ''), [value])

  const measure = () => {
    const r = inputRef.current?.getBoundingClientRect()
    if (r) setRect({ top: r.bottom + 2, left: r.left, width: Math.max(r.width, 260) })
  }

  // Keep the panel glued to the input while the table or page scrolls
  useEffect(() => {
    if (!open) return
    const h = () => measure()
    window.addEventListener('scroll', h, true)
    window.addEventListener('resize', h)
    return () => { window.removeEventListener('scroll', h, true); window.removeEventListener('resize', h) }
  }, [open])

  const doSearch = async (val: string) => {
    setQ(val)
    if (val.length < 1) { setOpts([]); setOpen(false); return }
    try {
      const r = await fetch(val === '%' ? '' : val)
      setOpts(r); measure(); setOpen(true)
    } catch { /* keep typing usable if the lookup fails */ }
  }

  const handleClear = () => {
    setQ(''); setOpts([]); setOpen(false); onClear()
    inputRef.current?.focus()
  }
  const showClear = !!q && !disabled

  return (
    <>
      <div className="relative">
        <input
          ref={inputRef}
          value={q}
          onChange={e => doSearch(e.target.value)}
          onFocus={() => { if (!disabled && q.length >= 1 && opts.length) { measure(); setOpen(true) } }}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          disabled={disabled}
          placeholder={placeholder}
          className={`${lineInputCls} ${showClear ? 'pr-7' : ''}`}
          style={lineInputStyle}
        />
        {showClear && (
          // onMouseDown so the input's blur-close does not swallow the click
          <button type="button" title="Clear"
            onMouseDown={e => { e.preventDefault(); handleClear() }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && opts.length > 0 && rect && (
        <div
          className="border shadow-lg rounded-lg max-h-56 overflow-y-auto text-xs"
          style={{
            position: 'fixed', top: rect.top, left: rect.left, width: rect.width, zIndex: 60,
            borderColor: 'var(--border-color)', background: 'var(--bg-primary)',
          }}
        >
          {opts.map(o => (
            <div key={o.id}
              className="px-3 py-2 cursor-pointer hover:bg-[var(--bg-secondary)]"
              onMouseDown={() => { onSelect(o.code, o); setQ(o.code); setOpen(false) }}>
              <span className="font-mono font-semibold" style={{ color: 'var(--accent-gold)' }}>{o.code}</span>
              {o.name !== o.code && (
                <div className="truncate" style={{ color: 'var(--text-muted)' }}>{o.name}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Component ─────────────────────────────────────────────────
// `onFormOpen` lets the parent drop its tab bar while the full-page entry form
// is showing, so the form owns the whole screen the way FG BOM Master's does.
interface TabProps { onFormOpen?: (open: boolean) => void }

const CustomerPriceStoneTab: React.FC<TabProps> = ({ onFormOpen }) => {
  // ── LOV state ───────────────────────────────────────────────
  const [stoneNameOpts, setStoneNameOpts] = useState<LookupOption[]>([])
  const [uomOpts,       setUomOpts]       = useState<LookupOption[]>([])

  useEffect(() => {
    apiService.get('/common/lookup/STONE_TYPE')
      .then(r => setStoneNameOpts(r.data?.data ?? []))
      .catch(() => toast.error('Failed to load stone types'))
    apiService.get('/common/lookup/UOM_RC')
      .then(r => setUomOpts(r.data?.data ?? []))
      .catch(() => toast.error('Failed to load UOM options'))
  }, [])

  // ── Grid state ──────────────────────────────────────────────
  const [items,        setItems]        = useState<CustomerPriceStone[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetching,     setFetching]     = useState(false)
  const isFirstLoad                     = useRef(true)
  const [stats,        setStats]        = useState({ active: 0, inactive: 0 })
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active')
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(25)
  const [searchInput,  setSearchInput]  = useState('')
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState('customer_company_name')
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
  const [selectedRows,      setSelectedRows]      = useState<CustomerPriceStone[]>([])
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
  const { canView, canCreate, canUpdate, canDelete } = usePermission('MM_CUST_PRICE')

  // ── Form view / confirm state ────────────────────────────────
  // The entry form is a full page rather than a popup (same shape as FG BOM
  // Master); the parent hides the tab bar while it is open.
  const [view,        setView]        = useState<'list' | 'form'>('list')
  const [formMode,    setFormMode]    = useState<'add' | 'edit' | 'view'>('add')
  const [editItem,    setEditItem]    = useState<CustomerPriceStone | null>(null)
  const [toggleItem,  setToggleItem]  = useState<CustomerPriceStone | null>(null)
  const [saving,      setSaving]      = useState(false)
  const isNew      = formMode === 'add'
  const isViewMode = formMode === 'view'

  // ── Form (controlled local state per project pattern) ────────
  const [header,      setHeader]      = useState<HeaderForm>(blankHeader)
  const [lines,       setLines]       = useState<LineForm[]>([])
  const [formErrors,  setFormErrors]  = useState<Partial<Record<keyof HeaderForm, string>>>({})

  const setField = (key: keyof HeaderForm, val: string) => {
    setHeader(f => ({ ...f, [key]: val }))
    if (formErrors[key]) setFormErrors(e => ({ ...e, [key]: undefined }))
  }

  const setLineField = (idx: number, key: keyof LineForm, val: string | boolean) => {
    setLines(ls => ls.map((l, i) => i === idx ? { ...l, [key]: val } : l))
  }

  // The customer is what the lines hang off, so it has to be picked before any
  // line can be added.
  const validateHeader = (): boolean => {
    const errs: Partial<Record<keyof HeaderForm, string>> = {}
    if (!header.customer_id) errs.customer_id = 'Customer is required'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const addLine = () => {
    if (!validateHeader()) { toast.error('Select the Customer above before adding a price line'); return }
    setLines(ls => [...ls, { ...blankLine }])
  }
  const removeLine = (idx: number) => setLines(ls => ls.filter((_, i) => i !== idx))

  // A row the user has actually started filling in — blank spares are dropped
  // by both validation and the payload.
  const isRealLine = (l: LineForm) => !!(l.stone_name || l.stone_code || l.rate_value)

  const validate = (): boolean => {
    if (!validateHeader()) return false

    if (lines.filter(isRealLine).length === 0) { toast.error('Add at least one price line'); return false }

    const seen = new Set<string>()
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      if (!isRealLine(l)) continue
      if (!l.stone_name) { toast.error(`Line ${i + 1}: Stone Name is required`); return false }
      if (!l.applyAllCode && !l.stone_code) { toast.error(`Line ${i + 1}: Stone Code is required`); return false }

      const key = `${l.stone_name}|${l.stone_code || 'ALL'}`
      if (seen.has(key)) { toast.error(`Line ${i + 1}: ${l.stone_code || 'ALL'} is already priced on another line`); return false }
      seen.add(key)

      if (l.rate_value !== '' && Number(l.rate_value) < 0) { toast.error(`Line ${i + 1}: Rate cannot be negative`); return false }
    }
    return true
  }

  // ── Customer LOV (searches /customers) ─────────────────────────
  const searchCustomer = async (q: string): Promise<LovOpt[]> => {
    const r = await apiService.get('/customers', { params: { page: 1, limit: 20, status: 'active', search: q } })
    const rows: { id: number; customer_code: string; customer_company_name: string }[] = r.data?.data ?? []
    return rows.map(v => ({ id: v.id, code: v.customer_code, name: v.customer_company_name }))
  }
  const handleCustomerSelect = (id: number, code: string, name: string) => {
    setHeader(f => ({ ...f, customer_id: String(id), customer_code: code, customer_company_name: name }))
    if (formErrors.customer_id) setFormErrors(e => ({ ...e, customer_id: undefined }))
  }

  const handleCustomerClear = () =>
    setHeader(f => ({ ...f, customer_id: '', customer_code: '', customer_company_name: '' }))

  // ── Stone Code LOV — reuses /fg-bom/lov/stones, filtered client-side by stone_name ─
  const searchStoneCode = async (q: string, stoneName: string): Promise<LovOpt[]> => {
    if (!stoneName) return []
    const r = await apiService.get('/fg-bom/lov/stones', { params: { search: q } })
    const rows: (LovOpt & { stn_type?: string })[] = r.data?.data ?? []
    return rows.filter(row => (row.stn_type || '').toUpperCase() === stoneName.toUpperCase())
  }

  // Changing Stone Name invalidates the code picked under the previous one.
  const handleStoneNameChange = (idx: number, newName: string) => {
    setLines(ls => ls.map((l, i) => i === idx
      ? { ...l, stone_name: newName, stone_code: l.applyAllCode ? 'ALL' : '' }
      : l))
  }

  const handleStoneCodeSelect = (idx: number, code: string) => setLineField(idx, 'stone_code', code)
  const handleStoneCodeClear  = (idx: number) => setLineField(idx, 'stone_code', '')

  // Per Pc is PCS-only and Per Weight is GM/CT only, so the line's UOM is
  // reconciled whenever its Rate Basis flips.
  const handleRateBasisChange = (idx: number, val: 'PER_GM' | 'PER_PC') => {
    setLines(ls => ls.map((l, i) => i === idx
      ? { ...l, rate_basis: val, uom: val === 'PER_PC' ? 'PCS' : (l.uom === 'PCS' ? 'CT' : l.uom) }
      : l))
  }

  const handleApplyAllCodeToggle = (idx: number, checked: boolean) => {
    setLines(ls => ls.map((l, i) => i === idx
      ? { ...l, applyAllCode: checked, stone_code: checked ? 'ALL' : '' }
      : l))
  }


  // ── Data loaders ─────────────────────────────────────────────
  const loadStats = async () => {
    try {
      const res = await apiService.get('/customer-price/stone/stats')
      setStats(res.data?.data ?? { active: 0, inactive: 0 })
    } catch { /* silent */ }
  }

  const loadItems = async () => {
    if (isFirstLoad.current) setLoading(true)
    else setFetching(true)
    try {
      const activeCF = Object.fromEntries(Object.entries(debouncedCF).filter(([, v]) => v.trim()))
      const res = await apiService.get('/customer-price/stone', {
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
      toast.error(msg || 'Failed to load customer price (stone) records')
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
  const toggleSelectRow = (item: CustomerPriceStone) =>
    setSelectedRows(prev =>
      prev.some(r => r.id === item.id)
        ? prev.filter(r => r.id !== item.id)
        : [...prev, item]
    )

  // ── Export ────────────────────────────────────────────────────
  const buildExportRows = (rows: CustomerPriceStone[]) =>
    rows.map(r => ({
      'Customer':      r.customer_company_name,
      'Customer Code': r.customer_code,
      'Price Lines':   r.line_count,
      'Remarks':       r.remarks ?? '',
      'Status':        r.is_active ? 'Active' : 'Inactive',
      ...(statusFilter === 'inactive' && {
        'Deactive Reason': r.deactivation_reason || '',
        'Deactive Date': r.deactivated_at ? formatDate(String(r.deactivated_at)) : '',
      }),
      'Created':     formatDateTime(String(r.created_at)),
    }))

  const handleExport = async (scope: 'all' | 'selected', format: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false)
    let rows: CustomerPriceStone[]
    if (scope === 'selected') {
      rows = selectedRows
      if (!rows.length) { toast.error('No rows selected'); return }
    } else {
      setExporting(true)
      try {
        const res = await apiService.get('/customer-price/stone', {
          params: { page: 1, limit: 9999, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter },
        })
        rows = res.data?.data ?? []
      } catch { toast.error('Failed to fetch export data'); setExporting(false); return }
      setExporting(false)
    }
    const data  = buildExportRows(rows)
    const fname = `customer_price_stone_${statusFilter}`
    if (format === 'csv')   exportToCSV(data, fname)
    else if (format === 'excel') void exportToExcel(data, fname)
    else void exportToPDF(data, fname, 'Customer Price Master (Stone) Report')
  }

  // ── Cell renderer ─────────────────────────────────────────────
  const renderCell = (col: ColDef, row: CustomerPriceStone) => {
    switch (col.key) {
      case 'customer_company_name':
        return (
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.customer_company_name}</p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{row.customer_code}</p>
          </div>
        )
      case 'customer_code':
        return <span className="font-mono text-sm">{row.customer_code}</span>
      case 'line_count':
        return (
          <span className="text-xs font-semibold px-2 py-0.5 rounded border border-[var(--border-color)]" style={{ color: 'var(--text-secondary)' }}>
            {row.line_count} {row.line_count === 1 ? 'line' : 'lines'}
          </span>
        )
      case 'remarks':
        return row.remarks
          ? <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.remarks}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>
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

  // ── Form helpers ──────────────────────────────────────────────
  const openAdd = () => {
    setFormMode('add')
    setEditItem(null)
    setHeader(blankHeader)
    setLines([])
    setFormErrors({})
    setView('form')
  }

  // A saved sheet's lines live one fetch away, so opening it loads the header
  // row's detail rather than reusing the grid row.
  const openSheet = async (item: CustomerPriceStone, mode: 'edit' | 'view') => {
    try {
      const res = await apiService.get(`/customer-price/stone/${item.id}`)
      const d = res.data?.data
      if (!d) { toast.error('Failed to load price sheet'); return }
      setFormMode(mode)
      setEditItem(item)
      setHeader({
        customer_id:           String(d.customer_id ?? ''),
        customer_code:         d.customer_code ?? '',
        customer_company_name: d.customer_company_name ?? '',
        remarks:               d.remarks ?? '',
      })
      const dl: StoneLine[] = d.lines ?? []
      setLines(dl.map(l => ({
        stone_name:   l.stone_name ?? '',
        stone_code:   l.stone_code ?? '',
        applyAllCode: l.stone_code === 'ALL',
        rate_basis:   l.rate_basis ?? 'PER_GM',
        rate_type:    l.rate_type ?? 'AMOUNT',
        rate_value:   String(l.rate_value ?? ''),
        uom:          l.uom ?? 'CT',
        remarks:      l.remarks ?? '',
      })))
      setFormErrors({})
      setView('form')
    } catch {
      toast.error('Failed to load price sheet')
    }
  }

  const openEdit = (item: CustomerPriceStone) => { void openSheet(item, 'edit') }
  const openView = (item: CustomerPriceStone) => { void openSheet(item, 'view') }

  const backToList = () => { setView('list'); setHeader(blankHeader); setLines([]); setFormErrors({}) }

  useEffect(() => { onFormOpen?.(view === 'form') }, [view, onFormOpen])
  // Leaving the tab entirely (parent switches tabs / unmounts) must not leave
  // the tab bar hidden.
  useEffect(() => () => onFormOpen?.(false), [onFormOpen])

  const onSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        customer_id: Number(header.customer_id),
        remarks:     header.remarks.trim() || null,
        lines: lines.filter(isRealLine).map(l => ({
          stone_name: l.stone_name,
          stone_code: l.stone_code || 'ALL',
          rate_basis: l.rate_basis,
          rate_type:  l.rate_type,
          rate_value: l.rate_value !== '' ? Number(l.rate_value) : 0,
          uom:        l.uom,
          remarks:    l.remarks.trim() || null,
        })),
      }
      if (isNew) {
        await apiService.post('/customer-price/stone', payload)
        toast.success('Customer price (stone) created successfully')
      } else {
        await apiService.put(`/customer-price/stone/${editItem!.id}`, payload)
        toast.success('Customer price (stone) updated successfully')
      }
      backToList()
      await Promise.all([loadItems(), loadStats()])

    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  const confirmToggle = async (reason?: string) => {
    if (!toggleItem) return
    try {
      const res = await apiService.delete(`/customer-price/stone/${toggleItem.id}`, reason ? { data: { reason } } : undefined)
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
      const res = await apiService.post('/customer-price/stone/import', { rows })
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

  // ── Full-page entry form (same shape as FG BOM Master) ───────
  if (view === 'form') {
    return (
      <div className="space-y-5">

        {/* Breadcrumb + back */}
        <div className="flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div className="flex items-center gap-2">
            <span>Masters</span>
            <span>/</span>
            <button onClick={backToList} className="hover:text-[var(--accent-gold)] flex items-center gap-1">
              <ArrowLeftIcon className="w-3.5 h-3.5" /> Customer Price Master
            </button>
            <span>/</span>
            <span style={{ color: 'var(--accent-gold)' }}>
              {isNew ? 'New Stone Price' : editItem?.customer_company_name}
            </span>
          </div>
          <button onClick={backToList} className="btn-secondary text-xs py-1 px-3">Back to List</button>
        </div>

        {/* Title row */}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {isNew
              ? 'Add Stone Price'
              : `${isViewMode ? 'View' : 'Edit'} Stone Price — ${editItem?.customer_company_name ?? ''}`}
          </h1>
          {isViewMode && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]" style={{ color: 'var(--text-muted)' }}>
              <EyeIcon className="w-3.5 h-3.5" />
              Read-only view — no changes can be made.
            </span>
          )}
        </div>

        {/* Customer — the sheet's base record */}
        <div className="card p-5">
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--accent-gold)' }}>Customer</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Customer<Req />
              </label>
              {isViewMode ? (
                <div className="form-input cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]" style={{ minHeight: '38px' }}>
                  {header.customer_company_name || header.customer_code || '—'}
                </div>
              ) : (
                <LovSearch
                  display={header.customer_code}
                  placeholder="Search customer by code or name…"
                  fetch={searchCustomer}
                  onSelect={handleCustomerSelect}
                  onClear={handleCustomerClear}
                  error={!!formErrors.customer_id}
                  hint="Type % to show all customers — one price sheet per customer"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Remarks
              </label>
              <input
                value={header.remarks}
                onChange={e => setField('remarks', e.target.value)}
                readOnly={isViewMode}
                maxLength={500}
                className={`form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
                placeholder="Optional notes for this sheet…"
              />
            </div>
          </div>
        </div>

        {/* Price lines */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold" style={{ color: 'var(--accent-gold)' }}>Price Lines</h3>
            {!isViewMode && (
              <button type="button" onClick={addLine} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
                <PlusIcon className="w-3.5 h-3.5" /> Add Line
              </button>
            )}
          </div>

          {lines.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center text-xs"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
              {isViewMode
                ? 'This price sheet has no lines.'
                : 'No price lines yet — pick the Customer above, then click "Add Line".'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
              <table className="w-full text-xs">
                <thead className="bg-[var(--bg-secondary)]">
                  <tr>
                    {LINE_COLS.map((c, i) => (
                      <th key={i} className="px-2 py-2 text-left font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        {c.label}{c.req && <Req />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={idx} className="border-t border-[var(--border-color)]">
                      <td className="px-2 py-1.5 text-center font-mono" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>

                      <td className="px-1 py-1.5" style={{ minWidth: '140px' }}>
                        <select value={l.stone_name} onChange={e => handleStoneNameChange(idx, e.target.value)}
                          disabled={isViewMode} className={lineInputCls} style={lineInputStyle}>
                          <option value="">Select…</option>
                          {stoneNameOpts.map(o => (
                            <option key={o.lookup_code} value={o.lookup_code}>{o.lookup_name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Stone code picker, or the ALL marker when this line
                          prices every code of its stone */}
                      <td className="px-1 py-1.5" style={{ minWidth: '190px' }}>
                        {l.applyAllCode ? (
                          <div className={`${lineInputCls} flex items-center bg-[var(--bg-tertiary)]`} style={{ color: 'var(--text-secondary)' }}>
                            ALL — every code of this stone
                          </div>
                        ) : (
                          <LineLovSearch
                            value={l.stone_code}
                            placeholder={l.stone_name ? 'Type or % for all…' : 'Select Stone Name first'}
                            disabled={isViewMode || !l.stone_name}
                            fetch={q => searchStoneCode(q, l.stone_name)}
                            onSelect={code => handleStoneCodeSelect(idx, code)}
                            onClear={() => handleStoneCodeClear(idx)}
                          />
                        )}
                        {!isViewMode && (
                          <label className="flex items-center gap-1 mt-1 text-[10px] cursor-pointer select-none" style={{ color: 'var(--text-muted)' }}>
                            <input type="checkbox" checked={l.applyAllCode}
                              onChange={e => handleApplyAllCodeToggle(idx, e.target.checked)}
                              disabled={!l.stone_name}
                              className="w-3 h-3 accent-[var(--color-primary)]" />
                            Apply to all codes
                          </label>
                        )}
                      </td>

                      <td className="px-1 py-1.5" style={{ minWidth: '110px' }}>
                        <select value={l.rate_basis}
                          onChange={e => handleRateBasisChange(idx, e.target.value as 'PER_GM' | 'PER_PC')}
                          disabled={isViewMode} className={lineInputCls} style={lineInputStyle}>
                          <option value="PER_GM">Per Weight</option>
                          <option value="PER_PC">Per Pc</option>
                        </select>
                      </td>

                      <td className="px-1 py-1.5" style={{ minWidth: '100px' }}>
                        <select value={l.rate_type} onChange={e => setLineField(idx, 'rate_type', e.target.value)}
                          disabled={isViewMode} className={lineInputCls} style={lineInputStyle}>
                          <option value="AMOUNT">Amount</option>
                          <option value="PERCENTAGE">%</option>
                        </select>
                      </td>

                      <td className="px-1 py-1.5" style={{ minWidth: '90px' }}>
                        <input type="number" step="0.01" min="0" value={l.rate_value}
                          onChange={e => setLineField(idx, 'rate_value', e.target.value)}
                          disabled={isViewMode} placeholder="0.00"
                          className={`${lineInputCls} text-right`} style={lineInputStyle} />
                      </td>

                      <td className="px-1 py-1.5" style={{ minWidth: '90px' }}>
                        <select value={l.uom} onChange={e => setLineField(idx, 'uom', e.target.value)}
                          disabled={isViewMode} className={lineInputCls} style={lineInputStyle}>
                          {uomOptsForBasis(uomOpts, l.rate_basis).map(o => (
                            <option key={o.lookup_code} value={o.lookup_code}>{o.lookup_name}</option>
                          ))}
                        </select>
                      </td>

                      <td className="px-1 py-1.5" style={{ minWidth: '170px' }}>
                        <input value={l.remarks} onChange={e => setLineField(idx, 'remarks', e.target.value)}
                          disabled={isViewMode} maxLength={500} placeholder="Optional…"
                          className={lineInputCls} style={lineInputStyle} />
                      </td>

                      <td className="px-1 py-1.5 text-center">
                        {!isViewMode && (
                          <button type="button" onClick={() => removeLine(idx)}
                            className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-red-500" title="Remove line">
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>


        {/* Bottom action bar */}
        <div className="card px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            {!isViewMode && (
              <button onClick={onSubmit} disabled={saving} className="btn-primary flex items-center gap-1.5 disabled:opacity-50">
                {saving
                  ? <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <CheckCircleIcon className="w-4 h-4" />
                }
                {isNew ? 'Create Entry' : 'Update Entry'}
              </button>
            )}
            <button onClick={backToList} className="btn-secondary ml-auto">
              {isViewMode ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div>
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
            Add Stone Price
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
              placeholder="Search stone prices…"
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
                          style={{ width: col.key === 'customer_company_name' ? '140px' : '80px' }}
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
                        ? 'No stone price entries match the current filters.'
                        : `No ${statusFilter} stone price entries found. Click "Add Stone Price" to get started.`
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
                : `Showing ${startRow}–${endRow} of ${total} entries`
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


      {/* Import Modal */}
      <Modal
        isOpen={importOpen}
        onClose={() => { setImportOpen(false); setImportFile(null); setImportPreview([]) }}
        title="Import Stone Prices from CSV"
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
        title="Deactivate Stone Price"
        itemLabel={`Stone price for "${toggleItem?.customer_company_name}"`}
        onConfirm={reason => confirmToggle(reason)}
        onCancel={() => setToggleItem(null)}
      />

      <ConfirmDialog
        isOpen={!!toggleItem && !toggleItem.is_active}
        title="Activate Stone Price"
        message={`Activate stone price for "${toggleItem?.customer_company_name}"?`}
        confirmLabel="Activate"
        variant="info"
        onConfirm={() => confirmToggle()}
        onCancel={() => setToggleItem(null)}
      />
    </div>
  )
}

export default CustomerPriceStoneTab
