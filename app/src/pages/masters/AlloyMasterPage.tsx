import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon, ArrowUpTrayIcon,
  MagnifyingGlassIcon, XMarkIcon, ViewColumnsIcon,
  ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon,
  FunnelIcon, BarsArrowUpIcon,
  NoSymbolIcon, CheckCircleIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import Modal                  from '@/components/common/Modal'
import Badge                  from '@/components/common/Badge'
import ConfirmDialog          from '@/components/common/ConfirmDialog'
import DeactivateReasonDialog from '@/components/common/DeactivateReasonDialog'
import { formatDate, formatDateTime, exportToCSV, exportToExcel, exportToPDF } from '@/utils/helpers'
import { apiService } from '@/api/apiService'

// ── LOV Options ────────────────────────────────────────────────
const METAL_CATEGORY_OPTS  = ['Gold', 'Silver', 'Special', 'Experimental']
const PURITY_TARGET_OPTS   = ['22K', '18K', '14K', '10K', '9K', '925SS']
const APPLICATION_TYPE_OPTS = ['Rings', 'Bangles', 'Necklaces', 'Earrings', 'Bracelets', 'Pendants', 'Chains', 'Anklets']
const ALLOY_STATUS_OPTS    = ['Active', 'Inactive', 'Trial (Timebond)', 'DisApproved']
const WITH_SILVER_OPTS     = ['YES', 'NO']
const ADDITIVE_TYPE_OPTS   = ['Copper', 'Zinc', 'Palladium', 'Rhodium', 'Platinum', 'Silicon']
const COLOR_TONE_OPTS      = ['Yellow', 'Rose', 'White', 'Custom']
const FINISH_OPTS          = ['Matte', 'High-polish', 'Diamond Cut Family']
const MELTING_METHOD_OPTS  = ['Manual', 'Manual-induction', 'Continuous Melting', 'Vacuum Casting']

// ── Types ──────────────────────────────────────────────────────
interface AlloyEntry {
  id: number
  alloy_code: string
  alloy_name: string
  karat: string | null
  purity_pct: number | null
  description: string | null
  metal_category: string | null
  purity_target: string | null
  application_type: string | null
  alloy_status: string | null
  with_silver: string | null
  silver_percentage: number | null
  alloy_additives_type: string | null
  alloy_density: number | null
  composition_remark: string | null
  alloy_hardness: string | null
  tensile_strength: string | null
  ductility_elongation: string | null
  melting_range: string | null
  color_tone: string | null
  finish_behaviour: string | null
  max_drawing_reduction: string | null
  alloy_required: string | null
  breakage_sensitivity: string | null
  melting_method: string | null
  alloy_cost_per_gram: number | null
  indicative_alloy_cost_per_gram: number | null
  supplier_name: string | null
  alloy_brand: string | null
  alloy_hazardous: boolean
  is_active: boolean
  deactivation_reason: string | null
  deactivated_at: string | null
  created_at: string
  updated_at: string | null
}

type FormValues = {
  alloy_code: string
  alloy_name: string
  metal_category: string
  alloy_status: string
  alloy_brand: string
  with_silver: string
  silver_percentage: string
  alloy_additives_type: string
  alloy_density: string
  composition_remark: string
  alloy_hardness: string
  tensile_strength: string
  ductility_elongation: string
  melting_range: string
  color_tone: string
  finish_behaviour: string
  max_drawing_reduction: string
  alloy_required: string
  breakage_sensitivity: string
  melting_method: string
  alloy_cost_per_gram: string
  indicative_alloy_cost_per_gram: string
  supplier_name: string
  alloy_hazardous: boolean
}

const schema = yup.object({
  alloy_code:                    yup.string().required('Alloy Code is required'),
  alloy_name:                    yup.string().required('Alloy Name is required'),
  metal_category:                yup.string().default(''),
  alloy_status:                  yup.string().default(''),
  alloy_brand:                   yup.string().default(''),
  with_silver:                   yup.string().default(''),
  silver_percentage:             yup.string().default(''),
  alloy_additives_type:          yup.string().default(''),
  alloy_density:                 yup.string().default(''),
  composition_remark:            yup.string().default(''),
  alloy_hardness:                yup.string().default(''),
  tensile_strength:              yup.string().default(''),
  ductility_elongation:          yup.string().default(''),
  melting_range:                 yup.string().default(''),
  color_tone:                    yup.string().default(''),
  finish_behaviour:              yup.string().default(''),
  max_drawing_reduction:         yup.string().default(''),
  alloy_required:                yup.string().default(''),
  breakage_sensitivity:          yup.string().default(''),
  melting_method:                yup.string().default(''),
  alloy_cost_per_gram:           yup.string().default(''),
  indicative_alloy_cost_per_gram: yup.string().default(''),
  supplier_name:                 yup.string().default(''),
  alloy_hazardous:               yup.boolean().default(false),
})

