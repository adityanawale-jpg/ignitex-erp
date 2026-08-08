import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon,
  MagnifyingGlassIcon, XMarkIcon, ViewColumnsIcon,
  ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon,
  FunnelIcon, BarsArrowUpIcon,
  NoSymbolIcon, CheckCircleIcon,
  ArrowDownTrayIcon, ArrowUpTrayIcon, ChevronRightIcon,
  InformationCircleIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import Modal                  from '@/components/common/Modal'
import Badge                  from '@/components/common/Badge'
import ConfirmDialog          from '@/components/common/ConfirmDialog'
import DeactivateReasonDialog from '@/components/common/DeactivateReasonDialog'
import { formatDate, formatDateTime, exportToCSV, exportToExcel, exportToPDF } from '@/utils/helpers'
import { apiService } from '@/api/apiService'

// Every text field on a lookup entry (Type, Code, Name, Value, Parent Code)
// is capitals + digits + hyphen only — same convention as every other *_code
// field in this app (RC-001, PO-000001, FIN-PN-001). Spaces become hyphens
// rather than being dropped, so multi-word input still reads as words.
const CODE_CHARS_RE = /^[A-Z0-9-]+$/
// Manual entry: silently keep the field valid as the user types (matches the
// live-uppercase behavior already on these inputs) — safe because it's one
// field the user is looking at and can see get cleaned up.
const toCodeFormat = (s: string): string =>
  s.trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '')
// Import: normalize case and spacing only — anything else invalid must be
// flagged and rejected (CODE_CHARS_RE, below), not silently stripped, so a
// bulk import can't quietly save rows that don't match what the file said.
const normalizeCodeSpacing = (s: string): string =>
  s.trim().toUpperCase().replace(/\s+/g, '-')

// ── Types ─────────────────────────────────────────────────────
interface LookupEntry {
  id:            number
  lookup_type:   string
  lookup_code:   string
  lookup_name:   string
  lookup_value:  string | null
  display_order: number
  parent_code:   string | null
  is_active:     boolean
  deactivation_reason: string | null
  deactivated_at:      string | null
  created_at:    string
  updated_at:    string | null
}

// ── Import types ──────────────────────────────────────────────
interface LImportRow {
  _rowNum:       number
  lookup_type:   string
  lookup_code:   string
  lookup_name:   string
  lookup_value:  string
  display_order: string
  parent_code:   string
  errors:        string[]
}

const LOOKUP_HEADER_MAP: Record<string, keyof LImportRow> = {
  'lookup type':   'lookup_type',
  'type':          'lookup_type',
  'lookup code':   'lookup_code',
  'code':          'lookup_code',
  'lookup name':   'lookup_name',
  'name':          'lookup_name',
  'lookup value':  'lookup_value',
  'value':         'lookup_value',
  'display order': 'display_order',
  'order':         'display_order',
  'parent code':   'parent_code',
  'parent':        'parent_code',
}
const normLHeader = (h: string) =>
  h.replace(/\*/g, '').replace(/\(.*?\)/g, '').trim().toLowerCase()

type FormValues = {
  lookup_type:   string
  lookup_code:   string
  lookup_name:   string
  lookup_value:  string
  display_order: number
  parent_code:   string
}

const schema = yup.object({
  lookup_type:   yup.string().required('Lookup Type is required')
    .matches(CODE_CHARS_RE, 'Only capital letters, numbers, and - are allowed'),
  lookup_code:   yup.string().required('Lookup Code is required')
    .matches(CODE_CHARS_RE, 'Only capital letters, numbers, and - are allowed'),
  lookup_name:   yup.string().required('Lookup Name is required')
    .matches(CODE_CHARS_RE, 'Only capital letters, numbers, and - are allowed'),
  lookup_value:  yup.string().default('')
    .matches(CODE_CHARS_RE, { message: 'Only capital letters, numbers, and - are allowed', excludeEmptyString: true }),
  display_order: yup.number().default(0).min(0, 'Must be 0 or more'),
  parent_code:   yup.string().default('')
    .matches(CODE_CHARS_RE, { message: 'Only capital letters, numbers, and - are allowed', excludeEmptyString: true }),
})

const PAGE_SIZES = [10, 25, 50, 100]
const Req = () => <span className="text-red-500 ml-0.5">*</span>

interface ColDef { key: string; label: string; sortKey?: string; visible: boolean; minW?: string }

const INITIAL_COLS: ColDef[] = [
  { key: 'lookup_code',   label: 'Code',          sortKey: 'lookup_code',   visible: true, minW: '120px' },
  { key: 'lookup_name',   label: 'Name',          sortKey: 'lookup_name',   visible: true, minW: '160px' },
  { key: 'lookup_value',  label: 'Value',                                   visible: true, minW: '130px' },
  { key: 'display_order', label: 'Order',         sortKey: 'display_order', visible: true, minW: '70px'  },
  { key: 'parent_code',   label: 'Parent Code',                             visible: true, minW: '110px' },
  { key: 'is_active',           label: 'Status',                            visible: true, minW: '80px'  },
  { key: 'deactivation_reason', label: 'Deactive Reason',                   visible: true, minW: '160px' },
  { key: 'deactivated_at',      label: 'Deactive Date',                     visible: true, minW: '120px' },
  { key: 'created_at',    label: 'Created',       sortKey: 'created_at',    visible: true, minW: '130px' },
]

