import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon, EyeIcon, MagnifyingGlassIcon, XMarkIcon,
  ViewColumnsIcon, ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon,
  FunnelIcon, BarsArrowUpIcon, NoSymbolIcon, CheckCircleIcon,
  ArrowDownTrayIcon, UserGroupIcon, ChevronRightIcon,
  DocumentIcon, PhotoIcon, ArrowUpTrayIcon, TrashIcon,
  InformationCircleIcon, ExclamationTriangleIcon, DocumentDuplicateIcon,
} from '@heroicons/react/24/outline'
import Modal                  from '@/components/common/Modal'
import Badge                  from '@/components/common/Badge'
import ConfirmDialog          from '@/components/common/ConfirmDialog'
import DeactivateReasonDialog from '@/components/common/DeactivateReasonDialog'
import { formatDate, formatDateTime, exportToCSV, exportToExcel, exportToPDF } from '@/utils/helpers'
import { getLovMany } from '@/utils/lovCache'
import { apiService, getFileUrl } from '@/api/apiService'
import { usePermission } from '@/hooks'

// ── Types ─────────────────────────────────────────────────────
interface Customer {
  id: number; customer_code: string; customer_name: string | null
  customer_company_name: string; customer_display_name: string | null
  bus_relationship: string | null; country_code: string | null
  pan_card: string | null; organization_type: string | null
  customer_type: string | null; is_active: boolean; created_at: string
  deactivation_reason: string | null; deactivated_at: string | null
  used_elsewhere: boolean
}

interface DocFile {
  id:       string
  name:     string
  type:     string
  size?:    number
  dataUrl?: string
  url?:     string
}

interface ContactRow {
  _key: string
  cont_first_name: string; cont_last_name: string; cont_email: string
  cont_job_title: string; cont_country_code: string; cont_mobile: string
  cont_is_admin: boolean
}

interface AddressRow {
  _key: string
  adrs_type: string
  adrs_name: string; adrs_country_code: string
  adrs_1: string; adrs_2: string; adrs_3: string
  adrs_city_name: string; adrs_state_code: string; adrs_pincode: string
  adrs_email: string; adrs_phone_number_country_code: string
  adrs_phone_number: string; adrs_extension: string
}

interface CustomerDetail extends Customer {
  is_msme_reg: boolean; website_url: string | null; upload_doc: string | null
  tax_payer_type: string | null; gstin_status: string | null
  gstin_uin_number: string | null; place_of_supply: string | null
  msme_udyam_reg_number: string | null
  gst_treatment: string | null
  credit_limit_by_value: number | null; credit_limit_by_grams: number | null
  payment_terms: string | null
  contacts:  Array<Omit<ContactRow,  '_key'>>
  addresses: Array<Omit<AddressRow,  '_key'>>
}

interface LookupOption { lookup_code: string; lookup_name: string }

// ── Import types ──────────────────────────────────────────────
interface CImportRow {
  _rowNum:               number
  customer_name:         string
  customer_company_name: string
  customer_display_name: string
  bus_relationship:      string
  country_code:          string
  pan_card:              string
  organization_type:     string
  customer_type:         string
  is_msme_reg:           string
  website_url:           string
  tax_payer_type:        string
  gstin_uin_number:      string
  place_of_supply:       string
  msme_udyam_reg_number: string
  gst_treatment:         string
  credit_limit_by_value: string
  credit_limit_by_grams: string
  payment_terms:         string
  errors:                string[]
}

const CUST_HEADER_MAP: Record<string, keyof CImportRow> = {
  'company name':          'customer_company_name',
  'company':               'customer_company_name',
  'customer name':         'customer_name',
  'display name':          'customer_display_name',
  'business relationship': 'bus_relationship',
  'country':               'country_code',
  'pan card':              'pan_card',
  'pan':                   'pan_card',
  'organization type':     'organization_type',
  'customer type':         'customer_type',
  'msme registration':     'is_msme_reg',
  'msme':                  'is_msme_reg',
  'website url':           'website_url',
  'website':               'website_url',
  'tax payer type':        'tax_payer_type',
  'gstin / uin':           'gstin_uin_number',
  'gstin/uin':             'gstin_uin_number',
  'gstin':                 'gstin_uin_number',
  'place of supply':       'place_of_supply',
  'msme udyam reg number': 'msme_udyam_reg_number',
  'udyam number':          'msme_udyam_reg_number',
  'gst treatment':         'gst_treatment',
  'credit limit value':    'credit_limit_by_value',
  'credit limit grams':    'credit_limit_by_grams',
  'payment terms':         'payment_terms',
}
const normCHeader = (h: string) =>
  h.replace(/\*/g, '').replace(/\(.*?\)/g, '').trim().toLowerCase()

type FormValues = {
  customer_name: string; customer_company_name: string; customer_display_name: string
  bus_relationship: string; country_code: string; pan_card: string
  organization_type: string; customer_type: string; is_msme_reg: string; website_url: string
  tax_payer_type: string; gstin_status: string; gstin_uin_number: string
  place_of_supply: string; msme_udyam_reg_number: string; gst_treatment: string
  credit_limit_by_value: string; credit_limit_by_grams: string; payment_terms: string
}

// GST details are only mandatory for Indian customers, and are waived for
// Proprietorship / Walk-In customers who typically have no GST registration.
const isGstMandatory = (country?: string, org?: string, cust?: string) =>
  country === 'IN' && org !== 'PROPRIETORSHIP' && cust !== 'WALK_IN'

// ── Validation ────────────────────────────────────────────────
const schema = yup.object({
  customer_name:         yup.string().required('Customer Name is required'),
  customer_company_name: yup.string().required('Company Name is required'),
  customer_display_name: yup.string().required('Display Name is required'),
  bus_relationship:      yup.string().required('Business Relationship is required'),
  country_code:          yup.string().required('Country is required'),
  pan_card:              yup.string().default('').transform(v => v ? v.toUpperCase() : v)
    .test('pan-format', 'Invalid PAN — expected format: ABCDE1234F (5 letters, 4 digits, 1 letter)', v => !v || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v)),
  organization_type:     yup.string().default(''),
  customer_type:         yup.string().default(''),
  is_msme_reg:           yup.string().default('false'),
  website_url:           yup.string().default('')
    .test('url-format', 'URL must start with http:// or https://', v => !v || /^https?:\/\/.+/.test(v)),
  tax_payer_type:        yup.string().default('')
    .when(['country_code', 'organization_type', 'customer_type'], {
      is: isGstMandatory,
      then: s => s.required('Tax Payer Type is required'),
    }),
  gstin_status:          yup.string().default('')
    .when(['country_code', 'organization_type', 'customer_type'], {
      is: isGstMandatory,
      then: s => s.required('GSTIN Status is required'),
    }),
  gstin_uin_number:      yup.string().default('').transform(v => v ? v.toUpperCase() : v)
    .test('gstin-format', 'Invalid GSTIN — expected format: 22AAAAA0000A1Z5 (2 digits + 10-char PAN + 3 chars)', v =>
      !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(v))
    .test('gstin-pan-match', 'Characters 3–12 of GSTIN must match the PAN entered', function(v) {
      const pan = (this.parent as { pan_card?: string }).pan_card
      if (!v || !pan || v.length < 12) return true
      return v.substring(2, 12) === pan.toUpperCase()
    })
    .when(['country_code', 'organization_type', 'customer_type'], {
      is: isGstMandatory,
      then: s => s.required('GSTIN is required for this customer'),
    }),
  place_of_supply:       yup.string().default('')
    .when(['country_code', 'organization_type', 'customer_type'], {
      is: isGstMandatory,
      then: s => s.required('Place of Supply is required'),
    }),
  msme_udyam_reg_number: yup.string().default('').transform(v => v ? v.toUpperCase() : v)
    .test('udyam-format', 'Invalid format — expected UDYAM-XX-00-0000000 (2 letters, 2 digits, 7 digits)', v =>
      !v || /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/.test(v))
    .when('is_msme_reg', {
      is: 'true',
      then: s => s.required('MSME / Udyam Registration Number is required when MSME Registration is Yes'),
    }),
  gst_treatment:         yup.string().default('')
    .when(['country_code', 'organization_type', 'customer_type'], {
      is: isGstMandatory,
      then: s => s.required('GST Treatment is required'),
    }),
  credit_limit_by_value: yup.string().default('')
    .test('non-negative', 'Value cannot be negative', v => !v || parseFloat(v) >= 0)
    // A customer must carry a credit limit in at least one unit — rupees or grams.
    .test('credit-limit-required', 'Enter a credit limit — by Value or by Grams', function(v) {
      const grams = (this.parent as { credit_limit_by_grams?: string }).credit_limit_by_grams
      return !!(v?.trim() || grams?.trim())
    }),
  credit_limit_by_grams: yup.string().default('')
    .test('non-negative', 'Grams cannot be negative', v => !v || parseFloat(v) >= 0),
  payment_terms:         yup.string().default(''),
})

// ── Constants ─────────────────────────────────────────────────
const PAGE_SIZES = [10, 25, 50, 100]
const Req = () => <span className="text-red-500 ml-0.5">*</span>

const STEPS = [
  { label: 'Customer Details',    desc: 'Basic customer information' },
  { label: 'Tax Information',     desc: 'GST & tax details' },
  { label: 'Contact Information', desc: 'Contact persons' },
  { label: 'Address Information', desc: 'Billing / shipping addresses' },
  { label: 'Credit Limit',        desc: 'Credit & payment terms' },
]