const PAGE_SIZES = [10, 25, 50, 100]
const Req = () => <span className="text-red-500 ml-0.5">*</span>
const SH = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-gold)] mb-3 pb-1.5 border-b border-[var(--border-color)]">{children}</h3>
)
const FL = ({ label, error, children, req }: { label: string; error?: string; children: React.ReactNode; req?: boolean }) => (
  <div>
    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{label}{req && <Req />}</label>
    {children}
    {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
  </div>
)

// ── Inline Multi-Select Checkbox Dropdown ──────────────────────
const MultiCheckSelect: React.FC<{
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}> = ({ options, selected, onChange, placeholder = 'Select…' }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="form-input text-left w-full flex items-center justify-between gap-1 text-sm">
        <span className={`truncate ${selected.length ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
          {selected.length ? selected.join(', ') : placeholder}
        </span>
        <ChevronDownIcon className="w-3.5 h-3.5 flex-shrink-0 text-[var(--text-muted)]" />
      </button>
      {open && (
        <div className="absolute z-[250] top-full mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg p-2 grid grid-cols-2 gap-0.5 max-h-40 overflow-y-auto">
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-[var(--bg-tertiary)] cursor-pointer select-none">
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="w-3.5 h-3.5 accent-[var(--color-primary)] flex-shrink-0" />
              <span className="text-xs text-[var(--text-secondary)] truncate">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

interface ColDef { key: string; label: string; sortKey?: string; visible: boolean; minW?: string }

const INITIAL_COLS: ColDef[] = [
  { key: 'alloy_code',          label: 'Code',             sortKey: 'alloy_code',          visible: true,  minW: '120px' },
  { key: 'alloy_name',          label: 'Alloy Name',       sortKey: 'alloy_name',          visible: true,  minW: '180px' },
  { key: 'metal_category',      label: 'Metal Category',   sortKey: 'metal_category',      visible: true,  minW: '130px' },
  { key: 'purity_target',       label: 'Purity Target',                                    visible: true,  minW: '120px' },
  { key: 'alloy_status',        label: 'Alloy Status',     sortKey: 'alloy_status',        visible: true,  minW: '120px' },
  { key: 'color_tone',          label: 'Color Tone',       sortKey: 'color_tone',          visible: true,  minW: '100px' },
  { key: 'alloy_cost_per_gram', label: 'Cost/g',           sortKey: 'alloy_cost_per_gram', visible: true,  minW: '90px'  },
  { key: 'is_active',           label: 'Status',                                           visible: true,  minW: '90px'  },
  { key: 'deactivation_reason', label: 'Deactive Reason',                                  visible: true,  minW: '160px' },
  { key: 'deactivated_at',      label: 'Deactive Date',                                    visible: true,  minW: '120px' },
  { key: 'created_at',          label: 'Created',          sortKey: 'created_at',          visible: true,  minW: '130px' },
]

// ── CSV Parse (simple, no deps) ────────────────────────────────
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
  const headers = ['alloy_code', 'alloy_name', 'metal_category', 'purity_target', 'alloy_status', 'alloy_brand', 'color_tone', 'melting_method', 'alloy_cost_per_gram', 'alloy_hazardous']
  const example = ['AU18K-YG', '18K Yellow Gold', 'Gold', '18K', 'Active', 'XYZ Brand', 'Yellow', 'Manual', '450.00', 'false']
  const csv = [headers.join(','), example.join(',')].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'alloy_master_import_template.csv'
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}


const blankForm = (): FormValues => ({
  alloy_code: '', alloy_name: '', metal_category: '', alloy_status: '', alloy_brand: '',
  with_silver: '', silver_percentage: '', alloy_additives_type: '', alloy_density: '',
  composition_remark: '', alloy_hardness: '', tensile_strength: '', ductility_elongation: '',
  melting_range: '', color_tone: '', finish_behaviour: '', max_drawing_reduction: '',
  alloy_required: '', breakage_sensitivity: '', melting_method: '',
  alloy_cost_per_gram: '', indicative_alloy_cost_per_gram: '', supplier_name: '', alloy_hazardous: false,
})

// ── Page ───────────────────────────────────────────────────────
const AlloyMasterPage: React.FC = () => {

  const [saving,     setSaving]     = useState(false)
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editItem,   setEditItem]   = useState<AlloyEntry | null>(null)
  const [toggleItem, setToggleItem] = useState<AlloyEntry | null>(null)
  const isNew = !editItem

  // Multi-select state (outside react-hook-form)
  const [puritySel,  setPuritySel]  = useState<string[]>([])
  const [appTypeSel, setAppTypeSel] = useState<string[]>([])

  const { handleSubmit, reset, setValue, formState: { errors } } =
    useForm<FormValues>({ resolver: yupResolver(schema) as never })

  const [fv, setFV] = useState<FormValues>(blankForm())
  const setField = <K extends keyof FormValues>(k: K, v: FormValues[K], validate = false) => {
    setFV(p => ({ ...p, [k]: v }))
    setValue(k, v as never, { shouldValidate: validate })
  }

  const [items,        setItems]        = useState<AlloyEntry[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetching,     setFetching]     = useState(false)
  const isFirstLoad    = useRef(true)
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active')
  const [stats,        setStats]        = useState({ active: 0, inactive: 0 })
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(25)
  const [searchInput,  setSearchInput]  = useState('')
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState('alloy_code')
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('asc')
  const [total,        setTotal]        = useState(0)
  const [totalPages,   setTotalPages]   = useState(1)

  const [cols,                setCols]                = useState<ColDef[]>(INITIAL_COLS)
  const [showColPicker,       setShowColPicker]       = useState(false)
  const [showFilterRow,       setShowFilterRow]       = useState(false)
  const [showSorting,         setShowSorting]         = useState(true)
  const [colFilters,          setColFilters]          = useState<Record<string, string>>({})
  const [debouncedColFilters, setDebouncedColFilters] = useState<Record<string, string>>({})
  const colPickerRef   = useRef<HTMLDivElement>(null)
  const searchTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const colFilterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedRows, setSelectedRows] = useState<AlloyEntry[]>([])
  const [exportOpen,   setExportOpen]   = useState(false)
  const [exporting,    setExporting]    = useState(false)
  const exportRef      = useRef<HTMLDivElement>(null)
  const masterCheckRef = useRef<HTMLInputElement>(null)

  // Import state
  const [importOpen,    setImportOpen]    = useState(false)
  const [importFile,    setImportFile]    = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([])
  const [importing,     setImporting]     = useState(false)
  const importFileRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setShowColPicker(false)
      if (exportRef.current   && !exportRef.current.contains(e.target as Node))    setExportOpen(false)
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
    try { const res = await apiService.get('/alloys/stats'); setStats(res.data?.data ?? { active: 0, inactive: 0 }) } catch { /* silent */ }
  }
  useEffect(() => { loadStats() }, []) // eslint-disable-line

  const loadItems = async () => {
    if (isFirstLoad.current) setLoading(true); else setFetching(true)
    try {
      const activeCF = Object.fromEntries(Object.entries(debouncedColFilters).filter(([, v]) => v.trim()))
      const res = await apiService.get('/alloys', {
        params: { page, limit: pageSize, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter,
          ...(Object.keys(activeCF).length > 0 && { col_filters: JSON.stringify(activeCF) }) },
      })
      setItems(res.data?.data ?? [])
      setTotal(res.data?.meta?.total ?? 0)
      setTotalPages(res.data?.meta?.total_pages ?? 1)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to load alloys')
    } finally { setLoading(false); setFetching(false); isFirstLoad.current = false }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadItems() }, [page, pageSize, search, sortBy, sortDir, debouncedColFilters, statusFilter])

  const currentPageIds   = items.map(r => r.id)
  const allPageSelected  = currentPageIds.length > 0 && currentPageIds.every(id => selectedRows.some(r => r.id === id))
  const somePageSelected = currentPageIds.some(id => selectedRows.some(r => r.id === id))
  useEffect(() => { if (masterCheckRef.current) masterCheckRef.current.indeterminate = somePageSelected && !allPageSelected }, [somePageSelected, allPageSelected])

  const toggleSelectPage = () => {
    if (allPageSelected) setSelectedRows(prev => prev.filter(r => !currentPageIds.includes(r.id)))
    else { const toAdd = items.filter(u => !selectedRows.some(r => r.id === u.id)); setSelectedRows(prev => [...prev, ...toAdd]) }
  }
  const toggleSelectRow = (item: AlloyEntry) =>
    setSelectedRows(prev => prev.some(r => r.id === item.id) ? prev.filter(r => r.id !== item.id) : [...prev, item])

  const handleSort    = (key: string) => { if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(key); setSortDir('asc') }; setPage(1) }
  const handlePageSize = (size: number) => { setPageSize(size); setPage(1) }
  const toggleCol      = (key: string) => setCols(cs => cs.map(c => c.key === key ? { ...c, visible: !c.visible } : c))
  const gridCols = statusFilter === 'inactive' ? cols : cols.filter(c => c.key !== 'deactivation_reason' && c.key !== 'deactivated_at')
  const visibleCols    = gridCols.filter(c => c.visible)

  const getExportData = (rows: AlloyEntry[]) =>
    rows.map(r => ({
      'Code': r.alloy_code, 'Alloy Name': r.alloy_name,
      'Metal Category': r.metal_category || '', 'Purity Target': r.purity_target || '',
      'Application Type': r.application_type || '', 'Alloy Status': r.alloy_status || '',
      'With Silver': r.with_silver || '', 'Silver %': r.silver_percentage ?? '',
      'Additive Type': r.alloy_additives_type || '', 'Density': r.alloy_density ?? '',
      'Color Tone': r.color_tone || '', 'Finish Behaviour': r.finish_behaviour || '',
      'Melting Method': r.melting_method || '', 'Alloy Brand': r.alloy_brand || '',
      'Supplier': r.supplier_name || '', 'Cost/g': r.alloy_cost_per_gram ?? '',
      'Indicative Cost/g': r.indicative_alloy_cost_per_gram ?? '',
      'Hazardous': r.alloy_hazardous ? 'Yes' : 'No',
      'Status': r.is_active ? 'Active' : 'Inactive',
      ...(statusFilter === 'inactive' && {
        'Deactive Reason': r.deactivation_reason || '',
        'Deactive Date': r.deactivated_at ? formatDate(String(r.deactivated_at)) : '',
      }),
      'Created At': formatDateTime(String(r.created_at)),
    }))

  const handleExport = async (scope: 'all' | 'selected', format: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false)
    let rows: AlloyEntry[]
    if (scope === 'selected') {
      rows = selectedRows; if (!rows.length) { toast.error('No rows selected'); return }
    } else {
      setExporting(true)
      try {
        const activeCF = Object.fromEntries(Object.entries(debouncedColFilters).filter(([, v]) => v.trim()))
        const res = await apiService.get('/alloys', { params: { page: 1, limit: 9999, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter, ...(Object.keys(activeCF).length > 0 && { col_filters: JSON.stringify(activeCF) }) } })
        rows = res.data?.data ?? []
      } catch { toast.error('Failed to fetch export data'); setExporting(false); return }
      setExporting(false)
    }
    const data = getExportData(rows)
    if (format === 'csv') exportToCSV(data, `alloy_master_${statusFilter}`)
    else if (format === 'excel') void exportToExcel(data, `alloy_master_${statusFilter}`)
    else void exportToPDF(data, `alloy_master_${statusFilter}`, 'Alloy Master Report')
  }

  const pageNumbers = useMemo((): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 4)              return [1, 2, 3, 4, 5, '...', totalPages]
    if (page >= totalPages - 3) return [1, '...', totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages]
    return [1, '...', page - 1, page, page + 1, '...', totalPages]
  }, [page, totalPages])
  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endRow   = Math.min(page * pageSize, total)

  const openAdd = () => {
    setEditItem(null); setPuritySel([]); setAppTypeSel([])
    setFV(blankForm()); setModalOpen(true)
  }

  const openEdit = (item: AlloyEntry) => {
    setEditItem(item)
    setPuritySel(item.purity_target ? item.purity_target.split(',').map(s => s.trim()).filter(Boolean) : [])
    setAppTypeSel(item.application_type ? item.application_type.split(',').map(s => s.trim()).filter(Boolean) : [])
    setModalOpen(true)
  }

  // Sync form state when modal opens (edit or add)
  useEffect(() => {
    if (!modalOpen) return
    if (editItem) {
      const vals: FormValues = {
        alloy_code:                     editItem.alloy_code,
        alloy_name:                     editItem.alloy_name,
        metal_category:                 editItem.metal_category ?? '',
        alloy_status:                   editItem.alloy_status ?? '',
        alloy_brand:                    editItem.alloy_brand ?? '',
        with_silver:                    editItem.with_silver ?? '',
        silver_percentage:              editItem.silver_percentage != null ? String(editItem.silver_percentage) : '',
        alloy_additives_type:           editItem.alloy_additives_type ?? '',
        alloy_density:                  editItem.alloy_density != null ? String(editItem.alloy_density) : '',
        composition_remark:             editItem.composition_remark ?? '',
        alloy_hardness:                 editItem.alloy_hardness ?? '',
        tensile_strength:               editItem.tensile_strength ?? '',
        ductility_elongation:           editItem.ductility_elongation ?? '',
        melting_range:                  editItem.melting_range ?? '',
        color_tone:                     editItem.color_tone ?? '',
        finish_behaviour:               editItem.finish_behaviour ?? '',
        max_drawing_reduction:          editItem.max_drawing_reduction ?? '',
        alloy_required:                 editItem.alloy_required ?? '',
        breakage_sensitivity:           editItem.breakage_sensitivity ?? '',
        melting_method:                 editItem.melting_method ?? '',
        alloy_cost_per_gram:            editItem.alloy_cost_per_gram != null ? String(editItem.alloy_cost_per_gram) : '',
        indicative_alloy_cost_per_gram: editItem.indicative_alloy_cost_per_gram != null ? String(editItem.indicative_alloy_cost_per_gram) : '',
        supplier_name:                  editItem.supplier_name ?? '',
        alloy_hazardous:                editItem.alloy_hazardous ?? false,
      }
      setFV(vals); reset(vals)
    } else {
      const blank = blankForm(); setFV(blank); reset(blank)
    }
  }, [modalOpen, editItem]) // eslint-disable-line

  const onSubmit = async (data: FormValues) => {
    setSaving(true)
    try {
      const payload = {
        ...data,
        alloy_code:   data.alloy_code.trim().toUpperCase(),
        alloy_name:   data.alloy_name.trim(),
        purity_target:    puritySel.join(',') || null,
        application_type: appTypeSel.join(',') || null,
      }
      if (isNew) { await apiService.post('/alloys', payload); toast.success('Alloy created successfully') }
      else { await apiService.put(`/alloys/${editItem!.id}`, payload); toast.success('Alloy updated successfully') }
      setModalOpen(false); reset()
      await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const confirmToggle = async (reason?: string) => {
    if (!toggleItem) return
    try {
      const res = await apiService.delete(`/alloys/${toggleItem.id}`, reason ? { data: { reason } } : undefined)
      toast.success(res.data?.message || 'Status updated')
      setToggleItem(null); await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed')
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
      const res = await apiService.post('/alloys/import', { rows })
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

  const renderCell = (key: string, row: AlloyEntry) => {
    switch (key) {
      case 'alloy_code':          return <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">{row.alloy_code}</span>
      case 'metal_category':      return <span className="text-sm text-[var(--text-secondary)]">{row.metal_category || '—'}</span>
      case 'purity_target':       return row.purity_target ? <span className="text-xs text-[var(--accent-gold)] font-medium">{row.purity_target}</span> : <span className="text-[var(--text-muted)]">—</span>
      case 'alloy_status':        return row.alloy_status ? <Badge label={row.alloy_status} variant={row.alloy_status === 'Active' ? 'success' : row.alloy_status === 'Inactive' ? 'danger' : 'warning'} /> : <span className="text-[var(--text-muted)]">—</span>
      case 'color_tone':          return <span className="text-sm text-[var(--text-secondary)]">{row.color_tone || '—'}</span>
      case 'alloy_cost_per_gram': return row.alloy_cost_per_gram != null ? <span className="text-sm font-medium tabular-nums">₹{Number(row.alloy_cost_per_gram).toFixed(2)}</span> : <span className="text-[var(--text-muted)]">—</span>
      case 'is_active':           return <Badge label={row.is_active ? 'Active' : 'Inactive'} variant={row.is_active ? 'success' : 'danger'} />
      case 'deactivation_reason': return row.deactivation_reason ? <span className="text-sm text-[var(--text-secondary)]">{row.deactivation_reason}</span> : <span className="text-[var(--text-muted)]">—</span>
      case 'deactivated_at':      return row.deactivated_at ? <span className="text-xs text-[var(--text-muted)]">{formatDate(String(row.deactivated_at))}</span> : <span className="text-[var(--text-muted)]">—</span>
      case 'created_at':          return <span className="text-xs text-[var(--text-muted)]">{formatDateTime(String(row.created_at))}</span>
      default: return <span className="text-sm text-[var(--text-secondary)]">{String((row as unknown as Record<string, unknown>)[key] ?? '') || '—'}</span>
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <span>Masters</span><span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>Alloy Master</span>
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 pl-3">
          {(['active', 'inactive'] as const).map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); setColFilters({}); setSearchInput(''); setSearch('') }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all w-36 ${statusFilter === s ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10' : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/50'}`}>
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
        <div className="flex items-center gap-2">
          <button onClick={() => setImportOpen(true)} className="btn-secondary flex items-center gap-2"><ArrowUpTrayIcon className="w-4 h-4" /> Import</button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2"><PlusIcon className="w-4 h-4" /> Add Alloy</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[var(--border-color)]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input value={searchInput} onChange={e => onSearchInput(e.target.value)} placeholder="Search alloys…" className="form-input pl-9 pr-8 py-1.5 text-sm w-full" />
            {searchInput && <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XMarkIcon className="w-4 h-4" /></button>}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setShowFilterRow(s => !s)} className={`p-1.5 rounded-lg border transition-colors ${showFilterRow ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}><FunnelIcon className="w-4 h-4" /></button>
            <button onClick={() => setShowSorting(s => !s)} className={`p-1.5 rounded-lg border transition-colors ${showSorting ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}><BarsArrowUpIcon className="w-4 h-4" /></button>
            <div ref={colPickerRef} className="relative">
              <button onClick={() => setShowColPicker(s => !s)} className={`p-1.5 rounded-lg border transition-colors ${showColPicker ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}><ViewColumnsIcon className="w-4 h-4" /></button>
              {showColPicker && (
                <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg p-1.5">
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
            <div ref={exportRef} className="relative">
              <button onClick={() => setExportOpen(o => !o)} disabled={exporting} className={`p-1.5 rounded-lg border transition-colors ${exportOpen ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                {exporting ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <ArrowDownTrayIcon className="w-4 h-4" />}
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg p-1.5">
                  <p className="px-2 py-1 text-xs text-[var(--text-muted)] font-semibold uppercase">All Records</p>
                  {(['csv', 'excel', 'pdf'] as const).map(fmt => (
                    <button key={fmt} onClick={() => handleExport('all', fmt)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] text-left">
                      <span>{fmt === 'csv' ? '📄' : fmt === 'excel' ? '📊' : '📋'}</span><span className="font-medium">{fmt.toUpperCase()}</span>
                    </button>
                  ))}
                  <div className="my-1.5 border-t border-[var(--border-color)]" />
                  <p className="px-2 py-1 text-xs text-[var(--text-muted)] font-semibold uppercase">Selected</p>
                  {(['csv', 'excel', 'pdf'] as const).map(fmt => (
                    <button key={fmt} onClick={() => handleExport('selected', fmt)} disabled={!selectedRows.length} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] text-left disabled:opacity-40 disabled:cursor-not-allowed">
                      <span>{fmt === 'csv' ? '📄' : fmt === 'excel' ? '📊' : '📋'}</span><span className="font-medium">{fmt.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
              <span className="hidden sm:inline">Show</span>
              <select value={pageSize} onChange={e => handlePageSize(Number(e.target.value))} className="form-input py-1.5 text-sm" style={{ width: '72px' }}>
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
                  <input type="checkbox" ref={masterCheckRef} checked={allPageSelected} onChange={toggleSelectPage} className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer" />
                </th>
                {visibleCols.map(col => (
                  <th key={col.key} style={{ minWidth: col.minW }}
                    onClick={() => showSorting && col.sortKey && handleSort(col.sortKey)}
                    className={`px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide select-none whitespace-nowrap ${showSorting && col.sortKey ? 'cursor-pointer hover:text-[var(--text-primary)]' : ''}`}>
                    <div className="flex items-center gap-1">
                      {col.label}
                      {showSorting && col.sortKey && (sortBy === col.sortKey
                        ? sortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5 text-[var(--accent-gold)]" /> : <ChevronDownIcon className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                        : <ChevronUpDownIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-2.5 w-28 text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide sticky right-0 z-10 bg-[var(--bg-secondary)] border-l border-[var(--border-color)]">Actions</th>
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
                    {Object.values(colFilters).some(v => v) && <button onClick={() => setColFilters({})} className="text-xs text-[var(--accent-gold)] hover:underline whitespace-nowrap">Clear</button>}
                  </th>
                </tr>
              )}
            </thead>
            <tbody className={fetching ? 'opacity-50 pointer-events-none' : ''}>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-color)]">
                    <td className="px-4 py-3"><div className="h-4 w-4 rounded animate-pulse bg-[var(--bg-tertiary)]" /></td>
                    {visibleCols.map(col => <td key={col.key} className="px-4 py-3"><div className="h-4 rounded animate-pulse bg-[var(--bg-tertiary)]" style={{ width: '80px' }} /></td>)}
                    <td className="px-4 py-3 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]"><div className="h-4 w-16 rounded animate-pulse bg-[var(--bg-tertiary)]" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={visibleCols.length + 2} className="px-4 py-14 text-center text-sm text-[var(--text-muted)]">
                  {search || Object.values(colFilters).some(v => v) ? 'No records match the current filters.' : 'No alloys found. Click "Add Alloy" to create one.'}
                </td></tr>
              ) : (
                items.map((row, idx) => (
                  <tr key={row.id} className={`border-b border-[var(--border-color)] transition-colors hover:bg-[var(--bg-secondary)] ${idx % 2 !== 0 ? 'bg-[var(--bg-primary)]/40' : ''} ${selectedRows.some(r => r.id === row.id) ? 'bg-[var(--accent-gold)]/5' : ''}`}>
                    <td className="px-4 py-2.5"><input type="checkbox" checked={selectedRows.some(r => r.id === row.id)} onChange={() => toggleSelectRow(row)} className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer" /></td>
                    {visibleCols.map(col => <td key={col.key} className="px-4 py-2.5">{renderCell(col.key, row)}</td>)}
                    <td className="px-4 py-2.5 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(row)} className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500 ${!row.is_active ? 'invisible' : ''}`} title="Edit"><PencilIcon className="w-4 h-4" /></button>
                        <button onClick={() => setToggleItem(row)} className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] ${row.is_active ? 'text-red-500' : 'text-green-600'}`} title={row.is_active ? 'Deactivate' : 'Activate'}>
                          {row.is_active ? <NoSymbolIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
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
            <span className="text-sm text-[var(--text-muted)]">{total === 0 ? 'No records found' : `Showing ${startRow}–${endRow} of ${total} entries`}</span>
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
            {pageNumbers.map((n, i) => n === '...' ? <span key={`d${i}`} className="px-1.5 text-xs text-[var(--text-muted)]">…</span> : (
              <button key={n} onClick={() => setPage(n as number)} className={`px-2.5 py-1 text-xs rounded border transition-colors ${page === n ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)] text-white font-semibold' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>{n}</button>
            ))}
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">›</button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">»</button>
          </div>
          <span className="text-sm text-[var(--text-muted)] hidden sm:block">Page {page} of {totalPages || 1}</span>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setFV(blankForm()); reset() }}
        title={isNew ? 'Add Alloy' : `Edit Alloy — ${editItem?.alloy_code}`}
        size="3xl"
        footer={
          <>
            <button onClick={() => { setModalOpen(false); setFV(blankForm()); reset() }} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit(onSubmit)} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : isNew ? 'Create' : 'Update'}
            </button>
          </>
        }
      >
        <form className="space-y-6" onSubmit={e => e.preventDefault()}>

          {/* Section 1: Basic Information */}
          <div>
            <SH>Basic Information</SH>
            <div className="grid grid-cols-3 gap-x-4 gap-y-3">
              <FL label="Alloy Code" error={errors.alloy_code?.message} req>
                {isNew ? (
                  <input className="form-input text-sm" value={fv.alloy_code} placeholder="e.g. AU18K-YG"
                    style={{ textTransform: 'uppercase' }}
                    onChange={e => setField('alloy_code', e.target.value.toUpperCase(), true)} />
                ) : (
                  <div className="form-input text-sm bg-[var(--bg-tertiary)] opacity-70 cursor-not-allowed font-mono font-semibold">{editItem?.alloy_code}</div>
                )}
              </FL>
              <FL label="Alloy Name" error={errors.alloy_name?.message} req>
                <input className="form-input text-sm" value={fv.alloy_name} placeholder="e.g. 18K Yellow Gold"
                  onChange={e => setField('alloy_name', e.target.value, !!errors.alloy_name)} />
              </FL>
              <FL label="Metal Category">
                <select className="form-input text-sm" value={fv.metal_category} onChange={e => setField('metal_category', e.target.value)}>
                  <option value="">— Select —</option>
                  {METAL_CATEGORY_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </FL>
              <FL label="Purity Target (Multi-select)">
                <MultiCheckSelect options={PURITY_TARGET_OPTS} selected={puritySel} onChange={setPuritySel} placeholder="Select purity targets…" />
              </FL>
              <FL label="Application Type (Multi-select)">
                <MultiCheckSelect options={APPLICATION_TYPE_OPTS} selected={appTypeSel} onChange={setAppTypeSel} placeholder="Select applications…" />
              </FL>
              <FL label="Alloy Status">
                <select className="form-input text-sm" value={fv.alloy_status} onChange={e => setField('alloy_status', e.target.value)}>
                  <option value="">— Select —</option>
                  {ALLOY_STATUS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </FL>
              <FL label="Alloy Brand">
                <input className="form-input text-sm" value={fv.alloy_brand} placeholder="Supplier or Brand name"
                  onChange={e => setField('alloy_brand', e.target.value)} />
              </FL>
              <FL label="Supplier Name">
                <input className="form-input text-sm" value={fv.supplier_name} placeholder="Supplier name"
                  onChange={e => setField('supplier_name', e.target.value)} />
              </FL>
              <FL label="Hazardous">
                <div className="flex items-center h-[38px] gap-2">
                  <input type="checkbox" checked={!!fv.alloy_hazardous} className="w-4 h-4 accent-[var(--color-primary)]" id="alloy_hazardous"
                    onChange={e => setField('alloy_hazardous', e.target.checked)} />
                  <label htmlFor="alloy_hazardous" className="text-sm text-[var(--text-secondary)] cursor-pointer select-none">Mark as hazardous</label>
                </div>
              </FL>
            </div>
          </div>

          {/* Section 2: Composition */}
          <div>
            <SH>Composition</SH>
            <div className="grid grid-cols-3 gap-x-4 gap-y-3">
              <FL label="With Silver">
                <select className="form-input text-sm" value={fv.with_silver} onChange={e => setField('with_silver', e.target.value)}>
                  <option value="">— Select —</option>
                  {WITH_SILVER_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </FL>
              <FL label="Silver Percentage">
                <input type="number" step="0.01" min="0" max="100" className="form-input text-sm"
                  value={fv.silver_percentage} placeholder="0.00"
                  onChange={e => setField('silver_percentage', e.target.value)} />
              </FL>
              <FL label="Alloy Additives Type">
                <select className="form-input text-sm" value={fv.alloy_additives_type} onChange={e => setField('alloy_additives_type', e.target.value)}>
                  <option value="">— Select —</option>
                  {ADDITIVE_TYPE_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </FL>
              <FL label="Alloy Density (g/cm³)">
                <input type="number" step="0.001" min="0" className="form-input text-sm"
                  value={fv.alloy_density} placeholder="e.g. 15.580"
                  onChange={e => setField('alloy_density', e.target.value)} />
              </FL>
              <FL label="Composition Remark">
                <input className="form-input text-sm" value={fv.composition_remark} placeholder="Notes on composition"
                  onChange={e => setField('composition_remark', e.target.value)} />
              </FL>
            </div>
          </div>

          {/* Section 3: Physical Properties */}
          <div>
            <SH>Physical Properties</SH>
            <div className="grid grid-cols-3 gap-x-4 gap-y-3">
              <FL label="Alloy Hardness">
                <input className="form-input text-sm" value={fv.alloy_hardness} placeholder="e.g. 180 HV"
                  onChange={e => setField('alloy_hardness', e.target.value)} />
              </FL>
              <FL label="Tensile Strength">
                <input className="form-input text-sm" value={fv.tensile_strength} placeholder="e.g. 600 MPa"
                  onChange={e => setField('tensile_strength', e.target.value)} />
              </FL>
              <FL label="Ductility / Elongation">
                <input className="form-input text-sm" value={fv.ductility_elongation} placeholder="e.g. 15%"
                  onChange={e => setField('ductility_elongation', e.target.value)} />
              </FL>
              <FL label="Melting Range (°C)">
                <input className="form-input text-sm" value={fv.melting_range} placeholder="e.g. 890–920"
                  onChange={e => setField('melting_range', e.target.value)} />
              </FL>
              <FL label="Color Tone">
                <select className="form-input text-sm" value={fv.color_tone} onChange={e => setField('color_tone', e.target.value)}>
                  <option value="">— Select —</option>
                  {COLOR_TONE_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </FL>
              <FL label="Finish Behaviour">
                <select className="form-input text-sm" value={fv.finish_behaviour} onChange={e => setField('finish_behaviour', e.target.value)}>
                  <option value="">— Select —</option>
                  {FINISH_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </FL>
              <FL label="Max Drawing Reduction">
                <input className="form-input text-sm" value={fv.max_drawing_reduction} placeholder="e.g. 80%"
                  onChange={e => setField('max_drawing_reduction', e.target.value)} />
              </FL>
              <FL label="Alloy Required">
                <input className="form-input text-sm" value={fv.alloy_required} placeholder="Usage note"
                  onChange={e => setField('alloy_required', e.target.value)} />
              </FL>
              <FL label="Breakage Sensitivity">
                <input className="form-input text-sm" value={fv.breakage_sensitivity} placeholder="Low / Medium / High"
                  onChange={e => setField('breakage_sensitivity', e.target.value)} />
              </FL>
              <FL label="Melting Method">
                <select className="form-input text-sm" value={fv.melting_method} onChange={e => setField('melting_method', e.target.value)}>
                  <option value="">— Select —</option>
                  {MELTING_METHOD_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </FL>
            </div>
          </div>

          {/* Section 4: Commercial */}
          <div>
            <SH>Commercial</SH>
            <div className="grid grid-cols-3 gap-x-4 gap-y-3">
              <FL label="Alloy Cost / gram (₹)">
                <input type="number" step="0.0001" min="0" className="form-input text-sm"
                  value={fv.alloy_cost_per_gram} placeholder="e.g. 450.0000"
                  onChange={e => setField('alloy_cost_per_gram', e.target.value)} />
              </FL>
              <FL label="Indicative Cost / gram (₹)">
                <input type="number" step="0.0001" min="0" className="form-input text-sm"
                  value={fv.indicative_alloy_cost_per_gram} placeholder="e.g. 420.0000"
                  onChange={e => setField('indicative_alloy_cost_per_gram', e.target.value)} />
              </FL>
            </div>
          </div>

        </form>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={importOpen}
        onClose={() => { setImportOpen(false); setImportFile(null); setImportPreview([]) }}
        title="Import Alloys from CSV"
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
          <p className="text-xs text-[var(--text-muted)]">
            Required columns: <span className="font-mono text-[var(--accent-gold)]">alloy_code</span>, <span className="font-mono text-[var(--accent-gold)]">alloy_name</span>. All other columns are optional. Duplicate codes are skipped.
          </p>
        </div>
      </Modal>

      <DeactivateReasonDialog
        isOpen={!!toggleItem?.is_active}
        title="Deactivate Alloy"
        itemLabel={`"${toggleItem?.alloy_name}" (${toggleItem?.alloy_code})`}
        onConfirm={reason => confirmToggle(reason)}
        onCancel={() => setToggleItem(null)}
      />
      <ConfirmDialog
        isOpen={!!toggleItem && !toggleItem.is_active}
        title="Activate Alloy"
        message={`Activate "${toggleItem?.alloy_name}" (${toggleItem?.alloy_code})?`}
        confirmLabel="Activate"
        variant="info"
        onConfirm={() => confirmToggle()}
        onCancel={() => setToggleItem(null)}
      />
    </div>
  )
}

export default AlloyMasterPage
