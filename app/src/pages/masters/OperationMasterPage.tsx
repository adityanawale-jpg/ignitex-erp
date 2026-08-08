import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon,
  MagnifyingGlassIcon, XMarkIcon, ViewColumnsIcon,
  ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon,
  FunnelIcon, BarsArrowUpIcon, NoSymbolIcon, CheckCircleIcon,
  ArrowDownTrayIcon, ArrowUpTrayIcon,
  CogIcon, InformationCircleIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import Modal                  from '@/components/common/Modal'
import Badge                  from '@/components/common/Badge'
import ConfirmDialog          from '@/components/common/ConfirmDialog'
import DeactivateReasonDialog from '@/components/common/DeactivateReasonDialog'
import { formatDate, formatDateTime, exportToCSV, exportToExcel, exportToPDF } from '@/utils/helpers'
import { apiService } from '@/api/apiService'

// ── Types ──────────────────────────────────────────────────────
interface OperationEntry {
  id:                  number
  operation_code:      string
  operation_name:      string
  dept_id:             number
  dept_name:           string | null
  machine_ids:         number[]
  machine_names:       string | null
  std_time:            number
  yield_percentage:    number | null
  process_by:          string | null
  deactivation_reason: string | null
  deactivated_at:      string | null
  is_active:           boolean
  created_at:          string
  updated_at:          string | null
}

interface DeptOption    { id: number; dept_code: string; dept_name: string }
interface MachineOption { id: number; machine_code: string; machine_name: string; machine_type: string; dept_name: string | null }
interface LookupOption  { lookup_code: string; lookup_name: string }

type FormValues = {
  operation_name:   string
  dept_id:          string
  machine_ids:      number[]
  std_time:         string
  yield_percentage: string
  process_by:       string
}

const blankForm: FormValues = {
  operation_name:   '',
  dept_id:          '',
  machine_ids:      [],
  std_time:         '',
  yield_percentage: '',
  process_by:       '',
}

// ── Import row type ────────────────────────────────────────────
interface OImportRow {
  _rowNum:          number
  operation_name:   string
  dept_code:        string
  machine_code:     string  // comma-separated machine codes
  std_time:         string
  yield_percentage: string
  process_by:       string
  errors:           string[]
}

const PAGE_SIZES = [10, 25, 50, 100]
const Req = () => <span className="text-red-500 ml-0.5">*</span>

interface ColDef { key: string; label: string; sortKey?: string; visible: boolean; minW?: string }

const INITIAL_COLS: ColDef[] = [
  { key: 'operation_code',   label: 'Op. Code',        sortKey: 'operation_code',   visible: true,  minW: '110px' },
  { key: 'operation_name',   label: 'Operation Name',  sortKey: 'operation_name',   visible: true,  minW: '180px' },
  { key: 'dept_name',        label: 'Department',      sortKey: 'dept_name',        visible: true,  minW: '140px' },
  { key: 'machine_names',    label: 'Machine(s)',       sortKey: 'machine_names',    visible: true,  minW: '200px' },
  { key: 'std_time',         label: 'Std Time (min)',  sortKey: 'std_time',         visible: true,  minW: '120px' },
  { key: 'yield_percentage', label: 'Yield %',         sortKey: 'yield_percentage', visible: false, minW: '90px'  },
  { key: 'process_by',       label: 'Process By',      sortKey: 'process_by',       visible: true,  minW: '130px' },
  { key: 'is_active',           label: 'Status',                                    visible: true,  minW: '90px'  },
  { key: 'deactivation_reason', label: 'Deactive Reason',                           visible: true,  minW: '160px' },
  { key: 'deactivated_at',      label: 'Deactive Date',                             visible: true,  minW: '120px' },
  { key: 'created_at',       label: 'Created',         sortKey: 'created_at',       visible: true,  minW: '130px' },
]

