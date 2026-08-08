import React, { useState, useEffect, useRef, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon,
  MagnifyingGlassIcon, XMarkIcon, ViewColumnsIcon,
  ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon,
  FunnelIcon, BarsArrowUpIcon, NoSymbolIcon, CheckCircleIcon,
  ArrowDownTrayIcon, ArrowUpTrayIcon,
  WrenchScrewdriverIcon, InformationCircleIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import Modal                  from '@/components/common/Modal'
import Badge                  from '@/components/common/Badge'
import ConfirmDialog          from '@/components/common/ConfirmDialog'
import DeactivateReasonDialog from '@/components/common/DeactivateReasonDialog'
import { formatDate, formatDateTime, exportToCSV, exportToExcel, exportToPDF } from '@/utils/helpers'
import { apiService } from '@/api/apiService'

// ── Types ──────────────────────────────────────────────────────
interface MachineEntry {
  id:                  number
  machine_code:        string
  machine_name:        string
  machine_type:        string
  dept_id:             number
  dept_name:           string | null
  make_brand:          string
  capacity_speed:      string
  machine_remarks:     string | null
  deactivation_reason: string | null
  deactivated_at:      string | null
  used_elsewhere:      boolean
  is_active:           boolean
  created_at:          string
  updated_at:          string | null
}

interface DeptOption   { id: number; dept_code: string; dept_name: string }
interface LookupOption { lookup_code: string; lookup_name: string }

type FormValues = {
  machine_name:    string
  machine_type:    string
  dept_id:         string
  make_brand:      string
  capacity_speed:  string
  machine_remarks: string
}

const blankForm: FormValues = {
  machine_name:    '',
  machine_type:    '',
  dept_id:         '',
  make_brand:      '',
  capacity_speed:  '',
  machine_remarks: '',
}

// ── Import row type ───────────────────────────────────────────
interface MImportRow {
  _rowNum:         number
  machine_name:    string
  machine_type:    string
  dept_code:       string
  make_brand:      string
  capacity_speed:  string
  machine_remarks: string
  errors:          string[]
}

const PAGE_SIZES = [10, 25, 50, 100]
const Req = () => <span className="text-red-500 ml-0.5">*</span>

interface ColDef { key: string; label: string; sortKey?: string; visible: boolean; minW?: string }

const INITIAL_COLS: ColDef[] = [
  { key: 'machine_code',    label: 'Machine Code',     sortKey: 'machine_code',    visible: true,  minW: '120px' },
  { key: 'machine_name',    label: 'Machine Name',     sortKey: 'machine_name',    visible: true,  minW: '180px' },
  { key: 'machine_type',    label: 'Type',             sortKey: 'machine_type',    visible: true,  minW: '150px' },
  { key: 'dept_name',       label: 'Department',       sortKey: 'dept_name',       visible: true,  minW: '140px' },
  { key: 'make_brand',      label: 'Make / Brand',     sortKey: 'make_brand',      visible: true,  minW: '150px' },
  { key: 'capacity_speed',  label: 'Capacity / Speed', sortKey: 'capacity_speed',  visible: true,  minW: '150px' },
  { key: 'machine_remarks', label: 'Remarks',                                       visible: false, minW: '160px' },
  { key: 'is_active',           label: 'Status',                                    visible: true,  minW: '90px'  },
  { key: 'deactivation_reason', label: 'Deactive Reason',                           visible: true,  minW: '160px' },
  { key: 'deactivated_at',      label: 'Deactive Date',                             visible: true,  minW: '120px' },
  { key: 'created_at',      label: 'Created',          sortKey: 'created_at',      visible: true,  minW: '130px' },
]

// ── Page ───────────────────────────────────────────────────────
const MachineMasterPage: React.FC = () => {

  // ── Lookup options ────────────────────────────────────────────
  const [deptOptions,    setDeptOptions]    = useState<DeptOption[]>([])
  const [machineTypes,   setMachineTypes]   = useState<LookupOption[]>([])
  const [makeBrands,     setMakeBrands]     = useState<LookupOption[]>([])
  const [capacitySpeeds, setCapacitySpeeds] = useState<LookupOption[]>([])

  // ── Form state (controlled local state per project pattern) ───
  const [form,             setForm]           = useState<FormValues>(blankForm)
  const [initialForm,      setInitialForm]    = useState<FormValues>(blankForm)
  const [formErrors,       setFormErrors]     = useState<Partial<Record<keyof FormValues, string>>>({})
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm)

  const setField = (key: keyof FormValues, val: string) => {
    setForm(f => ({ ...f, [key]: val }))
    if (formErrors[key]) setFormErrors(e => ({ ...e, [key]: undefined }))
  }

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormValues, string>> = {}
    if (!form.machine_name.trim()) errs.machine_name   = 'Machine Name is required'
    if (!form.machine_type)        errs.machine_type   = 'Machine Type is required'
    if (!form.dept_id)             errs.dept_id        = 'Department is required'
    if (!form.make_brand)          errs.make_brand     = 'Make / Brand is required'
    if (!form.capacity_speed)      errs.capacity_speed = 'Capacity / Speed is required'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Modal state ───────────────────────────────────────────────
  const [saving,           setSaving]           = useState(false)
  const [modalOpen,        setModalOpen]        = useState(false)
  const [editItem,         setEditItem]         = useState<MachineEntry | null>(null)
  const [showCloseWarning, setShowCloseWarning] = useState(false)
  const [toggleItem,       setToggleItem]       = useState<MachineEntry | null>(null)
  const isNew = !editItem

  // ── Import state (3-step: upload → preview → result) ─────────
  const [importOpen,    setImportOpen]    = useState(false)
  const [importStep,    setImportStep]    = useState<'upload' | 'preview' | 'result'>('upload')
  const [importRows,    setImportRows]    = useState<MImportRow[]>([])
  const [importResult,  setImportResult]  = useState<{ created: number; skipped: number; errors: string[] } | null>(null)
  const [importing,     setImporting]     = useState(false)
  const importFileRef   = useRef<HTMLInputElement>(null)

  // ── Grid state ────────────────────────────────────────────────
  const [items,        setItems]        = useState<MachineEntry[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetching,     setFetching]     = useState(false)
  const isFirstLoad    = useRef(true)
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active')
  const [stats,        setStats]        = useState({ active: 0, inactive: 0 })
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(25)
  const [searchInput,  setSearchInput]  = useState('')
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState('machine_code')
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
  const [selectedRows,  setSelectedRows]  = useState<MachineEntry[]>([])
  const [exportOpen,    setExportOpen]    = useState(false)
  const [exporting,     setExporting]     = useState(false)
  const colPickerRef   = useRef<HTMLDivElement>(null)
  const exportRef      = useRef<HTMLDivElement>(null)
  const masterCheckRef = useRef<HTMLInputElement>(null)
  const searchTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cfTimer        = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Outside-click ─────────────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setShowColPicker(false)
      if (exportRef.current    && !exportRef.current.contains(e.target as Node))    setExportOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Debounces ─────────────────────────────────────────────────
  const onSearchInput = (val: string) => {
    setSearchInput(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1) }, 400)
  }

  useEffect(() => {
    if (cfTimer.current) clearTimeout(cfTimer.current)
    cfTimer.current = setTimeout(() => { setDebouncedCF(colFilters); setPage(1) }, 400)
  }, [colFilters]) // eslint-disable-line

  // ── Lookups ───────────────────────────────────────────────────
  const loadLookups = async () => {
    try {
      const [deptRes, mtRes, mbRes, csRes] = await Promise.all([
        apiService.get('/departments/lov'),
        apiService.get('/lookup-master/lov/MACHINE_TYPE'),
        apiService.get('/lookup-master/lov/MAKE_BRAND'),
        apiService.get('/lookup-master/lov/CAPACITY_SPEED'),
      ])
      setDeptOptions(deptRes.data?.data ?? [])
      setMachineTypes(mtRes.data?.data ?? [])
      setMakeBrands(mbRes.data?.data ?? [])
      setCapacitySpeeds(csRes.data?.data ?? [])
    } catch { /* silent */ }
  }

  const loadStats = async () => {
    try {
      const res = await apiService.get('/machines/stats')
      setStats(res.data?.data ?? { active: 0, inactive: 0 })
    } catch { /* silent */ }
  }

  const loadItems = async () => {
    if (isFirstLoad.current) setLoading(true); else setFetching(true)
    try {
      const activeCF = Object.fromEntries(Object.entries(debouncedCF).filter(([, v]) => v.trim()))
      const res = await apiService.get('/machines', {
        params: {
          page, limit: pageSize, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter,
          ...(Object.keys(activeCF).length > 0 && { col_filters: JSON.stringify(activeCF) }),
        },
      })
      setItems(res.data?.data ?? [])
      setTotal(res.data?.meta?.total ?? 0)
      setTotalPages(res.data?.meta?.total_pages ?? 1)
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load machines')
    } finally { setLoading(false); setFetching(false); isFirstLoad.current = false }
  }

  useEffect(() => { loadStats(); loadLookups() }, [])  // eslint-disable-line
  useEffect(() => { loadItems() }, [page, pageSize, search, sortBy, sortDir, debouncedCF, statusFilter]) // eslint-disable-line

  // ── Row selection ─────────────────────────────────────────────
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
  const toggleSelectRow = (item: MachineEntry) =>
    setSelectedRows(prev => prev.some(r => r.id === item.id) ? prev.filter(r => r.id !== item.id) : [...prev, item])

  // ── Grid controls ─────────────────────────────────────────────
  const handleSort    = (key: string) => { if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(key); setSortDir('asc') }; setPage(1) }
  const toggleCol      = (key: string) => setCols(cs => cs.map(c => c.key === key ? { ...c, visible: !c.visible } : c))
  const gridCols = statusFilter === 'inactive' ? cols : cols.filter(c => c.key !== 'deactivation_reason' && c.key !== 'deactivated_at')
  const visibleCols    = gridCols.filter(c => c.visible)

  // ── Export ────────────────────────────────────────────────────
  const buildExportRows = (rows: MachineEntry[]) => rows.map(r => ({
    'Machine Code':    r.machine_code,
    'Machine Name':    r.machine_name,
    'Type':            r.machine_type,
    'Department':      r.dept_name || '',
    'Make / Brand':    r.make_brand,
    'Capacity / Speed':r.capacity_speed,
    'Remarks':         r.machine_remarks || '',
    'Status':          r.is_active ? 'Active' : 'Inactive',
    ...(statusFilter === 'inactive' && {
      'Deactive Reason': r.deactivation_reason || '',
      'Deactive Date': r.deactivated_at ? formatDate(String(r.deactivated_at)) : '',
    }),
    'Created At':      formatDateTime(String(r.created_at)),
  }))

  const handleExport = async (scope: 'all' | 'selected', format: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false)
    let rows: MachineEntry[]
    if (scope === 'selected') {
      rows = selectedRows
      if (!rows.length) { toast.error('No rows selected'); return }
    } else {
      setExporting(true)
      try {
        const activeCF = Object.fromEntries(Object.entries(debouncedCF).filter(([, v]) => v.trim()))
        const res = await apiService.get('/machines', { params: { page: 1, limit: 9999, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter, ...(Object.keys(activeCF).length > 0 && { col_filters: JSON.stringify(activeCF) }) } })
        rows = res.data?.data ?? []
      } catch { toast.error('Failed to fetch export data'); setExporting(false); return }
      setExporting(false)
    }
    const fname = `machine_master_${statusFilter}`
    const data  = buildExportRows(rows)
    if (format === 'csv')        exportToCSV(data, fname)
    else if (format === 'excel') void exportToExcel(data, fname)
    else                         void exportToPDF(data, fname, 'Machine Master Report')
  }

  // ── Pagination ────────────────────────────────────────────────
  const pageNumbers = useMemo((): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 4)              return [1, 2, 3, 4, 5, '...', totalPages]
    if (page >= totalPages - 3) return [1, '...', totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages]
    return [1, '...', page - 1, page, page + 1, '...', totalPages]
  }, [page, totalPages])
  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endRow   = Math.min(page * pageSize, total)

  // ── Modal helpers ─────────────────────────────────────────────
  const closeModal = () => {
    setModalOpen(false); setForm(blankForm); setInitialForm(blankForm); setFormErrors({}); setShowCloseWarning(false)
  }
  const handleModalClose = () => { if (isDirty) setShowCloseWarning(true); else closeModal() }

  const openAdd = () => {
    setEditItem(null); setForm(blankForm); setInitialForm(blankForm); setFormErrors({}); setModalOpen(true)
  }
  const openEdit = (item: MachineEntry) => {
    setEditItem(item)
    const f: FormValues = {
      machine_name:    item.machine_name,
      machine_type:    item.machine_type,
      dept_id:         String(item.dept_id),
      make_brand:      item.make_brand,
      capacity_speed:  item.capacity_speed,
      machine_remarks: item.machine_remarks ?? '',
    }
    setForm(f); setInitialForm(f); setFormErrors({}); setModalOpen(true)
  }

  const onSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        machine_name:    form.machine_name.trim(),
        machine_type:    form.machine_type,
        dept_id:         parseInt(form.dept_id, 10),
        make_brand:      form.make_brand,
        capacity_speed:  form.capacity_speed,
        machine_remarks: form.machine_remarks.trim() || null,
      }
      if (isNew) {
        await apiService.post('/machines', payload)
        toast.success('Machine created successfully')
      } else {
        await apiService.put(`/machines/${editItem!.id}`, payload)
        toast.success('Machine updated successfully')
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
      const res = await apiService.delete(`/machines/${toggleItem.id}`, reason ? { data: { reason } } : undefined)
      toast.success(res.data?.message || 'Status updated')
      setToggleItem(null)
      await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed')
    }
  }

  // ── Import helpers ────────────────────────────────────────────
  const openImport = () => {
    setImportOpen(true); setImportStep('upload')
    setImportRows([]); setImportResult(null)
  }

  const downloadImportTemplate = async () => {
    const XLSX = await import('xlsx')
    const headers = ['Machine Name *', 'Machine Type *', 'Dept Code *', 'Make / Brand *', 'Capacity / Speed *', 'Remarks']
    const sample  = ['Laser Machine 1', 'Laser Machine', 'PROD', 'Tanaka / Italian', '60-100 gm/hr', 'Main floor']
    const ws = XLSX.utils.aoa_to_sheet([headers, sample])
    ws['!cols'] = headers.map(() => ({ wch: 22 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Machines')
    XLSX.writeFile(wb, `machine_import_template_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleImportFile = async (file: File) => {
    const XLSX = await import('xlsx')
    const buf  = await file.arrayBuffer()
    const wb   = XLSX.read(buf, { type: 'array' })
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const raw  = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

    const validTypes   = new Set(machineTypes.map(o => o.lookup_name.toLowerCase()))
    const validBrands  = new Set(makeBrands.map(o => o.lookup_name.toLowerCase()))
    const validSpeeds  = new Set(capacitySpeeds.map(o => o.lookup_name.toLowerCase()))
    const validDeptMap = new Map(deptOptions.map(d => [d.dept_code.toUpperCase(), d]))

    const HEADER_MAP: Record<string, keyof MImportRow> = {
      'machine name':     'machine_name',
      'machine type':     'machine_type',
      'dept code':        'dept_code',
      'make / brand':     'make_brand',
      'make/brand':       'make_brand',
      'make brand':       'make_brand',
      'capacity / speed': 'capacity_speed',
      'capacity/speed':   'capacity_speed',
      'capacity speed':   'capacity_speed',
      'remarks':          'machine_remarks',
    }
    const norm = (h: string) => h.replace(/\*/g, '').trim().toLowerCase()

    const parsed: MImportRow[] = raw.map((r, idx) => {
      const row: Partial<MImportRow> = { _rowNum: idx + 2, errors: [] }
      Object.entries(r).forEach(([col, val]) => {
        const field = HEADER_MAP[norm(col)]
        if (field) (row as Record<string, unknown>)[field] = String(val ?? '').trim()
      })
      const errs: string[] = []
      if (!row.machine_name?.trim())  errs.push('Machine Name is required')
      if (!row.machine_type?.trim())  errs.push('Machine Type is required')
      else if (!validTypes.has(row.machine_type.toLowerCase())) errs.push(`Unknown Machine Type: "${row.machine_type}"`)
      if (!row.dept_code?.trim())     errs.push('Dept Code is required')
      else if (!validDeptMap.has(row.dept_code.toUpperCase()))  errs.push(`Dept code "${row.dept_code}" not found`)
      if (!row.make_brand?.trim())    errs.push('Make / Brand is required')
      else if (!validBrands.has(row.make_brand.toLowerCase()))  errs.push(`Unknown Make/Brand: "${row.make_brand}"`)
      if (!row.capacity_speed?.trim()) errs.push('Capacity / Speed is required')
      else if (!validSpeeds.has(row.capacity_speed.toLowerCase())) errs.push(`Unknown Capacity/Speed: "${row.capacity_speed}"`)
      row.errors = errs
      return row as MImportRow
    })

    setImportRows(parsed)
    setImportStep('preview')
  }

  const runImport = async () => {
    const valid = importRows.filter(r => r.errors.length === 0)
    if (!valid.length) return
    setImporting(true); setImportStep('result')
    try {
      const res = await apiService.post('/machines/import', { rows: valid })
      setImportResult(res.data?.data ?? { created: 0, skipped: 0, errors: [] })
      if ((res.data?.data?.created ?? 0) > 0) await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      setImportResult({ created: 0, skipped: 0, errors: [(err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Import failed'] })
    } finally { setImporting(false) }
  }

  // ── Cell renderer ─────────────────────────────────────────────
  const renderCell = (col: ColDef, row: MachineEntry) => {
    switch (col.key) {
      case 'machine_code': return <span className="font-mono text-sm font-semibold" style={{ color: 'var(--accent-gold)' }}>{row.machine_code}</span>
      case 'machine_name': return <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{row.machine_name}</span>
      case 'machine_type': return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium whitespace-nowrap">{row.machine_type}</span>
      case 'is_active':    return <Badge label={row.is_active ? 'Active' : 'Inactive'} variant={row.is_active ? 'success' : 'danger'} />
      case 'deactivation_reason': return row.deactivation_reason ? <span className="text-sm text-[var(--text-secondary)]">{row.deactivation_reason}</span> : <span className="text-[var(--text-muted)]">—</span>
      case 'deactivated_at': return row.deactivated_at ? <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(String(row.deactivated_at))}</span> : <span className="text-[var(--text-muted)]">—</span>
      case 'created_at':   return <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(String(row.created_at))}</span>
      default: return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{String((row as unknown as Record<string, unknown>)[col.key] ?? '') || '—'}</span>
    }
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <span>Masters</span><span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>Machine Master</span>
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
          <PlusIcon className="w-4 h-4" /> Add Machine
        </button>
      </div>

      {/* Grid card */}
      <div className="card overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[var(--border-color)]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input value={searchInput} onChange={e => onSearchInput(e.target.value)} placeholder="Search machines…"
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
                      <span className="text-base">{fmt === 'csv' ? '📄' : fmt === 'excel' ? '📊' : '📋'}</span>
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
                          <span className="text-base">{fmt === 'csv' ? '📄' : fmt === 'excel' ? '📊' : '📋'}</span>
                          <span className="font-medium">{fmt === 'csv' ? 'CSV' : fmt === 'excel' ? 'Excel (.xlsx)' : 'PDF'}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Import icon button — matches CustomerMasterPage position */}
            <button onClick={openImport} title="Import Machines from Excel"
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
                        <div className="h-4 rounded animate-pulse bg-[var(--bg-tertiary)]" style={{ width: col.key === 'machine_name' ? '160px' : '90px' }} />
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
                      <WrenchScrewdriverIcon className="w-10 h-10 opacity-30" />
                      {search || Object.values(colFilters).some(v => v)
                        ? 'No machines match the current filters.'
                        : `No ${statusFilter} machines found. Click "Add Machine" to get started.`}
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
                        <button onClick={() => openEdit(item)} className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500 ${(!item.is_active || item.used_elsewhere) ? 'invisible' : ''}`} title="Edit">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => setToggleItem(item)}
                          className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] ${item.is_active ? 'text-red-500' : 'text-green-500'} ${item.used_elsewhere ? 'invisible' : ''}`}
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
              {total === 0 ? 'No records found' : `Showing ${startRow}–${endRow} of ${total} machines`}
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

      {/* ── Add / Edit Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={handleModalClose}
        title={isNew ? 'Add Machine' : `Edit Machine — ${editItem?.machine_code}`}
        size="lg"
        footer={
          <>
            <button onClick={handleModalClose} className="btn-secondary">Cancel</button>
            <button onClick={onSubmit} disabled={saving} className="btn-primary">
              {saving
                ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />Saving…</>
                : isNew ? 'Create Machine' : 'Update Machine'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Machine Name<Req /></label>
            <input value={form.machine_name} onChange={e => setField('machine_name', e.target.value)}
              className={`form-input ${formErrors.machine_name ? 'border-red-500' : ''}`} placeholder="e.g. Laser Machine 1" />
            {formErrors.machine_name && <p className="text-xs text-red-500 mt-1">{formErrors.machine_name}</p>}
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Machine Type<Req /></label>
            <select value={form.machine_type} onChange={e => setField('machine_type', e.target.value)}
              className={`form-input ${formErrors.machine_type ? 'border-red-500' : ''}`}>
              <option value="">Select Type</option>
              {machineTypes.map(o => <option key={o.lookup_code} value={o.lookup_name}>{o.lookup_name}</option>)}
            </select>
            {formErrors.machine_type && <p className="text-xs text-red-500 mt-1">{formErrors.machine_type}</p>}
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Department<Req /></label>
            <select value={form.dept_id} onChange={e => setField('dept_id', e.target.value)}
              className={`form-input ${formErrors.dept_id ? 'border-red-500' : ''}`}>
              <option value="">Select Department</option>
              {deptOptions.map(d => <option key={d.id} value={d.id}>{d.dept_code} — {d.dept_name}</option>)}
            </select>
            {formErrors.dept_id && <p className="text-xs text-red-500 mt-1">{formErrors.dept_id}</p>}
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Make / Brand<Req /></label>
            <select value={form.make_brand} onChange={e => setField('make_brand', e.target.value)}
              className={`form-input ${formErrors.make_brand ? 'border-red-500' : ''}`}>
              <option value="">Select Brand</option>
              {makeBrands.map(o => <option key={o.lookup_code} value={o.lookup_name}>{o.lookup_name}</option>)}
            </select>
            {formErrors.make_brand && <p className="text-xs text-red-500 mt-1">{formErrors.make_brand}</p>}
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Capacity / Speed<Req /></label>
            <select value={form.capacity_speed} onChange={e => setField('capacity_speed', e.target.value)}
              className={`form-input ${formErrors.capacity_speed ? 'border-red-500' : ''}`}>
              <option value="">Select Capacity</option>
              {capacitySpeeds.map(o => <option key={o.lookup_code} value={o.lookup_name}>{o.lookup_name}</option>)}
            </select>
            {formErrors.capacity_speed && <p className="text-xs text-red-500 mt-1">{formErrors.capacity_speed}</p>}
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Remarks</label>
            <input value={form.machine_remarks} onChange={e => setField('machine_remarks', e.target.value)}
              className="form-input" placeholder="Optional remarks" />
          </div>

          {isNew && (
            <div className="col-span-2">
              <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Machine Code will be auto-generated (MC0001, MC0002, …)</p>
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
        title="Deactivate Machine"
        itemLabel={`"${toggleItem?.machine_name}" (${toggleItem?.machine_code})`}
        onConfirm={reason => confirmToggle(reason)}
        onCancel={() => setToggleItem(null)}
      />

      {/* ── Activate Confirm ──────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!toggleItem && !toggleItem.is_active}
        title="Activate Machine"
        message={`Activate machine "${toggleItem?.machine_name}" (${toggleItem?.machine_code})?`}
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
          importStep === 'upload'  ? 'Import Machines from Excel' :
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
                Download the template, fill in machine data, then upload the file.
                Machine Type, Make/Brand and Capacity/Speed must match valid lookup values.
                Dept Code must match an active department.
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
                    <ExclamationTriangleIcon className="w-4 h-4" /> {invalidCount} will be skipped (errors)
                  </span>
                )}
                <span style={{ color: 'var(--text-muted)' }}>Total: {importRows.length} rows</span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--bg-secondary)]">
                    <tr>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">#</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Machine Name</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Type</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Dept Code</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Make / Brand</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map(row => (
                      <React.Fragment key={row._rowNum}>
                        <tr className={`border-t border-[var(--border-color)] ${row.errors.length > 0 ? 'bg-red-50/50' : ''}`}>
                          <td className="px-3 py-2 text-[var(--text-muted)]">{row._rowNum}</td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{row.machine_name || '—'}</td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{row.machine_type || '—'}</td>
                          <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">{row.dept_code || '—'}</td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{row.make_brand || '—'}</td>
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
                                    <span className="flex-shrink-0 font-bold text-red-400 leading-tight">•</span>
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
                <p className="text-sm text-[var(--text-secondary)]">Importing machines…</p>
              </div>
            ) : importResult && (
              <>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-800 font-medium">
                    {importResult.created} machine{importResult.created !== 1 ? 's' : ''} imported successfully
                    {importResult.skipped > 0 ? `, ${importResult.skipped} skipped (duplicates)` : ''}
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

export default MachineMasterPage