interface ColDef { key: string; label: string; sortKey?: string; visible: boolean; minW?: string }

const INITIAL_COLS: ColDef[] = [
  { key: 'customer_code',         label: 'Customer Code',         sortKey: 'customer_code',         visible: true,  minW: '130px' },
  { key: 'customer_company_name', label: 'Company Name',          sortKey: 'customer_company_name', visible: true,  minW: '200px' },
  { key: 'bus_relationship',      label: 'Business Relationship', sortKey: 'bus_relationship',      visible: true,  minW: '160px' },
  { key: 'country_code',          label: 'Country',               sortKey: 'country_code',          visible: true,  minW: '100px' },
  { key: 'pan_card',              label: 'PAN Card',              sortKey: 'pan_card',              visible: true,  minW: '120px' },
  { key: 'organization_type',     label: 'Organization Type',     sortKey: 'organization_type',     visible: false, minW: '150px' },
  { key: 'customer_type',         label: 'Customer Type',         sortKey: 'customer_type',         visible: true,  minW: '120px' },
  { key: 'is_active',             label: 'Status',                                                  visible: true,  minW: '90px'  },
  { key: 'deactivation_reason',   label: 'Deactive Reason',                                         visible: true,  minW: '160px' },
  { key: 'deactivated_at',        label: 'Deactive Date',                                           visible: true,  minW: '120px' },
  { key: 'created_at',            label: 'Created',               sortKey: 'created_at',            visible: true,  minW: '140px' },
]

const LOV_TYPES = [
  'BUSINESS_RELATIONSHIP', 'COUNTRY', 'ORGANIZATION_TYPE',
  'GST_TREATMENT', 'STATE',
  'CUSTOMER_TYPE', 'TAX_PAYER_TYPE', 'GSTIN_STATUS', 'PAYMENT_TERM',
  'ADRESS_TYPE',
] as const
type LovType = typeof LOV_TYPES[number]

// Wizard step each form field belongs to — used to jump to the first step
// holding a validation error when Create / Update is clicked from any step.
const FIELD_STEP: Record<keyof FormValues, number> = {
  customer_name: 0, customer_company_name: 0, customer_display_name: 0,
  bus_relationship: 0, country_code: 0, pan_card: 0,
  organization_type: 0, customer_type: 0, is_msme_reg: 0, website_url: 0,
  tax_payer_type: 1, gstin_status: 1, gstin_uin_number: 1,
  place_of_supply: 1, msme_udyam_reg_number: 1, gst_treatment: 1,
  credit_limit_by_value: 4, credit_limit_by_grams: 4, payment_terms: 4,
}

const EMPTY_FORM: FormValues = {
  customer_name: '', customer_company_name: '', customer_display_name: '',
  bus_relationship: '', country_code: '', pan_card: '',
  organization_type: '', customer_type: '', is_msme_reg: 'false', website_url: '',
  tax_payer_type: '', gstin_status: '', gstin_uin_number: '',
  place_of_supply: '', msme_udyam_reg_number: '', gst_treatment: '',
  credit_limit_by_value: '', credit_limit_by_grams: '', payment_terms: '',
}

const countryOnly = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, '').trim()

// Bill To and Ship To share one structured shape, so both summarise the same way.
const addressSummary = (a: AddressRow): string =>
  [a.adrs_1, a.adrs_city_name, a.adrs_state_code, a.adrs_pincode].filter(Boolean).join(', ')

const fileCategory = (name: string, mime?: string): string => {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (mime?.startsWith('image/') || ['jpg','jpeg','png','gif','webp'].includes(ext)) return 'image'
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf'
  if (['doc','docx'].includes(ext) || mime?.includes('word'))       return 'doc'
  if (['xls','xlsx'].includes(ext) || mime?.includes('excel') || mime?.includes('spreadsheet')) return 'excel'
  return 'file'
}

