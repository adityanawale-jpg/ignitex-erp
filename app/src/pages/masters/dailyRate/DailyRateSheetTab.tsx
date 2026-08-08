import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon, EyeIcon, MagnifyingGlassIcon, XMarkIcon,
  ViewColumnsIcon, ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon,
  FunnelIcon, BarsArrowUpIcon, NoSymbolIcon, CheckCircleIcon,
  ArrowDownTrayIcon, TrashIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline'
import Modal                  from '@/components/common/Modal'
import Badge                  from '@/components/common/Badge'
import ConfirmDialog          from '@/components/common/ConfirmDialog'
import DeactivateReasonDialog from '@/components/common/DeactivateReasonDialog'
import { formatDate, formatDateTime, exportToCSV, exportToExcel, exportToPDF } from '@/utils/helpers'
import { apiService } from '@/api/apiService'
import { usePermission } from '@/hooks'

// ── Types ─────────────────────────────────────────────────────
// A rate sheet is one date's header with a line per metal + purity. The grid
// lists sheets; the modal edits one sheet and its whole line set.
interface RateLineBrief {
  metal_type:    string
  purity:        string
  rate_per_gram: number
  change_pct:    number | null
}

interface RateSheet {
  id:                  number
  rate_date:           string      // YYYY-MM-DD, formatted server-side
  update_mode:         'MANUAL' | 'AUTO' | 'CARRY_FWD'
  source:              string | null
  currency_code:       string | null
  remarks:             string | null
  line_count:          number
  lines:               RateLineBrief[]
  is_active:           boolean
  deactivation_reason: string | null
  deactivated_at:      string | null
  created_at:          string
}

interface RateLineFull extends RateLineBrief {
  id:        number
  line_no:   number
  prev_rate: number | null
  remarks:   string | null
}

interface LatestSheet {
  id:          number
  rate_date:   string
  update_mode: string
  source:      string | null
  pricing:     { metal_type: string; purity: string }
  lines:       RateLineFull[]
}

interface LookupOption { lookup_code: string; lookup_name: string }

// ── Form state (controlled local state per project pattern) ────
type LineForm = {
  metal_type:    string
  purity:        string
  rate_per_gram: string
  remarks:       string
}

const blankLine: LineForm = { metal_type: '', purity: '', rate_per_gram: '', remarks: '' }

