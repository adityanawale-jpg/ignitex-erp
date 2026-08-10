import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon, KeyIcon, ChevronDownIcon,
  MagnifyingGlassIcon, XMarkIcon, ViewColumnsIcon,
  ChevronUpIcon, ChevronUpDownIcon,
  FunnelIcon, BarsArrowUpIcon,
  NoSymbolIcon, CheckCircleIcon,
  UserGroupIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, InformationCircleIcon,
  EyeIcon, EyeSlashIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import Modal         from '@/components/common/Modal'
import Badge         from '@/components/common/Badge'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import PageBreadcrumb from '@/components/common/PageBreadcrumb'
import { formatDateTime, getInitials, exportToCSV, exportToExcel, exportToPDF } from '@/utils/helpers'
import { apiService } from '@/api/apiService'

// ── Types ─────────────────────────────────────────────────────
interface RoleOption    { id: number; role_code: string; role_name: string }
interface ManagerOption { user_id: number; employee_id: string; full_name: string }
interface UserRole      { role_id: number; role_name: string; role_code: string; is_default: boolean }

interface UserEntry {
  user_id:         number
  employee_id:     string
  first_name:      string
  last_name:       string
  full_name:       string
  emp_email:     string
  mobile_number: string
  department_id: string
  designation:   string
  manager_id:    number | null
  manager_name:  string
  start_date:    string
  expiry_date:   string | null
  user_status:     boolean
  inactive_date:   string | null
  inactive_reason: string | null
  created_at:      string
  roles:           UserRole[]
}

type FormValues = {
  employee_id:   string
  first_name:    string
  last_name:     string
  emp_email:     string
  mobile_number: string
  department_id: string
  designation:   string
  manager_id:    number | null
  start_date:    string
  expiry_date:   string
  password:      string
}

const schema = yup.object({
  employee_id:   yup.string().required('Employee ID is required').min(3, 'Min 3 characters'),
  first_name:    yup.string().required('First name is required'),
  last_name:     yup.string().default(''),
  emp_email:     yup.string().email('Invalid email').required('Email address is required'),
  mobile_number: yup.string()
    .test('mobile', 'Mobile number must be exactly 10 digits', val => !val || /^\d{10}$/.test(val))
    .default(''),
  department_id: yup.string().default(''),
  designation:   yup.string().default(''),
  manager_id:    yup.number().nullable()
    .transform((val, orig) => (orig === '' || orig === null || orig === undefined) ? null : Number(orig))
    .default(null),
  start_date:    yup.string().required('Start date is required'),
  expiry_date:   yup.string().default(''),
  password:      yup.string().default(''),
})

const DEPARTMENTS = [
  { id: 'IT',         name: 'Information Technology' },
  { id: 'SALES',      name: 'Sales' },
  { id: 'PURCHASE',   name: 'Purchase' },
  { id: 'ACCOUNTS',   name: 'Accounts' },
  { id: 'ADMIN',      name: 'Administration' },
  { id: 'HR',         name: 'Human Resources' },
  { id: 'DESIGN',     name: 'Design & Production' },
  { id: 'STORE',      name: 'Store Operations' },
  { id: 'INVENTORY',  name: 'Inventory' },
  { id: 'PRODUCTION', name: 'Production' },
]

const PAGE_SIZES = [10, 15, 20, 50, 100]

// ── Import types ──────────────────────────────────────────────
interface ImportRow {
  _rowNum:             number
  employee_id:         string
  first_name:          string
  last_name:           string
  emp_email:           string
  mobile_number:       string
  department_id:       string
  designation:         string
  manager_employee_id: string
  manager_id:          number | null
  start_date:          string
  expiry_date:         string
  password:            string
  role_names:          string
  role_ids:            number[]
  errors:              string[]
}

// Normalize Excel header → field key
const HEADER_MAP: Record<string, keyof ImportRow> = {
  'employee id':        'employee_id',
  'first name':         'first_name',
  'last name':          'last_name',
  'email':              'emp_email',
  'mobile':             'mobile_number',
  'department':         'department_id',
  'designation':        'designation',
  'manager':            'manager_employee_id',
  'manager id':         'manager_employee_id',
  'manager employee id':'manager_employee_id',
  'start date':         'start_date',
  'expiry date':        'expiry_date',
  'password':           'password',
  'roles':              'role_names',
}
const normalizeHeader = (h: string) =>
  h.replace(/\*/g, '').replace(/\(.*?\)/g, '').trim().toLowerCase()

const Req = () => <span className="text-red-500 ml-0.5">*</span>

// ── Column definition ─────────────────────────────────────────
interface ColDef {
  key:      string
  label:    string
  sortKey?: string
  visible:  boolean
  minW?:    string
}

const INITIAL_COLS: ColDef[] = [
  { key: 'employee',      label: 'Employee',    sortKey: 'first_name',    visible: true,  minW: '170px' },
  { key: 'emp_email',     label: 'Email',       sortKey: 'emp_email',     visible: true,  minW: '160px' },
  { key: 'mobile_number', label: 'Mobile',                                visible: true,  minW: '110px' },
  { key: 'department_id', label: 'Department',  sortKey: 'department_id', visible: true,  minW: '110px' },
  { key: 'designation',   label: 'Designation', sortKey: 'designation',   visible: true,  minW: '130px' },
  { key: 'manager_name',  label: 'Manager',                               visible: true,  minW: '120px' },
  { key: 'roles',         label: 'Roles',                                 visible: true,  minW: '120px' },
  { key: 'user_status',   label: 'Status',                                visible: true,  minW: '80px'  },
  { key: 'start_date',    label: 'Start Date',  sortKey: 'start_date',    visible: false, minW: '100px' },
  { key: 'expiry_date',   label: 'Expiry Date', sortKey: 'expiry_date',   visible: false, minW: '100px' },
  { key: 'created_at',    label: 'Created',     sortKey: 'created_at',    visible: true,  minW: '130px' },
]