const DocTypeBadge = ({ type }: { type: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    pdf:   { label: 'PDF',  cls: 'bg-red-100 text-red-700 border-red-200' },
    doc:   { label: 'DOC',  cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    excel: { label: 'XLS',  cls: 'bg-green-100 text-green-700 border-green-200' },
    file:  { label: 'FILE', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  }
  const cfg = map[type] ?? map.file
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ── Inline sub-form helpers (outside component to prevent remount) ──
const IFld = ({ label, value, onChange, placeholder, type = 'text', disabled, span2, error, required, digitsOnly, maxLength }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; disabled?: boolean; span2?: boolean
  error?: string; required?: boolean; digitsOnly?: boolean; maxLength?: number
}) => (
  <div className={span2 ? 'sm:col-span-2' : ''}>
    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
      {label}{required && !disabled && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <input
      type={type} value={value}
      onChange={e => onChange(digitsOnly ? e.target.value.replace(/\D/g, '') : e.target.value)}
      disabled={disabled} inputMode={digitsOnly ? 'numeric' : undefined} maxLength={maxLength}
      placeholder={placeholder ?? label}
      className={`form-input ${disabled ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''} ${error ? 'border-red-500' : ''}`}
    />
    {error && !disabled && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
)

const ISel = ({ label, value, onChange, options, nameTransform, disabled, span2, error, required }: {
  label: string; value: string; onChange: (v: string) => void
  options: LookupOption[]; nameTransform?: (n: string) => string; disabled?: boolean; span2?: boolean
  error?: string; required?: boolean
}) => (
  <div className={span2 ? 'sm:col-span-2' : ''}>
    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
      {label}{required && !disabled && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <select
      value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      className={`form-input ${disabled ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''} ${error ? 'border-red-500' : ''}`}
    >
      <option value="">Select {label}</option>
      {options.map(o => (
        <option key={o.lookup_code} value={o.lookup_code}>
          {nameTransform ? nameTransform(o.lookup_name) : o.lookup_name}
        </option>
      ))}
    </select>
    {error && !disabled && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
)

const IYN = ({ label, value, onChange, disabled }: {
  label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean
}) => (
  <div>
    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
    <select
      value={value ? 'true' : 'false'}
      onChange={e => onChange(e.target.value === 'true')}
      disabled={disabled}
      className={`form-input ${disabled ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
    >
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  </div>
)

// ── Component ─────────────────────────────────────────────────
const CustomerMasterPage: React.FC = () => {
  const [lovMap, setLovMap] = useState<Record<LovType, LookupOption[]>>({
    BUSINESS_RELATIONSHIP: [], COUNTRY: [], ORGANIZATION_TYPE: [],
    GST_TREATMENT: [], STATE: [],
    CUSTOMER_TYPE: [], TAX_PAYER_TYPE: [], GSTIN_STATUS: [], PAYMENT_TERM: [],
    ADRESS_TYPE: [],
  })

  const [items,        setItems]        = useState<Customer[]>([])
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

  const [cols,          setCols]          = useState<ColDef[]>(INITIAL_COLS)
  const [showColPicker, setShowColPicker] = useState(false)
  const [showFilterRow, setShowFilterRow] = useState(false)
  const [showSorting,   setShowSorting]   = useState(true)
  const [colFilters,    setColFilters]    = useState<Record<string, string>>({})
  const [debouncedCF,   setDebouncedCF]   = useState<Record<string, string>>({})
  const [selectedRows,  setSelectedRows]  = useState<Customer[]>([])
  const [exportOpen,    setExportOpen]    = useState(false)
  const [exporting,     setExporting]     = useState(false)
  const colPickerRef   = useRef<HTMLDivElement>(null)
  const exportRef      = useRef<HTMLDivElement>(null)
  const masterCheckRef = useRef<HTMLInputElement>(null)
  const searchTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cfTimer        = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef   = useRef<HTMLInputElement>(null)

  // ── Import state ──────────────────────────────────────────────
  const [importOpen,    setImportOpen]    = useState(false)
  const [importStep,    setImportStep]    = useState<'upload' | 'preview' | 'result'>('upload')
  const [importRows,    setImportRows]    = useState<CImportRow[]>([])
  const [importDone,    setImportDone]    = useState(0)
  const [importTotal,   setImportTotal]   = useState(0)
  const [importErrList, setImportErrList] = useState<{ row: number; msg: string }[]>([])
  const [importing,     setImporting]     = useState(false)
  const importFileRef   = useRef<HTMLInputElement>(null)

  const { canView, canCreate, canUpdate, canDelete } = usePermission('MM_CUSTOMER')

  const [modalOpen,     setModalOpen]     = useState(false)
  const [formMode,      setFormMode]      = useState<'add' | 'edit' | 'view'>('add')
  const [editItem,      setEditItem]      = useState<Customer | null>(null)
  const [toggleItem,    setToggleItem]    = useState<Customer | null>(null)
  const [saving,        setSaving]        = useState(false)
  const [activeStep,    setActiveStep]    = useState(0)
  const [docFiles,      setDocFiles]      = useState<DocFile[]>([])
  const [contacts,      setContacts]      = useState<ContactRow[]>([])
  const [addresses,     setAddresses]     = useState<AddressRow[]>([])
  const [contactEdit,   setContactEdit]   = useState<ContactRow | null>(null)
  const [addressEdit,   setAddressEdit]   = useState<AddressRow | null>(null)
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({})
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({})
  const [confirmClose,  setConfirmClose]  = useState(false)
  // PAN and GSTIN are not locked once set — both stay editable whenever the
  // country is India, and both are duplicate-checked before the record saves.
  const isNew      = formMode === 'add'
  const isViewMode = formMode === 'view'

  const { register, handleSubmit, reset, watch, setValue, trigger, setError, formState: { errors, isDirty } } =
    useForm<FormValues>({ resolver: yupResolver(schema) as never, defaultValues: EMPTY_FORM })

  // ── Load LOVs (cached — fetched once per session across all pages) ──
  useEffect(() => {
    getLovMany(LOV_TYPES)
      .then(setLovMap)
      .catch(() => toast.error('Failed to load lookup options'))
  }, [])

  // MSME/Udyam is an India-only scheme — force it off for any other country.
  const watchedCountry = watch('country_code')
  useEffect(() => {
    if (watchedCountry !== 'IN') {
      setValue('is_msme_reg', 'false')
      setValue('msme_udyam_reg_number', '')
    }
  }, [watchedCountry, setValue])

  const lovName = (type: LovType, code: string | null): string => {
    if (!code) return '—'
    const found = lovMap[type]?.find(o => o.lookup_code === code)
    return found ? countryOnly(found.lookup_name) : code
  }

  // ── Data loaders ─────────────────────────────────────────────
  const loadStats = async () => {
    try {
      const res = await apiService.get('/customers/stats')
      setStats(res.data?.data ?? { active: 0, inactive: 0 })
    } catch { /* silent */ }
  }

  const loadItems = async () => {
    if (isFirstLoad.current) setLoading(true); else setFetching(true)
    try {
      const activeCF = Object.fromEntries(Object.entries(debouncedCF).filter(([, v]) => v.trim()))
      const res = await apiService.get('/customers', {
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
      toast.error(msg || 'Failed to load customers')
    } finally { setLoading(false); setFetching(false); isFirstLoad.current = false }
  }

  useEffect(() => { loadStats() }, [])  // eslint-disable-line
  useEffect(() => { loadItems() }, [page, pageSize, search, sortBy, sortDir, debouncedCF, statusFilter]) // eslint-disable-line

  const onSearchInput = (val: string) => {
    setSearchInput(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1) }, 400)
  }

  useEffect(() => {
    if (cfTimer.current) clearTimeout(cfTimer.current)
    cfTimer.current = setTimeout(() => { setDebouncedCF(colFilters); setPage(1) }, 400)
  }, [colFilters]) // eslint-disable-line

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setShowColPicker(false)
      if (exportRef.current    && !exportRef.current.contains(e.target as Node))    setExportOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
    setPage(1)
  }

  const toggleCol   = (key: string) => setCols(cs => cs.map(c => c.key === key ? { ...c, visible: !c.visible } : c))
  const gridCols = statusFilter === 'inactive' ? cols : cols.filter(c => c.key !== 'deactivation_reason' && c.key !== 'deactivated_at')
  const visibleCols = gridCols.filter(c => c.visible)

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
  const toggleSelectRow = (item: Customer) =>
    setSelectedRows(prev => prev.some(r => r.id === item.id) ? prev.filter(r => r.id !== item.id) : [...prev, item])

  const buildExportRows = (rows: Customer[]) => rows.map(r => ({
    'Customer Code':         r.customer_code,
    'Company Name':          r.customer_company_name,
    'Business Relationship': lovName('BUSINESS_RELATIONSHIP', r.bus_relationship),
    'Country':               lovName('COUNTRY', r.country_code),
    'PAN Card':              r.pan_card ?? '—',
    'Organization Type':     lovName('ORGANIZATION_TYPE', r.organization_type),
    'Customer Type':         lovName('CUSTOMER_TYPE', r.customer_type),
    'Status':                r.is_active ? 'Active' : 'Inactive',
    ...(statusFilter === 'inactive' && {
      'Deactive Reason': r.deactivation_reason || '',
      'Deactive Date': r.deactivated_at ? formatDate(String(r.deactivated_at)) : '',
    }),
    'Created':               formatDateTime(String(r.created_at)),
  }))

  const handleExport = async (scope: 'all' | 'selected', format: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false)
    let rows: Customer[]
    if (scope === 'selected') {
      rows = selectedRows
      if (!rows.length) { toast.error('No rows selected'); return }
    } else {
      setExporting(true)
      try {
        const res = await apiService.get('/customers', { params: { page: 1, limit: 9999, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter } })
        rows = res.data?.data ?? []
      } catch { toast.error('Failed to fetch export data'); setExporting(false); return }
      setExporting(false)
    }
    const data = buildExportRows(rows)
    const fname = `customers_${statusFilter}`
    if (format === 'csv')        exportToCSV(data, fname)
    else if (format === 'excel') void exportToExcel(data, fname)
    else                         void exportToPDF(data, fname, 'Customer Master Report')
  }

  const renderCell = (col: ColDef, row: Customer) => {
    switch (col.key) {
      case 'customer_code':
        return <span className="font-mono text-sm font-semibold" style={{ color: 'var(--accent-gold)' }}>{row.customer_code}</span>
      case 'customer_company_name':
        return <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{row.customer_company_name}</span>
      case 'bus_relationship':
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{lovName('BUSINESS_RELATIONSHIP', row.bus_relationship)}</span>
      case 'country_code':
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{lovName('COUNTRY', row.country_code)}</span>
      case 'pan_card':
        return <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{row.pan_card ?? '—'}</span>
      case 'organization_type':
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{lovName('ORGANIZATION_TYPE', row.organization_type)}</span>
      case 'customer_type':
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{lovName('CUSTOMER_TYPE', row.customer_type)}</span>
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

  const pageNumbers = useMemo((): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 4) return [1, 2, 3, 4, 5, '...', totalPages]
    if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, '...', page - 1, page, page + 1, '...', totalPages]
  }, [page, totalPages])

  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endRow   = Math.min(page * pageSize, total)

  // ── File upload helpers ───────────────────────────────────────
  const parseExistingDocs = (uploadDoc: string | null): DocFile[] => {
    if (!uploadDoc) return []
    try {
      const parsed = JSON.parse(uploadDoc) as Array<{ name: string; url: string; type: string; size?: number }>
      return parsed.map((f, i) => ({ id: `existing-${i}`, name: f.name, type: f.type, size: f.size, url: f.url }))
    } catch { return [] }
  }

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: File must be under 5 MB`); return }
      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        setDocFiles(prev => [...prev, {
          id: `new-${Date.now()}-${Math.random()}`,
          name: file.name,
          type: fileCategory(file.name, file.type),
          size: file.size,
          dataUrl,
        }])
      }
      reader.readAsDataURL(file)
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const removeDoc = (id: string) => setDocFiles(prev => prev.filter(f => f.id !== id))

  // ── Multi-entry helpers ───────────────────────────────────────
  const newContact = (): ContactRow => ({
    _key: `c_${Date.now()}`,
    cont_first_name: '', cont_last_name: '', cont_email: '',
    cont_job_title: '', cont_country_code: '', cont_mobile: '',
    cont_is_admin: true,
  })

  const newAddress = (): AddressRow => ({
    _key: `a_${Date.now()}`,
    adrs_type: 'BILL_TO',
    adrs_name: '', adrs_country_code: '', adrs_1: '', adrs_2: '', adrs_3: '',
    adrs_city_name: '', adrs_state_code: '', adrs_pincode: '',
    adrs_email: '', adrs_phone_number_country_code: '',
    adrs_phone_number: '', adrs_extension: '',
  })

  // "Copy to Ship To" — a Bill To row becomes a brand-new Ship To draft with the
  // same values. It is a snapshot, not a live mirror: once opened it is edited
  // like any other address, so a later change to the Bill To row won't touch it.
  const copyAsShipTo = (src: AddressRow): AddressRow => ({
    ...src,
    _key:      `a_${Date.now()}`,
    adrs_type: 'SHIP_TO',
    adrs_name: src.adrs_name ? `${src.adrs_name} — Ship To` : '',
  })

  const saveContact = () => {
    if (!contactEdit) return
    const errs: Record<string, string> = {}
    if (!contactEdit.cont_first_name.trim()) errs.cont_first_name = 'First Name is required'
    if (!contactEdit.cont_last_name.trim())  errs.cont_last_name  = 'Last Name is required'
    if (contactEdit.cont_email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEdit.cont_email))
        errs.cont_email = 'Invalid email format'
      else {
        const dupEmail = contacts.find(c => c._key !== contactEdit._key && c.cont_email.toLowerCase() === contactEdit.cont_email.toLowerCase())
        if (dupEmail) errs.cont_email = 'This email is already used by another contact'
      }
    }
    if (contactEdit.cont_mobile) {
      const digits = contactEdit.cont_mobile.replace(/\D/g, '')
      if (contactEdit.cont_country_code === 'IN') {
        if (!/^[6-9][0-9]{9}$/.test(digits)) errs.cont_mobile = 'Indian mobile must be 10 digits starting with 6–9'
      } else if (contactEdit.cont_country_code && digits.length < 7) {
        errs.cont_mobile = 'Mobile number must be at least 7 digits'
      }
    }
    if (Object.keys(errs).length > 0) { setContactErrors(errs); return }
    setContactErrors({})
    setContacts(prev => {
      const exists = prev.some(c => c._key === contactEdit._key)
      const updated = exists
        ? prev.map(c => c._key === contactEdit._key ? contactEdit : c)
        : [...prev, contactEdit]
      if (contactEdit.cont_is_admin) {
        return updated.map(c => c._key === contactEdit._key ? c : { ...c, cont_is_admin: false })
      }
      return updated
    })
    setContactEdit(null)
  }

  const saveAddress = () => {
    if (!addressEdit) return
    const errs: Record<string, string> = {}
    if (!addressEdit.adrs_type.trim())         errs.adrs_type         = 'Address Type is required'
    if (!addressEdit.adrs_name.trim())         errs.adrs_name         = 'Address Name is required'
    if (!addressEdit.adrs_country_code.trim()) errs.adrs_country_code = 'Country is required'
    if (!addressEdit.adrs_1.trim())            errs.adrs_1            = 'Address Line 1 is required'
    const isIndia = addressEdit.adrs_country_code === 'IN'
    if (addressEdit.adrs_pincode) {
      if (!/^\d+$/.test(addressEdit.adrs_pincode))
        errs.adrs_pincode = 'Pincode must contain digits only'
      else if (isIndia && addressEdit.adrs_pincode.length !== 6)
        errs.adrs_pincode = 'Indian pincode must be exactly 6 digits'
    }
    if (addressEdit.adrs_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addressEdit.adrs_email)) {
      errs.adrs_email = 'Invalid email format'
    }
    if (addressEdit.adrs_phone_number) {
      const phoneDigits = addressEdit.adrs_phone_number.replace(/\D/g, '')
      const phoneCountry = addressEdit.adrs_phone_number_country_code || addressEdit.adrs_country_code
      if (phoneCountry === 'IN' && phoneDigits.length !== 10)
        errs.adrs_phone_number = 'Indian phone must be exactly 10 digits'
      else if (phoneCountry && phoneCountry !== 'IN' && phoneDigits.length < 7)
        errs.adrs_phone_number = 'Phone number must be at least 7 digits'
    }
    if (Object.keys(errs).length > 0) { setAddressErrors(errs); return }
    setAddressErrors({})
    setAddresses(prev => {
      const exists = prev.some(a => a._key === addressEdit._key)
      return exists ? prev.map(a => a._key === addressEdit._key ? addressEdit : a) : [...prev, addressEdit]
    })
    setAddressEdit(null)
  }

  const closeForm = () => {
    setModalOpen(false); reset(); setDocFiles([])
    setContacts([]); setAddresses([])
    setContactEdit(null); setAddressEdit(null)
    setContactErrors({}); setAddressErrors({})
    setConfirmClose(false)
  }

  const hasUnsavedChanges = () =>
    isDirty || contacts.length > 0 || addresses.length > 0 || docFiles.length > 0

  const handleClose = () => {
    if (!isViewMode && hasUnsavedChanges()) { setConfirmClose(true); return }
    closeForm()
  }

  // ── Step-level validation ─────────────────────────────────────
  const STEP_FIELDS: Record<number, Array<keyof FormValues>> = {
    0: ['customer_name', 'customer_company_name', 'customer_display_name', 'bus_relationship', 'country_code'],
    1: ['tax_payer_type', 'gstin_status', 'gstin_uin_number', 'place_of_supply', 'gst_treatment', 'msme_udyam_reg_number'],
  }

  const checkCustomerNameExists = async (): Promise<boolean> => {
    const name = watch('customer_name').trim()
    if (!name) return false
    try {
      const excludeId = editItem?.id ?? null
      const params = excludeId ? `name=${encodeURIComponent(name)}&exclude_id=${excludeId}` : `name=${encodeURIComponent(name)}`
      const res = await apiService.get(`/customers/check-name?${params}`)
      return res.data?.data?.exists === true
    } catch { return false }
  }

  const checkCompanyNameExists = async (): Promise<boolean> => {
    const name = watch('customer_company_name').trim()
    if (!name) return false
    try {
      const excludeId = editItem?.id ?? null
      const params = excludeId ? `company=${encodeURIComponent(name)}&exclude_id=${excludeId}` : `company=${encodeURIComponent(name)}`
      const res = await apiService.get(`/customers/check-company?${params}`)
      return res.data?.data?.exists === true
    } catch { return false }
  }

  const checkPanExists = async (): Promise<boolean> => {
    const pan = watch('pan_card').trim().toUpperCase()
    if (!pan) return false
    try {
      const excludeId = editItem?.id ?? null
      const params = excludeId ? `pan=${encodeURIComponent(pan)}&exclude_id=${excludeId}` : `pan=${encodeURIComponent(pan)}`
      const res = await apiService.get(`/customers/check-pan?${params}`)
      return res.data?.data?.exists === true
    } catch { return false }
  }

  const checkGstinExists = async (): Promise<boolean> => {
    const gstin = watch('gstin_uin_number').trim().toUpperCase()
    if (!gstin) return false
    try {
      const excludeId = editItem?.id ?? null
      const params = excludeId ? `gstin=${encodeURIComponent(gstin)}&exclude_id=${excludeId}` : `gstin=${encodeURIComponent(gstin)}`
      const res = await apiService.get(`/customers/check-gstin?${params}`)
      return res.data?.data?.exists === true
    } catch { return false }
  }

  const handleNext = async () => {
    if (activeStep === 2 && contactEdit) { toast.error('Please save or cancel the open contact before proceeding'); return }
    if (activeStep === 3 && addressEdit) { toast.error('Please save or cancel the open address before proceeding'); return }
    const fields = STEP_FIELDS[activeStep]
    if (fields) {
      const valid = await trigger(fields)
      if (!valid) return
    }
    if (activeStep === 0) {
      const nameExists = await checkCustomerNameExists()
      if (nameExists) { setError('customer_name', { message: 'A customer with this name already exists' }); return }
      const companyExists = await checkCompanyNameExists()
      if (companyExists) { setError('customer_company_name', { message: 'A customer with this company name already exists' }); return }
      const panExists = await checkPanExists()
      if (panExists) { setError('pan_card', { message: 'A customer with this PAN is already registered' }); return }
    }
    if (activeStep === 1 && watch('gstin_uin_number').trim()) {
      const gstinExists = await checkGstinExists()
      if (gstinExists) { setError('gstin_uin_number', { message: 'A customer with this GSTIN is already registered' }); return }
    }
    if (activeStep === 2 && contacts.length < 1) {
      toast.error('At least 1 contact must be defined before proceeding'); return
    }
    if (activeStep === 3 && addresses.length < 1) {
      toast.error('At least 1 address must be defined before proceeding'); return
    }
    setActiveStep(s => s + 1)
  }

  const handleStepClick = async (i: number) => {
    if (i !== activeStep) {
      if (activeStep === 2 && contactEdit) { toast.error('Please save or cancel the open contact before navigating'); return }
      if (activeStep === 3 && addressEdit) { toast.error('Please save or cancel the open address before navigating'); return }
    }
    if (i > activeStep && !isViewMode) {
      const fields = STEP_FIELDS[activeStep]
      if (fields) {
        const valid = await trigger(fields)
        if (!valid) return
      }
    }
    setActiveStep(i)
  }

  // ── Modal helpers ─────────────────────────────────────────────
  const openAdd = () => {
    setFormMode('add'); setEditItem(null); setActiveStep(0)
    setDocFiles([]); setContacts([]); setAddresses([])
    setContactEdit(null); setAddressEdit(null)
    setContactErrors({}); setAddressErrors({})
    reset(EMPTY_FORM)
    setModalOpen(true)
  }

  const loadAndOpenForm = async (item: Customer, mode: 'edit' | 'view') => {
    try {
      const res = await apiService.get(`/customers/${item.id}`)
      const d   = res.data?.data as CustomerDetail
      setFormMode(mode); setEditItem(item); setActiveStep(0)
      setDocFiles(parseExistingDocs(d.upload_doc))
      setContacts((d.contacts ?? []).map((c, i) => ({ ...c, _key: `c_${i}` })))
      setAddresses((d.addresses ?? []).map((a, i) => ({
        ...a,
        _key:      `a_${i}`,
        adrs_type: a.adrs_type || 'BILL_TO',
      })))
      setContactEdit(null); setAddressEdit(null)
      reset({
        customer_name:         d.customer_name         ?? '',
        customer_company_name: d.customer_company_name ?? '',
        customer_display_name: d.customer_display_name ?? '',
        bus_relationship:      d.bus_relationship       ?? '',
        country_code:          d.country_code           ?? '',
        pan_card:              d.pan_card               ?? '',
        organization_type:     d.organization_type      ?? '',
        customer_type:         d.customer_type          ?? '',
        is_msme_reg:           d.is_msme_reg ? 'true' : 'false',
        website_url:           d.website_url            ?? '',
        tax_payer_type:        d.tax_payer_type         ?? '',
        gstin_status:          d.gstin_status           ?? '',
        gstin_uin_number:      d.gstin_uin_number       ?? '',
        place_of_supply:       d.place_of_supply        ?? '',
        msme_udyam_reg_number: d.msme_udyam_reg_number  ?? '',
        gst_treatment:         d.gst_treatment          ?? '',
        credit_limit_by_value: d.credit_limit_by_value != null ? String(d.credit_limit_by_value) : '',
        credit_limit_by_grams: d.credit_limit_by_grams != null ? String(d.credit_limit_by_grams) : '',
        payment_terms:         d.payment_terms ?? '',
      })
      setModalOpen(true)
    } catch { toast.error('Failed to load customer details') }
  }

  // Jump to the first step carrying a schema error so the user can see it.
  const onInvalid = (errs: FieldErrors<FormValues>) => {
    const steps = (Object.keys(errs) as Array<keyof FormValues>).map(f => FIELD_STEP[f] ?? 0)
    if (steps.length) setActiveStep(Math.min(...steps))
    toast.error('Please correct the highlighted fields before saving')
  }

  const onSubmit = async (data: FormValues) => {
    if (contactEdit || addressEdit) { toast.error('Please save or cancel the open entry form before submitting'); return }
    if (contacts.length  < 1) { setActiveStep(2); toast.error('At least 1 contact is required'); return }
    if (addresses.length < 1) { setActiveStep(3); toast.error('At least 1 address is required'); return }
    // PAN / GSTIN stay editable in edit mode, so re-check them here — the
    // step-wise duplicate checks only run when navigating forward.
    if (data.pan_card.trim() && await checkPanExists()) {
      setActiveStep(0)
      setError('pan_card', { message: 'A customer with this PAN is already registered' })
      toast.error('A customer with this PAN is already registered')
      return
    }
    if (data.gstin_uin_number.trim() && await checkGstinExists()) {
      setActiveStep(1)
      setError('gstin_uin_number', { message: 'A customer with this GSTIN is already registered' })
      toast.error('A customer with this GSTIN is already registered')
      return
    }
    setSaving(true)
    try {
      const newFiles     = docFiles.filter(f => f.dataUrl)
      const existingDocs = docFiles.filter(f => f.url).map(f => ({ name: f.name, url: f.url!, type: f.type, size: f.size }))
      const payload = {
        ...data,
        is_msme_reg:   data.is_msme_reg === 'true',
        credit_limit_by_value: data.credit_limit_by_value ? parseFloat(data.credit_limit_by_value) : 0,
        credit_limit_by_grams: data.credit_limit_by_grams ? parseFloat(data.credit_limit_by_grams) : 0,
        contacts:      contacts.map(({ _key, ...rest }) => rest),
        addresses:     addresses.map(({ _key, ...rest }) => rest),
        files:         newFiles.map(f => ({ name: f.name, dataUrl: f.dataUrl!, size: f.size })),
        existing_docs: existingDocs,
      }
      if (isNew) {
        await apiService.post('/customers', payload)
        toast.success('Customer created successfully')
      } else {
        await apiService.put(`/customers/${editItem!.id}`, payload)
        toast.success('Customer updated successfully')
      }
      closeForm()
      await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      // A 413 comes back from the proxy as HTML, so there is no data.message to
      // show — say what actually went wrong instead of a bare "Failed to save".
      const e = err as { response?: { status?: number; data?: { message?: string } } }
      toast.error(e?.response?.status === 413
        ? 'Attachments are too large to upload in one save. Remove or compress a document and try again.'
        : e?.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const confirmToggle = async (reason?: string) => {
    if (!toggleItem) return
    try {
      const res = await apiService.delete(`/customers/${toggleItem.id}`, reason ? { data: { reason } } : undefined)
      toast.success(res.data?.message || 'Status updated')
      setToggleItem(null)
      await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'
      toast.error(msg)
    }
  }

  // ── Import helpers ────────────────────────────────────────────
  const openImport = () => {
    setImportOpen(true); setImportStep('upload')
    setImportRows([]); setImportDone(0); setImportTotal(0); setImportErrList([])
  }

  const downloadImportTemplate = async () => {
    const XLSX = await import('xlsx')
    const headers = [
      'Company Name *', 'Customer Name *', 'Display Name *',
      'Business Relationship *', 'Country *', 'PAN Card',
      'Organization Type', 'Customer Type', 'MSME Registration (Yes/No)',
      'Website URL', 'Tax Payer Type', 'GSTIN / UIN',
      'Place of Supply', 'MSME Udyam Reg Number', 'GST Treatment',
      'Credit Limit Value', 'Credit Limit Grams', 'Payment Terms',
    ]
    const sample = [
      'Acme Corporation', 'Acme Corp', 'Acme Corp',
      '', 'IN', 'ABCDE1234F',
      '', '', 'No',
      '', '', '',
      '', '', '',
      '', '', 'Net 30 days',
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, sample])
    ws['!cols'] = headers.map(() => ({ wch: 22 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Customers')
    XLSX.writeFile(wb, `customer_import_template_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleImportFile = async (file: File) => {
    const XLSX = await import('xlsx')
    const buf  = await file.arrayBuffer()
    const wb   = XLSX.read(buf, { type: 'array' })
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const raw  = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

    const resolveLov = (type: LovType, input: string): string | null => {
      if (!input) return null
      const v = input.trim().toLowerCase()
      return lovMap[type].find(
        o => o.lookup_code.toLowerCase() === v || countryOnly(o.lookup_name).toLowerCase() === v
      )?.lookup_code ?? null
    }

    const parsed: CImportRow[] = raw.map((r, idx) => {
      const row: Partial<CImportRow> = { _rowNum: idx + 2, errors: [] }
      Object.entries(r).forEach(([col, val]) => {
        const field = CUST_HEADER_MAP[normCHeader(col)]
        if (field) (row as Record<string, unknown>)[field] = String(val ?? '').trim()
      })
      const errs: string[] = []

      if (!row.customer_company_name?.trim()) errs.push('Company Name required')
      if (!row.customer_name?.trim())         errs.push('Customer Name required')
      if (!row.customer_display_name?.trim()) {
        row.customer_display_name = row.customer_company_name?.trim() || ''
        if (!row.customer_display_name) errs.push('Display Name required')
      }
      if (!row.bus_relationship?.trim()) errs.push('Business Relationship required')
      if (!row.country_code?.trim())     errs.push('Country required')

      if (row.bus_relationship?.trim()) {
        const code = resolveLov('BUSINESS_RELATIONSHIP', row.bus_relationship)
        if (code) row.bus_relationship = code
        else errs.push(`Unknown Business Relationship: "${row.bus_relationship.trim()}"`)
      }
      if (row.country_code?.trim()) {
        const code = resolveLov('COUNTRY', row.country_code)
        if (code) row.country_code = code
        else errs.push(`Unknown country: "${row.country_code.trim()}"`)
      }
      if (row.organization_type?.trim()) {
        const code = resolveLov('ORGANIZATION_TYPE', row.organization_type)
        if (code) row.organization_type = code
        else errs.push(`Unknown organization type: "${row.organization_type.trim()}"`)
      }
      if (row.customer_type?.trim()) {
        const code = resolveLov('CUSTOMER_TYPE', row.customer_type)
        if (code) row.customer_type = code
        else errs.push(`Unknown customer type: "${row.customer_type.trim()}"`)
      }
      if (row.tax_payer_type?.trim()) {
        const code = resolveLov('TAX_PAYER_TYPE', row.tax_payer_type)
        if (code) row.tax_payer_type = code
        else errs.push(`Unknown tax payer type: "${row.tax_payer_type.trim()}"`)
      }
      if (row.gst_treatment?.trim()) {
        const code = resolveLov('GST_TREATMENT', row.gst_treatment)
        if (code) row.gst_treatment = code
        else errs.push(`Unknown GST treatment: "${row.gst_treatment.trim()}"`)
      }
      if (row.payment_terms?.trim()) {
        const code = resolveLov('PAYMENT_TERM', row.payment_terms)
        if (code) row.payment_terms = code
        else errs.push(`Unknown payment terms: "${row.payment_terms.trim()}"`)
      }

      if (row.pan_card?.trim()) {
        const pan = row.pan_card.trim().toUpperCase()
        row.pan_card = pan
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan))
          errs.push('PAN format invalid — expected ABCDE1234F')
      }
      if (row.gstin_uin_number?.trim()) {
        const gstin = row.gstin_uin_number.trim().toUpperCase()
        row.gstin_uin_number = gstin
        if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(gstin))
          errs.push('GSTIN format invalid — expected 22AAAAA0000A1Z5')
      }
      if (row.msme_udyam_reg_number?.trim()) {
        const udyam = row.msme_udyam_reg_number.trim().toUpperCase()
        row.msme_udyam_reg_number = udyam
        if (!/^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/.test(udyam))
          errs.push('Udyam format invalid — expected UDYAM-XX-00-0000000')
      }

      const msmeRaw = (row.is_msme_reg || '').trim().toLowerCase()
      row.is_msme_reg = (msmeRaw === 'yes' || msmeRaw === 'true' || msmeRaw === '1') ? 'true' : 'false'
      if (row.is_msme_reg === 'true' && !row.msme_udyam_reg_number?.trim())
        errs.push('MSME / Udyam Registration Number is required when MSME Registration is Yes')

      row.errors = errs
      return row as CImportRow
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
          await apiService.post('/customers', {
            customer_name:         row.customer_name,
            customer_company_name: row.customer_company_name,
            customer_display_name: row.customer_display_name,
            bus_relationship:      row.bus_relationship      || null,
            country_code:          row.country_code          || null,
            pan_card:              row.pan_card              || null,
            organization_type:     row.organization_type     || null,
            customer_type:         row.customer_type         || null,
            is_msme_reg:           row.is_msme_reg === 'true',
            website_url:           row.website_url           || null,
            tax_payer_type:        row.tax_payer_type        || null,
            gstin_uin_number:      row.gstin_uin_number      || null,
            place_of_supply:       row.place_of_supply       || null,
            msme_udyam_reg_number: row.msme_udyam_reg_number || null,
            gst_treatment:         row.gst_treatment         || null,
            credit_limit_by_value: row.credit_limit_by_value ? parseFloat(row.credit_limit_by_value) : 0,
            credit_limit_by_grams: row.credit_limit_by_grams ? parseFloat(row.credit_limit_by_grams) : 0,
            payment_terms:         row.payment_terms         || null,
            contacts:              [],
            addresses:             [],
            files:                 [],
            existing_docs:         [],
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
    if (done > 0) await Promise.all([loadItems(), loadStats()])
  }

  // ── Form field helpers ────────────────────────────────────────
  const fi = (disabled: boolean) =>
    `form-input ${disabled ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`

  const Field = ({ label, name, required, placeholder, type = 'text', uppercase, disabled }: {
    label: string; name: keyof FormValues; required?: boolean; placeholder?: string; type?: string; uppercase?: boolean; disabled?: boolean
  }) => {
    const err = errors[name]
    const dis = isViewMode || !!disabled
    return (
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          {label}{required && !dis && <Req />}
        </label>
        <input {...register(name)} type={type} disabled={dis} placeholder={placeholder ?? label} className={fi(dis)}
          style={uppercase ? { textTransform: 'uppercase' } : undefined} />
        {!isViewMode && err && <p className="text-xs text-red-500 mt-1">{err.message}</p>}
      </div>
    )
  }

  const SelectField = ({ label, name, lovType, required, nameTransform, disabled }: {
    label: string; name: keyof FormValues; lovType: LovType; required?: boolean
    nameTransform?: (n: string) => string; disabled?: boolean
  }) => {
    const err = errors[name]
    const dis = isViewMode || !!disabled
    return (
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          {label}{required && !isViewMode && <Req />}
        </label>
        <select {...register(name)} disabled={dis} className={fi(dis)}>
          <option value="">Select {label}</option>
          {lovMap[lovType].map(o => (
            <option key={o.lookup_code} value={o.lookup_code}>
              {nameTransform ? nameTransform(o.lookup_name) : o.lookup_name}
            </option>
          ))}
        </select>
        {!isViewMode && err && <p className="text-xs text-red-500 mt-1">{err.message}</p>}
      </div>
    )
  }

  const YesNoField = ({ label, name, disabled }: { label: string; name: keyof FormValues; disabled?: boolean }) => {
    const dis = isViewMode || !!disabled
    return (
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
        <select {...register(name)} disabled={dis} className={fi(dis)}>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>
    )
  }

  // ── Document upload section ───────────────────────────────────
  const DocumentUpload = () => (
    <div className="sm:col-span-2">
      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
        Upload Documents
      </label>
      {!isViewMode && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:border-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/5"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <ArrowUpTrayIcon className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Click to browse files</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Images (JPG, PNG, WebP), PDF, Word, Excel — max 5 MB each</p>
          <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={onFileSelect} className="hidden" />
        </div>
      )}
      {docFiles.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {docFiles.map(file => {
            const src = file.dataUrl || getFileUrl(file.url) || null
            return (
              <div key={file.id} className="relative group rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                {file.type === 'image' ? (
                  <div className="h-28 overflow-hidden bg-[var(--bg-tertiary)] flex items-center justify-center">
                    {src ? (
                      <img src={src} alt={file.name} className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                      <PhotoIcon className="w-10 h-10 opacity-30" style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                ) : (
                  <div className="h-28 flex flex-col items-center justify-center gap-2 bg-[var(--bg-tertiary)]">
                    <DocumentIcon className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
                    <DocTypeBadge type={file.type} />
                  </div>
                )}
                <div className="px-2 py-1.5 flex items-center justify-between gap-1 relative z-10">
                  <p className="text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }} title={file.name}>{file.name}</p>
                  {!isViewMode && (
                    <button type="button" onClick={() => removeDoc(file.id)} className="flex-shrink-0 p-0.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50" title="Remove">
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {file.url && (
                  <a href={getFileUrl(file.url) ?? '#'} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" title="Open file" />
                )}
              </div>
            )
          })}
          {!isViewMode && (
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="h-28 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors hover:border-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/5"
              style={{ borderColor: 'var(--border-color)' }}>
              <PlusIcon className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Add more</span>
            </button>
          )}
        </div>
      )}
      {isViewMode && docFiles.length === 0 && (
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>No documents uploaded.</p>
      )}
    </div>
  )

  // ── Step content ──────────────────────────────────────────────
  const renderStep = () => {
    switch (activeStep) {
      case 0: {
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Field({ label: 'Customer Name',  name: 'customer_name',         required: true, placeholder: 'Enter customer name', disabled: !isNew })}
            {Field({ label: 'Company Name',   name: 'customer_company_name', required: true, placeholder: 'Enter company name', disabled: !isNew })}
            <div className="sm:col-span-2">
              {Field({ label: 'Display Name', name: 'customer_display_name', required: true, placeholder: 'Name shown on invoices' })}
            </div>
            {SelectField({ label: 'Business Relationship', name: 'bus_relationship', lovType: 'BUSINESS_RELATIONSHIP', required: true })}
            {SelectField({ label: 'Country',               name: 'country_code',     lovType: 'COUNTRY', nameTransform: countryOnly, required: true })}
            {Field({ label: 'PAN Card', name: 'pan_card', placeholder: 'ABCDE1234F', uppercase: true, disabled: watch('country_code') !== 'IN' })}
            {SelectField({ label: 'Organization Type', name: 'organization_type', lovType: 'ORGANIZATION_TYPE' })}
            {SelectField({ label: 'Customer Type',     name: 'customer_type',     lovType: 'CUSTOMER_TYPE' })}
            {YesNoField({ label: 'MSME Registration', name: 'is_msme_reg', disabled: watch('country_code') !== 'IN' })}
            <div className="sm:col-span-2">
              {Field({ label: 'URL (Website or Other)', name: 'website_url', placeholder: 'https://example.com' })}
            </div>
            <DocumentUpload />
          </div>
        )
      }
      case 1: {
        const isIndia   = watch('country_code') === 'IN'
        const gstExempt = watch('organization_type') === 'PROPRIETORSHIP' || watch('customer_type') === 'WALK_IN'
        const gstReq    = isIndia && !gstExempt
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isIndia && (
              <div className="sm:col-span-2 text-xs rounded-lg px-3 py-2" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                GST details apply to Indian customers only. Select "India" as the country to enable these fields.
              </div>
            )}
            {isIndia && gstExempt && (
              <div className="sm:col-span-2 text-xs rounded-lg px-3 py-2" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                GST details are optional for Proprietorship / Walk-In customers.
              </div>
            )}
            {SelectField({ label: 'Tax Payer Type', name: 'tax_payer_type', lovType: 'TAX_PAYER_TYPE', disabled: !isIndia, required: gstReq })}
            {SelectField({ label: 'GSTIN Status',   name: 'gstin_status',   lovType: 'GSTIN_STATUS', disabled: !isIndia, required: gstReq })}
            {Field({ label: 'GSTIN / UIN', name: 'gstin_uin_number', placeholder: '22AAAAA0000A1Z5', uppercase: true, disabled: !isIndia, required: gstReq })}
            {Field({ label: 'Place of Supply', name: 'place_of_supply', placeholder: 'State / City', disabled: !isIndia, required: gstReq })}
            {watch('is_msme_reg') === 'true' && (
              <div className="sm:col-span-2">
                {Field({ label: 'MSME / Udyam Registration Number', name: 'msme_udyam_reg_number', placeholder: 'UDYAM-XX-00-0000000', uppercase: true, required: true, disabled: !isNew })}
              </div>
            )}
            <div className="sm:col-span-2">
              {SelectField({ label: 'GST Treatment', name: 'gst_treatment', lovType: 'GST_TREATMENT', disabled: !isIndia, required: gstReq })}
            </div>
          </div>
        )
      }
      case 2: {
        const c = contactEdit
        const isEditing = !!c
        const isNewEntry = isEditing && !contacts.some(x => x._key === c._key)
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
              </p>
              {!isViewMode && !isEditing && (
                <button type="button" onClick={() => setContactEdit(newContact())}
                  className="btn-primary text-xs flex items-center gap-1">
                  <PlusIcon className="w-3.5 h-3.5" /> Add Contact
                </button>
              )}
            </div>

            {contacts.length === 0 && !isEditing && (
              <div className="flex flex-col items-center gap-2 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                <UserGroupIcon className="w-8 h-8 opacity-30" />
                <p className="text-sm">No contacts yet.</p>
                {!isViewMode && <p className="text-xs">Click "Add Contact" to add one.</p>}
              </div>
            )}

            {contacts.map(row => (
              <div key={row._key} className="flex items-start justify-between p-3 rounded-lg border"
                style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {[row.cont_first_name, row.cont_last_name].filter(Boolean).join(' ') || '—'}
                    {row.cont_is_admin && (
                      <span className="ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--accent-gold)', color: 'white' }}>Admin</span>
                    )}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {[row.cont_job_title, row.cont_email, row.cont_mobile].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  {isViewMode ? (
                    <button type="button" onClick={() => setContactEdit({ ...row })}
                      className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]" title="View">
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  ) : (
                    <>
                    <button type="button" onClick={() => setContactEdit({ ...row })}
                      className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500" title="Edit">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setContacts(prev => prev.filter(x => x._key !== row._key))}
                      className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-red-500" title="Remove">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {c && (
              <div className="p-4 rounded-xl border-2 mt-2"
                style={{ borderColor: 'var(--accent-gold)', background: 'var(--bg-secondary)' }}>
                <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--accent-gold)' }}>
                  {isViewMode ? 'View Contact' : isNewEntry ? 'New Contact' : 'Edit Contact'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <IFld label="First Name" value={c.cont_first_name}
                    onChange={v => { setContactEdit(p => p && ({ ...p, cont_first_name: v })); setContactErrors(e => ({ ...e, cont_first_name: '' })) }}
                    disabled={isViewMode} required error={contactErrors.cont_first_name} />
                  <IFld label="Last Name" value={c.cont_last_name}
                    onChange={v => { setContactEdit(p => p && ({ ...p, cont_last_name: v })); setContactErrors(e => ({ ...e, cont_last_name: '' })) }}
                    disabled={isViewMode} required error={contactErrors.cont_last_name} />
                  <IFld label="Email" type="email" value={c.cont_email}
                    onChange={v => { setContactEdit(p => p && ({ ...p, cont_email: v })); setContactErrors(e => ({ ...e, cont_email: '' })) }}
                    disabled={isViewMode} span2 placeholder="contact@example.com" maxLength={255} error={contactErrors.cont_email} />
                  <IFld label="Job Title" value={c.cont_job_title}
                    onChange={v => setContactEdit(p => p && ({ ...p, cont_job_title: v }))}
                    disabled={isViewMode} placeholder="e.g. Purchase Manager" />
                  <ISel label="Country (Mobile)" value={c.cont_country_code}
                    onChange={v => setContactEdit(p => p && ({ ...p, cont_country_code: v }))}
                    options={lovMap.COUNTRY} nameTransform={countryOnly} disabled={isViewMode} />
                  <IFld label="Mobile Number" value={c.cont_mobile}
                    onChange={v => { setContactEdit(p => p && ({ ...p, cont_mobile: v })); setContactErrors(e => ({ ...e, cont_mobile: '' })) }}
                    disabled={isViewMode} span2 placeholder="9876543210" digitsOnly maxLength={15} error={contactErrors.cont_mobile} />
                  <IYN label="Admin Contact" value={c.cont_is_admin}
                    onChange={v => setContactEdit(p => p && ({ ...p, cont_is_admin: v }))}
                    disabled={isViewMode} />
                </div>
                <div className="flex gap-2 mt-4">
                  {isViewMode ? (
                    <button type="button" onClick={() => setContactEdit(null)} className="btn-secondary text-sm">Close</button>
                  ) : (
                    <>
                      <button type="button" onClick={saveContact} className="btn-primary text-sm">Save</button>
                      <button type="button" onClick={() => { setContactEdit(null); setContactErrors({}) }} className="btn-secondary text-sm">Cancel</button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      }
      case 3: {
        const a = addressEdit
        const isEditing = !!a
        const isNewEntry = isEditing && !addresses.some(x => x._key === a._key)
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {addresses.length} address{addresses.length !== 1 ? 'es' : ''}
                {!isViewMode && addresses.length === 0 && (
                  <span className="ml-2 text-xs font-normal text-red-500">At least 1 address is required</span>
                )}
              </p>
              {!isViewMode && !isEditing && (
                <button type="button" onClick={() => setAddressEdit(newAddress())}
                  className="btn-primary text-xs flex items-center gap-1">
                  <PlusIcon className="w-3.5 h-3.5" /> Add Address
                </button>
              )}
            </div>

            {addresses.length === 0 && !isEditing && (
              <div className="flex flex-col items-center gap-2 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                <UserGroupIcon className="w-8 h-8 opacity-30" />
                <p className="text-sm">No addresses yet.</p>
                {!isViewMode && <p className="text-xs">Click "Add Address" to add one.</p>}
              </div>
            )}

            {addresses.map(row => (
              <div key={row._key} className="flex items-start justify-between p-3 rounded-lg border"
                style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    {row.adrs_name || '—'}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      row.adrs_type === 'SHIP_TO'
                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                        : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                      {row.adrs_type === 'SHIP_TO' ? 'SHIP TO' : 'BILL TO'}
                    </span>
                  </p>
                  <p className="text-xs mt-0.5 whitespace-pre-line" style={{ color: 'var(--text-muted)' }}>
                    {addressSummary(row) || '—'}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  {isViewMode ? (
                    <button type="button" onClick={() => setAddressEdit({ ...row })}
                      className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]" title="View">
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  ) : (
                    <>
                      {row.adrs_type === 'BILL_TO' && (
                        <button type="button"
                          onClick={() => { setAddressEdit(copyAsShipTo(row)); setAddressErrors({}) }}
                          disabled={isEditing}
                          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--accent-gold)] disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Copy to Ship To address">
                          <DocumentDuplicateIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button type="button" onClick={() => setAddressEdit({ ...row })}
                        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500" title="Edit">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setAddresses(prev => prev.filter(x => x._key !== row._key))}
                        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-red-500" title="Remove">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {a && (
              <div className="p-4 rounded-xl border-2 mt-2"
                style={{ borderColor: 'var(--accent-gold)', background: 'var(--bg-secondary)' }}>
                <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--accent-gold)' }}>
                  {isViewMode ? 'View Address' : isNewEntry ? 'New Address' : 'Edit Address'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ISel label="Address Type" value={a.adrs_type}
                    onChange={v => {
                      setAddressEdit(p => p && ({ ...p, adrs_type: v }))
                      setAddressErrors(e => ({ ...e, adrs_type: '' }))
                    }}
                    options={lovMap.ADRESS_TYPE} disabled={isViewMode} required error={addressErrors.adrs_type} />
                  <IFld label="Address Name" value={a.adrs_name}
                    onChange={v => { setAddressEdit(p => p && ({ ...p, adrs_name: v })); setAddressErrors(e => ({ ...e, adrs_name: '' })) }}
                    disabled={isViewMode} placeholder="e.g. Head Office, Billing Address" required error={addressErrors.adrs_name} />

                  <ISel label="Country" value={a.adrs_country_code}
                    onChange={v => { setAddressEdit(p => p && ({ ...p, adrs_country_code: v, adrs_state_code: '' })); setAddressErrors(e => ({ ...e, adrs_country_code: '' })) }}
                    options={lovMap.COUNTRY} nameTransform={countryOnly} disabled={isViewMode} required error={addressErrors.adrs_country_code} />
                  {a.adrs_country_code === 'IN' ? (
                    <ISel label="State" value={a.adrs_state_code}
                      onChange={v => setAddressEdit(p => p && ({ ...p, adrs_state_code: v }))}
                      options={lovMap.STATE} disabled={isViewMode} />
                  ) : (
                    <IFld label="State / Province" value={a.adrs_state_code}
                      onChange={v => setAddressEdit(p => p && ({ ...p, adrs_state_code: v }))}
                      disabled={isViewMode} placeholder="State / Province" />
                  )}
                  <IFld label="Address Line 1" value={a.adrs_1}
                    onChange={v => { setAddressEdit(p => p && ({ ...p, adrs_1: v })); setAddressErrors(e => ({ ...e, adrs_1: '' })) }}
                    disabled={isViewMode} span2 placeholder="Building / Street" required error={addressErrors.adrs_1} />
                  <IFld label="Address Line 2" value={a.adrs_2}
                    onChange={v => setAddressEdit(p => p && ({ ...p, adrs_2: v }))}
                    disabled={isViewMode} placeholder="Area / Landmark" />
                  <IFld label="Address Line 3" value={a.adrs_3}
                    onChange={v => setAddressEdit(p => p && ({ ...p, adrs_3: v }))}
                    disabled={isViewMode} placeholder="Optional" />
                  <IFld label="City" value={a.adrs_city_name}
                    onChange={v => setAddressEdit(p => p && ({ ...p, adrs_city_name: v }))}
                    disabled={isViewMode} />
                  <IFld label="Pincode" value={a.adrs_pincode}
                    onChange={v => { setAddressEdit(p => p && ({ ...p, adrs_pincode: v })); setAddressErrors(e => ({ ...e, adrs_pincode: '' })) }}
                    disabled={isViewMode} placeholder="400001" error={addressErrors.adrs_pincode} />
                  <IFld label="Email" type="email" value={a.adrs_email}
                    onChange={v => { setAddressEdit(p => p && ({ ...p, adrs_email: v })); setAddressErrors(e => ({ ...e, adrs_email: '' })) }}
                    disabled={isViewMode} span2 placeholder="address@example.com" maxLength={255} error={addressErrors.adrs_email} />
                  <ISel label="Phone Country Code" value={a.adrs_phone_number_country_code}
                    onChange={v => setAddressEdit(p => p && ({ ...p, adrs_phone_number_country_code: v }))}
                    options={lovMap.COUNTRY} disabled={isViewMode} />
                  <IFld label="Phone Number" value={a.adrs_phone_number}
                    onChange={v => { setAddressEdit(p => p && ({ ...p, adrs_phone_number: v })); setAddressErrors(e => ({ ...e, adrs_phone_number: '' })) }}
                    disabled={isViewMode} placeholder="9876543210" digitsOnly maxLength={15} error={addressErrors.adrs_phone_number} />
                  <IFld label="Extension" value={a.adrs_extension}
                    onChange={v => setAddressEdit(p => p && ({ ...p, adrs_extension: v }))}
                    disabled={isViewMode} placeholder="101" />
                </div>
                <div className="flex gap-2 mt-4">
                  {isViewMode ? (
                    <button type="button" onClick={() => setAddressEdit(null)} className="btn-secondary text-sm">Close</button>
                  ) : (
                    <>
                      <button type="button" onClick={saveAddress} className="btn-primary text-sm">Save</button>
                      <button type="button" onClick={() => { setAddressEdit(null); setAddressErrors({}) }} className="btn-secondary text-sm">Cancel</button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      }
      case 4: return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!isViewMode && (
            <div className="sm:col-span-2 text-xs rounded-lg px-3 py-2" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              <Req /> At least one credit limit is required — by Value or by Grams.
            </div>
          )}
          {Field({ label: 'Credit Limit by Value (₹)', name: 'credit_limit_by_value', type: 'number', placeholder: '0.00' })}
          {Field({ label: 'Credit Limit by Grams',     name: 'credit_limit_by_grams', type: 'number', placeholder: '0.0000' })}
          <div className="sm:col-span-2">
            {SelectField({ label: 'Payment Terms', name: 'payment_terms', lovType: 'PAYMENT_TERM' })}
          </div>
        </div>
      )
      default: return null
    }
  }

  // ── Stepper sidebar ───────────────────────────────────────────
  const Stepper = () => (
    <div className="flex flex-col gap-0 w-44 flex-shrink-0">
      {STEPS.map((step, i) => {
        const done    = i < activeStep
        const current = i === activeStep
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => handleStepClick(i)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all flex-shrink-0
                  ${current ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)] text-white'
                  : done    ? 'border-green-500 bg-green-500 text-white'
                            : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)]'}`}
              >
                {done ? <CheckCircleIcon className="w-4 h-4" /> : i + 1}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-0.5 my-1 min-h-[20px] flex-1 ${done ? 'bg-green-500' : 'bg-[var(--border-color)]'}`} />
              )}
            </div>
            <div className={`pb-5 ${i === STEPS.length - 1 ? 'pb-0' : ''}`}>
              <p className={`text-xs font-semibold leading-tight ${current ? 'text-[var(--accent-gold)]' : done ? 'text-green-600' : 'text-[var(--text-muted)]'}`}>
                {step.label}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{step.desc}</p>
            </div>
          </div>
        )
      })}
    </div>
  )

  // ── Render ────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <span>Masters</span><span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>Customer Master</span>
      </div>

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
            <PlusIcon className="w-4 h-4" /> Add Customer
          </button>
        )}
      </div>

      {/* Card */}
      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[var(--border-color)]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input value={searchInput} onChange={e => onSearchInput(e.target.value)} placeholder="Search customers…"
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

            {canCreate && (
              <button
                onClick={openImport}
                title="Import Customers from Excel"
                className="p-1.5 rounded-lg border transition-colors border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
              </button>
            )}

            <input
              ref={importFileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void handleImportFile(f); e.target.value = '' }}
            />

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
                    className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide select-none whitespace-nowrap ${showSorting && col.sortKey ? 'cursor-pointer hover:text-[var(--text-primary)]' : ''}`}
                  >
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
                        <div className="h-4 rounded animate-pulse bg-[var(--bg-tertiary)]" style={{ width: col.key === 'customer_company_name' ? '180px' : '80px' }} />
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
                      <UserGroupIcon className="w-10 h-10 opacity-30" />
                      {search || Object.values(colFilters).some(v => v)
                        ? 'No customers match the current filters.'
                        : `No ${statusFilter} customers found. Click "Add Customer" to get started.`}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id}
                    className={`border-b border-[var(--border-color)] transition-colors hover:bg-[var(--bg-secondary)]
                      ${idx % 2 !== 0 ? 'bg-[var(--bg-primary)]/40' : ''}
                      ${selectedRows.some(r => r.id === item.id) ? 'bg-[var(--accent-gold)]/5' : ''}`}
                  >
                    <td className="px-4 py-2.5">
                      <input type="checkbox" checked={selectedRows.some(r => r.id === item.id)} onChange={() => toggleSelectRow(item)}
                        className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer" />
                    </td>
                    {visibleCols.map(col => <td key={col.key} className="px-4 py-2.5">{renderCell(col, item)}</td>)}
                    <td className="px-4 py-2.5 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]">
                      <div className="flex items-center justify-center gap-1">
                        {canUpdate && (
                          <button onClick={() => loadAndOpenForm(item, 'edit')} className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500 ${(!item.is_active || item.used_elsewhere) ? 'invisible' : ''}`} title="Edit">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canView && (
                          <button onClick={() => loadAndOpenForm(item, 'view')} className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]" title="View">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setToggleItem(item)}
                            className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] ${item.is_active ? 'text-red-500' : 'text-green-500'} ${item.used_elsewhere ? 'invisible' : ''}`}
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

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {total === 0 ? 'No records found' : `Showing ${startRow}–${endRow} of ${total} customers`}
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

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={handleClose}
        title={isNew ? 'Add Customer' : isViewMode ? `View Customer — ${editItem?.customer_code}` : `Edit Customer — ${editItem?.customer_code}`}
        size="4xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Step {activeStep + 1} of {STEPS.length} — <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{STEPS[activeStep].label}</span>
            </span>
            <div className="flex items-center gap-2">
              {isViewMode ? (
                <>
                  {activeStep > 0 && (
                    <button type="button" onClick={() => setActiveStep(s => s - 1)} className="btn-secondary">← Previous</button>
                  )}
                  {activeStep < STEPS.length - 1 && (
                    <button type="button" onClick={() => setActiveStep(s => s + 1)} className="btn-secondary flex items-center gap-1">
                      Next <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={closeForm} className="btn-secondary">Close</button>
                </>
              ) : (
                <>
                  <button onClick={handleClose} className="btn-secondary">Cancel</button>
                  {activeStep > 0 && (
                    <button type="button" onClick={() => setActiveStep(s => s - 1)} className="btn-secondary">← Previous</button>
                  )}
                  {activeStep < STEPS.length - 1 && (
                    <button type="button" onClick={handleNext} className="btn-primary flex items-center gap-1">
                      Next <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  )}
                  {(isNew ? activeStep === STEPS.length - 1 : true) && (
                    <button onClick={handleSubmit(onSubmit, onInvalid)} disabled={saving} className="btn-primary">
                      {saving
                        ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />Saving…</>
                        : isNew ? 'Create Customer' : 'Update Customer'
                      }
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        }
      >
        <div className="flex gap-6">
          <Stepper />
          <div className="w-px flex-shrink-0" style={{ background: 'var(--border-color)' }} />
          <div className="flex-1 min-w-0">
            {isViewMode && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] mb-4">
                <EyeIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Read-only view — no changes can be made.</p>
              </div>
            )}
            <div className="mb-4 pb-3 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{STEPS[activeStep].label}</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{STEPS[activeStep].desc}</p>
            </div>
            {renderStep()}
          </div>
        </div>
      </Modal>

      <DeactivateReasonDialog
        isOpen={!!toggleItem?.is_active}
        title="Deactivate Customer"
        itemLabel={`"${toggleItem?.customer_company_name}" (${toggleItem?.customer_code})`}
        onConfirm={reason => confirmToggle(reason)}
        onCancel={() => setToggleItem(null)}
      />

      <ConfirmDialog
        isOpen={!!toggleItem && !toggleItem.is_active}
        title="Activate Customer"
        message={`Activate customer "${toggleItem?.customer_company_name}" (${toggleItem?.customer_code})?`}
        confirmLabel="Activate"
        variant="info"
        onConfirm={() => confirmToggle()}
        onCancel={() => setToggleItem(null)}
      />

      <ConfirmDialog
        isOpen={confirmClose}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to close? All unsaved data will be lost."
        confirmLabel="Discard Changes"
        onConfirm={closeForm}
        onCancel={() => setConfirmClose(false)}
      />

      {/* ── Import Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={importOpen}
        onClose={() => { if (!importing) { setImportOpen(false); setImportStep('upload') } }}
        title={importStep === 'upload' ? 'Import Customers from Excel' : importStep === 'preview' ? 'Preview Import Data' : 'Import Results'}
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
                Download the template, fill in customer data, then upload the file. Business Relationship and Country must match valid lookup values.
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
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Company Name</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Customer Name</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Country</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">PAN</th>
                      <th className="px-3 py-2 text-left text-[var(--text-muted)] font-semibold uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map(row => (
                      <React.Fragment key={row._rowNum}>
                        <tr className={`border-t border-[var(--border-color)] ${row.errors.length > 0 ? 'bg-red-50/50' : ''}`}>
                          <td className="px-3 py-2 text-[var(--text-muted)]">{row._rowNum}</td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{row.customer_company_name || '—'}</td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{row.customer_name || '—'}</td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">{row.country_code || '—'}</td>
                          <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">{row.pan_card || '—'}</td>
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
                    {importDone} customer{importDone !== 1 ? 's' : ''} imported successfully
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

export default CustomerMasterPage