// ── Page ───────────────────────────────────────────────────────
const OperationMasterPage: React.FC = () => {

  // ── Lookup options ─────────────────────────────────────────────
  const [deptOptions,    setDeptOptions]    = useState<DeptOption[]>([])
  const [machineOptions, setMachineOptions] = useState<MachineOption[]>([])
  const [processBy,      setProcessBy]      = useState<LookupOption[]>([])

  // ── Form state (controlled local state per project pattern) ────
  const [form,          setForm]        = useState<FormValues>(blankForm)
  const [initialForm,   setInitialForm] = useState<FormValues>(blankForm)
  const [formErrors,    setFormErrors]  = useState<Partial<Record<keyof FormValues, string>>>({})
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm)

  const setField = (key: keyof FormValues, val: string) => {
    setForm(f => ({ ...f, [key]: val }))
    if (formErrors[key]) setFormErrors(e => ({ ...e, [key]: undefined }))
  }

  const toggleMachineId = useCallback((id: number) => {
    setForm(f => {
      const ids = f.machine_ids.includes(id) ? f.machine_ids.filter(x => x !== id) : [...f.machine_ids, id]
      return { ...f, machine_ids: ids }
    })
    setFormErrors(e => ({ ...e, machine_ids: undefined }))
  }, [])

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormValues, string>> = {}
    if (!form.operation_name.trim())  errs.operation_name = 'Operation Name is required'
    if (!form.dept_id)                errs.dept_id        = 'Department is required'
    if (!form.machine_ids.length)     errs.machine_ids    = 'At least one Machine is required'
    if (!form.std_time.trim())        errs.std_time       = 'Std Time is required'
    else if (isNaN(Number(form.std_time)) || Number(form.std_time) <= 0)
      errs.std_time = 'Std Time must be a positive number'
    if (form.yield_percentage.trim() !== '') {
      const y = Number(form.yield_percentage)
      if (isNaN(y) || y < 0 || y > 100) errs.yield_percentage = 'Yield % must be 0–100'
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Machine inline LOV search ──────────────────────────────────
  const [machineSearch, setMachineSearch] = useState('')

  // ── Modal state ────────────────────────────────────────────────
  const [saving,           setSaving]           = useState(false)
  const [modalOpen,        setModalOpen]        = useState(false)
  const [editItem,         setEditItem]         = useState<OperationEntry | null>(null)
  const [showCloseWarning, setShowCloseWarning] = useState(false)
  const [toggleItem,       setToggleItem]       = useState<OperationEntry | null>(null)
  const isNew = !editItem

  // ── Import state (3-step: upload → preview → result) ──────────
  const [importOpen,   setImportOpen]   = useState(false)
  const [importStep,   setImportStep]   = useState<'upload' | 'preview' | 'result'>('upload')
  const [importRows,   setImportRows]   = useState<OImportRow[]>([])
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null)
  const [importing,    setImporting]    = useState(false)
  const importFileRef  = useRef<HTMLInputElement>(null)

  // ── Grid state ─────────────────────────────────────────────────
  const [items,        setItems]        = useState<OperationEntry[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetching,     setFetching]     = useState(false)
  const isFirstLoad    = useRef(true)
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active')
  const [stats,        setStats]        = useState({ active: 0, inactive: 0 })
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(25)
  const [searchInput,  setSearchInput]  = useState('')
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState('operation_code')
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('asc')
  const [total,        setTotal]        = useState(0)
  const [totalPages,   setTotalPages]   = useState(1)

  // ── Toolbar state ──────────────────────────────────────────────
  const [cols,          setCols]          = useState<ColDef[]>(INITIAL_COLS)
  const [showColPicker, setShowColPicker] = useState(false)
  const [showFilterRow, setShowFilterRow] = useState(false)
  const [showSorting,   setShowSorting]   = useState(true)
  const [colFilters,    setColFilters]    = useState<Record<string, string>>({})
  const [debouncedCF,   setDebouncedCF]   = useState<Record<string, string>>({})
  const [selectedRows,  setSelectedRows]  = useState<OperationEntry[]>([])
  const [exportOpen,    setExportOpen]    = useState(false)
  const [exporting,     setExporting]     = useState(false)
  const colPickerRef   = useRef<HTMLDivElement>(null)
  const exportRef      = useRef<HTMLDivElement>(null)
  const masterCheckRef = useRef<HTMLInputElement>(null)
  const searchTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cfTimer        = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Outside-click ──────────────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setShowColPicker(false)
      if (exportRef.current    && !exportRef.current.contains(e.target as Node))    setExportOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Debounces ──────────────────────────────────────────────────
  const onSearchInput = (val: string) => {
    setSearchInput(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1) }, 400)
  }

  useEffect(() => {
    if (cfTimer.current) clearTimeout(cfTimer.current)
    cfTimer.current = setTimeout(() => { setDebouncedCF(colFilters); setPage(1) }, 400)
  }, [colFilters]) // eslint-disable-line

  // ── Lookups ────────────────────────────────────────────────────
  const loadLookups = async () => {
    try {
      const [deptRes, machineRes, pbRes] = await Promise.all([
        apiService.get('/departments/lov'),
        apiService.get('/machines/lov'),
        apiService.get('/lookup-master/lov/PROCESS_BY'),
      ])
      setDeptOptions(deptRes.data?.data ?? [])
      setMachineOptions(machineRes.data?.data ?? [])
      setProcessBy(pbRes.data?.data ?? [])
    } catch { /* silent */ }
  }

  const loadStats = async () => {
    try {
      const res = await apiService.get('/operations/stats')
      setStats(res.data?.data ?? { active: 0, inactive: 0 })
    } catch { /* silent */ }
  }

  const loadItems = async () => {
    if (isFirstLoad.current) setLoading(true); else setFetching(true)
    try {
      const activeCF = Object.fromEntries(Object.entries(debouncedCF).filter(([, v]) => v.trim()))
      const res = await apiService.get('/operations', {
        params: {
          page, limit: pageSize, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter,
          ...(Object.keys(activeCF).length > 0 && { col_filters: JSON.stringify(activeCF) }),
        },
      })
      setItems(res.data?.data ?? [])
      setTotal(res.data?.meta?.total ?? 0)
      setTotalPages(res.data?.meta?.total_pages ?? 1)
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load operations')
    } finally { setLoading(false); setFetching(false); isFirstLoad.current = false }
  }

  useEffect(() => { loadStats(); loadLookups() }, [])  // eslint-disable-line
  useEffect(() => { loadItems() }, [page, pageSize, search, sortBy, sortDir, debouncedCF, statusFilter]) // eslint-disable-line

  // ── Row selection ──────────────────────────────────────────────
  const currentPageIds   = items.map(r => r.id)
  const allPageSelected  = currentPageIds.length > 0 && currentPageIds.every(id => selectedRows.some(r => r.id === id))
  const somePageSelected = currentPageIds.some(id => selectedRows.some(r => r.id === id))
  useEffect(() => {
    if (masterCheckRef.current) masterCheckRef.current.indeterminate = somePageSelected && !allPageSelected
  }, [somePageSelected, allPageSelected])

  const toggleSelectPage = () => {
    if (allPageSelected) setSelectedRows(prev => prev.filter(r => !currentPageIds.includes(r.id)))
    else setSelectedRows(prev => [...prev, ...items.filter(u => !selectedRows.some(r => r.id === u.id))])
  }
  const toggleSelectRow = (item: OperationEntry) =>
    setSelectedRows(prev => prev.some(r => r.id === item.id) ? prev.filter(r => r.id !== item.id) : [...prev, item])

  // ── Grid controls ──────────────────────────────────────────────
  const handleSort   = (key: string) => { if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(key); setSortDir('asc') }; setPage(1) }
  const toggleCol    = (key: string) => setCols(cs => cs.map(c => c.key === key ? { ...c, visible: !c.visible } : c))
  const gridCols = statusFilter === 'inactive' ? cols : cols.filter(c => c.key !== 'deactivation_reason' && c.key !== 'deactivated_at')
  const visibleCols  = gridCols.filter(c => c.visible)

  // ── Export ─────────────────────────────────────────────────────
  const buildExportRows = (rows: OperationEntry[]) => rows.map(r => ({
    'Op. Code':         r.operation_code,
    'Operation Name':   r.operation_name,
    'Department':       r.dept_name || '',
    'Machine(s)':       r.machine_names || '',
    'Std Time (min)':   r.std_time,
    'Yield %':          r.yield_percentage ?? '',
    'Process By':       r.process_by || '',
    'Status':           r.is_active ? 'Active' : 'Inactive',
    ...(statusFilter === 'inactive' && {
      'Deactive Reason': r.deactivation_reason || '',
      'Deactive Date': r.deactivated_at ? formatDate(String(r.deactivated_at)) : '',
    }),
    'Created At':       formatDateTime(String(r.created_at)),
  }))

  const handleExport = async (scope: 'all' | 'selected', format: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false)
    let rows: OperationEntry[]
    if (scope === 'selected') {
      rows = selectedRows
      if (!rows.length) { toast.error('No rows selected'); return }
    } else {
      setExporting(true)
      try {
        const activeCF = Object.fromEntries(Object.entries(debouncedCF).filter(([, v]) => v.trim()))
        const res = await apiService.get('/operations', { params: { page: 1, limit: 9999, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter, ...(Object.keys(activeCF).length > 0 && { col_filters: JSON.stringify(activeCF) }) } })
        rows = res.data?.data ?? []
      } catch { toast.error('Failed to fetch export data'); setExporting(false); return }
      setExporting(false)
    }
    const fname = `operation_master_${statusFilter}`
    const data  = buildExportRows(rows)
    if (format === 'csv')        exportToCSV(data, fname)
    else if (format === 'excel') void exportToExcel(data, fname)
    else                         void exportToPDF(data, fname, 'Operation Master Report')
  }

  // ── Pagination ─────────────────────────────────────────────────
  const pageNumbers = useMemo((): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 4)              return [1, 2, 3, 4, 5, '...', totalPages]
    if (page >= totalPages - 3) return [1, '...', totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages]
    return [1, '...', page - 1, page, page + 1, '...', totalPages]
  }, [page, totalPages])
  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endRow   = Math.min(page * pageSize, total)

  // ── Modal helpers ──────────────────────────────────────────────
  const closeModal = () => {
    setModalOpen(false); setForm(blankForm); setInitialForm(blankForm); setFormErrors({})
    setShowCloseWarning(false); setMachineSearch('')
  }
  const handleModalClose = () => { if (isDirty) setShowCloseWarning(true); else closeModal() }

  const openAdd = () => {
    setEditItem(null); setForm(blankForm); setInitialForm(blankForm); setFormErrors({}); setModalOpen(true)
  }
  const openEdit = (item: OperationEntry) => {
    setEditItem(item)
    const f: FormValues = {
      operation_name:   item.operation_name,
      dept_id:          String(item.dept_id),
      machine_ids:      Array.isArray(item.machine_ids) ? item.machine_ids : [],
      std_time:         String(item.std_time),
      yield_percentage: item.yield_percentage != null ? String(item.yield_percentage) : '',
      process_by:       item.process_by ?? '',
    }
    setForm(f); setInitialForm(f); setFormErrors({}); setModalOpen(true)
  }

  const onSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        operation_name:   form.operation_name.trim(),
        dept_id:          parseInt(form.dept_id, 10),
        machine_ids:      form.machine_ids,
        std_time:         Number(form.std_time),
        yield_percentage: form.yield_percentage.trim() !== '' ? Number(form.yield_percentage) : null,
        process_by:       form.process_by || null,
      }
      if (isNew) {
        await apiService.post('/operations', payload)
        toast.success('Operation created successfully')
      } else {
        await apiService.put(`/operations/${editItem!.id}`, payload)
        toast.success('Operation updated successfully')
      }
      closeModal()
      await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const confirmToggle = async (reason?: string) => {
    if (!toggleItem) return
    try {
      const res = await apiService.delete(`/operations/${toggleItem.id}`, reason ? { data: { reason } } : undefined)
      toast.success(res.data?.message || 'Status updated')
      setToggleItem(null)
      await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed')
    }
  }

  // ── Import helpers ─────────────────────────────────────────────
  const openImport = () => {
    setImportOpen(true); setImportStep('upload')
    setImportRows([]); setImportResult(null)
  }

  const downloadImportTemplate = async () => {
    const XLSX = await import('xlsx')
    const headers = ['Operation Name *', 'Dept Code *', 'Machine Code(s) *', 'Std Time (min) *', 'Yield %', 'Process By']
    const sample  = ['Casting', 'PROD', 'MC0001,MC0002', '45', '98.5', 'Machine']
    const ws = XLSX.utils.aoa_to_sheet([headers, sample])
    ws['!cols'] = headers.map(() => ({ wch: 20 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Operations')
    XLSX.writeFile(wb, `operation_import_template_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleImportFile = async (file: File) => {
    const XLSX = await import('xlsx')
    const buf  = await file.arrayBuffer()
    const wb   = XLSX.read(buf, { type: 'array' })
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const raw  = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

    const validProcessBy = new Set(processBy.map(o => o.lookup_name.toLowerCase()))
    const validDeptMap   = new Map(deptOptions.map(d => [d.dept_code.toUpperCase(), d]))
    const validMachMap   = new Map(machineOptions.map(m => [m.machine_code.toUpperCase(), m]))

    const HEADER_MAP: Record<string, keyof OImportRow> = {
      'operation name':    'operation_name',
      'dept code':         'dept_code',
      'machine code':      'machine_code',
      'machine code(s)':   'machine_code',
      'machine codes':     'machine_code',
      'std time (min)':    'std_time',
      'std time':          'std_time',
      'yield %':           'yield_percentage',
      'yield':             'yield_percentage',
      'yield_percentage':  'yield_percentage',
      'process by':        'process_by',
    }
    const norm = (h: string) => h.replace(/\*/g, '').trim().toLowerCase()

    const parsed: OImportRow[] = raw.map((r, idx) => {
      const row: Partial<OImportRow> = { _rowNum: idx + 2, errors: [] }
      Object.entries(r).forEach(([col, val]) => {
        const field = HEADER_MAP[norm(col)]
        if (field) (row as Record<string, unknown>)[field] = String(val ?? '').trim()
      })
      const errs: string[] = []

      if (!row.operation_name?.trim()) errs.push('Operation Name is required')
      if (!row.dept_code?.trim())      errs.push('Dept Code is required')
      else if (!validDeptMap.has(row.dept_code.toUpperCase())) errs.push(`Dept code "${row.dept_code}" not found`)
      if (!row.machine_code?.trim()) {
        errs.push('Machine Code is required')
      } else {
        const codes = row.machine_code.split(',').map(c => c.trim().toUpperCase()).filter(Boolean)
        codes.forEach(c => { if (!validMachMap.has(c)) errs.push(`Machine code "${c}" not found`) })
      }
      if (!row.std_time?.trim())       errs.push('Std Time is required')
      else {
        const t = Number(row.std_time)
        if (isNaN(t) || t <= 0) errs.push('Std Time must be a positive number')
      }
      if (row.yield_percentage?.trim()) {
        const y = Number(row.yield_percentage)
        if (isNaN(y) || y < 0 || y > 100) errs.push('Yield % must be 0–100')
      }
      if (row.process_by?.trim() && !validProcessBy.has(row.process_by.toLowerCase())) {
        errs.push(`Unknown Process By: "${row.process_by}"`)
      }
      row.errors = errs
      return row as OImportRow
    })

    setImportRows(parsed)
    setImportStep('preview')
  }

  const runImport = async () => {
    const valid = importRows.filter(r => r.errors.length === 0)
    if (!valid.length) return
    setImporting(true); setImportStep('result')
    try {
      const res = await apiService.post('/operations/import', { rows: valid })
      setImportResult(res.data?.data ?? { created: 0, skipped: 0, errors: [] })
      if ((res.data?.data?.created ?? 0) > 0) await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      setImportResult({ created: 0, skipped: 0, errors: [(err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Import failed'] })
    } finally { setImporting(false) }
  }

  // ── Cell renderer ──────────────────────────────────────────────
  const renderCell = (col: ColDef, row: OperationEntry) => {
    switch (col.key) {
      case 'operation_code': return <span className="font-mono text-sm font-semibold" style={{ color: 'var(--accent-gold)' }}>{row.operation_code}</span>
      case 'operation_name': return <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{row.operation_name}</span>
      case 'machine_names':  return row.machine_names
        ? <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.machine_names}</span>
        : <span style={{ color: 'var(--text-muted)' }}>—</span>
      case 'std_time':       return <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>{row.std_time} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>min</span></span>
      case 'yield_percentage': return row.yield_percentage != null
        ? <span className="text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>{row.yield_percentage}<span className="text-xs" style={{ color: 'var(--text-muted)' }}>%</span></span>
        : <span style={{ color: 'var(--text-muted)' }}>—</span>
      case 'process_by':     return row.process_by ? <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium whitespace-nowrap">{row.process_by}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>
      case 'is_active':      return <Badge label={row.is_active ? 'Active' : 'Inactive'} variant={row.is_active ? 'success' : 'danger'} />
      case 'deactivation_reason': return row.deactivation_reason ? <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.deactivation_reason}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>
      case 'deactivated_at': return row.deactivated_at ? <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(String(row.deactivated_at))}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>
      case 'created_at':     return <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(String(row.created_at))}</span>
      default: return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{String((row as unknown as Record<string, unknown>)[col.key] ?? '') || '—'}</span>
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <span>Masters</span><span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>Operation Master</span>
      </div>

      {/* Stats + Add */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 pl-1">
          {(['active', 'inactive'] as const).map(s => (
            <button key={s}
              onClick={() => { setStatusFilter(s); setPage(1); setColFilters({}); setSearchInput(''); setSearch('') }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 transition-all w-36 ${
                statusFilter === s
                  ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                  : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/50'}`}
            >
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
          <PlusIcon className="w-4 h-4" /> Add Operation
        </button>
      </div>

      {/* Grid card */}
      <div className="card overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[var(--border-color)]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input value={searchInput} onChange={e => onSearchInput(e.target.value)} placeholder="Search operations…"
              className="form-input pl-9 pr-8 py-1.5 text-sm w-full" />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setShowFilterRow(s => !s)} title="Column Filters"
              className={`p-1.5 rounded-lg border transition-colors ${showFilterRow ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
              <FunnelIcon className="w-4 h-4" />
            </button>
            <button onClick={() => setShowSorting(s => !s)} title="Column Sorting"
              className={`p-1.5 rounded-lg border transition-colors ${showSorting ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
              <BarsArrowUpIcon className="w-4 h-4" />
            </button>

            <div ref={colPickerRef} className="relative">
              <button onClick={() => setShowColPicker(s => !s)} title="Show / Hide Columns"
                className={`p-1.5 rounded-lg border transition-colors ${showColPicker ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                <ViewColumnsIcon className="w-4 h-4" />
              </button>
              {showColPicker && (
                <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg p-1.5">
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
              <button onClick={() => setExportOpen(o => !o)} disabled={exporting} title="Export"
                className={`p-1.5 rounded-lg border transition-colors ${exportOpen ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                {exporting ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <ArrowDownTrayIcon className="w-4 h-4" />}
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg p-1.5">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Export All Records</p>
                  {(['csv', 'excel', 'pdf'] as const).map(fmt => (
                    <button key={fmt} onClick={() => handleExport('all', fmt)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] text-left">
                      <span>{fmt === 'csv' ? '📄' : fmt === 'excel' ? '📊' : '📋'}</span>
                      <span className="font-medium">{fmt === 'csv' ? 'CSV' : fmt === 'excel' ? 'Excel (.xlsx)' : 'PDF'}</span>
                    </button>
                  ))}
                  {selectedRows.length > 0 && (
                    <>
                      <hr className="my-1 border-[var(--border-color)]" />
                      <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Export Selected ({selectedRows.length})</p>
                      {(['csv', 'excel', 'pdf'] as const).map(fmt => (
                        <button key={`sel-${fmt}`} onClick={() => handleExport('selected', fmt)}
                          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] text-left">
                          <span>{fmt === 'csv' ? '📄' : fmt === 'excel' ? '📊' : '📋'}</span>
                          <span className="font-medium">{fmt === 'csv' ? 'CSV' : fmt === 'excel' ? 'Excel (.xlsx)' : 'PDF'}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            <button onClick={openImport} title="Import Operations from Excel"
              className="p-1.5 rounded-lg border transition-colors border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">
              <ArrowUpTrayIcon className="w-4 h-4" />
            </button>

            <input ref={importFileRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void handleImportFile(f); e.target.value = '' }} />

            <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span className="hidden sm:inline">Show</span>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                className="form-input py-1.5 text-sm" style={{ width: '72px' }}>
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
                  <input type="checkbox" ref={masterCheckRef} checked={allPageSelected} onChange={toggleSelectPage}
                    className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer" />
                </th>
                {visibleCols.map(col => (
                  <th key={col.key}
                    style={{ minWidth: col.minW, color: 'var(--text-muted)' } as React.CSSProperties}
                    onClick={() => showSorting && col.sortKey && handleSort(col.sortKey)}
                    className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide select-none whitespace-nowrap ${showSorting && col.sortKey ? 'cursor-pointer hover:text-[var(--text-primary)]' : ''}`}>
                    <div className="flex items-center gap-1">
                      {col.label}
                      {showSorting && col.sortKey && (
                        sortBy === col.sortKey
                          ? sortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5 text-[var(--accent-gold)]" /> : <ChevronDownIcon className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                          : <ChevronUpDownIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-2.5 w-28 text-center text-xs font-semibold uppercase tracking-wide sticky right-0 z-10 border-l border-[var(--border-color)] bg-[var(--bg-secondary)]"
                  style={{ color: 'var(--text-muted)' }}>Actions</th>
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
                        <div className="h-4 rounded animate-pulse bg-[var(--bg-tertiary)]" style={{ width: col.key === 'operation_name' ? '160px' : '80px' }} />
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
                      <CogIcon className="w-10 h-10 opacity-30" />
                      {search || Object.values(colFilters).some(v => v)
                        ? 'No operations match the current filters.'
                        : `No ${statusFilter} operations found. Click "Add Operation" to get started.`}
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
                    {visibleCols.map(col => <td key={col.key} className="px-4 py-2.5">{renderCell(col, item)}</td>)}
                    <td className="px-4 py-2.5 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(item)} className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500 ${!item.is_active ? 'invisible' : ''}`} title="Edit">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => setToggleItem(item)}
                          className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] ${item.is_active ? 'text-red-500' : 'text-green-500'}`}
                          title={item.is_active ? 'Deactivate' : 'Activate'}>
                          {item.is_active ? <NoSymbolIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
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
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {total === 0 ? 'No records found' : `Showing ${startRow}–${endRow} of ${total} operations`}
            </span>
            {selectedRows.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent-gold)]">
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-gold)]/15 border border-[var(--accent-gold)]/30">{selectedRows.length} selected</span>
                <button onClick={() => setSelectedRows([])} className="text-xs hover:text-[var(--text-primary)] underline underline-offset-2" style={{ color: 'var(--text-muted)' }}>Clear</button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage(1)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">«</button>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">‹</button>
            {pageNumbers.map((n, i) =>
              n === '...' ? <span key={`dots-${i}`} className="px-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>…</span> : (
                <button key={n} onClick={() => setPage(n as number)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${page === n ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)] text-white font-semibold' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                  {n}
                </button>
              )
            )}
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">›</button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">»</button>
          </div>
          <span className="text-sm hidden sm:block" style={{ color: 'var(--text-muted)' }}>Page {page} of {totalPages || 1}</span>
        </div>
      </div>

      {/* ── Add / Edit Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={handleModalClose}
        title={isNew ? 'Add Operation' : `Edit Operation — ${editItem?.operation_code}`}
        size="2xl"
        footer={
          <>
            <button onClick={handleModalClose} className="btn-secondary">Cancel</button>
            <button onClick={onSubmit} disabled={saving} className="btn-primary">
              {saving
                ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />Saving…</>
                : isNew ? 'Create Operation' : 'Update Operation'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Operation Name<Req /></label>
            <input value={form.operation_name} onChange={e => setField('operation_name', e.target.value)}
              className={`form-input ${formErrors.operation_name ? 'border-red-500' : ''}`} placeholder="e.g. Casting, Polishing…" />
            {formErrors.operation_name && <p className="text-xs text-red-500 mt-1">{formErrors.operation_name}</p>}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Department<Req /></label>
            <select value={form.dept_id} onChange={e => setField('dept_id', e.target.value)}
              className={`form-input ${formErrors.dept_id ? 'border-red-500' : ''}`}>
              <option value="">Select Department</option>
              {deptOptions.map(d => <option key={d.id} value={d.id}>{d.dept_code} — {d.dept_name}</option>)}
            </select>
            {formErrors.dept_id && <p className="text-xs text-red-500 mt-1">{formErrors.dept_id}</p>}
          </div>

          {/* Machine multi-select — inline panel (avoids modal overflow clipping) */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Machine(s)<Req /></label>
              <div className="flex items-center gap-3">
                {form.machine_ids.length > 0 && (
                  <button type="button" onClick={() => { setForm(f => ({ ...f, machine_ids: [] })); setFormErrors(e => ({ ...e, machine_ids: undefined })) }}
                    className="text-xs text-red-500 hover:underline">Clear all</button>
                )}
                <span className="text-xs font-medium" style={{ color: 'var(--accent-gold)' }}>
                  {form.machine_ids.length > 0 ? `${form.machine_ids.length} selected` : 'None selected'}
                </span>
              </div>
            </div>

            {/* Selected tags */}
            {form.machine_ids.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {form.machine_ids.map(mid => {
                  const m = machineOptions.find(o => o.id === mid)
                  return m ? (
                    <span key={mid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-gold)]/15 border border-[var(--accent-gold)]/30" style={{ color: 'var(--accent-gold)' }}>
                      {m.machine_code}
                      <button type="button" onClick={() => toggleMachineId(mid)} className="hover:text-red-500 transition-colors">
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ) : null
                })}
              </div>
            )}

            {/* Inline panel */}
            <div className={`rounded-xl border overflow-hidden ${formErrors.machine_ids ? 'border-red-500' : 'border-[var(--border-color)]'}`}>
              {/* Search + Select All row */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-color)]" style={{ background: 'var(--bg-secondary)' }}>
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  <input
                    value={machineSearch}
                    onChange={e => setMachineSearch(e.target.value)}
                    placeholder="Search machines…"
                    className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] focus:outline-none focus:border-[var(--accent-gold)]"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>
                <button type="button" className="text-xs font-medium whitespace-nowrap hover:underline flex-shrink-0" style={{ color: 'var(--accent-gold)' }}
                  onClick={() => {
                    const filtered = machineOptions.filter(m =>
                      !machineSearch || `${m.machine_code} ${m.machine_name} ${m.machine_type ?? ''} ${m.dept_name ?? ''}`.toLowerCase().includes(machineSearch.toLowerCase())
                    )
                    const allIds = filtered.map(m => m.id)
                    const allSelected = allIds.every(id => form.machine_ids.includes(id))
                    setForm(f => ({
                      ...f,
                      machine_ids: allSelected
                        ? f.machine_ids.filter(id => !allIds.includes(id))
                        : [...new Set([...f.machine_ids, ...allIds])]
                    }))
                    setFormErrors(e => ({ ...e, machine_ids: undefined }))
                  }}>
                  {(() => {
                    const filtered = machineOptions.filter(m =>
                      !machineSearch || `${m.machine_code} ${m.machine_name} ${m.machine_type ?? ''} ${m.dept_name ?? ''}`.toLowerCase().includes(machineSearch.toLowerCase())
                    )
                    return filtered.length > 0 && filtered.every(m => form.machine_ids.includes(m.id)) ? 'Deselect All' : 'Select All'
                  })()}
                </button>
              </div>

              {/* Checkbox list */}
              <div className="max-h-44 overflow-y-auto" style={{ background: 'var(--bg-card)' }}>
                {machineOptions
                  .filter(m => !machineSearch || `${m.machine_code} ${m.machine_name} ${m.machine_type ?? ''} ${m.dept_name ?? ''}`.toLowerCase().includes(machineSearch.toLowerCase()))
                  .map(m => (
                    <label key={m.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--bg-secondary)] cursor-pointer select-none border-b border-[var(--border-color)] last:border-0 transition-colors">
                      <input type="checkbox"
                        checked={form.machine_ids.includes(m.id)}
                        onChange={() => toggleMachineId(m.id)}
                        className="w-4 h-4 flex-shrink-0 accent-[var(--color-primary)]" />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold font-mono mr-2" style={{ color: 'var(--accent-gold)' }}>{m.machine_code}</span>
                        <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{m.machine_name}</span>
                        {(m.machine_type || m.dept_name) && (
                          <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>
                            {[m.machine_type, m.dept_name].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                {machineOptions.filter(m =>
                  !machineSearch || `${m.machine_code} ${m.machine_name} ${m.machine_type ?? ''} ${m.dept_name ?? ''}`.toLowerCase().includes(machineSearch.toLowerCase())
                ).length === 0 && (
                  <div className="px-3 py-5 text-xs text-center" style={{ color: 'var(--text-muted)' }}>No machines match "{machineSearch}"</div>
                )}
              </div>
            </div>
            {formErrors.machine_ids && <p className="text-xs text-red-500 mt-1">{formErrors.machine_ids}</p>}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Process By</label>
            <select value={form.process_by} onChange={e => setField('process_by', e.target.value)} className="form-input">
              <option value="">— None —</option>
              {processBy.map(o => <option key={o.lookup_code} value={o.lookup_name}>{o.lookup_name}</option>)}
            </select>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Std Time (min)<Req /></label>
            <input type="number" min="0.01" step="0.01"
              value={form.std_time} onChange={e => setField('std_time', e.target.value)}
              className={`form-input ${formErrors.std_time ? 'border-red-500' : ''}`} placeholder="e.g. 45.5" />
            {formErrors.std_time && <p className="text-xs text-red-500 mt-1">{formErrors.std_time}</p>}
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Yield %</label>
            <input type="number" min="0" max="100" step="0.01"
              value={form.yield_percentage} onChange={e => setField('yield_percentage', e.target.value)}
              className={`form-input ${formErrors.yield_percentage ? 'border-red-500' : ''}`} placeholder="e.g. 98.5" />
            {formErrors.yield_percentage && <p className="text-xs text-red-500 mt-1">{formErrors.yield_percentage}</p>}
          </div>

          {isNew && (
            <div className="col-span-2 sm:col-span-4">
              <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Operation Code will be auto-generated (OP0001, OP0002, …)</p>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Unsaved Changes Warning ───────────────────────────────── */}
      <ConfirmDialog
        isOpen={showCloseWarning}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to close? All unsaved data will be lost."
        confirmLabel="Discard Changes"
        variant="warning"
        onConfirm={closeModal}
        onCancel={() => setShowCloseWarning(false)}
      />

      {/* ── Deactivate Dialog ─────────────────────────────────────── */}
      <DeactivateReasonDialog
        isOpen={!!toggleItem?.is_active}
        title="Deactivate Operation"
        itemLabel={`"${toggleItem?.operation_name}" (${toggleItem?.operation_code})`}
        onConfirm={reason => confirmToggle(reason)}
        onCancel={() => setToggleItem(null)}
      />

      {/* ── Activate Confirm ──────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!toggleItem && !toggleItem.is_active}
        title="Activate Operation"
        message={`Activate operation "${toggleItem?.operation_name}" (${toggleItem?.operation_code})?`}
        confirmLabel="Activate"
        variant="info"
        onConfirm={() => confirmToggle()}
        onCancel={() => setToggleItem(null)}
      />

      {/* ── Import Modal (3-step: upload → preview → result) ─────── */}
      <Modal
        isOpen={importOpen}
        onClose={() => { if (!importing) { setImportOpen(false); setImportStep('upload') } }}
        title={
          importStep === 'upload'  ? 'Import Operations from Excel' :
          importStep === 'preview' ? 'Preview Import Data' :
                                     'Import Results'
        }
        size={importStep === 'preview' ? '2xl' : 'md'}
        footer={
          importStep === 'upload' ? (
            <>
              <button onClick={() => setImportOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => importFileRef.current?.click()} className="btn-primary flex items-center gap-2">
                <ArrowUpTrayIcon className="w-4 h-4" /> Choose File
              </button>
            </>
          ) : importStep === 'preview' ? (
            <>
              <button onClick={() => setImportStep('upload')} className="btn-secondary">← Back</button>
              <button
                onClick={runImport}
                disabled={importRows.filter(r => r.errors.length === 0).length === 0}
                className="btn-primary disabled:opacity-50"
              >
                Import {importRows.filter(r => r.errors.length === 0).length} Row{importRows.filter(r => r.errors.length === 0).length !== 1 ? 's' : ''}
              </button>
            </>
          ) : (
            <button onClick={() => { setImportOpen(false); setImportStep('upload') }} disabled={importing} className="btn-primary">
              Close
            </button>
          )
        }
      >
        {/* Step 1: Upload */}
        {importStep === 'upload' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Download the template, fill in operation data, then upload.
                Dept Code and Machine Code(s) must match active records.
                Multiple machines can be entered as comma-separated codes (e.g. MC0001,MC0002).
                Process By must match a valid lookup value (optional).
              </p>
            </div>
            <button onClick={downloadImportTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-[var(--accent-gold)]/50 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/5 transition-colors text-sm font-medium w-full justify-center">
              <ArrowDownTrayIcon className="w-4 h-4" /> Download Template (.xlsx)
            </button>
            <button onClick={() => importFileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 w-full py-8 rounded-xl border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent-gold)]/50 hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-muted)]">
              <ArrowUpTrayIcon className="w-7 h-7" />
              <span className="text-sm font-medium">Click to upload Excel file</span>
              <span className="text-xs">.xlsx or .xls</span>
            </button>
          </div>
        )}

        {/* Step 2: Preview */}
        {importStep === 'preview' && (() => {
          const validCount   = importRows.filter(r => r.errors.length === 0).length
          const invalidCount = importRows.length - validCount
          return (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-green-600 font-medium">
                  <CheckCircleIcon className="w-4 h-4" /> {validCount} valid
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1.5 text-red-500 font-medium">
                    <ExclamationTriangleIcon className="w-4 h-4" /> {invalidCount} will be skipped
                  </span>
                )}
                <span style={{ color: 'var(--text-muted)' }}>Total: {importRows.length} rows</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--bg-secondary)]">
                    <tr>
                      {['#', 'Operation Name', 'Dept Code', 'Machine Code', 'Std Time', 'Status'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map(row => (
                      <React.Fragment key={row._rowNum}>
                        <tr className={`border-t border-[var(--border-color)] ${row.errors.length > 0 ? 'bg-red-50/50' : ''}`}>
                          <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{row._rowNum}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{row.operation_name || '—'}</td>
                          <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{row.dept_code || '—'}</td>
                          <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{row.machine_code || '—'}</td>
                          <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--text-secondary)' }}>{row.std_time || '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.errors.length === 0
                              ? <span className="text-green-600 font-semibold">✓ Valid</span>
                              : <span className="text-red-600 font-semibold">✗ {row.errors.length} error{row.errors.length > 1 ? 's' : ''}</span>}
                          </td>
                        </tr>
                        {row.errors.length > 0 && (
                          <tr className="bg-red-50/80">
                            <td className="px-3 pb-2.5" />
                            <td colSpan={5} className="px-3 pb-2.5 pt-1">
                              <ul className="space-y-1">
                                {row.errors.map((e, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-red-700">
                                    <span className="flex-shrink-0 font-bold text-red-400">•</span>
                                    <span>{e}</span>
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}

        {/* Step 3: Result */}
        {importStep === 'result' && (
          <div className="flex flex-col gap-4">
            {importing ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Importing operations…</p>
              </div>
            ) : importResult && (
              <>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-800 font-medium">
                    {importResult.created} operation{importResult.created !== 1 ? 's' : ''} imported successfully
                    {importResult.skipped > 0 ? `, ${importResult.skipped} skipped` : ''}
                  </p>
                </div>
                {importResult.errors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1.5">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      {importResult.errors.length} row{importResult.errors.length > 1 ? 's' : ''} failed:
                    </p>
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-red-200 bg-red-50/50">
                      {importResult.errors.map((e, i) => (
                        <p key={i} className="px-3 py-1.5 text-xs text-red-700 border-b border-red-100 last:border-0">{e}</p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default OperationMasterPage