// ── GroupCheckbox — handles indeterminate state correctly ─────
const GroupCheckbox: React.FC<{
  state: { checked: boolean; indeterminate: boolean }
  onChange: () => void
}> = ({ state, onChange }) => {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state.indeterminate
  }, [state.indeterminate])
  return (
    <input type="checkbox" ref={ref} checked={state.checked} onChange={onChange}
      className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer" />
  )
}

// ── Page ──────────────────────────────────────────────────────
const LookupMasterPage: React.FC = () => {

  const [saving,     setSaving]     = useState(false)
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editItem,   setEditItem]   = useState<LookupEntry | null>(null)
  const [toggleItem, setToggleItem] = useState<LookupEntry | null>(null)
  const isNew = !editItem

  // Track whether the type field is "new" (not in existing list)
  const [isNewType,       setIsNewType]       = useState(false)
  const [typeInputMode,   setTypeInputMode]   = useState<'select' | 'new'>('select')

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<FormValues>({ resolver: yupResolver(schema) as never })

  const watchedType = watch('lookup_type')

  // ── Grid state ─────────────────────────────────────────────
  const [items,        setItems]        = useState<LookupEntry[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetching,     setFetching]     = useState(false)
  const isFirstLoad    = useRef(true)
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active')
  const [stats,        setStats]        = useState({ active: 0, inactive: 0 })
  const [lookupTypes,  setLookupTypes]  = useState<string[]>([])
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(25)
  const [searchInput,  setSearchInput]  = useState('')
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState('lookup_type')
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('asc')
  const [total,        setTotal]        = useState(0)
  const [totalPages,   setTotalPages]   = useState(1)

  // ── Grouping state ─────────────────────────────────────────
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const toggleGroup = (type: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }
  const collapseAll = () => setCollapsedGroups(new Set(groupedTypes))
  const expandAll   = () => setCollapsedGroups(new Set())

  // ── Toolbar state ──────────────────────────────────────────
  const [cols,                setCols]                = useState<ColDef[]>(INITIAL_COLS)
  const [showColPicker,       setShowColPicker]       = useState(false)
  const [showFilterRow,       setShowFilterRow]       = useState(false)
  const [showSorting,         setShowSorting]         = useState(true)
  const [colFilters,          setColFilters]          = useState<Record<string, string>>({})
  const [debouncedColFilters, setDebouncedColFilters] = useState<Record<string, string>>({})
  const colPickerRef   = useRef<HTMLDivElement>(null)
  const searchTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const colFilterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [selectedRows, setSelectedRows] = useState<LookupEntry[]>([])
  const [exportOpen,   setExportOpen]   = useState(false)
  const [exporting,    setExporting]    = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  // ── Import state ───────────────────────────────────────────
  const [importOpen,    setImportOpen]    = useState(false)
  const [importStep,    setImportStep]    = useState<'upload' | 'preview' | 'result'>('upload')
  const [importRows,    setImportRows]    = useState<LImportRow[]>([])
  const [importDone,    setImportDone]    = useState(0)
  const [importTotal,   setImportTotal]   = useState(0)
  const [importErrList, setImportErrList] = useState<{ row: number; msg: string }[]>([])
  const [importing,     setImporting]     = useState(false)
  const importFileRef   = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node))
        setShowColPicker(false)
      if (exportRef.current && !exportRef.current.contains(e.target as Node))
        setExportOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const onSearchInput = (val: string) => {
    setSearchInput(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1) }, 400)
  }

  useEffect(() => {
    if (colFilterTimer.current) clearTimeout(colFilterTimer.current)
    colFilterTimer.current = setTimeout(() => { setDebouncedColFilters(colFilters); setPage(1) }, 400)
  }, [colFilters]) // eslint-disable-line

  const loadStats = async () => {
    try {
      const res = await apiService.get('/lookup-master/stats')
      setStats(res.data?.data ?? { active: 0, inactive: 0 })
    } catch { /* silent */ }
  }

  const loadTypes = async () => {
    try {
      const res = await apiService.get('/lookup-master/types')
      setLookupTypes(res.data?.data ?? [])
    } catch { /* silent */ }
  }

  useEffect(() => { loadStats(); loadTypes() }, []) // eslint-disable-line

  const loadItems = async () => {
    if (isFirstLoad.current) setLoading(true)
    else setFetching(true)
    try {
      const activeCF = Object.fromEntries(Object.entries(debouncedColFilters).filter(([, v]) => v.trim()))
      const res = await apiService.get('/lookup-master', {
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
      toast.error(msg || 'Failed to load lookup master')
    } finally {
      setLoading(false); setFetching(false); isFirstLoad.current = false
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadItems() }, [page, pageSize, search, sortBy, sortDir, debouncedColFilters, statusFilter])

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
    setPage(1)
  }
  const handlePageSize = (size: number) => { setPageSize(size); setPage(1) }

  // ── Grouping ───────────────────────────────────────────────
  const groupedMap = useMemo(() => {
    const map: Record<string, LookupEntry[]> = {}
    items.forEach(item => {
      if (!map[item.lookup_type]) map[item.lookup_type] = []
      map[item.lookup_type].push(item)
    })
    return map
  }, [items])

  const groupedTypes = useMemo(() => Object.keys(groupedMap).sort(), [groupedMap])

  // ── Column helpers ─────────────────────────────────────────
  const toggleCol   = (key: string) => setCols(cs => cs.map(c => c.key === key ? { ...c, visible: !c.visible } : c))
  const gridCols = statusFilter === 'inactive' ? cols : cols.filter(c => c.key !== 'deactivation_reason' && c.key !== 'deactivated_at')
  const visibleCols = gridCols.filter(c => c.visible)

  // ── Export ─────────────────────────────────────────────────
  const getExportData = (rows: LookupEntry[]) =>
    rows.map(r => ({
      'Type': r.lookup_type, 'Code': r.lookup_code, 'Name': r.lookup_name,
      'Value': r.lookup_value || '', 'Display Order': r.display_order,
      'Parent Code': r.parent_code || '', 'Status': r.is_active ? 'Active' : 'Inactive',
      ...(statusFilter === 'inactive' && {
        'Deactive Reason': r.deactivation_reason || '',
        'Deactive Date': r.deactivated_at ? formatDate(String(r.deactivated_at)) : '',
      }),
      'Created At': formatDateTime(String(r.created_at)),
    }))

  const handleExport = async (scope: 'all' | 'selected', format: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false)
    let rows: LookupEntry[]
    if (scope === 'selected') {
      rows = selectedRows
      if (!rows.length) { toast.error('No rows selected'); return }
    } else {
      setExporting(true)
      try {
        const activeCF = Object.fromEntries(Object.entries(debouncedColFilters).filter(([, v]) => v.trim()))
        const res = await apiService.get('/lookup-master', {
          params: { page: 1, limit: 9999, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter,
            ...(Object.keys(activeCF).length > 0 && { col_filters: JSON.stringify(activeCF) }) },
        })
        rows = res.data?.data ?? []
      } catch { toast.error('Failed to fetch export data'); setExporting(false); return }
      setExporting(false)
    }
    const fname = `lookup_master_${statusFilter}`
    const data  = getExportData(rows)
    if (format === 'csv')        exportToCSV(data, fname)
    else if (format === 'excel') void exportToExcel(data, fname)
    else                         void exportToPDF(data, fname, 'Lookup Master Report')
  }

  // ── Row selection ──────────────────────────────────────────
  const currentPageIds   = items.map(r => r.id)
  const allPageSelected  = currentPageIds.length > 0 && currentPageIds.every(id => selectedRows.some(r => r.id === id))
  const somePageSelected = currentPageIds.some(id => selectedRows.some(r => r.id === id))

  // Fix Issue 2: useRef + useEffect to reliably update indeterminate on master checkbox
  const masterCheckRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (masterCheckRef.current) {
      masterCheckRef.current.indeterminate = somePageSelected && !allPageSelected
    }
  }, [somePageSelected, allPageSelected])

  const toggleSelectPage = () => {
    if (allPageSelected) setSelectedRows(prev => prev.filter(r => !currentPageIds.includes(r.id)))
    else { const toAdd = items.filter(u => !selectedRows.some(r => r.id === u.id)); setSelectedRows(prev => [...prev, ...toAdd]) }
  }
  const toggleSelectRow = (item: LookupEntry) =>
    setSelectedRows(prev => prev.some(r => r.id === item.id) ? prev.filter(r => r.id !== item.id) : [...prev, item])

  // Fix Issue 1 & 3: group checkbox state with indeterminate + empty guard
  const getGroupCheckState = (groupRows: LookupEntry[]) => {
    if (groupRows.length === 0) return { checked: false, indeterminate: false }
    const selectedCount = groupRows.filter(r => selectedRows.some(s => s.id === r.id)).length
    return {
      checked:       selectedCount === groupRows.length,
      indeterminate: selectedCount > 0 && selectedCount < groupRows.length,
    }
  }

  // ── Cell renderer ──────────────────────────────────────────
  const renderCell = (key: string, row: LookupEntry) => {
    switch (key) {
      case 'lookup_code':
        return <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">{row.lookup_code}</span>
      case 'display_order':
        return <span className="text-sm text-[var(--text-secondary)] tabular-nums">{row.display_order}</span>
      case 'is_active':
        return <Badge label={row.is_active ? 'Active' : 'Inactive'} variant={row.is_active ? 'success' : 'danger'} />
      case 'deactivation_reason':
        return row.deactivation_reason ? <span className="text-sm text-[var(--text-secondary)]">{row.deactivation_reason}</span> : <span className="text-[var(--text-muted)]">—</span>
      case 'deactivated_at':
        return row.deactivated_at ? <span className="text-xs text-[var(--text-muted)]">{formatDate(String(row.deactivated_at))}</span> : <span className="text-[var(--text-muted)]">—</span>
      case 'created_at':
        return <span className="text-xs text-[var(--text-muted)]">{formatDateTime(String(row.created_at))}</span>
      default:
        return <span className="text-sm text-[var(--text-secondary)]">{String((row as unknown as Record<string, unknown>)[key] ?? '') || '—'}</span>
    }
  }

  // ── Pagination page numbers ────────────────────────────────
  const pageNumbers = useMemo((): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 4)              return [1, 2, 3, 4, 5, '...', totalPages]
    if (page >= totalPages - 3) return [1, '...', totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages]
    return [1, '...', page - 1, page, page + 1, '...', totalPages]
  }, [page, totalPages])

  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endRow   = Math.min(page * pageSize, total)

  // ── Open Add (optionally pre-fill a type) ──────────────────
  const openAdd = (prefilledType?: string) => {
    setEditItem(null)
    const existingType = prefilledType || ''
    const isKnown = existingType !== '' && lookupTypes.includes(existingType)
    setTypeInputMode(existingType === '' ? 'select' : (isKnown ? 'select' : 'new'))
    setIsNewType(!isKnown && existingType === '')
    reset({ lookup_type: existingType, lookup_code: '', lookup_name: '', lookup_value: '', display_order: 0, parent_code: '' })
    setModalOpen(true)
  }

  const openEdit = (item: LookupEntry) => {
    setEditItem(item)
    setTypeInputMode('select')
    setIsNewType(false)
    reset({
      lookup_type:   item.lookup_type,
      lookup_code:   item.lookup_code,
      lookup_name:   item.lookup_name,
      lookup_value:  item.lookup_value  ?? '',
      display_order: item.display_order ?? 0,
      parent_code:   item.parent_code   ?? '',
    })
    setModalOpen(true)
  }

  const onSubmit = async (data: FormValues) => {
    setSaving(true)
    try {
      const payload = {
        ...data,
        lookup_type:  toCodeFormat(data.lookup_type),
        lookup_code:  toCodeFormat(data.lookup_code),
        lookup_name:  toCodeFormat(data.lookup_name),
        lookup_value: data.lookup_value ? toCodeFormat(data.lookup_value) : '',
        parent_code:  data.parent_code ? toCodeFormat(data.parent_code) : '',
      }
      if (isNew) {
        await apiService.post('/lookup-master', payload)
        toast.success('Lookup created successfully')
      } else {
        await apiService.put(`/lookup-master/${editItem!.id}`, payload)
        toast.success('Lookup updated successfully')
      }
      setModalOpen(false); reset()
      await Promise.all([loadItems(), loadStats(), loadTypes()])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  const confirmToggle = async (reason?: string) => {
    if (!toggleItem) return
    try {
      const res = await apiService.delete(`/lookup-master/${toggleItem.id}`, reason ? { data: { reason } } : undefined)
      toast.success(res.data?.message || 'Status updated')
      setToggleItem(null)
      await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'
      toast.error(msg)
    }
  }

  // ── Import helpers ─────────────────────────────────────────
  const openImport = () => {
    setImportOpen(true); setImportStep('upload')
    setImportRows([]); setImportDone(0); setImportTotal(0); setImportErrList([])
  }

  const downloadImportTemplate = async () => {
    const XLSX = await import('xlsx')
    const headers = [
      'Lookup Type *', 'Lookup Code *', 'Lookup Name *',
      'Lookup Value', 'Display Order', 'Parent Code',
    ]
    const sample = ['METAL_FINISH', 'GOLD_22K', '22 Karat Gold', '22', '1', 'GOLD']
    const ws = XLSX.utils.aoa_to_sheet([headers, sample])
    ws['!cols'] = headers.map(() => ({ wch: 22 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Lookups')
    XLSX.writeFile(wb, `lookup_master_import_template_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleImportFile = async (file: File) => {
    const XLSX = await import('xlsx')
    const buf  = await file.arrayBuffer()
    const wb   = XLSX.read(buf, { type: 'array' })
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const raw  = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

    // Type + Code is the unique key — catch in-file repeats before they
    // reach the API and come back as one failed row each.
    const seen = new Set<string>()

    const parsed: LImportRow[] = raw.map((r, idx) => {
      const row: Partial<LImportRow> = { _rowNum: idx + 2, errors: [] }
      Object.entries(r).forEach(([col, val]) => {
        const field = LOOKUP_HEADER_MAP[normLHeader(col)]
        if (field) (row as Record<string, unknown>)[field] = String(val ?? '').trim()
      })
      const errs: string[] = []

      // Spaces convert to hyphens (matches the manual-entry inputs) rather than
      // being silently dropped — anything left outside capitals/digits/hyphen
      // after that is a genuine data problem, flagged below rather than stripped,
      // so an import can't quietly save a value that doesn't match what was typed.
      const rawType   = (row.lookup_type  || '').trim()
      const rawCode   = (row.lookup_code  || '').trim()
      const rawName   = (row.lookup_name  || '').trim()
      const rawValue  = (row.lookup_value || '').trim()
      const rawParent = (row.parent_code  || '').trim()
      row.lookup_type  = normalizeCodeSpacing(rawType)
      row.lookup_code  = normalizeCodeSpacing(rawCode)
      row.lookup_name  = normalizeCodeSpacing(rawName)
      row.lookup_value = normalizeCodeSpacing(rawValue)
      row.parent_code  = normalizeCodeSpacing(rawParent)

      if (!row.lookup_type) errs.push('Lookup Type required')
      else if (!CODE_CHARS_RE.test(row.lookup_type)) errs.push(`Lookup Type: only capital letters, numbers, and - are allowed ("${rawType}")`)

      if (!row.lookup_code) errs.push('Lookup Code required')
      else if (!CODE_CHARS_RE.test(row.lookup_code)) errs.push(`Lookup Code: only capital letters, numbers, and - are allowed ("${rawCode}")`)

      if (!row.lookup_name) errs.push('Lookup Name required')
      else if (!CODE_CHARS_RE.test(row.lookup_name)) errs.push(`Lookup Name: only capital letters, numbers, and - are allowed ("${rawName}")`)

      if (row.lookup_value && !CODE_CHARS_RE.test(row.lookup_value)) errs.push(`Lookup Value: only capital letters, numbers, and - are allowed ("${rawValue}")`)
      if (row.parent_code && !CODE_CHARS_RE.test(row.parent_code)) errs.push(`Parent Code: only capital letters, numbers, and - are allowed ("${rawParent}")`)

      const order = (row.display_order || '').trim()
      if (order) {
        if (!/^\d+$/.test(order)) errs.push(`Display Order must be a whole number 0 or more: "${order}"`)
      } else {
        row.display_order = '0'
      }

      if (row.lookup_type && row.lookup_code) {
        const key = `${row.lookup_type}|${row.lookup_code}`
        if (seen.has(key)) errs.push(`Duplicate in file: ${row.lookup_type} / ${row.lookup_code}`)
        else seen.add(key)
      }

      row.errors = errs
      return row as LImportRow
    })

    setImportRows(parsed)
    setImportStep('preview')
  }

  const runImport = async () => {
    const valid = importRows.filter(r => r.errors.length === 0)
    setImportTotal(valid.length); setImportDone(0); setImportErrList([])
    setImporting(true); setImportStep('result')
    let done = 0
    const errs: { row: number; msg: string }[] = []
    for (let i = 0; i < valid.length; i += 3) {
      const batch = valid.slice(i, i + 3)
      await Promise.allSettled(batch.map(async row => {
        try {
          await apiService.post('/lookup-master', {
            lookup_type:   row.lookup_type,
            lookup_code:   row.lookup_code,
            lookup_name:   row.lookup_name,
            lookup_value:  row.lookup_value || null,
            display_order: Number(row.display_order || 0),
            parent_code:   row.parent_code || null,
          })
          done++
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'
          errs.push({ row: row._rowNum, msg })
        }
      }))
      setImportDone(done)
      setImportErrList([...errs])
    }
    setImporting(false)
    if (done > 0) await Promise.all([loadItems(), loadStats(), loadTypes()])
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <span>Masters</span><span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>Lookup Master</span>
      </div>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">

        {/* Status cards */}
        <div className="flex items-center gap-2 pl-3">
          {(['active', 'inactive'] as const).map(s => (
            <button key={s}
              onClick={() => { setStatusFilter(s); setPage(1); setColFilters({}); setSearchInput(''); setSearch('') }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all w-36 ${
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

        {/* Add button */}
        <button onClick={() => openAdd()} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Add Lookup
        </button>
      </div>

      <div className="card overflow-hidden">

        {/* ── Toolbar ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[var(--border-color)]">

          {/* Global search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input value={searchInput} onChange={e => onSearchInput(e.target.value)}
              placeholder="Search lookup…" className="form-input pl-9 pr-8 py-1.5 text-sm w-full" />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">

            {/* Expand / Collapse all groups */}
            <button onClick={expandAll}
              title="Expand All"
              className="px-2 py-1.5 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">
              Expand All
            </button>
            <button onClick={collapseAll}
              title="Collapse All"
              className="px-2 py-1.5 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">
              Collapse All
            </button>

            {/* Filter row toggle */}
            <button onClick={() => setShowFilterRow(s => !s)} title="Toggle Filters"
              className={`p-1.5 rounded-lg border transition-colors ${showFilterRow ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
              <FunnelIcon className="w-4 h-4" />
            </button>

            {/* Sorting toggle */}
            <button onClick={() => setShowSorting(s => !s)} title="Toggle Sorting"
              className={`p-1.5 rounded-lg border transition-colors ${showSorting ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
              <BarsArrowUpIcon className="w-4 h-4" />
            </button>

            {/* Column chooser */}
            <div ref={colPickerRef} className="relative">
              <button onClick={() => setShowColPicker(s => !s)} title="Columns"
                className={`p-1.5 rounded-lg border transition-colors ${showColPicker ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                <ViewColumnsIcon className="w-4 h-4" />
              </button>
              {showColPicker && (
                <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg p-1.5">
                  <p className="px-2 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Show / Hide</p>
                  {gridCols.map(col => (
                    <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer select-none">
                      <input type="checkbox" checked={col.visible} onChange={() => toggleCol(col.key)} className="w-3.5 h-3.5 accent-[var(--color-primary)]" />
                      <span className="text-sm text-[var(--text-secondary)]">{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Export */}
            <div ref={exportRef} className="relative">
              <button onClick={() => setExportOpen(o => !o)} disabled={exporting} title="Export"
                className={`p-1.5 rounded-lg border transition-colors ${exportOpen ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                {exporting
                  ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <ArrowDownTrayIcon className="w-4 h-4" />
                }
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg p-1.5">
                  <p className="px-2 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Export All</p>
                  {(['csv', 'excel', 'pdf'] as const).map(fmt => (
                    <button key={fmt} onClick={() => handleExport('all', fmt)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] text-left">
                      <span>{fmt === 'csv' ? '📄' : fmt === 'excel' ? '📊' : '📋'}</span>
                      <span className="font-medium">{fmt === 'csv' ? 'CSV' : fmt === 'excel' ? 'Excel' : 'PDF'}</span>
                    </button>
                  ))}
                  <div className="my-1.5 border-t border-[var(--border-color)]" />
                  <p className="px-2 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide flex items-center gap-1">
                    Export Selected
                    {selectedRows.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[var(--accent-gold)] text-white text-[10px] font-bold">{selectedRows.length}</span>
                    )}
                  </p>
                  {(['csv', 'excel', 'pdf'] as const).map(fmt => (
                    <button key={fmt} onClick={() => handleExport('selected', fmt)} disabled={!selectedRows.length}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] text-left disabled:opacity-40 disabled:cursor-not-allowed">
                      <span>{fmt === 'csv' ? '📄' : fmt === 'excel' ? '📊' : '📋'}</span>
                      <span className="font-medium">{fmt === 'csv' ? 'CSV' : fmt === 'excel' ? 'Excel' : 'PDF'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Import */}
            <button onClick={openImport} title="Import Lookups from Excel"
              className="p-1.5 rounded-lg border transition-colors border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">
              <ArrowUpTrayIcon className="w-4 h-4" />
            </button>

            <input
              ref={importFileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void handleImportFile(f); e.target.value = '' }}
            />

            {/* Page size */}
            <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
              <span className="hidden sm:inline">Show</span>
              <select value={pageSize} onChange={e => handlePageSize(Number(e.target.value))}
                className="form-input py-1.5 text-sm" style={{ width: '72px' }}>
                {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="hidden sm:inline">per page</span>
            </div>
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                <th className="px-4 py-2.5 w-10">
                  {/* Fix Issue 2: controlled via useRef + useEffect */}
                  <input type="checkbox" checked={allPageSelected}
                    ref={masterCheckRef}
                    onChange={toggleSelectPage} className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer" />
                </th>
                {visibleCols.map(col => (
                  <th key={col.key} style={{ minWidth: col.minW }}
                    onClick={() => showSorting && col.sortKey && handleSort(col.sortKey)}
                    className={`px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide select-none whitespace-nowrap ${showSorting && col.sortKey ? 'cursor-pointer hover:text-[var(--text-primary)]' : ''}`}>
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
                <th className="px-4 py-2.5 w-28 text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide sticky right-0 z-10 bg-[var(--bg-secondary)] border-l border-[var(--border-color)]">
                  Actions
                </th>
              </tr>

              {showFilterRow && (
                <tr className="border-b border-[var(--border-color)]" style={{ background: 'var(--bg-primary)' }}>
                  <th className="px-2 py-1.5 w-10" />
                  {visibleCols.map(col => (
                    <th key={col.key} className="px-2 py-1.5">
                      <input value={colFilters[col.key] ?? ''} onChange={e => setColFilters(f => ({ ...f, [col.key]: e.target.value }))}
                        placeholder="Filter…" className="w-full px-2 py-1 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]" />
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
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-color)]">
                    <td className="px-4 py-3"><div className="h-4 w-4 rounded animate-pulse bg-[var(--bg-tertiary)]" /></td>
                    {visibleCols.map(col => (
                      <td key={col.key} className="px-4 py-3"><div className="h-4 rounded animate-pulse bg-[var(--bg-tertiary)]" style={{ width: col.key === 'lookup_name' ? '140px' : '80px' }} /></td>
                    ))}
                    <td className="px-4 py-3 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]"><div className="h-4 w-16 rounded animate-pulse bg-[var(--bg-tertiary)]" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length + 2} className="px-4 py-14 text-center text-sm text-[var(--text-muted)]">
                    {search || Object.values(colFilters).some(v => v) ? 'No records match the current filters.' : 'No lookup entries found.'}
                  </td>
                </tr>
              ) : (
                groupedTypes.map(type => {
                  const groupRows = groupedMap[type]
                  const isCollapsed = collapsedGroups.has(type)

                  return (
                    <React.Fragment key={type}>
                      {/* ── Group header row ─────────────────── */}
                      <tr className="border-b border-[var(--border-color)] bg-[var(--accent-gold)]/5 hover:bg-[var(--accent-gold)]/10 transition-colors">
                        <td className="px-4 py-2">
                          {/* Fix Issues 1 & 3: indeterminate + empty-group guard */}
                          <GroupCheckbox
                            state={getGroupCheckState(groupRows)}
                            onChange={() => {
                              const { checked } = getGroupCheckState(groupRows)
                              if (checked) setSelectedRows(prev => prev.filter(r => !groupRows.some(g => g.id === r.id)))
                              else { const toAdd = groupRows.filter(r => !selectedRows.some(s => s.id === r.id)); setSelectedRows(prev => [...prev, ...toAdd]) }
                            }}
                          />
                        </td>
                        <td colSpan={visibleCols.length}
                          className="px-3 py-2 cursor-pointer select-none"
                          onClick={() => toggleGroup(type)}
                        >
                          <div className="flex items-center gap-2">
                            {isCollapsed
                              ? <ChevronRightIcon className="w-4 h-4 text-[var(--accent-gold)] flex-shrink-0" />
                              : <ChevronDownIcon  className="w-4 h-4 text-[var(--accent-gold)] flex-shrink-0" />
                            }
                            <span className="font-bold text-sm tracking-wide text-[var(--text-primary)] font-mono uppercase">
                              {type}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent-gold)]/20 text-[var(--accent-gold)]">
                              {groupRows.length} {groupRows.length === 1 ? 'entry' : 'entries'}
                            </span>
                          </div>
                        </td>
                        {/* Add entry to this type */}
                        <td className="px-4 py-2 sticky right-0 z-10 bg-[var(--accent-gold)]/5 border-l border-[var(--border-color)]">
                          <button
                            onClick={() => openAdd(type)}
                            title={`Add entry to ${type}`}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-[var(--accent-gold)]/15 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/30 transition-colors whitespace-nowrap"
                          >
                            <PlusIcon className="w-3.5 h-3.5" /> Add
                          </button>
                        </td>
                      </tr>

                      {/* ── Group data rows ───────────────────── */}
                      {!isCollapsed && groupRows.map((row, idx) => (
                        <tr key={row.id}
                          className={`border-b border-[var(--border-color)] transition-colors hover:bg-[var(--bg-secondary)]
                            ${idx % 2 !== 0 ? 'bg-[var(--bg-primary)]/40' : ''}
                            ${selectedRows.some(r => r.id === row.id) ? 'bg-[var(--accent-gold)]/5' : ''}`}
                        >
                          <td className="px-4 py-2.5 pl-10">
                            <input type="checkbox" checked={selectedRows.some(r => r.id === row.id)}
                              onChange={() => toggleSelectRow(row)} className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer" />
                          </td>
                          {visibleCols.map(col => (
                            <td key={col.key} className="px-4 py-2.5">{renderCell(col.key, row)}</td>
                          ))}
                          <td className="px-4 py-2.5 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => openEdit(row)} className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500 ${!row.is_active ? 'invisible' : ''}`} title="Edit">
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button onClick={() => setToggleItem(row)}
                                className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] ${row.is_active ? 'text-red-500' : 'text-green-600'}`}
                                title={row.is_active ? 'Deactivate' : 'Activate'}>
                                {row.is_active ? <NoSymbolIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-muted)]">
              {total === 0 ? 'No records found' : `Showing ${startRow}–${endRow} of ${total} entries`}
            </span>
            {selectedRows.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent-gold)]">
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-gold)]/15 border border-[var(--accent-gold)]/30">{selectedRows.length} selected</span>
                <button onClick={() => setSelectedRows([])} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline underline-offset-2">Clear</button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage(1)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">«</button>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">‹</button>
            {pageNumbers.map((n, i) =>
              n === '...' ? <span key={`d${i}`} className="px-1.5 text-xs text-[var(--text-muted)]">…</span> : (
                <button key={n} onClick={() => setPage(n as number)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${page === n ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)] text-white font-semibold' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                  {n}
                </button>
              )
            )}
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">›</button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">»</button>
          </div>
          <span className="text-sm text-[var(--text-muted)] hidden sm:block">Page {page} of {totalPages || 1}</span>
        </div>
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); reset() }}
        title={isNew ? 'Add Lookup Entry' : 'Edit Lookup Entry'}
        size="md"
        footer={
          <>
            <button onClick={() => { setModalOpen(false); reset() }} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit(onSubmit)} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : isNew ? 'Create' : 'Update'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">

          {/* ── Lookup Type ───────────────────────────────── */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Lookup Type<Req />
            </label>

            {isNew ? (
              <>
                {/* Toggle: existing vs new */}
                <div className="flex rounded-lg border border-[var(--border-color)] overflow-hidden mb-2 w-fit">
                  <button type="button"
                    onClick={() => { setTypeInputMode('select'); setIsNewType(false); setValue('lookup_type', '') }}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${typeInputMode === 'select' ? 'bg-[var(--accent-gold)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                    Existing Type
                  </button>
                  <button type="button"
                    onClick={() => { setTypeInputMode('new'); setIsNewType(true); setValue('lookup_type', '') }}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${typeInputMode === 'new' ? 'bg-[var(--accent-gold)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                    + New Type
                  </button>
                </div>

                {typeInputMode === 'select' ? (
                  <select {...register('lookup_type')} className="form-input">
                    <option value="">— Select a type —</option>
                    {lookupTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                ) : (
                  <>
                    <input
                      {...register('lookup_type')}
                      className="form-input"
                      placeholder="e.g. METAL-FINISH (capitals + - only)"
                      onChange={e => {
                        e.target.value = toCodeFormat(e.target.value)
                        void register('lookup_type').onChange(e)
                      }}
                    />
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <span>⚠</span> A new lookup type will be created with the first entry you add.
                    </p>
                  </>
                )}
              </>
            ) : (
              /* Edit mode — type is locked */
              <div className="form-input bg-[var(--bg-tertiary)] opacity-70 cursor-not-allowed flex items-center gap-2">
                <span className="font-mono font-semibold text-[var(--text-primary)]">{watchedType}</span>
                <span className="text-xs text-[var(--text-muted)]">(cannot change)</span>
              </div>
            )}

            {errors.lookup_type && <p className="text-xs text-red-500 mt-1">{errors.lookup_type.message}</p>}
          </div>

          {/* ── Lookup Code ───────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Lookup Code<Req /></label>
            {isNew ? (
              <input {...register('lookup_code')} className="form-input" placeholder="e.g. GOLD-22K"
                onChange={e => { e.target.value = toCodeFormat(e.target.value); void register('lookup_code').onChange(e) }} />
            ) : (
              <div className="form-input bg-[var(--bg-tertiary)] opacity-70 cursor-not-allowed font-mono font-semibold">
                {editItem?.lookup_code}
              </div>
            )}
            {errors.lookup_code && <p className="text-xs text-red-500 mt-1">{errors.lookup_code.message}</p>}
            {!isNew && <p className="text-xs text-[var(--text-muted)] mt-1">Code cannot be changed.</p>}
          </div>

          {/* ── Lookup Name ───────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Lookup Name<Req /></label>
            <input {...register('lookup_name')} className="form-input" placeholder="e.g. 22-KARAT-GOLD"
              onChange={e => { e.target.value = toCodeFormat(e.target.value); void register('lookup_name').onChange(e) }} />
            {errors.lookup_name && <p className="text-xs text-red-500 mt-1">{errors.lookup_name.message}</p>}
          </div>

          {/* ── Lookup Value ──────────────────────────────── */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Lookup Value
              <span className="ml-1 text-xs text-[var(--text-muted)] font-normal">(optional extra data)</span>
            </label>
            <input {...register('lookup_value')} className="form-input" placeholder="e.g. FFD700 or 22"
              onChange={e => { e.target.value = toCodeFormat(e.target.value); void register('lookup_value').onChange(e) }} />
            {errors.lookup_value && <p className="text-xs text-red-500 mt-1">{errors.lookup_value.message}</p>}
          </div>

          {/* ── Display Order ─────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Display Order</label>
            <input type="number" {...register('display_order')} className="form-input" min={0} placeholder="0" />
            {errors.display_order && <p className="text-xs text-red-500 mt-1">{errors.display_order.message}</p>}
          </div>

          {/* ── Parent Code ───────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Parent Code
              <span className="ml-1 text-xs text-[var(--text-muted)] font-normal">(optional)</span>
            </label>
            <input {...register('parent_code')} className="form-input" placeholder="e.g. GOLD"
              onChange={e => { e.target.value = toCodeFormat(e.target.value); void register('parent_code').onChange(e) }} />
            {errors.parent_code && <p className="text-xs text-red-500 mt-1">{errors.parent_code.message}</p>}
          </div>

        </div>
      </Modal>

      <DeactivateReasonDialog
        isOpen={!!toggleItem?.is_active}
        title="Deactivate Lookup"
        itemLabel={`"${toggleItem?.lookup_name}" (${toggleItem?.lookup_type} / ${toggleItem?.lookup_code})`}
        onConfirm={reason => confirmToggle(reason)}
        onCancel={() => setToggleItem(null)}
      />

      <ConfirmDialog
        isOpen={!!toggleItem && !toggleItem.is_active}
        title="Activate Lookup"
        message={`Activate "${toggleItem?.lookup_name}" (${toggleItem?.lookup_type} / ${toggleItem?.lookup_code})?`}
        confirmLabel="Activate"
        variant="info"
        onConfirm={() => confirmToggle()}
        onCancel={() => setToggleItem(null)}
      />

      {/* ── Import Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={importOpen}
        onClose={() => { if (!importing) { setImportOpen(false); setImportStep('upload') } }}
        title={importStep === 'upload' ? 'Import Lookups from Excel' : importStep === 'preview' ? 'Preview Import Data' : 'Import Results'}
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
                Import {importRows.filter(r => r.errors.length === 0).length} Rows
              </button>
            </>
          ) : (
            <button
              onClick={() => { setImportOpen(false); setImportStep('upload') }}
              disabled={importing}
              className="btn-primary"
            >
              Close
            </button>
          )
        }
      >
        {importStep === 'upload' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Download the template, fill in lookup data, then upload the file. Type and Code are
                uppercased automatically; a type that does not exist yet is created with its first entry.
              </p>
            </div>

            <button
              onClick={downloadImportTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-[var(--accent-gold)]/50 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/5 transition-colors text-sm font-medium w-full justify-center"
            >
              <ArrowDownTrayIcon className="w-4 h-4" /> Download Template (.xlsx)
            </button>

            <button
              onClick={() => importFileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 w-full py-8 rounded-xl border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent-gold)]/50 hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-muted)]"
            >
              <ArrowUpTrayIcon className="w-7 h-7" />
              <span className="text-sm font-medium">Click to upload Excel file</span>
              <span className="text-xs">.xlsx or .xls</span>
            </button>
          </div>
        )}

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
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Type</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Code</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Name</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Value</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Order</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map(row => (
                      <React.Fragment key={row._rowNum}>
                        <tr className={`border-t border-[var(--border-color)] ${row.errors.length > 0 ? 'bg-red-50/50' : ''}`}>
                          <td className="px-3 py-2 text-[var(--text-muted)]">{row._rowNum}</td>
                          <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">{row.lookup_type || '—'}</td>
                          <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">{row.lookup_code || '—'}</td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{row.lookup_name || '—'}</td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{row.lookup_value || '—'}</td>
                          <td className="px-3 py-2 tabular-nums text-[var(--text-secondary)]">{row.display_order || '0'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.errors.length === 0 ? (
                              <span className="text-green-600 font-semibold">✓ Valid</span>
                            ) : (
                              <span className="text-red-600 font-semibold">✗ {row.errors.length} error{row.errors.length > 1 ? 's' : ''}</span>
                            )}
                          </td>
                        </tr>
                        {row.errors.length > 0 && (
                          <tr className="bg-red-50/80">
                            <td className="px-3 pb-2.5" />
                            <td colSpan={6} className="px-3 pb-2.5 pt-1">
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

        {importStep === 'result' && (
          <div className="flex flex-col gap-4">
            {importing ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-[var(--text-secondary)]">Importing {importDone} / {importTotal}…</p>
                <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-[var(--color-primary)] transition-all"
                    style={{ width: importTotal > 0 ? `${(importDone / importTotal) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-800 font-medium">
                    {importDone} lookup{importDone !== 1 ? 's' : ''} imported successfully
                  </p>
                </div>
                {importErrList.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1.5">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      {importErrList.length} row{importErrList.length > 1 ? 's' : ''} failed:
                    </p>
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-red-200 bg-red-50/50">
                      {importErrList.map((e, i) => (
                        <p key={i} className="px-3 py-1.5 text-xs text-red-700 border-b border-red-100 last:border-0">
                          Row {e.row}: {e.msg}
                        </p>
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

export default LookupMasterPage