// ── Role multi-select ─────────────────────────────────────────
interface RoleMultiSelectProps {
  roles: RoleOption[]; selected: number[]
  onChange: (ids: number[]) => void; error?: string; disabled?: boolean
}
const RoleMultiSelect: React.FC<RoleMultiSelectProps> = ({ roles, selected, onChange, error, disabled }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const toggle = (id: number) => {
    if (disabled) return
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }
  const label = selected.length === 0
    ? 'Select roles...'
    : roles.filter(r => selected.includes(r.id))
        .map((r, i) => i === 0 ? `${r.role_name} (default)` : r.role_name).join(', ')
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => !disabled && setOpen(o => !o)}
        className={`form-input w-full text-left flex justify-between items-center
          ${error ? 'border-red-400' : ''}
          ${disabled ? 'opacity-60 cursor-not-allowed bg-[var(--bg-tertiary)]' : ''}`}>
        <span className={`truncate text-sm ${selected.length === 0 ? 'text-[var(--text-muted)]' : ''}`}>{label}</span>
        <ChevronDownIcon className={`w-4 h-4 flex-shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && !disabled && (
        <div className="absolute z-50 w-full bottom-full mb-1 rounded-lg shadow-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] max-h-52 overflow-y-auto">
          {roles.length === 0
            ? <p className="px-3 py-2 text-sm text-[var(--text-muted)]">No roles available</p>
            : roles.map(role => {
                const checked = selected.includes(role.id)
                return (
                  <label key={role.id} className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-tertiary)] cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={() => toggle(role.id)}
                      className="w-4 h-4 accent-[var(--color-primary)]" />
                    <span className="flex-1 text-sm text-[var(--text-primary)]">{role.role_name}</span>
                    {selected[0] === role.id && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">default</span>
                    )}
                  </label>
                )
              })
          }
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────
const UserManagementPage: React.FC = () => {

  // ── Form / modal state ─────────────────────────────────────
  const [roles,        setRoles]        = useState<RoleOption[]>([])
  const [managers,     setManagers]     = useState<ManagerOption[]>([])
  const [saving,          setSaving]          = useState(false)
  const [modalOpen,       setModalOpen]       = useState(false)
  const [editItem,        setEditItem]        = useState<UserEntry | null>(null)
  const [deleteItem,      setDeleteItem]      = useState<UserEntry | null>(null)
  const [showPass,        setShowPass]        = useState(false)

  // ── Deactivation modal state ───────────────────────────────
  const [deactivateItem,        setDeactivateItem]        = useState<UserEntry | null>(null)
  const [inactiveDate,          setInactiveDate]          = useState('')
  const [inactiveReason,        setInactiveReason]        = useState('')
  const [deactivateSaving,      setDeactivateSaving]      = useState(false)
  const [deactErrors,           setDeactErrors]           = useState<{ inactiveDate?: string; inactiveReason?: string }>({})
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [showActivateConfirm,   setShowActivateConfirm]   = useState(false)
  const [selectedRoles,   setSelectedRoles]   = useState<number[]>([])
  const [roleError,       setRoleError]       = useState('')
  const [activateStatus,  setActivateStatus]  = useState(false)
  const isNew          = !editItem
  const isInactiveEdit = !isNew && editItem !== null && !editItem.user_status

  // ── Reset password modal state ─────────────────────────────
  const [resetPwdUser,    setResetPwdUser]    = useState<UserEntry | null>(null)
  const [resetSaving,     setResetSaving]     = useState(false)
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPass,     setShowNewPass]     = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [pwdErrors,       setPwdErrors]       = useState<{ newPassword?: string; confirmPassword?: string }>({})

  const { register, handleSubmit, reset, setError, watch, getValues, formState: { errors } } =
    useForm<FormValues>({ resolver: yupResolver(schema) as never })

  const TODAY = new Date().toISOString().split('T')[0]
  const watchedExpiry = watch('expiry_date')
  const expiryIsPast  = !!watchedExpiry && watchedExpiry < TODAY

  // ── Grid / server state ────────────────────────────────────
  const [users,        setUsers]        = useState<UserEntry[]>([])
  const [loading,      setLoading]      = useState(true)   // initial skeleton
  const [fetching,     setFetching]     = useState(false)  // subsequent page/sort/filter
  const isFirstLoad    = useRef(true)
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active')
  const [stats,        setStats]        = useState({ active: 0, inactive: 0 })
  const [page,         setPage]         = useState(1)
  const [pageSize,    setPageSize]    = useState(10)
  const [searchInput, setSearchInput] = useState('')
  const [search,      setSearch]      = useState('')
  const [sortBy,      setSortBy]      = useState('first_name')
  const [sortDir,     setSortDir]     = useState<'asc' | 'desc'>('asc')
  const [total,       setTotal]       = useState(0)
  const [totalPages,  setTotalPages]  = useState(1)

  // ── Grid toolbar state ─────────────────────────────────────
  const [cols,           setCols]           = useState<ColDef[]>(INITIAL_COLS)
  const [showColPicker,  setShowColPicker]  = useState(false)
  const [showFilterRow,  setShowFilterRow]  = useState(true)
  const [showSorting,    setShowSorting]    = useState(true)
  const [colFilters,          setColFilters]          = useState<Record<string, string>>({})
  const [debouncedColFilters, setDebouncedColFilters] = useState<Record<string, string>>({})
  const colPickerRef   = useRef<HTMLDivElement>(null)
  const searchTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const colFilterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Import state ────────────────────────────────────────────
  const [importOpen,     setImportOpen]     = useState(false)
  const [importStep,     setImportStep]     = useState<'upload' | 'preview' | 'result'>('upload')
  const [importRows,     setImportRows]     = useState<ImportRow[]>([])
  const [importDone,     setImportDone]     = useState(0)
  const [importTotal,    setImportTotal]    = useState(0)
  const [importErrList,  setImportErrList]  = useState<{ row: number; msg: string }[]>([])
  const [importing,      setImporting]      = useState(false)
  const importFileRef    = useRef<HTMLInputElement>(null)

  // ── Export / selection state ────────────────────────────────
  const [selectedRows, setSelectedRows] = useState<UserEntry[]>([])
  const [exportOpen,   setExportOpen]   = useState(false)
  const [exporting,    setExporting]    = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  // Close col picker / export menu on outside click
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

  // ── Search debounce ────────────────────────────────────────
  const onSearchInput = (val: string) => {
    setSearchInput(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1) }, 400)
  }

  // ── Column-filter debounce ─────────────────────────────────
  useEffect(() => {
    if (colFilterTimer.current) clearTimeout(colFilterTimer.current)
    colFilterTimer.current = setTimeout(() => {
      setDebouncedColFilters(colFilters)
      setPage(1)
    }, 400)
  }, [colFilters]) // eslint-disable-line

  // ── Load stats ─────────────────────────────────────────────
  const loadStats = async () => {
    try {
      const res = await apiService.get('/users/stats')
      setStats(res.data?.data ?? { active: 0, inactive: 0 })
    } catch { /* silent */ }
  }

  useEffect(() => { loadStats() }, []) // eslint-disable-line

  // ── Load users (server-side) ───────────────────────────────
  const loadUsers = async () => {
    if (isFirstLoad.current) setLoading(true)
    else setFetching(true)
    try {
      const activeCF = Object.fromEntries(
        Object.entries(debouncedColFilters).filter(([, v]) => v.trim())
      )
      const res = await apiService.get('/users', {
        params: {
          page, limit: pageSize, search, sort_by: sortBy, sort_dir: sortDir,
          status: statusFilter,
          ...(Object.keys(activeCF).length > 0 && { col_filters: JSON.stringify(activeCF) }),
        },
      })
      setUsers(res.data?.data ?? [])
      setTotal(res.data?.meta?.total ?? 0)
      setTotalPages(res.data?.meta?.total_pages ?? 1)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to load users')
    } finally {
      setLoading(false)
      setFetching(false)
      isFirstLoad.current = false
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadUsers() }, [page, pageSize, search, sortBy, sortDir, debouncedColFilters, statusFilter])

  // ── Sort handler ───────────────────────────────────────────
  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
    setPage(1)
  }

  // ── Page-size handler ──────────────────────────────────────
  const handlePageSize = (size: number) => { setPageSize(size); setPage(1) }

  // ── Column chooser ─────────────────────────────────────────
  const toggleCol    = (key: string) =>
    setCols(cs => cs.map(c => c.key === key ? { ...c, visible: !c.visible } : c))
  const visibleCols  = cols.filter(c => c.visible)

  // ── Export helpers ─────────────────────────────────────────
  const getExportData = (rows: UserEntry[]) =>
    rows.map(u => ({
      'Employee ID':  u.employee_id,
      'Full Name':    u.full_name || `${u.first_name} ${u.last_name ?? ''}`.trim(),
      'Email':        u.emp_email,
      'Mobile':       u.mobile_number || '',
      'Department':   u.department_id || '',
      'Designation':  u.designation   || '',
      'Manager':      u.manager_name  || '',
      'Roles':        u.roles?.map(r => r.role_name).join(', ') || '',
      'Status':       u.user_status ? 'Active' : 'Inactive',
      'Start Date':   u.start_date   ? u.start_date.substring(0, 10)   : '',
      'Expiry Date':  u.expiry_date  ? u.expiry_date.substring(0, 10)  : '',
      'Created At':   formatDateTime(String(u.created_at)),
    }))

  const handleExport = async (scope: 'all' | 'selected', format: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false)
    let rows: UserEntry[]
    if (scope === 'selected') {
      rows = selectedRows
      if (rows.length === 0) { toast.error('No rows selected'); return }
    } else {
      setExporting(true)
      try {
        const activeCF = Object.fromEntries(
          Object.entries(debouncedColFilters).filter(([, v]) => v.trim())
        )
        const res = await apiService.get('/users', {
          params: {
            page: 1, limit: 9999, search, sort_by: sortBy, sort_dir: sortDir,
            status: statusFilter,
            ...(Object.keys(activeCF).length > 0 && { col_filters: JSON.stringify(activeCF) }),
          },
        })
        rows = res.data?.data ?? []
      } catch {
        toast.error('Failed to fetch data for export')
        setExporting(false)
        return
      }
      setExporting(false)
    }
    const data  = getExportData(rows)
    const fname = `users_${statusFilter}`
    if (format === 'csv')   exportToCSV(data, fname)
    else if (format === 'excel') void exportToExcel(data, fname)
    else void exportToPDF(data, fname, 'User Management Report')
  }

  // ── Row selection helpers ──────────────────────────────────
  const currentPageIds  = users.map(u => u.user_id)
  const allPageSelected = currentPageIds.length > 0 &&
    currentPageIds.every(id => selectedRows.some(r => r.user_id === id))
  const somePageSelected = currentPageIds.some(id => selectedRows.some(r => r.user_id === id))

  const toggleSelectPage = () => {
    if (allPageSelected) {
      setSelectedRows(prev => prev.filter(r => !currentPageIds.includes(r.user_id)))
    } else {
      const toAdd = users.filter(u => !selectedRows.some(r => r.user_id === u.user_id))
      setSelectedRows(prev => [...prev, ...toAdd])
    }
  }

  const toggleSelectRow = (u: UserEntry) => {
    setSelectedRows(prev =>
      prev.some(r => r.user_id === u.user_id)
        ? prev.filter(r => r.user_id !== u.user_id)
        : [...prev, u]
    )
  }

  // ── Cell renderer ──────────────────────────────────────────
  const renderCell = (key: string, u: UserEntry) => {
    switch (key) {
      case 'employee':
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--color-primary)] flex-shrink-0">
              {getInitials(u.full_name || `${u.first_name} ${u.last_name}`)}
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)] text-sm leading-tight">
                {u.full_name || `${u.first_name} ${u.last_name ?? ''}`.trim()}
              </p>
              <p className="text-xs text-[var(--text-muted)]">{u.employee_id}</p>
            </div>
          </div>
        )
      case 'roles':
        if (!u.roles?.length) return <span className="text-xs text-[var(--text-muted)]">—</span>
        return (
          <div className="flex flex-wrap gap-1">
            {u.roles.map(r => <Badge key={r.role_id} label={r.role_name} variant={r.is_default ? 'primary' : 'secondary'} />)}
          </div>
        )
      case 'user_status':
        return <Badge label={u.user_status ? 'Active' : 'Inactive'} variant={u.user_status ? 'success' : 'danger'} />
      case 'created_at':
        return <span className="text-xs text-[var(--text-muted)]">{formatDateTime(String(u.created_at))}</span>
      case 'start_date':
        return <span className="text-xs text-[var(--text-secondary)]">{u.start_date ? u.start_date.substring(0, 10) : '—'}</span>
      case 'expiry_date':
        return <span className="text-xs text-[var(--text-secondary)]">{u.expiry_date ? u.expiry_date.substring(0, 10) : '—'}</span>
      default:
        return (
          <span className="text-sm text-[var(--text-secondary)]">
            {String((u as unknown as Record<string, unknown>)[key] ?? '') || '—'}
          </span>
        )
    }
  }

  // ── Pagination page numbers ────────────────────────────────
  const pageNumbers = useMemo((): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 4)           return [1, 2, 3, 4, 5, '...', totalPages]
    if (page >= totalPages - 3) return [1, '...', totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages]
    return [1, '...', page - 1, page, page + 1, '...', totalPages]
  }, [page, totalPages])

  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endRow   = Math.min(page * pageSize, total)

  // ── Dropdowns ──────────────────────────────────────────────
  const loadDropdowns = async () => {
    try {
      const [rRes, mRes] = await Promise.all([
        apiService.get('/users/roles'),
        apiService.get('/users/managers'),
      ])
      setRoles(rRes.data?.data ?? [])
      setManagers(mRes.data?.data ?? [])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to load options')
    }
  }

  // ── Open Add ────────────────────────────────────────────────
  const openAdd = async () => {
    setEditItem(null)
    reset({ employee_id: '', first_name: '', last_name: '', emp_email: '',
            mobile_number: '', department_id: '', designation: '',
            manager_id: null, start_date: '', expiry_date: '', password: '' })
    setSelectedRoles([]); setRoleError(''); setShowPass(false); setModalOpen(true)
    if (roles.length === 0) await loadDropdowns()
  }

  // ── Open Edit ───────────────────────────────────────────────
  const openEdit = async (item: UserEntry) => {
    setEditItem(item)
    reset({
      employee_id:   item.employee_id,
      first_name:    item.first_name,
      last_name:     item.last_name     ?? '',
      emp_email:     item.emp_email,
      mobile_number: item.mobile_number ?? '',
      department_id: item.department_id ?? '',
      designation:   item.designation   ?? '',
      manager_id:    item.manager_id    ?? null,
      start_date:    item.start_date    ? item.start_date.substring(0, 10) : '',
      expiry_date:   item.expiry_date   ? item.expiry_date.substring(0, 10) : '',
    })
    setActivateStatus(item.user_status)
    setSelectedRoles(item.roles.map(r => r.role_id)); setRoleError(''); setShowPass(false); setModalOpen(true)
    if (roles.length === 0) await loadDropdowns()
  }

  // ── Update status (inactive users only) ───────────────────────
  // Step 1 — validate using the CURRENT form value of expiry_date (user may have just edited it)
  const handleUpdateStatus = () => {
    if (!editItem) return
    if (activateStatus === editItem.user_status) {
      setModalOpen(false); reset(); return
    }
    if (activateStatus) {
      const currentExpiry = getValues('expiry_date')
      if (currentExpiry) {
        const today = new Date(); today.setHours(0, 0, 0, 0)
        if (new Date(currentExpiry) < today) {
          toast.error('Cannot activate: expiry date is still in the past. Set a future date or clear it first.', { duration: 5000 })
          return
        }
      }
    }
    setShowActivateConfirm(true)
  }

  // Step 2 — confirmed: save new expiry date if changed, then toggle status
  const confirmActivate = async () => {
    if (!editItem) return
    setShowActivateConfirm(false)
    setSaving(true)
    try {
      const currentExpiry  = getValues('expiry_date') || ''
      const originalExpiry = editItem.expiry_date ? editItem.expiry_date.substring(0, 10) : ''

      // If expiry date was updated, persist it before toggling status
      if (currentExpiry !== originalExpiry) {
        await apiService.put(`/users/${editItem.user_id}`, {
          first_name:    editItem.first_name,
          last_name:     editItem.last_name     ?? '',
          emp_email:     editItem.emp_email,
          mobile_number: editItem.mobile_number ?? '',
          department_id: editItem.department_id ?? '',
          designation:   editItem.designation   ?? '',
          manager_id:    editItem.manager_id    ?? null,
          start_date:    editItem.start_date    ? editItem.start_date.substring(0, 10) : '',
          expiry_date:   currentExpiry || null,
          role_ids:      editItem.roles.map(r => r.role_id),
        })
      }

      const res = await apiService.delete(`/users/${editItem.user_id}`)
      toast.success(res.data?.message || 'User activated successfully')
      setModalOpen(false); reset()
      await Promise.all([loadUsers(), loadStats()])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update status'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  // ── Submit (create / active-user edit only) ─────────────────
  const onSubmit = async (data: FormValues) => {
    if (isNew && (!data.password || data.password.trim().length < 6)) {
      setError('password', { message: 'Password is required (min 6 characters)' }); return
    }
    if (selectedRoles.length === 0) { setRoleError('At least one role is required'); return }
    setRoleError(''); setSaving(true)
    try {
      const { password: _pw, ...noPass } = data
      const payload = { ...(isNew ? data : noPass), role_ids: selectedRoles, manager_id: data.manager_id || null }
      if (isNew) {
        const resp = await apiService.post('/users', payload)
        const saved: number = resp.data?.data?.roles_saved ?? 0
        saved > 0 ? toast.success(`${resp.data?.message || 'User created'} ✓ ${saved} role(s) mapped`)
                  : toast.error('User created but roles were NOT saved.')
      } else {
        const resp = await apiService.put(`/users/${editItem!.user_id}`, payload)
        const saved: number     = resp.data?.data?.roles_saved      ?? 0
        const autoDeact: boolean = resp.data?.data?.auto_deactivated ?? false
        if (autoDeact) {
          toast.error(resp.data?.message || 'User updated and automatically deactivated (expiry date has passed).', { duration: 5000 })
        } else {
          saved > 0 ? toast.success(`${resp.data?.message || 'User updated'} ✓ ${saved} role(s) mapped`)
                    : toast.error('User updated but roles were NOT saved.')
        }
      }
      setModalOpen(false); reset(); await Promise.all([loadUsers(), loadStats()])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save user'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  // ── Reset password ─────────────────────────────────────────
  const openResetPassword = (u: UserEntry) => {
    setResetPwdUser(u)
    setNewPassword(''); setConfirmPassword('')
    setShowNewPass(false); setShowConfirmPass(false); setPwdErrors({})
  }

  const handleResetPassword = async () => {
    const errs: { newPassword?: string; confirmPassword?: string } = {}
    if (!newPassword || newPassword.trim().length < 6)
      errs.newPassword = 'Password must be at least 6 characters'
    if (!confirmPassword)
      errs.confirmPassword = 'Please confirm your password'
    else if (newPassword !== confirmPassword)
      errs.confirmPassword = 'Passwords do not match'
    if (Object.keys(errs).length > 0) { setPwdErrors(errs); return }
    if (!resetPwdUser) return
    setResetSaving(true)
    try {
      const payload = {
        employee_id:   resetPwdUser.employee_id,
        first_name:    resetPwdUser.first_name,
        last_name:     resetPwdUser.last_name     ?? '',
        emp_email:     resetPwdUser.emp_email,
        mobile_number: resetPwdUser.mobile_number ?? '',
        department_id: resetPwdUser.department_id ?? '',
        designation:   resetPwdUser.designation   ?? '',
        manager_id:    resetPwdUser.manager_id    ?? null,
        start_date:    resetPwdUser.start_date    ? resetPwdUser.start_date.substring(0, 10) : '',
        expiry_date:   resetPwdUser.expiry_date   ? resetPwdUser.expiry_date.substring(0, 10) : '',
        role_ids:      resetPwdUser.roles.map(r => r.role_id),
        password:      newPassword,
      }
      const res = await apiService.put(`/users/${resetPwdUser.user_id}`, payload)
      toast.success(res.data?.message || 'Password reset successfully')
      setResetPwdUser(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to reset password'
      toast.error(msg)
    } finally { setResetSaving(false) }
  }

  // ── Deactivate user (with inactive date + reason) ──────────
  const openDeactivate = (u: UserEntry) => {
    setDeactivateItem(u)
    setInactiveDate(new Date().toISOString().split('T')[0])
    setInactiveReason('')
    setDeactErrors({})
  }

  // Step 1 — validate form, open confirmation dialog
  const handleDeactivate = () => {
    const errs: { inactiveDate?: string; inactiveReason?: string } = {}
    if (!inactiveDate)          errs.inactiveDate   = 'Inactive date is required'
    if (!inactiveReason.trim()) errs.inactiveReason = 'Inactive reason is required'
    if (Object.keys(errs).length > 0) { setDeactErrors(errs); return }
    setShowDeactivateConfirm(true)
  }

  // Step 2 — confirmed: execute API call
  const confirmDeactivate = async () => {
    if (!deactivateItem) return
    setShowDeactivateConfirm(false)
    setDeactivateSaving(true)
    try {
      const res = await apiService.delete(`/users/${deactivateItem.user_id}`, {
        data: { inactive_date: inactiveDate, inactive_reason: inactiveReason.trim() },
      })
      toast.success(res.data?.message || 'User deactivated successfully')
      setDeactivateItem(null)
      await Promise.all([loadUsers(), loadStats()])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to deactivate user'
      toast.error(msg)
    } finally { setDeactivateSaving(false) }
  }

  // ── Activate user ───────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteItem) return
    try {
      const res = await apiService.delete(`/users/${deleteItem.user_id}`)
      toast.success(res.data?.message || 'User activated successfully')
      setDeleteItem(null)
      await Promise.all([loadUsers(), loadStats()])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to activate user'
      toast.error(msg)
    }
  }

  // ── Import helpers ────────────────────────────────────────────
  const openImport = async () => {
    setImportOpen(true); setImportStep('upload')
    setImportRows([]); setImportDone(0); setImportTotal(0); setImportErrList([])
    if (roles.length === 0) await loadDropdowns()
  }

  const downloadImportTemplate = async () => {
    const XLSX = await import('xlsx')
    const headers = [
      'Employee ID *', 'First Name *', 'Last Name', 'Email *', 'Mobile',
      'Department', 'Designation', 'Manager', 'Start Date *', 'Expiry Date', 'Password *', 'Roles *',
    ]
    const sample = [
      'EMP100', 'John', 'Doe', 'john.doe@example.com', '9876543210',
      'SALES', 'Sales Executive', 'EMP001', new Date().toISOString().split('T')[0], '',
      'Welcome@123', 'Sales Executive',
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, sample])
    ws['!cols'] = headers.map(() => ({ wch: 20 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Users')
    XLSX.writeFile(wb, `user_import_template_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleImportFile = async (file: File) => {
    const XLSX = await import('xlsx')
    const buf  = await file.arrayBuffer()
    const wb   = XLSX.read(buf, { type: 'array' })
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const raw  = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

    const parsed: ImportRow[] = raw.map((r, idx) => {
      const row: Partial<ImportRow> = { _rowNum: idx + 2, role_ids: [], manager_id: null, errors: [] }
      Object.entries(r).forEach(([col, val]) => {
        const field = HEADER_MAP[normalizeHeader(col)]
        if (field) (row as Record<string, unknown>)[field] = String(val ?? '').trim()
      })
      // Validation
      const errs: string[] = []
      if (!row.employee_id?.trim())  errs.push('Employee ID required')
      if (!row.first_name?.trim())   errs.push('First Name required')
      if (!row.emp_email?.trim())    errs.push('Email required')
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.emp_email)) errs.push('Invalid email')
      if (!row.start_date?.trim())   errs.push('Start Date required')
      else if (isNaN(Date.parse(row.start_date))) errs.push('Start Date must be YYYY-MM-DD')
      if (!row.password?.trim())     errs.push('Password required')
      else if (row.password.trim().length < 6)    errs.push('Password min 6 chars')
      if (!row.role_names?.trim())   errs.push('Roles required')

      // Normalize department against master (case-insensitive match by id or full name)
      if (row.department_id?.trim()) {
        const val = row.department_id.trim().toLowerCase()
        const found = DEPARTMENTS.find(
          d => d.id.toLowerCase() === val || d.name.toLowerCase() === val
        )
        if (found) row.department_id = found.id
        else errs.push(`Unknown department: "${row.department_id.trim()}" — valid: ${DEPARTMENTS.map(d => d.id).join(', ')}`)
      }

      // Resolve role IDs
      if (row.role_names?.trim()) {
        const names = row.role_names.split(',').map(s => s.trim()).filter(Boolean)
        const ids: number[] = []
        names.forEach(name => {
          const found = roles.find(
            r => r.role_name.toLowerCase() === name.toLowerCase() ||
                 r.role_code.toLowerCase() === name.toLowerCase()
          )
          if (found) ids.push(found.id)
          else errs.push(`Unknown role: "${name}"`)
        })
        row.role_ids = ids
      }

      // Resolve manager (optional — match by employee_id or full name)
      if (row.manager_employee_id?.trim()) {
        const val = row.manager_employee_id.trim().toLowerCase()
        const found = managers.find(
          m => m.employee_id.toLowerCase() === val ||
               m.full_name.toLowerCase() === val
        )
        if (found) row.manager_id = found.user_id
        else errs.push(`Unknown manager: "${row.manager_employee_id.trim()}"`)
      }

      row.errors = errs
      return row as ImportRow
    })

    // Same email allowed within same department; blocked if same email appears in a different department
    // Build map: email -> set of departments already using it (from existing users)
    const existingEmailDept = new Map<string, string>()
    users.forEach(u => {
      const key = u.emp_email.toLowerCase()
      if (!existingEmailDept.has(key)) existingEmailDept.set(key, (u.department_id ?? '').toUpperCase())
    })
    // Also track emails seen in this import file
    const seenEmailDept = new Map<string, string>()
    parsed.forEach(row => {
      if (!row.emp_email) return
      const email = row.emp_email.toLowerCase()
      const dept  = (row.department_id ?? '').toUpperCase()
      // Check against existing users
      if (existingEmailDept.has(email)) {
        const existingDept = existingEmailDept.get(email)!
        if (existingDept !== dept) {
          row.errors.push(`Email "${row.emp_email}" is already used in department "${existingDept}"`)
        }
      }
      // Check within import file
      if (seenEmailDept.has(email)) {
        const prevDept = seenEmailDept.get(email)!
        if (prevDept !== dept) {
          row.errors.push(`Email "${row.emp_email}" appears in a different department in this file`)
        }
      } else {
        seenEmailDept.set(email, dept)
      }
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
          await apiService.post('/users', {
            employee_id:   row.employee_id,
            first_name:    row.first_name,
            last_name:     row.last_name     || '',
            emp_email:     row.emp_email,
            mobile_number: row.mobile_number || '',
            department_id: row.department_id || '',
            designation:   row.designation   || '',
            start_date:    row.start_date,
            expiry_date:   row.expiry_date   || null,
            password:      row.password,
            role_ids:      row.role_ids,
            manager_id:    row.manager_id ?? null,
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
    if (done > 0) await Promise.all([loadUsers(), loadStats()])
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div>
      <PageBreadcrumb parent="System Admin" current="User Master" />

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">

        {/* Left — status filter cards */}
        <div className="flex items-center gap-2 pl-3">
          <button
            onClick={() => { setStatusFilter('active'); setPage(1); setColFilters({}); setSearchInput(''); setSearch('') }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all w-36 ${
              statusFilter === 'active'
                ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/50'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <UserGroupIcon className="w-3.5 h-3.5 text-green-600" />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{stats.active}</p>
              <p className="text-xs mt-0.5 text-green-600 font-medium">Active Users</p>
            </div>
          </button>

          <button
            onClick={() => { setStatusFilter('inactive'); setPage(1); setColFilters({}); setSearchInput(''); setSearch('') }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all w-36 ${
              statusFilter === 'inactive'
                ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/50'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <NoSymbolIcon className="w-3.5 h-3.5 text-red-500" />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{stats.inactive}</p>
              <p className="text-xs mt-0.5 text-red-500 font-medium">Inactive Users</p>
            </div>
          </button>
        </div>

        {/* Right — Add User */}
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Add User
        </button>

      </div>

      <div className="card overflow-hidden">

        {/* ── Toolbar ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[var(--border-color)]">

          {/* Global search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              value={searchInput}
              onChange={e => onSearchInput(e.target.value)}
              placeholder="Search users…"
              className="form-input pl-9 pr-8 py-1.5 text-sm w-full"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">

            {/* Filter row toggle */}
            <button
              onClick={() => setShowFilterRow(s => !s)}
              title={showFilterRow ? 'Hide Filters' : 'Show Filters'}
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
              title={showSorting ? 'Disable Sorting' : 'Enable Sorting'}
              className={`p-1.5 rounded-lg border transition-colors ${
                showSorting
                  ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]'
                  : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <BarsArrowUpIcon className="w-4 h-4" />
            </button>

            {/* Column chooser — icon only */}
            <div ref={colPickerRef} className="relative">
              <button
                onClick={() => setShowColPicker(s => !s)}
                title="Column Chooser"
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
                  <p className="px-2 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                    Show / Hide
                  </p>
                  {cols.map(col => (
                    <label key={col.key}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer select-none">
                      <input type="checkbox" checked={col.visible} onChange={() => toggleCol(col.key)}
                        className="w-3.5 h-3.5 accent-[var(--color-primary)]" />
                      <span className="text-sm text-[var(--text-secondary)]">{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Export dropdown */}
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
                  <p className="px-2 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                    Export All Records
                  </p>
                  {(['csv', 'excel', 'pdf'] as const).map(fmt => (
                    <button key={fmt} onClick={() => handleExport('all', fmt)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] text-left">
                      <span className="text-base">{fmt === 'csv' ? '📄' : fmt === 'excel' ? '📊' : '📋'}</span>
                      <span className="font-medium">{fmt === 'csv' ? 'CSV' : fmt === 'excel' ? 'Excel (.xlsx)' : 'PDF'}</span>
                    </button>
                  ))}

                  <div className="my-1.5 border-t border-[var(--border-color)]" />

                  <p className="px-2 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide flex items-center gap-1">
                    Export Selected
                    {selectedRows.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[var(--accent-gold)] text-white text-[10px] font-bold leading-none">
                        {selectedRows.length}
                      </span>
                    )}
                  </p>
                  {(['csv', 'excel', 'pdf'] as const).map(fmt => (
                    <button key={fmt} onClick={() => handleExport('selected', fmt)}
                      disabled={selectedRows.length === 0}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] text-left disabled:opacity-40 disabled:cursor-not-allowed">
                      <span className="text-base">{fmt === 'csv' ? '📄' : fmt === 'excel' ? '📊' : '📋'}</span>
                      <span className="font-medium">{fmt === 'csv' ? 'CSV' : fmt === 'excel' ? 'Excel (.xlsx)' : 'PDF'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Import button */}
            <button
              onClick={openImport}
              title="Import Users from Excel"
              className="p-1.5 rounded-lg border transition-colors border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
            </button>

            {/* Page-size dropdown */}
            <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
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

        {/* ── Table ──────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {/* ── Sort headers ─────────────────────────────── */}
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                <th className="px-4 py-2.5 w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
                    onChange={toggleSelectPage}
                    className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
                  />
                </th>
                {visibleCols.map(col => (
                  <th
                    key={col.key}
                    style={{ minWidth: col.minW }}
                    onClick={() => showSorting && col.sortKey && handleSort(col.sortKey)}
                    className={`px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide select-none whitespace-nowrap
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
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide sticky right-0 z-10 bg-[var(--bg-secondary)] border-l border-[var(--border-color)]">
                  Actions
                </th>
              </tr>

              {/* ── Column filter row ─────────────────────────── */}
              {showFilterRow && <tr className="border-b border-[var(--border-color)]" style={{ background: 'var(--bg-primary)' }}>
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
                <th className="px-2 py-1.5 text-center sticky right-0 z-10 border-l border-[var(--border-color)]"
                  style={{ background: 'var(--bg-primary)' }}>
                  {Object.values(colFilters).some(v => v) && (
                    <button onClick={() => setColFilters({})}
                      className="text-xs text-[var(--accent-gold)] hover:underline whitespace-nowrap">
                      Clear
                    </button>
                  )}
                </th>
              </tr>}
            </thead>

            <tbody className={fetching ? 'opacity-50 pointer-events-none' : ''}>
              {loading ? (
                // Skeleton rows — only on first load
                Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-color)]">
                    <td className="px-4 py-3">
                      <div className="h-4 w-4 rounded animate-pulse bg-[var(--bg-tertiary)]" />
                    </td>
                    {visibleCols.map(col => (
                      <td key={col.key} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse bg-[var(--bg-tertiary)]"
                          style={{ width: col.key === 'employee' ? '140px' : col.key === 'roles' ? '100px' : '70px' }} />
                      </td>
                    ))}
                    <td className="px-4 py-3 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]">
                      <div className="h-4 w-16 rounded animate-pulse bg-[var(--bg-tertiary)]" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length + 2}
                    className="px-4 py-14 text-center text-sm text-[var(--text-muted)]">
                    {search || Object.values(colFilters).some(v => v)
                      ? 'No users match the current filters.'
                      : 'No users found.'}
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => (
                  <tr key={u.user_id}
                    className={`border-b border-[var(--border-color)] transition-colors hover:bg-[var(--bg-secondary)]
                      ${idx % 2 !== 0 ? 'bg-[var(--bg-primary)]/40' : ''}
                      ${selectedRows.some(r => r.user_id === u.user_id) ? 'bg-[var(--accent-gold)]/5' : ''}`}
                  >
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedRows.some(r => r.user_id === u.user_id)}
                        onChange={() => toggleSelectRow(u)}
                        className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
                      />
                    </td>
                    {visibleCols.map(col => (
                      <td key={col.key} className="px-4 py-2.5">
                        {renderCell(col.key, u)}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]">
                      <div className="flex items-center gap-1">
                        {statusFilter === 'inactive' ? (
                          <button onClick={() => openEdit(u)}
                            className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors" title="Activate User">
                            <UserGroupIcon className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => openEdit(u)}
                            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500" title="Edit">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {statusFilter === 'active' && (
                          <button onClick={() => openResetPassword(u)}
                            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-amber-500" title="Reset Password">
                            <KeyIcon className="w-4 h-4" />
                          </button>
                        )}
                        {statusFilter === 'active' && (
                          <button
                            onClick={() => openDeactivate(u)}
                            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-red-500"
                            title="Deactivate User">
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

        {/* ── Pagination ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">

          {/* Record count + selection badge */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-muted)]">
              {total === 0
                ? 'No records found'
                : `Showing ${startRow}–${endRow} of ${total} users`}
            </span>
            {selectedRows.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent-gold)]">
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-gold)]/15 border border-[var(--accent-gold)]/30">
                  {selectedRows.length} selected
                </span>
                <button
                  onClick={() => setSelectedRows([])}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline underline-offset-2"
                >
                  Clear
                </button>
              </span>
            )}
          </div>

          {/* Page buttons */}
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage(1)}
              className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
              «
            </button>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
              ‹
            </button>

            {pageNumbers.map((n, i) =>
              n === '...' ? (
                <span key={`dots-${i}`} className="px-1.5 text-xs text-[var(--text-muted)]">…</span>
              ) : (
                <button key={n} onClick={() => setPage(n as number)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                    page === n
                      ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)] text-white font-semibold'
                      : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                  }`}>
                  {n}
                </button>
              )
            )}

            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
              ›
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}
              className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
              »
            </button>
          </div>

          {/* Page info */}
          <span className="text-sm text-[var(--text-muted)] hidden sm:block">
            Page {page} of {totalPages || 1}
          </span>
        </div>
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); reset() }}
        title={isNew ? 'Add User' : 'Edit User'}
        size="lg"
        footer={
          <>
            <button onClick={() => { setModalOpen(false); reset() }} className="btn-secondary">Cancel</button>
            {isInactiveEdit ? (
              <button onClick={handleUpdateStatus} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Update Status'}
              </button>
            ) : (
              <button onClick={handleSubmit(onSubmit)} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : isNew ? 'Create User' : 'Update User'}
              </button>
            )}
          </>
        }
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">

          {/* Inactive-user info banner */}
          {isInactiveEdit && (
            <div className="col-span-2 flex items-start gap-3 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <InformationCircleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                This user is <strong>inactive</strong>. All fields are read-only.
                Use the <strong>User Status</strong> checkbox below to reactivate.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Employee ID<Req /></label>
            <input {...register('employee_id')} className="form-input" placeholder="EMP001" disabled={!isNew} />
            {errors.employee_id && <p className="text-xs text-red-500 mt-1">{errors.employee_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">First Name<Req /></label>
            <input {...register('first_name')} className="form-input" placeholder="John" disabled={isInactiveEdit} />
            {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Last Name</label>
            <input {...register('last_name')} className="form-input" placeholder="Doe" disabled={isInactiveEdit} />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email Address<Req /></label>
            <input type="email" {...register('emp_email')} className="form-input" placeholder="john@example.com" disabled={isInactiveEdit} />
            {errors.emp_email && <p className="text-xs text-red-500 mt-1">{errors.emp_email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Mobile Number</label>
            <input
              {...register('mobile_number')}
              className="form-input"
              placeholder="9876543210"
              maxLength={10}
              disabled={isInactiveEdit}
              onKeyDown={(e) => {
                const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End']
                if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault()
              }}
            />
            {errors.mobile_number && <p className="text-xs text-red-500 mt-1">{errors.mobile_number.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Department</label>
            <select {...register('department_id')} className="form-input" disabled={isInactiveEdit}>
              <option value="">Select Department</option>
              {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Designation</label>
            <input {...register('designation')} className="form-input" placeholder="e.g. Sales Executive" disabled={isInactiveEdit} />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Manager</label>
            <select {...register('manager_id')} className="form-input" disabled={isInactiveEdit}>
              <option value="">None</option>
              {managers.map(m => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name} ({m.employee_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Start Date<Req />
              <span className="ml-1 text-xs text-[var(--text-muted)] font-normal">(Activation date)</span>
            </label>
            <input
              type="date"
              {...register('start_date')}
              className="form-input"
              disabled={isInactiveEdit}
              min={isNew ? TODAY : undefined}
            />
            {errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Expiry Date
              <span className="ml-1 text-xs text-[var(--text-muted)] font-normal">(Blank = no expiry)</span>
            </label>
            {/* Editable for both active and inactive users — inactive users must fix it before activating */}
            <input type="date" {...register('expiry_date')} className="form-input" min={isInactiveEdit ? TODAY : undefined} />
            {isInactiveEdit && (
              <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                <InformationCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                Set a future date (or clear) to be able to activate this user.
              </p>
            )}
            {!isNew && !isInactiveEdit && expiryIsPast && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <ExclamationTriangleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                Past date — user will be automatically deactivated on save.
              </p>
            )}
          </div>

          {isNew && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Password<Req /></label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} {...register('password')}
                  className="form-input pr-10" placeholder="Min 6 characters" />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>
          )}

          <div className="col-span-2">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Roles<Req />
              <span className="ml-1 text-xs text-[var(--text-muted)] font-normal">(First selected = default role)</span>
            </label>
            <RoleMultiSelect
              roles={roles} selected={selectedRoles}
              onChange={ids => { setSelectedRoles(ids); if (ids.length > 0) setRoleError('') }}
              error={roleError}
              disabled={isInactiveEdit}
            />
          </div>

          {/* User Status — visible when editing (not new) */}
          {!isNew && (
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">User Status</label>
              <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors select-none
                ${isInactiveEdit
                  ? 'border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] cursor-pointer'
                  : 'border-[var(--border-color)] bg-[var(--bg-tertiary)] cursor-not-allowed opacity-70'
                }`}>
                <input
                  type="checkbox"
                  checked={activateStatus}
                  onChange={e => isInactiveEdit && setActivateStatus(e.target.checked)}
                  disabled={!isInactiveEdit}
                  className="w-4 h-4 accent-green-600 cursor-pointer"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Active User</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {isInactiveEdit
                      ? activateStatus ? 'Will be activated on save' : 'Check to activate this user'
                      : 'User is currently active'}
                  </p>
                </div>
                <Badge
                  label={activateStatus ? 'Active' : 'Inactive'}
                  variant={activateStatus ? 'success' : 'danger'}
                />
              </label>
            </div>
          )}

        </div>
      </Modal>

      {/* ── Activate confirm ─────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteItem}
        title="Activate User"
        message={`Activate "${deleteItem?.first_name} ${deleteItem?.last_name}" (${deleteItem?.employee_id})? The user will be able to login again.`}
        confirmLabel="Activate"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteItem(null)}
      />

      {/* ── Deactivate Modal (with inactive date + reason) ───── */}
      <Modal
        isOpen={!!deactivateItem}
        onClose={() => setDeactivateItem(null)}
        title="Deactivate User"
        size="sm"
        footer={
          <>
            <button onClick={() => setDeactivateItem(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleDeactivate} disabled={deactivateSaving} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {deactivateSaving ? 'Saving…' : 'Continue'}
            </button>
          </>
        }
      >
        {/* User info */}
        <div className="flex items-center gap-3 mb-5 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-sm font-bold text-red-600 flex-shrink-0">
            {getInitials(deactivateItem?.full_name || `${deactivateItem?.first_name} ${deactivateItem?.last_name ?? ''}`)}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {deactivateItem?.full_name || `${deactivateItem?.first_name} ${deactivateItem?.last_name ?? ''}`.trim()}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{deactivateItem?.employee_id} · {deactivateItem?.emp_email}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Inactive Date */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Inactive Date
            </label>
            <input
              type="date"
              value={inactiveDate}
              readOnly
              className="form-input w-full opacity-70 cursor-not-allowed bg-[var(--bg-tertiary)]"
            />
          </div>

          {/* Inactive Reason */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Inactive Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={inactiveReason}
              onChange={e => { setInactiveReason(e.target.value); setDeactErrors(p => ({ ...p, inactiveReason: undefined })) }}
              placeholder="Enter reason for deactivation…"
              className={`form-input w-full resize-none ${deactErrors.inactiveReason ? 'border-red-400' : ''}`}
            />
            {deactErrors.inactiveReason && (
              <p className="text-xs text-red-500 mt-1">{deactErrors.inactiveReason}</p>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Deactivate confirmation dialog ───────────────────── */}
      <ConfirmDialog
        isOpen={showDeactivateConfirm}
        title="Confirm Deactivation"
        message={`Deactivate "${deactivateItem?.full_name || `${deactivateItem?.first_name} ${deactivateItem?.last_name ?? ''}`.trim()}" (${deactivateItem?.employee_id})?\n\nInactive Date: ${inactiveDate}\nReason: ${inactiveReason}\n\nThe user will not be able to login.`}
        confirmLabel="Deactivate"
        onConfirm={confirmDeactivate}
        onCancel={() => setShowDeactivateConfirm(false)}
      />

      {/* ── Activate confirmation dialog (from modal) ────────── */}
      <ConfirmDialog
        isOpen={showActivateConfirm}
        title="Activate User"
        message={`Activate "${editItem?.full_name || `${editItem?.first_name} ${editItem?.last_name ?? ''}`.trim()}" (${editItem?.employee_id})? The user will be able to login again.`}
        confirmLabel="Activate"
        onConfirm={confirmActivate}
        onCancel={() => setShowActivateConfirm(false)}
      />

      {/* ── Reset Password Modal ─────────────────────────────── */}
      <Modal
        isOpen={!!resetPwdUser}
        onClose={() => setResetPwdUser(null)}
        title="Reset Password"
        size="sm"
        footer={
          <>
            <button onClick={() => setResetPwdUser(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleResetPassword} disabled={resetSaving} className="btn-primary">
              {resetSaving ? 'Saving…' : 'Reset Password'}
            </button>
          </>
        }
      >
        {/* User info */}
        <div className="flex items-center gap-3 mb-5 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
          <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-sm font-bold text-[var(--color-primary)] flex-shrink-0">
            {getInitials(resetPwdUser?.full_name || `${resetPwdUser?.first_name} ${resetPwdUser?.last_name ?? ''}`)}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {resetPwdUser?.full_name || `${resetPwdUser?.first_name} ${resetPwdUser?.last_name ?? ''}`.trim()}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{resetPwdUser?.employee_id} · {resetPwdUser?.emp_email}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPass ? 'text' : 'password'}
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setPwdErrors(p => ({ ...p, newPassword: undefined })) }}
                placeholder="Min 6 characters"
                className={`form-input pr-10 w-full ${pwdErrors.newPassword ? 'border-red-400' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowNewPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showNewPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
            {pwdErrors.newPassword && (
              <p className="text-xs text-red-500 mt-1">{pwdErrors.newPassword}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setPwdErrors(p => ({ ...p, confirmPassword: undefined })) }}
                placeholder="Re-enter password"
                className={`form-input pr-10 w-full ${pwdErrors.confirmPassword ? 'border-red-400' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showConfirmPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
            {pwdErrors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">{pwdErrors.confirmPassword}</p>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Import Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={importOpen}
        onClose={() => { if (!importing) { setImportOpen(false); setImportStep('upload') } }}
        title={importStep === 'upload' ? 'Import Users from Excel' : importStep === 'preview' ? 'Preview Import Data' : 'Import Results'}
        size={importStep === 'preview' ? '2xl' : 'md'}
        footer={
          importStep === 'upload' ? (
            <>
              <button onClick={() => setImportOpen(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => importFileRef.current?.click()}
                className="btn-primary flex items-center gap-2"
              >
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
        {/* ── Upload step ── */}
        {importStep === 'upload' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Download the template, fill in user data, then upload the file. Roles must match existing role names exactly.
              </p>
            </div>

            <button
              onClick={downloadImportTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-[var(--accent-gold)]/50 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/5 transition-colors text-sm font-medium w-full justify-center"
            >
              <ArrowDownTrayIcon className="w-4 h-4" /> Download Template (.xlsx)
            </button>

            <input
              ref={importFileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = '' }}
            />

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

        {/* ── Preview step ── */}
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
                <span className="text-[var(--text-muted)]">Total: {importRows.length} rows</span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--bg-secondary)]">
                    <tr>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">#</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Employee ID</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Name</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Email</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Manager</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Roles</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="max-h-64 overflow-y-auto">
                    {importRows.map(row => (
                      <tr key={row._rowNum} className={`border-t border-[var(--border-color)] ${row.errors.length > 0 ? 'bg-red-50/50' : ''}`}>
                        <td className="px-3 py-2 text-[var(--text-muted)]">{row._rowNum}</td>
                        <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">{row.employee_id || '—'}</td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">{`${row.first_name || ''} ${row.last_name || ''}`.trim() || '—'}</td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">{row.emp_email || '—'}</td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">
                          {row.manager_id
                            ? managers.find(m => m.user_id === row.manager_id)?.full_name || row.manager_employee_id
                            : row.manager_employee_id || '—'}
                        </td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">{row.role_names || '—'}</td>
                        <td className="px-3 py-2">
                          {row.errors.length === 0 ? (
                            <span className="text-green-600 font-medium">✓ Valid</span>
                          ) : (
                            <span className="text-red-500" title={row.errors.join('\n')}>
                              ✗ {row.errors.length} error{row.errors.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}

        {/* ── Result step ── */}
        {importStep === 'result' && (
          <div className="flex flex-col gap-4">
            {importing ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-[var(--text-secondary)]">
                  Importing {importDone} / {importTotal}…
                </p>
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
                    {importDone} user{importDone !== 1 ? 's' : ''} imported successfully
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

export default UserManagementPage