const todayISO = () => {
  // Local calendar date, not UTC — a sheet entered at 1am IST belongs to that
  // day, and toISOString() would file it under yesterday.
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const LINE_COLS: { label: string; req?: boolean }[] = [
  { label: '#' },
  { label: 'Metal Type', req: true },
  { label: 'Purity',     req: true },
  { label: 'Rate ₹/gram', req: true },
  { label: 'Previous' },
  { label: 'Change' },
  { label: 'Remarks' },
  { label: '' },
]

const lineInputCls   = 'w-full text-xs px-2 py-1.5 border border-[var(--border-color)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-gold)] disabled:opacity-60'
const lineInputStyle: React.CSSProperties = { background: 'var(--bg-primary)', color: 'var(--text-primary)' }

// ── Constants ─────────────────────────────────────────────────
const PAGE_SIZES = [10, 25, 50, 100]
const Req = () => <span className="text-red-500 ml-0.5">*</span>

const MODE_LABEL: Record<string, string> = {
  MANUAL:    'Manual',
  AUTO:      'Auto',
  CARRY_FWD: 'Carried fwd',
}
const MODE_VARIANT: Record<string, 'primary' | 'success' | 'info'> = {
  MANUAL:    'primary',
  AUTO:      'success',
  CARRY_FWD: 'info',
}

interface ColDef { key: string; label: string; sortKey?: string; visible: boolean; minW?: string }

const INITIAL_COLS: ColDef[] = [
  { key: 'rate_date',           label: 'Rate Date',   sortKey: 'rate_date',   visible: true,  minW: '120px' },
  { key: 'lines',               label: 'Rates',                               visible: true,  minW: '320px' },
  { key: 'update_mode',         label: 'Updated By',  sortKey: 'update_mode', visible: true,  minW: '110px' },
  { key: 'source',              label: 'Source',      sortKey: 'source',      visible: true,  minW: '180px' },
  { key: 'line_count',          label: 'Metals',                              visible: false, minW: '90px'  },
  { key: 'remarks',             label: 'Remarks',                             visible: false, minW: '200px' },
  { key: 'is_active',           label: 'Status',                              visible: true,  minW: '90px'  },
  { key: 'deactivation_reason', label: 'Deactive Reason',                     visible: true,  minW: '160px' },
  { key: 'deactivated_at',      label: 'Deactive Date',                       visible: true,  minW: '120px' },
  { key: 'created_at',          label: 'Created',     sortKey: 'created_at',  visible: false, minW: '140px' },
]

const rupee = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── Movement chip ─────────────────────────────────────────────
const ChangeChip: React.FC<{ pct: number | null; size?: 'sm' | 'md' }> = ({ pct, size = 'sm' }) => {
  if (pct === null || pct === undefined) {
    return <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
  }
  const up   = pct >= 0
  const cls  = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
  const Icon = up ? ArrowTrendingUpIcon : ArrowTrendingDownIcon
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-semibold ${cls}`}
      style={{
        background: up ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
        color:      up ? '#059669' : '#dc2626',
      }}
    >
      <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {Math.abs(pct).toFixed(2)}%
    </span>
  )
}

// ── Component ─────────────────────────────────────────────────
const DailyRateSheetTab: React.FC<{ refreshKey?: number }> = ({ refreshKey = 0 }) => {
  const { canView, canCreate, canUpdate, canDelete } = usePermission('MM_DAILY_RATE')

  // ── Lookups ──────────────────────────────────────────────────
  const [metalOpts,  setMetalOpts]  = useState<LookupOption[]>([])
  const [purityOpts, setPurityOpts] = useState<LookupOption[]>([])

  // ── Latest sheet banner ──────────────────────────────────────
  const [latest, setLatest] = useState<LatestSheet | null>(null)

  // ── Grid state ───────────────────────────────────────────────
  const [items,        setItems]        = useState<RateSheet[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetching,     setFetching]     = useState(false)
  const isFirstLoad                     = useRef(true)
  const [stats,        setStats]        = useState({ active: 0, inactive: 0 })
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active')
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(25)
  const [searchInput,  setSearchInput]  = useState('')
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState('rate_date')
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
  const [selectedRows,  setSelectedRows]  = useState<RateSheet[]>([])
  const [exportOpen,    setExportOpen]    = useState(false)
  const [exporting,     setExporting]     = useState(false)
  const colPickerRef   = useRef<HTMLDivElement>(null)
  const exportRef      = useRef<HTMLDivElement>(null)
  const masterCheckRef = useRef<HTMLInputElement>(null)
  const searchTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cfTimer        = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Modal / form state ────────────────────────────────────────
  const [modalOpen,  setModalOpen]  = useState(false)
  const [formMode,   setFormMode]   = useState<'add' | 'edit' | 'view'>('add')
  const [editItem,   setEditItem]   = useState<RateSheet | null>(null)
  const [toggleItem, setToggleItem] = useState<RateSheet | null>(null)
  const [saving,     setSaving]     = useState(false)
  const isNew      = formMode === 'add'
  const isViewMode = formMode === 'view'

  const [rateDate, setRateDate] = useState(todayISO())
  const [remarks,  setRemarks]  = useState('')
  const [lines,    setLines]    = useState<LineForm[]>([{ ...blankLine }])
  // prev_rate is read-only context from the server; kept beside the editable
  // rows rather than inside them so it can't be typed over.
  const [prevRates, setPrevRates] = useState<Record<string, number>>({})

  // ── Lookup names ──────────────────────────────────────────────
  const metalName  = useCallback(
    (code: string) => metalOpts.find(o => o.lookup_code === code)?.lookup_name ?? code,
    [metalOpts],
  )
  const purityName = useCallback(
    (code: string) => purityOpts.find(o => o.lookup_code === code)?.lookup_name ?? code,
    [purityOpts],
  )

  // ── Loaders ───────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [m, p] = await Promise.all([
          apiService.get('/common/lookup/METAL_TYPE'),
          apiService.get('/common/lookup/PURITY'),
        ])
        setMetalOpts(m.data?.data ?? [])
        setPurityOpts(p.data?.data ?? [])
      } catch {
        toast.error('Failed to load Metal Type / Purity options')
      }
    }
    load()
  }, [])

  const loadLatest = async () => {
    try {
      const res = await apiService.get('/daily-rate/latest')
      setLatest(res.data?.data ?? null)
    } catch { /* banner is optional context */ }
  }

  const loadStats = async () => {
    try {
      const res = await apiService.get('/daily-rate/stats')
      setStats(res.data?.data ?? { active: 0, inactive: 0 })
    } catch { /* silent */ }
  }

  const loadItems = async () => {
    if (isFirstLoad.current) setLoading(true)
    else setFetching(true)
    try {
      const activeCF = Object.fromEntries(Object.entries(debouncedCF).filter(([, v]) => v.trim()))
      const res = await apiService.get('/daily-rate', {
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
      toast.error(msg || 'Failed to load daily rates')
    } finally {
      setLoading(false); setFetching(false); isFirstLoad.current = false
    }
  }

  useEffect(() => { loadStats(); loadLatest() }, []) // eslint-disable-line
  useEffect(() => { loadItems() }, [page, pageSize, search, sortBy, sortDir, debouncedCF, statusFilter]) // eslint-disable-line

  // A fetch on the Auto Update tab writes a sheet; pick it up without a reload.
  useEffect(() => {
    if (refreshKey === 0) return
    loadItems(); loadStats(); loadLatest()
  }, [refreshKey]) // eslint-disable-line

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
  const handlePageSize = (n: number) => { setPageSize(n); setPage(1) }

  // ── Columns ───────────────────────────────────────────────────
  const toggleCol = (key: string) => setCols(cs => cs.map(c => c.key === key ? { ...c, visible: !c.visible } : c))
  const gridCols = statusFilter === 'inactive'
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
  const toggleSelectRow = (item: RateSheet) =>
    setSelectedRows(p => p.some(r => r.id === item.id) ? p.filter(r => r.id !== item.id) : [...p, item])

  // ── Export ────────────────────────────────────────────────────
  // One row per rate line, not per sheet: a spreadsheet of "29-Jul, Gold, 916,
  // 14750" is what anyone exporting rates actually wants to work with.
  const buildExportRows = (rows: RateSheet[]) =>
    rows.flatMap(r =>
      (r.lines.length ? r.lines : [null]).map(l => ({
        'Rate Date':  formatDate(r.rate_date),
        'Metal Type': l ? metalName(l.metal_type) : '',
        'Purity':     l ? purityName(l.purity)    : '',
        'Rate /gram': l ? l.rate_per_gram          : '',
        'Change %':   l && l.change_pct !== null ? l.change_pct : '',
        'Updated By': MODE_LABEL[r.update_mode] ?? r.update_mode,
        'Source':     r.source || '',
        'Status':     r.is_active ? 'Active' : 'Inactive',
        ...(statusFilter === 'inactive' && {
          'Deactive Reason': r.deactivation_reason || '',
          'Deactive Date':   r.deactivated_at ? formatDate(String(r.deactivated_at)) : '',
        }),
      })),
    )

  const handleExport = async (scope: 'all' | 'selected', format: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false)
    let rows: RateSheet[]
    if (scope === 'selected') {
      rows = selectedRows
      if (!rows.length) { toast.error('No rows selected'); return }
    } else {
      setExporting(true)
      try {
        const res = await apiService.get('/daily-rate', {
          params: { page: 1, limit: 9999, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter },
        })
        rows = res.data?.data ?? []
      } catch { toast.error('Failed to fetch export data'); setExporting(false); return }
      setExporting(false)
    }
    const data  = buildExportRows(rows)
    const fname = `daily_rate_${statusFilter}`
    if (format === 'csv')        exportToCSV(data, fname)
    else if (format === 'excel') void exportToExcel(data, fname)
    else                         void exportToPDF(data, fname, 'Daily Rate Report')
  }

  // ── Cell renderer ─────────────────────────────────────────────
  const renderCell = (col: ColDef, row: RateSheet) => {
    switch (col.key) {
      case 'rate_date':
        return <span className="text-sm font-semibold" style={{ color: 'var(--accent-gold)' }}>{formatDate(row.rate_date)}</span>
      case 'lines':
        if (!row.lines.length) return <span style={{ color: 'var(--text-muted)' }}>—</span>
        return (
          <div className="flex flex-wrap gap-1.5">
            {row.lines.slice(0, 4).map(l => (
              <span
                key={`${l.metal_type}-${l.purity}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border"
                style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
                title={`${metalName(l.metal_type)} · ${purityName(l.purity)}`}
              >
                <span className="font-medium" style={{ color: 'var(--text-muted)' }}>
                  {metalName(l.metal_type)} {l.purity}
                </span>
                <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                  ₹{rupee(l.rate_per_gram)}
                </span>
                <ChangeChip pct={l.change_pct} />
              </span>
            ))}
            {row.lines.length > 4 && (
              <span className="text-[11px] self-center" style={{ color: 'var(--text-muted)' }}>
                +{row.lines.length - 4} more
              </span>
            )}
          </div>
        )
      case 'update_mode':
        return <Badge label={MODE_LABEL[row.update_mode] ?? row.update_mode} variant={MODE_VARIANT[row.update_mode] ?? 'secondary'} />
      case 'source':
        return row.source
          ? <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.source}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>
      case 'line_count':
        return <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{row.line_count}</span>
      case 'remarks':
        return row.remarks
          ? <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.remarks}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>
      case 'is_active':
        return <Badge label={row.is_active ? 'Active' : 'Inactive'} variant={row.is_active ? 'success' : 'danger'} />
      case 'deactivation_reason':
        return row.deactivation_reason
          ? <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.deactivation_reason}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>
      case 'deactivated_at':
        return row.deactivated_at
          ? <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(String(row.deactivated_at))}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>
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

  // ── Form helpers ──────────────────────────────────────────────
  const resetForm = () => {
    setRateDate(todayISO()); setRemarks(''); setLines([{ ...blankLine }]); setPrevRates({})
  }

  const openAdd = () => {
    setFormMode('add'); setEditItem(null); resetForm()
    // The previous sheet's metals are the ones being re-rated today, so the
    // form opens pre-filled with them and only the numbers left to type.
    if (latest?.lines.length) {
      setLines(latest.lines.map(l => ({
        metal_type: l.metal_type, purity: l.purity, rate_per_gram: '', remarks: '',
      })))
      setPrevRates(Object.fromEntries(latest.lines.map(l => [`${l.metal_type}|${l.purity}`, l.rate_per_gram])))
    }
    setModalOpen(true)
  }

  const openSheet = async (item: RateSheet, mode: 'edit' | 'view') => {
    setFormMode(mode); setEditItem(item); setModalOpen(true)
    setRateDate(item.rate_date); setRemarks(item.remarks ?? '')
    setLines([{ ...blankLine }]); setPrevRates({})
    try {
      const res  = await apiService.get(`/daily-rate/${item.id}`)
      const data = res.data?.data as { lines?: RateLineFull[] } | undefined
      const ls   = data?.lines ?? []
      setLines(ls.length
        ? ls.map(l => ({
            metal_type:    l.metal_type,
            purity:        l.purity,
            rate_per_gram: String(l.rate_per_gram),
            remarks:       l.remarks ?? '',
          }))
        : [{ ...blankLine }])
      setPrevRates(Object.fromEntries(
        ls.filter(l => l.prev_rate !== null).map(l => [`${l.metal_type}|${l.purity}`, l.prev_rate as number]),
      ))
    } catch {
      toast.error('Failed to load the rate sheet')
    }
  }

  // Duplicating yesterday into a new date is the single most common way a
  // sheet gets made, so it gets its own button rather than a copy-paste ritual.
  const openCopy = (item: RateSheet) => {
    setFormMode('add'); setEditItem(null)
    setRateDate(todayISO()); setRemarks('')
    setLines(item.lines.map(l => ({
      metal_type: l.metal_type, purity: l.purity, rate_per_gram: String(l.rate_per_gram), remarks: '',
    })))
    setPrevRates(Object.fromEntries(item.lines.map(l => [`${l.metal_type}|${l.purity}`, l.rate_per_gram])))
    setModalOpen(true)
  }

  const closeModal = () => { setModalOpen(false); resetForm() }

  const setLine = (idx: number, patch: Partial<LineForm>) =>
    setLines(ls => ls.map((l, i) => i === idx ? { ...l, ...patch } : l))
  const addLine    = () => setLines(ls => [...ls, { ...blankLine }])
  const removeLine = (idx: number) =>
    setLines(ls => ls.length === 1 ? [{ ...blankLine }] : ls.filter((_, i) => i !== idx))

  const filledLines = lines.filter(l => l.metal_type || l.purity || l.rate_per_gram)

  const validate = (): string | null => {
    if (!rateDate) return 'Rate Date is required'
    if (filledLines.length === 0) return 'Add at least one rate line'
    const seen = new Set<string>()
    for (let i = 0; i < filledLines.length; i++) {
      const l = filledLines[i]
      if (!l.metal_type) return `Line ${i + 1}: Metal Type is required`
      if (!l.purity)     return `Line ${i + 1}: Purity is required`
      const key = `${l.metal_type}|${l.purity}`
      if (seen.has(key)) return `Line ${i + 1}: ${metalName(l.metal_type)} ${l.purity} is already rated on another line`
      seen.add(key)
      const n = Number(l.rate_per_gram)
      if (l.rate_per_gram === '' || !Number.isFinite(n)) return `Line ${i + 1}: Rate is required`
      if (n < 0) return `Line ${i + 1}: Rate cannot be negative`
    }
    return null
  }

  const onSubmit = async () => {
    const err = validate()
    if (err) { toast.error(err); return }

    setSaving(true)
    try {
      const payload = {
        rate_date: rateDate,
        remarks:   remarks.trim() || null,
        lines: filledLines.map(l => ({
          metal_type:    l.metal_type,
          purity:        l.purity,
          rate_per_gram: Number(l.rate_per_gram),
          remarks:       l.remarks.trim() || null,
        })),
      }
      if (isNew) {
        await apiService.post('/daily-rate', payload)
        toast.success('Daily rate created successfully')
      } else {
        await apiService.put(`/daily-rate/${editItem!.id}`, payload)
        toast.success('Daily rate updated successfully')
      }
      closeModal()
      await Promise.all([loadItems(), loadStats(), loadLatest()])
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  const confirmToggle = async (reason?: string) => {
    if (!toggleItem) return
    try {
      const res = await apiService.delete(`/daily-rate/${toggleItem.id}`, reason ? { data: { reason } } : undefined)
      toast.success(res.data?.message || 'Status updated')
      setToggleItem(null)
      await Promise.all([loadItems(), loadStats(), loadLatest()])
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'
      toast.error(msg)
    }
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Today's rates banner ── */}
      {latest && latest.lines.length > 0 && (
        <div className="mb-4 rounded-2xl overflow-hidden relative"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderLeft: '4px solid var(--accent-gold)',
          }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(201,151,58,0.07) 0%, transparent 55%)' }} />

          <div className="relative z-10 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--accent-gold)' }}>
                  Rates in effect
                </span>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {formatDate(latest.rate_date)}
                </span>
                <Badge
                  label={MODE_LABEL[latest.update_mode] ?? latest.update_mode}
                  variant={MODE_VARIANT[latest.update_mode] ?? 'secondary'}
                />
              </div>
              {latest.source && (
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{latest.source}</span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {latest.lines.map(l => {
                const isPricing = l.metal_type === latest.pricing.metal_type && l.purity === latest.pricing.purity
                return (
                  <div
                    key={l.id}
                    className="px-3 py-2.5 rounded-xl border"
                    style={{
                      borderColor: isPricing ? 'var(--accent-gold)' : 'var(--border-color)',
                      background:  isPricing ? 'rgba(201,151,58,0.08)' : 'var(--bg-secondary)',
                    }}
                    // Named on the card rather than in a legend — this is the
                    // number every percentage-based Sales Order price uses.
                    title={isPricing ? 'Sales Order percentage pricing is struck against this rate' : undefined}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium truncate" style={{ color: 'var(--text-muted)' }}>
                        {metalName(l.metal_type)} {l.purity}
                      </span>
                      {isPricing && (
                        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--accent-gold)', color: '#fff' }}>
                          Pricing
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline justify-between gap-2 mt-1">
                      <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                        ₹{rupee(l.rate_per_gram)}
                        <span className="text-[10px] font-medium ml-0.5" style={{ color: 'var(--text-muted)' }}>/g</span>
                      </span>
                      <ChangeChip pct={l.change_pct} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

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
            Add Rate
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
              placeholder="Search source or remarks…"
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
                <th className="px-4 py-2.5 w-32 text-center text-xs font-semibold uppercase tracking-wide sticky right-0 z-10 border-l border-[var(--border-color)] bg-[var(--bg-secondary)]"
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
                        placeholder={col.key === 'rate_date' ? 'YYYY-MM-DD' : 'Filter…'}
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
                          style={{ width: col.key === 'lines' ? '260px' : '80px' }} />
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
                      <div className="text-4xl opacity-30">💰</div>
                      {search || Object.values(colFilters).some(v => v)
                        ? 'No rate sheets match the current filters.'
                        : `No ${statusFilter} rate sheets found. Click "Add Rate" to enter today's rates.`
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
                        {canCreate && (
                          <button onClick={() => openCopy(item)} className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--accent-gold)]" title="Copy to a new date">
                            <DocumentDuplicateIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canUpdate && (
                          <button onClick={() => openSheet(item, 'edit')} className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500 ${!item.is_active ? 'invisible' : ''}`} title="Edit">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canView && (
                          <button onClick={() => openSheet(item, 'view')} className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]" title="View">
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
              {total === 0 ? 'No records found' : `Showing ${startRow}–${endRow} of ${total} rate sheets`}
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
            ? 'Add Daily Rate'
            : isViewMode
              ? `View Rates — ${formatDate(rateDate)}`
              : `Edit Rates — ${formatDate(rateDate)}`
        }
        size="4xl"
        footer={
          isViewMode ? (
            <button onClick={closeModal} className="btn-secondary">Close</button>
          ) : (
            <>
              <button onClick={closeModal} className="btn-secondary">Cancel</button>
              <button onClick={onSubmit} disabled={saving} className="btn-primary">
                {saving
                  ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />Saving…</>
                  : isNew ? 'Create Rate' : 'Update Rate'
                }
              </button>
            </>
          )
        }
      >
        <div className="space-y-5">
          {isViewMode && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
              <EyeIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Read-only view — no changes can be made.</p>
            </div>
          )}

          {!isViewMode && !isNew && editItem?.update_mode !== 'MANUAL' && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <span className="text-sm flex-shrink-0 mt-0.5">⚠️</span>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                This sheet was written by the auto update
                ({MODE_LABEL[editItem?.update_mode ?? ''] ?? editItem?.update_mode}). Saving marks it as
                manually entered, and the scheduler will then leave it alone unless
                &ldquo;Overwrite manual sheets&rdquo; is switched on.
              </p>
            </div>
          )}

          {/* Header fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Rate Date{!isViewMode && <Req />}
              </label>
              <input
                type="date"
                value={rateDate}
                onChange={e => setRateDate(e.target.value)}
                disabled={isViewMode}
                className={`form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Remarks</label>
              <input
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                disabled={isViewMode}
                maxLength={500}
                placeholder="Optional note about this day's rates"
                className={`form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
              />
            </div>
          </div>

          {/* Line grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Metal Rates
                <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                  in ₹ per gram
                </span>
              </h4>
              {!isViewMode && (
                <button type="button" onClick={addLine}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-[var(--bg-tertiary)]"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--accent-gold)' }}>
                  <PlusIcon className="w-3.5 h-3.5" />
                  Add Row
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    {LINE_COLS.map((c, i) => (
                      <th key={i} className="px-2 py-2 text-left font-semibold uppercase tracking-wide whitespace-nowrap"
                        style={{ color: 'var(--text-muted)' }}>
                        {c.label}{c.req && !isViewMode && <Req />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => {
                    const prev    = prevRates[`${l.metal_type}|${l.purity}`]
                    const current = Number(l.rate_per_gram)
                    // Live movement while typing, so a fat-fingered 147500 in a
                    // per-gram field shows up as +900% before it is saved.
                    const pct = prev !== undefined && prev > 0 && l.rate_per_gram !== '' && Number.isFinite(current)
                      ? ((current - prev) / prev) * 100
                      : null
                    return (
                      <tr key={idx} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                        <td className="px-2 py-1.5 text-center" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td className="px-2 py-1.5" style={{ minWidth: 140 }}>
                          <select
                            value={l.metal_type}
                            onChange={e => setLine(idx, { metal_type: e.target.value })}
                            disabled={isViewMode}
                            className={lineInputCls} style={lineInputStyle}
                          >
                            <option value="">Select…</option>
                            {metalOpts.map(o => <option key={o.lookup_code} value={o.lookup_code}>{o.lookup_name}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5" style={{ minWidth: 150 }}>
                          <select
                            value={l.purity}
                            onChange={e => setLine(idx, { purity: e.target.value })}
                            disabled={isViewMode}
                            className={lineInputCls} style={lineInputStyle}
                          >
                            <option value="">Select…</option>
                            {purityOpts.map(o => <option key={o.lookup_code} value={o.lookup_code}>{o.lookup_name}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5" style={{ minWidth: 130 }}>
                          <input
                            type="number" min="0" step="0.0001" inputMode="decimal"
                            value={l.rate_per_gram}
                            onChange={e => setLine(idx, { rate_per_gram: e.target.value })}
                            disabled={isViewMode}
                            placeholder="0.0000"
                            className={`${lineInputCls} text-right font-mono`} style={lineInputStyle}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                          {prev !== undefined ? `₹${rupee(prev)}` : '—'}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <ChangeChip pct={pct} />
                        </td>
                        <td className="px-2 py-1.5" style={{ minWidth: 160 }}>
                          <input
                            value={l.remarks}
                            onChange={e => setLine(idx, { remarks: e.target.value })}
                            disabled={isViewMode}
                            maxLength={500}
                            className={lineInputCls} style={lineInputStyle}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {!isViewMode && (
                            <button type="button" onClick={() => removeLine(idx)}
                              className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-red-500" title="Remove row">
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5">
            <span className="text-sm flex-shrink-0 mt-0.5">💡</span>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Rates are always <b>₹ per gram</b>. Sales Order strikes percentage-based customer prices
              against the metal and purity chosen on the <b>Auto Update</b> tab, reading the most recent
              active sheet on or before the order date.
            </p>
          </div>
        </div>
      </Modal>

      <DeactivateReasonDialog
        isOpen={!!toggleItem?.is_active}
        title="Deactivate Rate Sheet"
        itemLabel={`Rates for ${toggleItem ? formatDate(toggleItem.rate_date) : ''}`}
        onConfirm={reason => confirmToggle(reason)}
        onCancel={() => setToggleItem(null)}
      />

      <ConfirmDialog
        isOpen={!!toggleItem && !toggleItem.is_active}
        title="Activate Rate Sheet"
        message={`Activate the rate sheet for ${toggleItem ? formatDate(toggleItem.rate_date) : ''}?`}
        confirmLabel="Activate"
        variant="info"
        onConfirm={() => confirmToggle()}
        onCancel={() => setToggleItem(null)}
      />
    </div>
  )
}

export default DailyRateSheetTab
