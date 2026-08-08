import React, { useState, useEffect, useRef, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon, EyeIcon, MagnifyingGlassIcon, XMarkIcon,
  ViewColumnsIcon, ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon,
  FunnelIcon, BarsArrowUpIcon, NoSymbolIcon, CheckCircleIcon,
  ArrowDownTrayIcon, SparklesIcon, PrinterIcon, TrashIcon,
  EnvelopeIcon, ChatBubbleLeftRightIcon, DocumentArrowDownIcon,
  DocumentDuplicateIcon, ClockIcon, ArrowLeftIcon, InformationCircleIcon,
  ExclamationTriangleIcon, XCircleIcon,
} from '@heroicons/react/24/outline'
import Modal                  from '@/components/common/Modal'
import Badge                  from '@/components/common/Badge'
import ConfirmDialog          from '@/components/common/ConfirmDialog'
import DeactivateReasonDialog from '@/components/common/DeactivateReasonDialog'
import WorkflowPanel          from '@/components/workflow/WorkflowPanel'
import { formatDate, formatDateTime } from '@/utils/helpers'
import { apiService } from '@/api/apiService'
import { usePermission } from '@/hooks'

// ── Types ─────────────────────────────────────────────────────
interface SalesOrderRow {
  id:                    number
  order_no:              string
  buss_unit_id:          string
  customer_id:           number
  customer_code:         string
  customer_company_name: string
  customer_po:           string | null
  order_type:            string
  order_date:            string
  currency_code:         string
  sales_credit:          number | null
  order_status:          'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  total_qty:             number | null
  total_amount:          number | null
  cancel_reason:         string | null
  cancelled_at:          string | null
  line_count:            number
  created_at:            string
}

interface SalesOrderLine {
  id?:                 number
  line_no?:            number
  item_name:           string | null
  customer_item:       string | null
  sales_group:         string | null
  item_qty:            number
  item_uom:            string | null
  gold_rate:           number | null
  item_price:          number
  item_amount:         number
  item_status:         string
  inventory_org:       string | null
  supply_subinventory: string | null
  pay_term:            string | null
  requested_date:      string | null
}

interface LookupOption { lookup_code: string; lookup_name: string }
interface LovOpt { id: number; code: string; name: string; [key: string]: unknown }

// How a line's Price was arrived at — the customer's Metal price sheet row plus
// the item's BOM net weight. Held on the line only for display; the saved order
// keeps the resulting number, not the working.
interface PriceBreakdown {
  sku_code:      string
  itemtype:      string
  price_found:   boolean
  matched_sku?:  string
  variant_found: boolean
  has_bom:       boolean
  net_weight:    number
  rate_basis?:   'PER_GM' | 'PER_PC'
  rate_type?:    'AMOUNT' | 'PERCENTAGE'
  rate_value?:   number
  uom?:          string
  // The rate a percentage price was struck against — the line's own Gold Rate
  // cell when it holds one, otherwise the Daily Rate master's figure — plus the
  // sheet it came off. Sent on an Amount price too, which never multiplies by it.
  gold_rate?:    number | null
  // Set when the line is priced off a rate other than what the master says
  // today — typed here and now, or saved when the master read differently;
  // master_rate is then the master's own figure, for the breakdown to name.
  rate_overridden?: boolean
  master_rate?:  number | null
  rate_date?:    string | null
  rate_metal?:   string | null
  rate_purity?:  string | null
  rate_mode?:    string | null
  rate_source?:  string | null
  // Set when a percentage price has no Daily Rate to multiply against, so the
  // line comes back priceless rather than silently priced off a stale number.
  rate_missing?:       boolean
  pricing_metal_type?: string
  pricing_purity?:     string
  base_rate?:    number
  weight_factor?: number
  base_amount?:  number
  addons?: {
    rhodium_amt:          number
    tricolor_rhodium_amt: number
    lobster_amt:          number
    silky_rope_amt:       number
    hallmark_amt:         number
  }
  addons_total?: number
  unit_price:    number | null
}

// One Inventory Structure row for the order's Business Unit — the source of both
// the Inventory Org and the Subinventory cell on every order line.
interface InvStructRow {
  inv_org_code: string
  inv_org_name: string
  sub_inv_code: string
  sub_inv_name: string
}

// ── Form state (controlled local state per project pattern) ────
type HeaderForm = {
  buss_unit_id:          string
  customer_id:           string
  customer_code:         string
  customer_company_name: string
  bill_to_address:       string
  ship_to_address:       string
  customer_po:           string
  order_type:            string
  order_date:            string
  currency_code:         string
  sales_credit:          string
}

type LineForm = {
  item_name:           string
  customer_item:       string
  sales_group:         string
  item_qty:            string
  item_uom:            string
  // The metal rate this line is priced against — seeded from the Daily Rate
  // master when the Item is picked and editable from there. Empty means "use
  // the master's rate", which is what clearing the cell asks for.
  gold_rate:           string
  item_price:          string
  item_status:         string
  inventory_org:       string
  supply_subinventory: string
  pay_term:            string
  requested_date:      string
  // How item_price was derived, kept beside the line so the Price cell can show
  // its working. Null on a hand-typed price and on a saved order until the
  // breakdown is asked for — it is display-only and never persisted.
  price_info:          PriceBreakdown | null
}

// The plain-text cells of a line — the ones a generic string setter may touch.
// price_info is deliberately excluded so it cannot be overwritten with a string.
type LineTextKey = { [K in keyof LineForm]: LineForm[K] extends string ? K : never }[keyof LineForm]

const today = () => new Date().toISOString().slice(0, 10)

// YYYY-MM-DD `days` from now, read off the local clock. toISOString() would
// convert to UTC first, which lands on the previous day for any IST morning.
const dateFromToday = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Fallback lead time for a line whose item carries none of its own
const REQUESTED_DATE_LEAD_DAYS = 15
const defaultRequestedDate = () => dateFromToday(REQUESTED_DATE_LEAD_DAYS)

// The LEAD_TIME lookup codes are the day counts themselves ('7', '14', …), so
// the variant's Manufacturing → Lead Time doubles as the number of days. Any
// non-numeric code is treated as "no lead time on file".
const leadTimeDays = (leadTime: string | null | undefined): number | null => {
  const n = parseInt(String(leadTime ?? '').trim(), 10)
  return Number.isFinite(n) && n >= 0 ? n : null
}

// Which master feeds the Item picker, per SALES_ORDER_TYPE code.
// Every live order type maps to a source; an unmapped one (only legacy
// STANDARD rows now) falls back to a plain free-text cell.
const ORDER_TYPE_ITEM_SOURCE: Record<string, 'fg' | 'fin'> = {
  STK: 'fg',   // FG Stock Order
  CUS: 'fg',   // FG Customer Order
  FIO: 'fin',  // Finding Order
}

const blankHeader: HeaderForm = {
  buss_unit_id: '', customer_id: '', customer_code: '', customer_company_name: '',
  bill_to_address: '', ship_to_address: '', customer_po: '',
  order_type: '', order_date: '', currency_code: 'INR',
  sales_credit: '',
}

const blankLine: LineForm = {
  item_name: '', customer_item: '', sales_group: '',
  item_qty: '', item_uom: 'PCS', gold_rate: '', item_price: '',
  item_status: 'DRAFT',
  inventory_org: '', supply_subinventory: '',
  // Pay Term carries no literal default — it comes from the customer master.
  pay_term: '', requested_date: '',
  price_info: null,
}

// ── Constants ─────────────────────────────────────────────────
const PAGE_SIZES = [10, 25, 50, 100]
const Req = () => <span className="text-red-500 ml-0.5">*</span>

// Order Lines grid columns. `req` renders the same red asterisk the header
// fields use, and marks exactly the fields validate() enforces per line.
const LINE_COLS: { label: string; req?: boolean }[] = [
  { label: '#' },
  { label: 'Item',          req: true },
  { label: 'Customer Item' },
  { label: 'Sales Group' },
  { label: 'Qty',           req: true },
  { label: 'UOM' },
  { label: 'Gold Rate' },
  { label: 'Price' },
  { label: 'Amount' },
  { label: 'Inventory Org' },
  { label: 'Subinventory' },
  { label: 'Pay Term' },
  { label: 'Requested Date' },
  { label: 'Status' },
  { label: '' },
]

const CURRENCY_SYMBOL: Record<string, string> = { INR: '₹', USD: '$' }
const curSym = (code: string) => CURRENCY_SYMBOL[code] ?? `${code} `

const money = (v: number | string | null | undefined, code = 'INR') => {
  const n = Number(v ?? 0)
  return `${curSym(code)}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'danger' | 'info'> = {
  DRAFT: 'warning', PENDING_APPROVAL: 'info', APPROVED: 'success',
  REJECTED: 'danger', CANCELLED: 'danger',
}

// The status column stores the code; these are the words the screen shows.
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', PENDING_APPROVAL: 'Pending Approval', APPROVED: 'Approved',
  REJECTED: 'Rejected', CANCELLED: 'Cancelled',
}

// The list's status tabs. Every key but 'all' is a status code lowercased —
// the API uppercases it straight back before matching.
type StatusFilter = 'all' | 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled'

// Mirrors ORDER_EDITABLE on the API: the maker holds the order in these two
// states and nowhere else.
const EDITABLE_STATUSES: readonly string[] = ['DRAFT', 'REJECTED']

// ── Price breakdown labels ────────────────────────────────────
// Customer Price Master stores the rate shape as PER_GM/PER_PC and
// AMOUNT/PERCENTAGE; these are the words that master shows for them.
const RATE_BASIS_LABEL: Record<string, string> = { PER_GM: 'Per Weight', PER_PC: 'Per Pc' }
const RATE_TYPE_LABEL:  Record<string, string> = { AMOUNT: 'Amount', PERCENTAGE: 'Percentage' }

const ADDON_LABELS: [keyof NonNullable<PriceBreakdown['addons']>, string][] = [
  ['rhodium_amt',          'Rhodium'],
  ['tricolor_rhodium_amt', 'Tricolour Rhodium'],
  ['lobster_amt',          'Lobster'],
  ['silky_rope_amt',       'Silky Rope'],
  ['hallmark_amt',         'Hallmark'],
]

const wt  = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 4 })
const amt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// The arithmetic behind a line's unit price, spelled out with the values that
// actually went into it. Mirrors the four cases the server computes.
const priceFormula = (b: PriceBreakdown): string => {
  const perWeight = b.rate_basis === 'PER_GM'
  const head = b.rate_type === 'PERCENTAGE'
    ? `Gold Rate ${amt(b.gold_rate ?? 0)}/g × ${b.rate_value ?? 0}%`
    : `Rate ${amt(b.rate_value ?? 0)}`
  const factor = perWeight ? ` × ${wt(b.net_weight)} ${b.uom ?? 'GM'} (Net Wt)` : ' × 1 pc'
  return `(${head}${factor}) + Rhodium + Tricolour Rhodium + Lobster + Silky Rope + Hallmark`
}

// The same working with the actual numbers in it, short enough to sit under the
// order line. The itemised version stays in the info modal.
const priceFormulaInline = (b: PriceBreakdown, code: string): string => {
  if (b.unit_price === null) return ''
  const cur    = curSym(code)
  const head   = b.rate_type === 'PERCENTAGE'
    ? `${cur}${amt(b.gold_rate ?? 0)}/g × ${b.rate_value ?? 0}%`
    : `${cur}${amt(b.rate_value ?? 0)}`
  const factor = b.rate_basis === 'PER_GM' ? ` × ${wt(b.net_weight)} g` : ' × 1 pc'
  const addons = (b.addons_total ?? 0) > 0 ? ` + ${cur}${amt(b.addons_total ?? 0)} plating` : ''
  return `${head}${factor}${addons} = ${cur}${amt(b.unit_price)}`
}

// Everything wrong with how a line got priced, worst first. A SKU carrying no
// ACTIVE BOM is the one that matters most: net weight falls back to 0, which
// quietly strips the metal out of a per-weight price, so it is called out in
// red on the row rather than left inside a modal nobody opens.
const priceWarnings = (b: PriceBreakdown, source: 'fg' | 'fin' | null): string[] => {
  const bomName = source === 'fin' ? 'Finding BOM' : 'FG BOM'
  const master  = source === 'fin' ? 'Finding Master' : 'FG Master'
  const out: string[] = []

  if (!b.variant_found) {
    out.push(`${b.sku_code} is not in ${master} — check the item code`)
  } else if (!b.has_bom) {
    out.push(
      `${b.sku_code} has no ACTIVE BOM in ${bomName}` +
      (b.rate_basis === 'PER_GM'
        ? ' — net weight taken as 0, so this price covers the plating charges only'
        : ' — net weight taken as 0'),
    )
  }

  if (!b.price_found) {
    out.push(`${b.sku_code} is not on this customer's Customer Price Master sheet — enter the price by hand`)
  } else if (b.rate_missing) {
    out.push(
      `No Daily Rate on file for ${b.pricing_metal_type} ${b.pricing_purity} —` +
      ' type a Gold Rate on this line, or enter the price by hand',
    )
  }

  return out
}

const statusLabel = (s: string) => STATUS_LABEL[s] ?? (s.charAt(0) + s.slice(1).toLowerCase())

interface ColDef { key: string; label: string; sortKey?: string; visible: boolean; minW?: string }

const INITIAL_COLS: ColDef[] = [
  { key: 'order_no',              label: 'Order No',    sortKey: 'order_no',              visible: true,  minW: '120px' },
  { key: 'customer_company_name', label: 'Customer',    sortKey: 'customer_company_name', visible: true,  minW: '180px' },
  { key: 'buss_unit_id',          label: 'BU',          sortKey: 'buss_unit_id',          visible: true,  minW: '130px' },
  { key: 'order_date',            label: 'Order Date',  sortKey: 'order_date',            visible: true,  minW: '110px' },
  { key: 'order_type',            label: 'Type',        sortKey: 'order_type',            visible: true,  minW: '100px' },
  { key: 'customer_po',           label: 'Customer PO', sortKey: 'customer_po',           visible: true,  minW: '120px' },
  { key: 'currency_code',         label: 'Currency',    sortKey: 'currency_code',         visible: false, minW: '90px'  },
  { key: 'line_count',            label: 'Lines',                                          visible: true,  minW: '70px'  },
  { key: 'total_amount',          label: 'Total Amount', sortKey: 'total_amount',         visible: true,  minW: '130px' },
  { key: 'order_status',          label: 'Status',      sortKey: 'order_status',          visible: true,  minW: '100px' },
  { key: 'cancel_reason',         label: 'Cancel Reason',                                  visible: true,  minW: '160px' },
  { key: 'created_at',            label: 'Created',     sortKey: 'created_at',            visible: false, minW: '140px' },
]

// ─────────────────────────────────────────────────────────────────
// LovSearch — type-ahead picker (shared shape with Supplier Rate Contract)
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
  const [q,    setQ]    = useState(display)
  const [opts, setOpts] = useState<LovOpt[]>([])
  const [open, setOpen] = useState(false)
  useEffect(() => setQ(display), [display])
  const doSearch = async (val: string) => {
    setQ(val)
    const q2 = (val === '%') ? '' : val
    if (val.length < 1) { setOpts([]); setOpen(false); return }
    try { const r = await fetch(q2); setOpts(r); setOpen(true) } catch { /* */ }
  }
  const showClear   = !!onClear && !!q && !disabled
  const handleClear = () => { setQ(''); setOpts([]); setOpen(false); onClear!() }
  return (
    <div>
      <div className="relative">
        <input value={q} onChange={e => doSearch(e.target.value)}
          onFocus={() => { if (q.length >= 1 && opts.length) setOpen(true) }}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder={placeholder} disabled={disabled}
          className={`w-full text-sm pl-3 ${showClear ? 'pr-8' : 'pr-3'} py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] disabled:opacity-50`}
          style={{
            borderColor: error ? '#ef4444' : 'var(--border-color)',
            background: 'var(--bg-primary)', color: 'var(--text-primary)',
            boxShadow: error ? '0 0 0 1px #ef4444' : undefined,
          }} />
        {showClear && (
          <button
            type="button"
            title="Clear"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
        {open && opts.length > 0 && (
          <div className="absolute z-50 top-full left-0 w-full border shadow-lg rounded-lg max-h-52 overflow-y-auto text-sm"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)' }}>
            {opts.map(o => (
              <div key={o.id}
                className="px-3 py-2 cursor-pointer flex gap-2 items-center hover:bg-[var(--bg-secondary)]"
                onMouseDown={() => { onSelect(o.id, o.code, o.name, o); setQ(o.name); setOpen(false) }}>
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
        <p className="mt-1 text-xs text-red-500">Required — select a customer</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Order-line input styling (shared by the plain cells and the picker)
// ─────────────────────────────────────────────────────────────────
const lineInputCls = 'w-full text-xs px-2 py-1.5 border border-[var(--border-color)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-gold)] disabled:opacity-60'
const lineInputStyle: React.CSSProperties = { background: 'var(--bg-primary)', color: 'var(--text-primary)' }

// ─────────────────────────────────────────────────────────────────
// ItemSearch — SKU type-ahead for the Item cell
//
// The lines table scrolls horizontally, and an overflow-x container clips
// absolutely-positioned children vertically too, so the dropdown is rendered
// fixed and anchored to the input's measured rect instead.
// ─────────────────────────────────────────────────────────────────
interface ItemLovOpt {
  id:                     number
  code:                   string
  name:                   string
  karat_color?:           string | null
  weight_band?:           string | null
  group_sales?:           string | null
  lead_time?:             string | null
  customer_name?:         string | null
  customer_variant_code?: string | null
  customer_variant_name?: string | null
}

interface ItemSearchProps {
  value:    string
  disabled?: boolean
  fetch:    (q: string) => Promise<ItemLovOpt[]>
  onSelect: (opt: ItemLovOpt) => void
  onType:   (val: string) => void
}
function ItemSearch({ value, disabled, fetch, onSelect, onType }: ItemSearchProps) {
  const [q,    setQ]    = useState(value)
  const [opts, setOpts] = useState<ItemLovOpt[]>([])
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setQ(value), [value])

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

  const runFetch = async (term: string) => {
    try {
      const r = await fetch(term)
      setOpts(r); measure(); setOpen(true)
    } catch { /* keep typing usable if the lookup fails */ }
  }

  const doSearch = async (val: string) => {
    setQ(val); onType(val)
    // Search from the first character typed; '%' is the show-all convention
    // shared with the other pickers. An empty cell searches nothing.
    if (val.length < 1) { setOpts([]); setOpen(false); return }
    await runFetch(val === '%' ? '' : val)
  }

  // Returning to a cell that already has a term reopens its last result set;
  // an empty cell stays closed until something is typed.
  const handleFocus = () => {
    if (disabled || q.length < 1) return
    if (opts.length) { measure(); setOpen(true) }
  }

  // Clears only this cell — Customer Item and Sales Group are derived and are
  // overwritten anyway when the next SKU is picked.
  const handleClear = () => {
    setQ(''); onType(''); setOpts([]); setOpen(false)
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
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          disabled={disabled}
          placeholder="Type or % for all…"
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
              onMouseDown={() => { onSelect(o); setQ(o.code); setOpen(false) }}>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold" style={{ color: 'var(--accent-gold)' }}>{o.code}</span>
                {(o.karat_color || o.weight_band) && (
                  <span className="truncate" style={{ color: 'var(--text-muted)' }}>
                    {[o.karat_color, o.weight_band].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
              {(o.customer_variant_code || o.customer_variant_name) ? (
                <div className="mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                  {o.customer_variant_code && <span className="font-mono">{o.customer_variant_code}</span>}
                  {o.customer_variant_code && o.customer_variant_name && ' — '}
                  {o.customer_variant_name}
                  {o.customer_name && <span style={{ color: 'var(--text-muted)' }}> ({o.customer_name})</span>}
                </div>
              ) : (
                <div className="mt-0.5" style={{ color: 'var(--text-muted)' }}>No client variant on file</div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────
// Print document builders
// ─────────────────────────────────────────────────────────────────
interface PrintData {
  order_no:              string
  order_status:          string
  order_date:            string
  order_type:            string
  currency_code:         string
  bu_name:               string
  customer_code:         string
  customer_company_name: string
  bill_to_address:       string
  ship_to_address:       string
  customer_po:           string
  sales_credit:          string
  pay_term:              string
  total_qty:             number
  total_amount:          number
  lines: {
    line_no: number; item_name: string; customer_item: string; sales_group: string
    item_qty: number; item_uom: string; item_price: number; item_amount: number
    requested_date: string
  }[]
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')

// Self-contained HTML document — used for preview, browser print and Word export
function buildOrderHTML(d: PrintData): string {
  const sym = curSym(d.currency_code)
  const fmt = (n: number) => `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const rows = d.lines.map(l => `
    <tr>
      <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:center;">${l.line_no}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px;font-weight:600;">${esc(l.item_name)}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px;">${esc(l.customer_item)}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px;">${esc(l.sales_group)}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:right;">${l.item_qty}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:center;">${esc(l.item_uom)}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:right;">${fmt(l.item_price)}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:right;font-weight:600;">${fmt(l.item_amount)}</td>
      <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:center;">${l.requested_date ? formatDate(l.requested_date) : '—'}</td>
    </tr>`).join('')

  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;color:#111827;font-size:13px;line-height:1.45;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
      <tr>
        <td style="vertical-align:top;">
          <div style="font-size:22px;font-weight:700;letter-spacing:1px;color:#92700c;">SALES ORDER</div>
          <div style="font-size:15px;font-weight:600;margin-top:2px;">${esc(d.bu_name)}</div>
        </td>
        <td style="vertical-align:top;text-align:right;">
          <div style="font-size:16px;font-weight:700;">${esc(d.order_no)}</div>
          <div style="margin-top:2px;">Order Date: <b>${d.order_date ? formatDate(d.order_date) : '—'}</b></div>
          <div>Status: <b>${statusLabel(d.order_status)}</b></div>
        </td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
      <tr>
        <td style="width:50%;vertical-align:top;border:1px solid #d1d5db;padding:8px 10px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">Bill To</div>
          <div style="font-weight:600;">${esc(d.customer_company_name)} <span style="color:#6b7280;font-weight:400;">(${esc(d.customer_code)})</span></div>
          <div>${esc(d.bill_to_address) || '—'}</div>
        </td>
        <td style="width:50%;vertical-align:top;border:1px solid #d1d5db;padding:8px 10px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">Ship To</div>
          <div>${esc(d.ship_to_address) || '—'}</div>
        </td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:12px;">
      <tr>
        <td style="border:1px solid #d1d5db;padding:6px 10px;"><b>Customer PO:</b> ${esc(d.customer_po) || '—'}</td>
        <td style="border:1px solid #d1d5db;padding:6px 10px;"><b>Order Type:</b> ${esc(d.order_type)}</td>
        <td style="border:1px solid #d1d5db;padding:6px 10px;"><b>Currency:</b> ${esc(d.currency_code)}</td>
        <td style="border:1px solid #d1d5db;padding:6px 10px;"><b>Pay Term:</b> ${esc(d.pay_term) || '—'}</td>
      </tr>
      <tr>
        <td style="border:1px solid #d1d5db;padding:6px 10px;" colspan="4"><b>Sales Credit:</b> ${esc(d.sales_credit) || '—'}</td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="border:1px solid #d1d5db;padding:6px 8px;font-size:11px;text-transform:uppercase;">#</th>
          <th style="border:1px solid #d1d5db;padding:6px 8px;font-size:11px;text-transform:uppercase;">Item</th>
          <th style="border:1px solid #d1d5db;padding:6px 8px;font-size:11px;text-transform:uppercase;">Customer Item</th>
          <th style="border:1px solid #d1d5db;padding:6px 8px;font-size:11px;text-transform:uppercase;">Sales Group</th>
          <th style="border:1px solid #d1d5db;padding:6px 8px;font-size:11px;text-transform:uppercase;">Qty</th>
          <th style="border:1px solid #d1d5db;padding:6px 8px;font-size:11px;text-transform:uppercase;">UOM</th>
          <th style="border:1px solid #d1d5db;padding:6px 8px;font-size:11px;text-transform:uppercase;">Price</th>
          <th style="border:1px solid #d1d5db;padding:6px 8px;font-size:11px;text-transform:uppercase;">Amount</th>
          <th style="border:1px solid #d1d5db;padding:6px 8px;font-size:11px;text-transform:uppercase;">Req. Date</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="9" style="border:1px solid #d1d5db;padding:14px;text-align:center;color:#6b7280;">No line items</td></tr>`}
      </tbody>
      <tfoot>
        <tr style="background:#f9fafb;">
          <td colspan="4" style="border:1px solid #d1d5db;padding:6px 8px;font-weight:700;text-align:right;">Total</td>
          <td style="border:1px solid #d1d5db;padding:6px 8px;font-weight:700;text-align:right;">${d.total_qty}</td>
          <td colspan="2" style="border:1px solid #d1d5db;padding:6px 8px;"></td>
          <td style="border:1px solid #d1d5db;padding:6px 8px;font-weight:700;text-align:right;">${fmt(d.total_amount)}</td>
          <td style="border:1px solid #d1d5db;padding:6px 8px;"></td>
        </tr>
      </tfoot>
    </table>

    <div style="margin-top:36px;display:flex;justify-content:space-between;font-size:12px;">
      <div style="border-top:1px solid #9ca3af;padding-top:4px;width:200px;text-align:center;">Prepared By</div>
      <div style="border-top:1px solid #9ca3af;padding-top:4px;width:200px;text-align:center;">Authorized Signatory</div>
    </div>
  </div>`
}

// Plain-text summary — used for mail body and WhatsApp message
function buildOrderText(d: PrintData): string {
  const L: string[] = []
  L.push(`SALES ORDER ${d.order_no}`)
  L.push(`Business Unit: ${d.bu_name}`)
  L.push(`Customer: ${d.customer_company_name} (${d.customer_code})`)
  L.push(`Order Date: ${d.order_date ? formatDate(d.order_date) : '-'}   Status: ${statusLabel(d.order_status)}`)
  if (d.customer_po) L.push(`Customer PO: ${d.customer_po}`)
  L.push(`Currency: ${d.currency_code}`)
  L.push('')
  L.push('Items:')
  d.lines.forEach(l => {
    L.push(`${l.line_no}. ${l.item_name}${l.customer_item ? ` [${l.customer_item}]` : ''} — ${l.item_qty} ${l.item_uom} × ${l.item_price.toFixed(2)} = ${l.item_amount.toFixed(2)}`)
  })
  L.push('')
  L.push(`Total Qty: ${d.total_qty}`)
  L.push(`Total Amount: ${d.currency_code} ${d.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
  return L.join('\n')
}

// RTF export — no external deps; non-ASCII escaped as \uN
function rtfEscape(s: string): string {
  let out = ''
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0
    if (ch === '\\' || ch === '{' || ch === '}') out += '\\' + ch
    else if (ch === '\n') out += '\\line '
    else if (code > 127) out += `\\u${code > 32767 ? code - 65536 : code}?`
    else out += ch
  }
  return out
}

function buildOrderRTF(d: PrintData): string {
  const r = rtfEscape
  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  // 9 columns, twips
  const cellx = [600, 2000, 3800, 5600, 6300, 6900, 8100, 9400, 10400]
  const rowDef = '\\trowd\\trgaph80' + cellx.map(x => `\\cellx${x}`).join('')
  const row = (cells: string[], bold = false) =>
    `${rowDef}${cells.map(c => `\\intbl ${bold ? '\\b ' : ''}${c}${bold ? '\\b0' : ''}\\cell`).join('')}\\row\n`

  let body = ''
  body += `{\\b\\fs36 SALES ORDER}\\par {\\b\\fs24 ${r(d.bu_name)}}\\par\\par `
  body += `{\\b Order No:} ${r(d.order_no)}\\tab {\\b Date:} ${d.order_date ? r(formatDate(d.order_date)) : '-'}\\tab {\\b Status:} ${r(statusLabel(d.order_status))}\\par `
  body += `{\\b Customer:} ${r(d.customer_company_name)} (${r(d.customer_code)})\\par `
  if (d.customer_po) body += `{\\b Customer PO:} ${r(d.customer_po)}\\par `
  body += `{\\b Order Type:} ${r(d.order_type)}\\tab {\\b Currency:} ${r(d.currency_code)}\\tab {\\b Pay Term:} ${r(d.pay_term || '-')}\\par `
  if (d.sales_credit) body += `{\\b Sales Credit:} ${r(d.sales_credit)}\\par `
  body += `\\par {\\b Bill To:}\\par ${r(d.bill_to_address || '-')}\\par\\par {\\b Ship To:}\\par ${r(d.ship_to_address || '-')}\\par\\par `

  body += row(['#', 'Item', 'Customer Item', 'Sales Group', 'Qty', 'UOM', 'Price', 'Amount', 'Req. Date'], true)
  d.lines.forEach(l => {
    body += row([
      String(l.line_no), r(l.item_name), r(l.customer_item), r(l.sales_group),
      String(l.item_qty), r(l.item_uom), fmt(l.item_price), fmt(l.item_amount),
      l.requested_date ? r(formatDate(l.requested_date)) : '-',
    ])
  })
  body += row(['', '', '', 'Total', String(d.total_qty), '', '', fmt(d.total_amount), ''], true)

  return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Calibri;}}\\f0\\fs20\n${body}}`
}

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Component ─────────────────────────────────────────────────
const SalesOrderPage: React.FC = () => {
  // ── LOV state ───────────────────────────────────────────────
  const [buOpts,        setBuOpts]        = useState<LookupOption[]>([])
  const [orderTypeOpts, setOrderTypeOpts] = useState<LookupOption[]>([])
  const [currencyOpts,  setCurrencyOpts]  = useState<LookupOption[]>([])
  const [uomOpts,       setUomOpts]       = useState<LookupOption[]>([])
  const [grpSalesOpts,  setGrpSalesOpts]  = useState<LookupOption[]>([])
  const [payTermOpts,   setPayTermOpts]   = useState<LookupOption[]>([])
  const [invStruct,     setInvStruct]     = useState<InvStructRow[]>([])

  useEffect(() => {
    apiService.get('/common/lookup/INV_BU')
      .then(r => setBuOpts(r.data?.data ?? []))
      .catch(() => toast.error('Failed to load BU list'))
    apiService.get('/common/lookup/SALES_ORDER_TYPE')
      .then(r => setOrderTypeOpts(r.data?.data ?? []))
      .catch(() => toast.error('Failed to load order types'))
    apiService.get('/common/lookup/CURRENCY')
      .then(r => setCurrencyOpts(r.data?.data ?? []))
      .catch(() => toast.error('Failed to load currencies'))
    apiService.get('/common/lookup/UOM')
      .then(r => setUomOpts(r.data?.data ?? []))
      .catch(() => toast.error('Failed to load UOM list'))
    apiService.get('/common/lookup/GROUP_SALES')
      .then(r => setGrpSalesOpts(r.data?.data ?? []))
      .catch(() => toast.error('Failed to load sales groups'))
    // Same list Customer Master picks Payment Terms from, so a customer's term
    // always resolves to one of these options.
    apiService.get('/common/lookup/PAYMENT_TERM')
      .then(r => setPayTermOpts(r.data?.data ?? []))
      .catch(() => toast.error('Failed to load payment terms'))
  }, [])

  const buName = (code: string) => buOpts.find(o => o.lookup_code === code)?.lookup_name ?? code
  const orderTypeName = (code: string) => orderTypeOpts.find(o => o.lookup_code === code)?.lookup_name ?? code
  const salesGroupName = (code: string) =>
    grpSalesOpts.find(o => o.lookup_code === code)?.lookup_name ?? code
  const payTermName = (code: string) =>
    payTermOpts.find(o => o.lookup_code === code)?.lookup_name ?? code

  // ── Grid state ──────────────────────────────────────────────
  const [items,        setItems]        = useState<SalesOrderRow[]>([])
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

  // ── Toolbar state ────────────────────────────────────────────
  const [cols,          setCols]          = useState<ColDef[]>(INITIAL_COLS)
  const [showColPicker, setShowColPicker] = useState(false)
  const [showFilterRow, setShowFilterRow] = useState(false)
  const [showSorting,   setShowSorting]   = useState(true)
  const [colFilters,    setColFilters]    = useState<Record<string, string>>({})
  const [debouncedCF,   setDebouncedCF]   = useState<Record<string, string>>({})
  const colPickerRef                      = useRef<HTMLDivElement>(null)
  const searchTimer                       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cfTimer                           = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Permissions ──────────────────────────────────────────────
  const { canView, canCreate, canUpdate, canDelete, canPrint } = usePermission('ORD_SALES')

  // ── View state — full-screen form instead of a popup (same as FG BOM) ──
  const [view, setView] = useState<'list' | 'form'>('list')

  // ── Form / confirm state ─────────────────────────────────────
  const [formMode,    setFormMode]    = useState<'add' | 'edit' | 'view'>('add')
  const [editItem,    setEditItem]    = useState<SalesOrderRow | null>(null)
  const [cancelItem,  setCancelItem]  = useState<SalesOrderRow | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [submitAsk,   setSubmitAsk]   = useState(false)
  const [backAsk,     setBackAsk]     = useState(false)
  const isNew      = formMode === 'add'
  const isViewMode = formMode === 'view'

  // The selected customer's Payment Terms, kept aside so every line added
  // afterwards can default to it. Seeded on customer pick and when an existing
  // order is opened.
  const [custPayTerm, setCustPayTerm] = useState('')

  // A fresh line carries the default 15-day requested date and the customer's
  // pay term; loaded lines keep whatever was saved.
  const newLine = (): LineForm => ({
    ...blankLine,
    pay_term:       custPayTerm,
    requested_date: defaultRequestedDate(),
  })

  // ── Form (controlled local state per project pattern) ────────
  // An order starts with no lines at all — the grid only appears once one is
  // added, which cannot happen before Order Details is complete.
  const [header,     setHeader]     = useState<HeaderForm>(blankHeader)
  const [lines,      setLines]      = useState<LineForm[]>([])
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof HeaderForm, string>>>({})
  // Leaving the form is a full page change now, so warn only when something
  // was actually edited — every mutating helper below flips this.
  const [dirty,      setDirty]      = useState(false)

  const setField = (key: keyof HeaderForm, val: string) => {
    setHeader(f => ({ ...f, [key]: val }))
    setDirty(true)
    if (formErrors[key]) setFormErrors(e => ({ ...e, [key]: undefined }))
  }

  const setLineField = (idx: number, key: LineTextKey, val: string) => {
    setLines(ls => ls.map((l, i) => i === idx ? { ...l, [key]: val } : l))
    setDirty(true)
  }
  // Order Details drives what a line can even contain — Order Type decides which
  // master the Item picker searches, and Business Unit decides the Inventory Org
  // and Subinventory lists — so the header is validated before a line is added
  // rather than leaving the user to fill a row that has nothing to pick from.
  const validateHeader = (): boolean => {
    const errs: Partial<Record<keyof HeaderForm, string>> = {}
    if (!header.buss_unit_id) errs.buss_unit_id = 'Business Unit is required'
    if (!header.customer_id)  errs.customer_id  = 'Customer is required'
    if (!header.order_date)   errs.order_date   = 'Order Date is required'
    if (!header.order_type)   errs.order_type   = 'Order Type is required'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const addLine = () => {
    if (!validateHeader()) {
      toast.error('Complete the Order Details above before adding a line')
      return
    }
    setLines(ls => [...ls, newLine()])
    setDirty(true)
  }
  // Removing a row renumbers everything after it, so any Gold Rate repricing
  // still waiting on a timer is dropped rather than left to land on whichever
  // line has since taken that index.
  const removeLine = (idx: number) => {
    clearRateTimers()
    setLines(ls => ls.filter((_, i) => i !== idx))
    setDirty(true)
  }

  // ── Item picker ───────────────────────────────────────────────
  // Source master follows the header's Order Type. Null until a type is picked,
  // or on a legacy order whose type is no longer in the lookup.
  const itemSource = ORDER_TYPE_ITEM_SOURCE[header.order_type] ?? null

  const searchOrderItems = async (q: string): Promise<ItemLovOpt[]> => {
    if (!itemSource) return []
    const r = await apiService.get(`/sales-orders/lov/${itemSource}`, {
      params: { search: q, customer: header.customer_company_name || '' },
    })
    return r.data?.data ?? []
  }

  // Customer Item shows the client variant's code and name in one cell, in the
  // same "code — name" shape the picker's dropdown uses. Either half can be
  // missing on a client row, so the separator only appears when both are there.
  const customerItemText = (opt: ItemLovOpt) =>
    [opt.customer_variant_code, opt.customer_variant_name]
      .map(v => (v ?? '').trim()).filter(Boolean).join(' — ')

  // ── Line pricing ──────────────────────────────────────────────
  // The unit price of a line comes from the customer's Metal price sheet, the
  // item's ACTIVE BOM net weight and the line's Gold Rate, worked out
  // server-side so the four rate basis/type combinations live in one place.
  // Called on item pick (writing the price into the cell), when the Gold Rate
  // cell is edited (repricing off the new rate), from the Price cell's info
  // button (breakdown only, so a hand-edited price is never overwritten behind
  // the user's back), and once per line when a saved order is opened (quiet, so
  // a whole grid's worth of parallel calls does not thrash the busy marker).
  //
  // `goldRate` is the line's own rate: passing a figure prices against it,
  // passing an empty string or nothing prices against the Daily Rate master and
  // writes that rate back into the cell.
  const [pricingIdx, setPricingIdx] = useState<number | null>(null)

  const priceLine = async (
    idx: number,
    sku: string,
    { applyPrice, quiet, goldRate, notify }: {
      applyPrice: boolean; quiet?: boolean; goldRate?: string; notify?: boolean
    },
  ): Promise<PriceBreakdown | null> => {
    if (!itemSource || !sku.trim() || !header.customer_id) return null
    const rate    = String(goldRate ?? '').trim()
    // Repeated repricing off an edited rate would otherwise re-announce the
    // same warning after every keystroke.
    const tell    = notify ?? applyPrice
    if (!quiet) setPricingIdx(idx)
    try {
      const r = await apiService.get('/sales-orders/item-price', {
        params: {
          source: itemSource, sku_code: sku.trim(), customer_id: header.customer_id,
          ...(rate ? { gold_rate: rate } : {}),
        },
      })
      const info: PriceBreakdown | undefined = r.data?.data
      if (!info) return null

      // The line may have been removed or re-pointed at another SKU while the
      // request was in flight — only write back if it is still the same item.
      setLines(ls => ls.map((l, i) => {
        if (i !== idx || l.item_name.trim() !== sku.trim()) return l
        return {
          ...l,
          price_info: info,
          // The Gold Rate cell only follows the master while it is empty —
          // a rate typed on the line is what was just priced against anyway,
          // and rewriting it would fight the user's own digits.
          ...(applyPrice && !rate && info.gold_rate != null ? { gold_rate: String(info.gold_rate) } : {}),
          ...(applyPrice && info.unit_price !== null ? { item_price: String(info.unit_price) } : {}),
        }
      }))
      if (tell) {
        if (!info.price_found)
          toast(`${sku} is not on this customer's price sheet — enter the price by hand`, { icon: '⚠️' })
        else if (info.rate_missing)
          toast(`No Daily Rate on file for ${info.pricing_metal_type} ${info.pricing_purity} — type a Gold Rate on the line, or enter the price by hand`, { icon: '⚠️' })
        else if (!info.has_bom && info.rate_basis === 'PER_GM')
          toast(`${sku} has no active BOM — priced at net weight 0`, { icon: '⚠️' })
      }
      return info
    } catch {
      if (tell) toast.error('Failed to fetch price from Customer Price Master')
      return null
    } finally {
      if (!quiet) setPricingIdx(null)
    }
  }

  // ── Gold Rate ─────────────────────────────────────────────────
  // A rate is typed digit by digit, so the repricing call waits for the typing
  // to stop rather than firing on every keystroke. One timer per line, keyed by
  // row index, cleared on unmount so a pending call cannot land afterwards.
  const rateTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const clearRateTimers = () => {
    Object.values(rateTimers.current).forEach(t => clearTimeout(t))
    rateTimers.current = {}
  }
  useEffect(() => clearRateTimers, []) // eslint-disable-line

  const setLineGoldRate = (idx: number, val: string) => {
    setLineField(idx, 'gold_rate', val)
    const sku = lines[idx]?.item_name.trim()
    if (!sku) return
    clearTimeout(rateTimers.current[idx])
    // An emptied cell reprices against the Daily Rate master and gets that
    // rate written back, which is how the cell is reset.
    rateTimers.current[idx] = setTimeout(() => {
      void priceLine(idx, sku, { applyPrice: true, goldRate: val, notify: false })
    }, 500)
  }

  // A saved order stores the resulting price, not how it was reached. Opening
  // one re-derives each line's breakdown in the background so the notes under
  // the grid are already there — a line whose item lost its BOM since the order
  // was raised should say so on sight, not only if someone opens the modal.
  // applyPrice stays false throughout: nothing on a saved order is repriced.
  useEffect(() => {
    if (view !== 'form' || !itemSource || !header.customer_id) return
    lines.forEach((l, idx) => {
      if (l.price_info || !l.item_name.trim()) return
      // Priced against the rate the line was saved with, so the working under
      // the row explains the saved price rather than today's rate.
      void priceLine(idx, l.item_name, { applyPrice: false, quiet: true, goldRate: l.gold_rate })
    })
    // Deliberately not keyed on `lines` — this is a one-shot pass when an order
    // is opened, and re-running it on every keystroke would be a request storm.
    // Newly typed lines are priced by handleItemSelect instead.
  }, [view, itemSource, header.customer_id]) // eslint-disable-line

  // Picking a SKU fills Customer Item from that variant's client variant row
  // (the one matching this order's customer when there is one) and Sales Group
  // from the variant itself. Both cells are read-only — they only ever restate
  // what the picked item already says.
  //
  // Requested Date is re-dated from the variant's Manufacturing → Lead Time
  // (today + that many days). A variant with no lead time on file leaves the
  // date alone, so the 15-day default — or whatever the user set — survives.
  //
  // Price is then fetched from the customer's price sheet; see priceLine().
  const handleItemSelect = (idx: number, opt: ItemLovOpt) => {
    const customerItem = customerItemText(opt)
    const days         = leadTimeDays(opt.lead_time)
    // A rate already typed on this line belongs to the order, not to the item
    // that was just swapped in, so the new SKU is priced against it too.
    const goldRate     = lines[idx]?.gold_rate ?? ''
    setLines(ls => ls.map((l, i) => i === idx ? {
      ...l,
      item_name:      opt.code,
      customer_item:  customerItem,
      sales_group:    opt.group_sales ?? '',
      requested_date: days === null ? l.requested_date : dateFromToday(days),
      price_info:     null,
    } : l))
    setDirty(true)
    if (!customerItem)
      toast(`${opt.code} has no client variant on file — Customer Item left blank`, { icon: 'ℹ️' })
    void priceLine(idx, opt.code, { applyPrice: true, goldRate })
  }

  // Typing in the Item cell means the line is no longer the SKU that was picked,
  // so the two derived cells cannot stand — and being read-only, they could not
  // be corrected by hand. Picking from the dropdown refills them. The price
  // breakdown goes with them: it described the SKU that was replaced.
  const setLineItem = (idx: number, val: string) => {
    setLines(ls => ls.map((l, i) => i === idx
      ? { ...l, item_name: val, customer_item: '', sales_group: '', price_info: null }
      : l))
    setDirty(true)
  }

  // ── Inventory Org / Subinventory ──────────────────────────────
  // Both cells are filled from the Inventory Structure rows of the header's
  // Business Unit, so the list is fetched once per BU rather than per line.
  useEffect(() => {
    if (!header.buss_unit_id) { setInvStruct([]); return }
    let cancelled = false
    apiService.get(`/sales-orders/inventory-structure/${encodeURIComponent(header.buss_unit_id)}`)
      .then(r => { if (!cancelled) setInvStruct(r.data?.data ?? []) })
      .catch(() => { if (!cancelled) { setInvStruct([]); toast.error('Failed to load inventory structure') } })
    return () => { cancelled = true }
  }, [header.buss_unit_id])

  // Distinct Inventory Orgs of that BU, in the order the API returned them.
  const invOrgOpts = useMemo(() => {
    const seen = new Map<string, string>()
    invStruct.forEach(r => { if (!seen.has(r.inv_org_code)) seen.set(r.inv_org_code, r.inv_org_name) })
    return [...seen].map(([code, name]) => ({ code, name }))
  }, [invStruct])

  // Subinventories belong to one (BU, Inventory Org) pair, so a line that has
  // picked an org only offers that org's rows; without one, the whole BU shows.
  const subInvOptsFor = (orgCode: string) =>
    invStruct
      .filter(r => !orgCode || r.inv_org_code === orgCode)
      .map(r => ({ code: r.sub_inv_code, name: r.sub_inv_name }))

  const invOrgName = (code: string) => invOrgOpts.find(o => o.code === code)?.name ?? code
  const subInvName = (code: string) => invStruct.find(r => r.sub_inv_code === code)?.sub_inv_name ?? code

  // Changing BU changes which Inventory Structure rows exist, so anything picked
  // under the old BU is no longer valid on these lines.
  const setBusinessUnit = (val: string) => {
    setField('buss_unit_id', val)
    setLines(ls => ls.map(l => ({ ...l, inventory_org: '', supply_subinventory: '' })))
  }

  // Picking an Inventory Org invalidates a Subinventory chosen under another one.
  const setLineInvOrg = (idx: number, val: string) => {
    setLines(ls => ls.map((l, i) => i === idx
      ? { ...l, inventory_org: val, supply_subinventory: subInvOptsFor(val).some(o => o.code === l.supply_subinventory) ? l.supply_subinventory : '' }
      : l))
    setDirty(true)
  }

  // A row the user has actually started filling in. Blank spare rows are ignored
  // by both validation and the saved payload, so the test lives in one place.
  const isRealLine = (l: LineForm) =>
    !!(l.item_name.trim() || l.customer_item.trim() || l.item_qty || l.item_price)

  const lineAmount = (l: LineForm) => {
    const qty   = parseInt(l.item_qty, 10) || 0
    const price = Number(l.item_price) || 0
    return Math.round(qty * price * 100) / 100
  }
  const formTotals = useMemo(() => ({
    qty:    lines.reduce((s, l) => s + (parseInt(l.item_qty, 10) || 0), 0),
    amount: Math.round(lines.reduce((s, l) => s + lineAmount(l), 0) * 100) / 100,
  }), [lines])

  const validate = (): boolean => {
    if (!validateHeader()) return false

    // Line rules apply to Save Draft as well as Submit: an order with no usable
    // line, or a line missing its item or quantity, is not worth persisting
    // either way. Untouched spare rows are ignored, exactly as buildPayload
    // drops them.
    if (lines.filter(isRealLine).length === 0) {
      toast.error('Add at least one order line')
      return false
    }
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      if (!isRealLine(l)) continue
      // Customer Item is not checked — it is derived from the picked Item and
      // stays blank for a variant with no client row on file.
      if (!l.item_name.trim())                  { toast.error(`Line ${i + 1}: Item is required`); return false }
      if ((parseInt(l.item_qty, 10) || 0) <= 0) { toast.error(`Line ${i + 1}: Qty must be greater than 0`); return false }
    }
    return true
  }

  // ── Customer LOV (searches /customers) ────────────────────────
  const searchCustomer = async (q: string): Promise<LovOpt[]> => {
    const r = await apiService.get('/customers', { params: { page: 1, limit: 20, status: 'active', search: q } })
    const rows: { id: number; customer_code: string; customer_company_name: string }[] = r.data?.data ?? []
    return rows.map(c => ({ id: c.id, code: c.customer_code, name: c.customer_company_name }))
  }

  // Customer Master captures Bill To and Ship To in the same structured lines, so
  // one flattener covers both.
  const composeAddress = (a: Record<string, unknown>): string =>
    [a.adrs_1, a.adrs_2, a.adrs_3, a.adrs_city_name, a.adrs_state_code, a.adrs_pincode]
      .map(v => String(v ?? '').trim()).filter(Boolean).join(', ')

  // Everything the order takes from the customer lands here: both addresses, the
  // credit limit and the payment term. All of it overwrites what was on screen —
  // picking a different customer must not leave the previous one's details
  // behind — which is safe because opening a saved order never runs this.
  const handleCustomerSelect = async (id: number, code: string, name: string) => {
    setHeader(f => ({ ...f, customer_id: String(id), customer_code: code, customer_company_name: name }))
    setDirty(true)
    if (formErrors.customer_id) setFormErrors(e => ({ ...e, customer_id: undefined }))
    try {
      const r = await apiService.get(`/customers/${id}`)
      const d: Record<string, unknown> = r.data?.data ?? {}
      const addresses: Record<string, unknown>[] = (d.addresses as Record<string, unknown>[]) ?? []

      // Fall back to the first address on file for a customer whose rows predate
      // the Bill To / Ship To split.
      const bill = addresses.find(a => a.adrs_type === 'BILL_TO') ?? addresses[0]
      const ship = addresses.find(a => a.adrs_type === 'SHIP_TO')
      const billText = bill ? composeAddress(bill) : ''
      const shipText = ship ? composeAddress(ship) : billText

      const credit  = d.credit_limit_by_value
      const payTerm = String(d.payment_terms ?? '')

      setHeader(f => ({
        ...f,
        bill_to_address: billText,
        ship_to_address: shipText,
        sales_credit:    credit != null ? String(Number(credit)) : '',
      }))
      setCustPayTerm(payTerm)
      // Prices are struck against the customer's own price sheet, so every
      // breakdown on screen describes the previous customer. The prices
      // themselves are left alone — they may have been typed by hand — but the
      // stale working is dropped, and the info button re-fetches on demand.
      setLines(ls => ls.map(l => ({ ...l, pay_term: payTerm, price_info: null })))
    } catch { /* best-effort — the fields stay editable either way */ }
  }

  // Clears the customer so a different one can be picked. Addresses are left
  // alone — they may have been edited by hand after the auto-fill.
  const handleCustomerClear = () => {
    setHeader(f => ({ ...f, customer_id: '', customer_code: '', customer_company_name: '' }))
    setDirty(true)
  }

  // ── Data loaders ─────────────────────────────────────────────
  const loadStats = async () => {
    try {
      const res = await apiService.get('/sales-orders/stats')
      setStats(res.data?.data ?? { draft: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 })
    } catch { /* silent */ }
  }

  const loadItems = async () => {
    if (isFirstLoad.current) setLoading(true)
    else setFetching(true)
    try {
      const activeCF = Object.fromEntries(Object.entries(debouncedCF).filter(([, v]) => v.trim()))
      const res = await apiService.get('/sales-orders', {
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
      toast.error(msg || 'Failed to load sales orders')
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node))
        setShowColPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Sort / page size / columns ────────────────────────────────
  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
    setPage(1)
  }
  const handlePageSize = (size: number) => { setPageSize(size); setPage(1) }
  const toggleCol = (key: string) => setCols(cs => cs.map(c => c.key === key ? { ...c, visible: !c.visible } : c))
  const gridCols    = statusFilter === 'cancelled' ? cols : cols.filter(c => c.key !== 'cancel_reason')
  const visibleCols = gridCols.filter(c => c.visible)

  // ── Cell renderer ─────────────────────────────────────────────
  const renderCell = (col: ColDef, row: SalesOrderRow) => {
    switch (col.key) {
      case 'order_no':
        return <span className="font-mono text-sm font-semibold" style={{ color: 'var(--accent-gold)' }}>{row.order_no}</span>
      case 'customer_company_name':
        return (
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.customer_company_name}</p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{row.customer_code}</p>
          </div>
        )
      case 'buss_unit_id':
        return <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{buName(row.buss_unit_id)}</span>
      case 'order_date':
        return <span className="text-sm">{formatDate(String(row.order_date))}</span>
      case 'order_type':
        return <Badge label={orderTypeName(row.order_type)} variant="secondary" />
      case 'customer_po':
        return row.customer_po ? <span className="text-sm font-mono">{row.customer_po}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>
      case 'currency_code':
        return <span className="text-sm">{row.currency_code}</span>
      case 'line_count':
        return <span className="text-sm font-mono">{row.line_count}</span>
      case 'total_amount':
        return <span className="text-sm font-mono font-semibold">{money(row.total_amount, row.currency_code)}</span>
      case 'order_status':
        return <Badge label={statusLabel(row.order_status)} variant={STATUS_BADGE[row.order_status]} />
      case 'cancel_reason':
        return row.cancel_reason ? <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.cancel_reason}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>
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
    setHeader({ ...blankHeader, order_date: today() })
    setLines([])
    setCustPayTerm('')
    setFormErrors({})
    setDirty(false)
    setView('form')
  }

  // After a workflow action the order's status has moved on, so the badge and
  // the form's editability have to catch up without reloading the whole screen.
  // An order that has left the maker's hands drops straight into read-only.
  const refreshEditItem = async () => {
    if (!editItem) return
    try {
      const res = await apiService.get(`/sales-orders/${editItem.id}`)
      const status = res.data?.data?.order_status as SalesOrderRow['order_status'] | undefined
      if (!status) return
      setEditItem(prev => prev && ({ ...prev, order_status: status }))
      if (!EDITABLE_STATUSES.includes(status)) setFormMode('view')
    } catch { /* the panel already reported the action's own outcome */ }
  }

  const loadOrderIntoForm = async (row: SalesOrderRow, mode: 'edit' | 'view') => {
    try {
      const res = await apiService.get(`/sales-orders/${row.id}`)
      const d = res.data?.data
      if (!d) { toast.error('Failed to load sales order'); return }
      setFormMode(mode)
      setEditItem(row)
      setHeader({
        buss_unit_id:          d.buss_unit_id ?? '',
        customer_id:           String(d.customer_id ?? ''),
        customer_code:         d.customer_code ?? '',
        customer_company_name: d.customer_company_name ?? '',
        bill_to_address:       d.bill_to_address ?? '',
        ship_to_address:       d.ship_to_address ?? '',
        customer_po:           d.customer_po ?? '',
        order_type:            d.order_type ?? '',
        order_date:            String(d.order_date ?? '').slice(0, 10),
        currency_code:         d.currency_code ?? 'INR',
        sales_credit:          d.sales_credit != null ? String(d.sales_credit) : '',
      })
      // So a line added to this draft still defaults to the customer's term
      setCustPayTerm(d.customer_payment_terms ?? '')
      const dl: SalesOrderLine[] = d.lines ?? []
      setLines(dl.length ? dl.map(l => ({
        item_name:           l.item_name ?? '',
        customer_item:       l.customer_item ?? '',
        sales_group:         l.sales_group ?? '',
        item_qty:            String(l.item_qty ?? ''),
        item_uom:            l.item_uom ?? 'PCS',
        // Blank on a line saved before the Gold Rate column existed, and on one
        // priced without a metal rate at all.
        gold_rate:           l.gold_rate != null ? String(Number(l.gold_rate)) : '',
        item_price:          String(l.item_price ?? ''),
        item_status:         l.item_status ?? 'DRAFT',
        inventory_org:       l.inventory_org ?? '',
        supply_subinventory: l.supply_subinventory ?? '',
        pay_term:            l.pay_term ?? '',
        requested_date:      l.requested_date ? String(l.requested_date).slice(0, 10) : '',
        // Only the resulting price is stored, not how it was reached — the
        // Price cell's info button re-derives the breakdown when asked.
        price_info:          null,
      })) : [])
      setFormErrors({})
      setDirty(false)
      setView('form')
    } catch {
      toast.error('Failed to load sales order')
    }
  }

  const backToList = () => {
    setView('list'); setBackAsk(false)
    setHeader(blankHeader); setLines([]); setCustPayTerm(''); setFormErrors({}); setDirty(false)
  }

  // Read-only view has nothing to lose — leave straight away
  const askBackToList = () => { if (isViewMode || !dirty) backToList(); else setBackAsk(true) }

  const buildPayload = (action: 'draft' | 'submit') => ({
    action,
    buss_unit_id:    header.buss_unit_id,
    customer_id:     Number(header.customer_id),
    bill_to_address: header.bill_to_address.trim() || null,
    ship_to_address: header.ship_to_address.trim() || null,
    customer_po:     header.customer_po.trim() || null,
    order_type:      header.order_type,
    order_date:      header.order_date,
    currency_code:   header.currency_code,
    sales_credit:    header.sales_credit !== '' ? Number(header.sales_credit) : 0,
    lines: lines
      .filter(isRealLine)
      .map(l => ({
        item_name:           l.item_name.trim() || null,
        customer_item:       l.customer_item.trim() || null,
        sales_group:         l.sales_group.trim() || null,
        item_qty:            parseInt(l.item_qty, 10) || 0,
        item_uom:            l.item_uom || null,
        // Kept with the line so a reopened order can still explain its price;
        // null when the line was never priced against a metal rate.
        gold_rate:           l.gold_rate.trim() !== '' ? Number(l.gold_rate) : null,
        item_price:          Number(l.item_price) || 0,
        inventory_org:       l.inventory_org.trim() || null,
        supply_subinventory: l.supply_subinventory.trim() || null,
        pay_term:            l.pay_term.trim() || null,
        requested_date:      l.requested_date || null,
      })),
  })

  const saveOrder = async (action: 'draft' | 'submit') => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = buildPayload(action)
      let res
      if (isNew) res = await apiService.post('/sales-orders', payload)
      else       res = await apiService.put(`/sales-orders/${editItem!.id}`, payload)
      toast.success(res.data?.message || 'Sales order saved')
      backToList()
      await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save sales order'
      toast.error(msg)
    } finally { setSaving(false); setSubmitAsk(false) }
  }

  const confirmCancel = async (reason?: string) => {
    if (!cancelItem) return
    try {
      const res = await apiService.delete(`/sales-orders/${cancelItem.id}`, reason ? { data: { reason } } : undefined)
      toast.success(res.data?.message || 'Sales order cancelled')
      setCancelItem(null)
      await Promise.all([loadItems(), loadStats()])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'
      toast.error(msg)
    }
  }

  // ── Print preview ─────────────────────────────────────────────
  const [printData,    setPrintData]    = useState<PrintData | null>(null)
  const [printExpOpen, setPrintExpOpen] = useState(false)
  const printExpRef                     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (printExpRef.current && !printExpRef.current.contains(e.target as Node))
        setPrintExpOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Build print data from the currently open form
  const printFromForm = () => {
    const realLines = lines.filter(l => l.item_name.trim() || l.customer_item.trim() || l.item_qty || l.item_price)
    setPrintData({
      order_no:              editItem?.order_no ?? '(Unsaved Draft)',
      order_status:          editItem ? (isViewMode ? editItem.order_status : 'DRAFT') : 'DRAFT',
      order_date:            header.order_date,
      order_type:            orderTypeName(header.order_type),
      currency_code:         header.currency_code,
      bu_name:               buName(header.buss_unit_id) || '—',
      customer_code:         header.customer_code,
      customer_company_name: header.customer_company_name || '—',
      bill_to_address:       header.bill_to_address,
      ship_to_address:       header.ship_to_address,
      customer_po:           header.customer_po,
      sales_credit:          header.sales_credit,
      pay_term:              payTermName(realLines[0]?.pay_term ?? ''),
      total_qty:             formTotals.qty,
      total_amount:          formTotals.amount,
      lines: realLines.map((l, i) => ({
        line_no:        i + 1,
        item_name:      l.item_name,
        customer_item:  l.customer_item,
        sales_group:    l.sales_group ? salesGroupName(l.sales_group) : '',
        item_qty:       parseInt(l.item_qty, 10) || 0,
        item_uom:       l.item_uom,
        item_price:     Number(l.item_price) || 0,
        item_amount:    lineAmount(l),
        requested_date: l.requested_date,
      })),
    })
  }

  // Build print data from a grid row (fetches full detail)
  const printFromRow = async (row: SalesOrderRow) => {
    try {
      const res = await apiService.get(`/sales-orders/${row.id}`)
      const d = res.data?.data
      if (!d) { toast.error('Failed to load sales order'); return }
      const dl: SalesOrderLine[] = d.lines ?? []
      setPrintData({
        order_no:              d.order_no ?? '',
        order_status:          d.order_status ?? 'DRAFT',
        order_date:            String(d.order_date ?? '').slice(0, 10),
        order_type:            orderTypeName(d.order_type ?? ''),
        currency_code:         d.currency_code ?? 'INR',
        bu_name:               buName(d.buss_unit_id ?? ''),
        customer_code:         d.customer_code ?? '',
        customer_company_name: d.customer_company_name ?? '',
        bill_to_address:       d.bill_to_address ?? '',
        ship_to_address:       d.ship_to_address ?? '',
        customer_po:           d.customer_po ?? '',
        sales_credit:          d.sales_credit != null ? String(d.sales_credit) : '',
        pay_term:              payTermName(dl[0]?.pay_term ?? ''),
        total_qty:             Number(d.total_qty ?? 0),
        total_amount:          Number(d.total_amount ?? 0),
        lines: dl.map((l, i) => ({
          line_no:        l.line_no ?? i + 1,
          item_name:      l.item_name ?? '',
          customer_item:  l.customer_item ?? '',
          sales_group:    l.sales_group ? salesGroupName(l.sales_group) : '',
          item_qty:       Number(l.item_qty ?? 0),
          item_uom:       l.item_uom ?? '',
          item_price:     Number(l.item_price ?? 0),
          item_amount:    Number(l.item_amount ?? 0),
          requested_date: l.requested_date ? String(l.requested_date).slice(0, 10) : '',
        })),
      })
    } catch {
      toast.error('Failed to load sales order')
    }
  }

  const doBrowserPrint = () => {
    if (!printData) return
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) { toast.error('Popup blocked — allow popups to print'); return }
    w.document.write(`<!doctype html><html><head><title>${printData.order_no} — Sales Order</title></head><body style="margin:24px;">${buildOrderHTML(printData)}</body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print() }, 300)
  }

  const doExportPDF = async () => {
    if (!printData) return
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const d = printData
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' })
    const fmt = (n: number) => `${d.currency_code} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text('SALES ORDER', 40, 44)
    doc.setFontSize(12)
    doc.text(d.bu_name, 40, 62)
    doc.setFontSize(11)
    doc.text(d.order_no, doc.internal.pageSize.getWidth() - 40, 44, { align: 'right' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text(`Order Date: ${d.order_date ? formatDate(d.order_date) : '-'}    Status: ${statusLabel(d.order_status)}`, doc.internal.pageSize.getWidth() - 40, 58, { align: 'right' })

    const info = [
      `Customer: ${d.customer_company_name} (${d.customer_code})`,
      `Customer PO: ${d.customer_po || '-'}    Order Type: ${d.order_type}    Currency: ${d.currency_code}    Pay Term: ${d.pay_term || '-'}`,
      `Sales Credit: ${d.sales_credit || '-'}`,
      `Bill To: ${d.bill_to_address || '-'}`,
      `Ship To: ${d.ship_to_address || '-'}`,
    ]
    let y = 82
    info.forEach(line => {
      const wrapped = doc.splitTextToSize(line, doc.internal.pageSize.getWidth() - 80)
      doc.text(wrapped, 40, y)
      y += wrapped.length * 12
    })

    autoTable(doc, {
      startY: y + 6,
      head: [['#', 'Item', 'Customer Item', 'Sales Group', 'Qty', 'UOM', 'Price', 'Amount', 'Req. Date']],
      body: d.lines.map(l => [
        l.line_no, l.item_name, l.customer_item, l.sales_group,
        l.item_qty, l.item_uom, fmt(l.item_price), fmt(l.item_amount),
        l.requested_date ? formatDate(l.requested_date) : '-',
      ]),
      foot: [['', '', '', 'Total', d.total_qty, '', '', fmt(d.total_amount), '']],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [146, 112, 12] },
      footStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: 'bold' },
    })

    doc.save(`${d.order_no.replace(/[^\w-]/g, '_')}_sales_order.pdf`)
    setPrintExpOpen(false)
  }

  const doExportWord = () => {
    if (!printData) return
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${printData.order_no}</title></head><body>${buildOrderHTML(printData)}</body></html>`
    downloadBlob(html, `${printData.order_no.replace(/[^\w-]/g, '_')}_sales_order.doc`, 'application/msword')
    setPrintExpOpen(false)
  }

  const doExportRTF = () => {
    if (!printData) return
    downloadBlob(buildOrderRTF(printData), `${printData.order_no.replace(/[^\w-]/g, '_')}_sales_order.rtf`, 'application/rtf')
    setPrintExpOpen(false)
  }

  const doMail = () => {
    if (!printData) return
    const subject = encodeURIComponent(`Sales Order ${printData.order_no} — ${printData.customer_company_name}`)
    const body    = encodeURIComponent(buildOrderText(printData))
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const doWhatsApp = () => {
    if (!printData) return
    const text = encodeURIComponent(buildOrderText(printData))
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  // ── Price breakdown ───────────────────────────────────────────
  // Opened from the info button on a line's Price cell. The breakdown is fetched
  // on demand when the line has none cached — which is the case for every line
  // of a saved order, since only the resulting price is persisted.
  const [priceInfoLine, setPriceInfoLine] = useState<{ idx: number; sku: string } | null>(null)

  const openPriceInfo = async (idx: number) => {
    const l = lines[idx]
    if (!l) return
    setPriceInfoLine({ idx, sku: l.item_name })
    if (!l.price_info) await priceLine(idx, l.item_name, { applyPrice: false, goldRate: l.gold_rate })
  }

  // ── Stat cards config ─────────────────────────────────────────
  const statCards: Array<{ key: StatusFilter; label: string; count: number; icon: React.ReactNode; iconBg: string }> = [
    { key: 'all',              label: 'All',              count: stats.draft + stats.pending + stats.approved + stats.rejected + stats.cancelled, icon: <ClockIcon className="w-3.5 h-3.5 text-blue-500" />,           iconBg: 'bg-blue-100'   },
    { key: 'draft',            label: 'Draft',            count: stats.draft,     icon: <PencilIcon className="w-3.5 h-3.5 text-amber-600" />,         iconBg: 'bg-amber-100'  },
    { key: 'pending_approval', label: 'Pending Approval', count: stats.pending,   icon: <ClockIcon className="w-3.5 h-3.5 text-blue-600" />,           iconBg: 'bg-blue-100'   },
    { key: 'approved',         label: 'Approved',         count: stats.approved,  icon: <CheckCircleIcon className="w-3.5 h-3.5 text-green-600" />,    iconBg: 'bg-green-100'  },
    { key: 'rejected',         label: 'Rejected',         count: stats.rejected,  icon: <XCircleIcon className="w-3.5 h-3.5 text-red-600" />,          iconBg: 'bg-red-100'    },
    { key: 'cancelled',        label: 'Cancelled',        count: stats.cancelled, icon: <NoSymbolIcon className="w-3.5 h-3.5 text-red-500" />,         iconBg: 'bg-red-100'    },
  ]

  // ── Print preview modal — reachable from both the list and the form ──
  const printModal = (
    <Modal
      isOpen={!!printData}
      onClose={() => setPrintData(null)}
      title={`Print Preview — ${printData?.order_no ?? ''}`}
      size="4xl"
      footer={
        <>
          <button onClick={() => setPrintData(null)} className="btn-secondary">Close</button>

          <div ref={printExpRef} className="relative">
            <button
              onClick={() => setPrintExpOpen(o => !o)}
              className="btn-secondary flex items-center gap-1.5"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export
              <ChevronDownIcon className="w-3.5 h-3.5" />
            </button>
            {printExpOpen && (
              <div className="absolute right-0 bottom-full mb-1 z-50 w-44 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg p-1.5">
                {([
                  ['PDF (.pdf)',   doExportPDF],
                  ['Word (.doc)',  doExportWord],
                  ['RTF (.rtf)',   doExportRTF],
                ] as const).map(([label, fn]) => (
                  <button
                    key={label}
                    onClick={fn}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] text-left"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    <span className="font-medium">{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={doMail} className="btn-secondary flex items-center gap-1.5">
            <EnvelopeIcon className="w-4 h-4" />
            Mail
          </button>
          <button onClick={doWhatsApp} className="btn-secondary flex items-center gap-1.5">
            <ChatBubbleLeftRightIcon className="w-4 h-4" />
            WhatsApp
          </button>
          <button onClick={doBrowserPrint} className="btn-primary flex items-center gap-1.5">
            <PrinterIcon className="w-4 h-4" />
            Print
          </button>
        </>
      }
    >
      {printData && (
        <div className="rounded-lg border border-[var(--border-color)] overflow-auto" style={{ background: '#ffffff' }}>
          <div
            className="p-6"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: buildOrderHTML(printData) }}
          />
        </div>
      )}
    </Modal>
  )

  // ── Price breakdown modal — how one line's unit price was reached ──
  const infoLine  = priceInfoLine ? lines[priceInfoLine.idx] : undefined
  const infoPrice = infoLine?.price_info ?? null
  const infoBusy  = !!priceInfoLine && !infoPrice && pricingIdx === priceInfoLine.idx

  const priceInfoModal = (
    <Modal
      isOpen={!!priceInfoLine}
      onClose={() => setPriceInfoLine(null)}
      title={`Price Breakdown — ${priceInfoLine?.sku || 'Line'}`}
      size="lg"
      footer={<button onClick={() => setPriceInfoLine(null)} className="btn-secondary">Close</button>}
    >
      {infoBusy ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>
          Reading the customer price sheet…
        </p>
      ) : !infoPrice ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>
          {itemSource
            ? 'No price could be read for this line — the price sheet lookup did not come back.'
            : 'Prices are only calculated for order types that draw items from the FG or Finding master.'}
        </p>
      ) : infoPrice.rate_missing ? (
        <div className="space-y-3 text-sm">
          <p style={{ color: 'var(--text-secondary)' }}>
            <span className="font-mono font-semibold">{infoPrice.sku_code}</span> is priced as a{' '}
            <b>percentage</b> of the metal rate, but the Daily Rate master carries no rate for{' '}
            <b>{infoPrice.pricing_metal_type} {infoPrice.pricing_purity}</b> on or before today — so the
            Price cell was left for you to fill in.
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Type a rate into the line&apos;s Gold Rate cell to price it here and now — or enter today&apos;s
            rate under Masters → Daily Rate, or change which metal Sales Order prices against on that
            page&apos;s Auto Update tab.
          </p>
          <div className="rounded-lg border border-[var(--border-color)] p-3 text-xs" style={{ background: 'var(--bg-secondary)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Customer price: </span>
            <span className="font-mono font-semibold">{infoPrice.rate_value}%</span>
            <span className="mx-2" style={{ color: 'var(--text-muted)' }}>·</span>
            <span style={{ color: 'var(--text-muted)' }}>BOM Net Weight: </span>
            <span className="font-mono font-semibold">{wt(infoPrice.net_weight)}</span>
          </div>
        </div>
      ) : !infoPrice.price_found ? (
        <div className="space-y-3 text-sm">
          <p style={{ color: 'var(--text-secondary)' }}>
            <span className="font-mono font-semibold">{infoPrice.sku_code}</span> is not priced on{' '}
            <b>{header.customer_company_name || 'this customer'}</b>&apos;s Customer Price Master sheet
            ({infoPrice.itemtype}), so the Price cell was left for you to fill in.
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Add a price line for this SKU — or an <span className="font-mono">ALL</span> catch-all row for
            the item type — under Masters → Customer Price Master → Metal.
          </p>
          <div className="rounded-lg border border-[var(--border-color)] p-3 text-xs" style={{ background: 'var(--bg-secondary)' }}>
            <span style={{ color: 'var(--text-muted)' }}>BOM Net Weight: </span>
            <span className="font-mono font-semibold">{wt(infoPrice.net_weight)}</span>
            {!infoPrice.has_bom && (
              <span className="ml-2 text-amber-600">
                — {infoPrice.variant_found ? 'no active BOM on this SKU' : 'SKU not found in the item master'}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* What the sheet says */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {([
              ['Rate Basis', RATE_BASIS_LABEL[infoPrice.rate_basis ?? ''] ?? infoPrice.rate_basis],
              ['Rate Type',  RATE_TYPE_LABEL[infoPrice.rate_type ?? ''] ?? infoPrice.rate_type],
              ['Rate',       infoPrice.rate_type === 'PERCENTAGE' ? `${infoPrice.rate_value}%` : amt(infoPrice.rate_value ?? 0)],
              ['UOM',        infoPrice.uom ?? '—'],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-[var(--border-color)] px-3 py-2" style={{ background: 'var(--bg-secondary)' }}>
                <div className="uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</div>
                <div className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Where the SKU-side numbers came from */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>
              Net Weight (BOM): <span className="font-mono font-semibold">{wt(infoPrice.net_weight)}</span>
              {!infoPrice.has_bom && (
                <span className="ml-1 text-amber-600">
                  — {infoPrice.variant_found ? 'no active BOM, taken as 0' : 'SKU not in item master, taken as 0'}
                </span>
              )}
            </span>
            {infoPrice.matched_sku === 'ALL' && (
              <span className="text-amber-600">Priced from the item type&apos;s ALL catch-all row</span>
            )}
          </div>

          <div className="rounded-lg border border-[var(--border-color)] px-3 py-2 text-xs font-mono" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            {priceFormula(infoPrice)}
          </div>

          {/* The arithmetic itself */}
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-[var(--border-color)]">
                <td className="py-2" style={{ color: 'var(--text-secondary)' }}>
                  {infoPrice.rate_type === 'PERCENTAGE'
                    ? `Gold Rate ${amt(infoPrice.gold_rate ?? 0)}/g × ${infoPrice.rate_value}%`
                    : `Rate ${amt(infoPrice.rate_value ?? 0)}`}
                  {infoPrice.rate_basis === 'PER_GM'
                    ? ` × ${wt(infoPrice.net_weight)} Net Wt`
                    : ' × 1 pc'}
                </td>
                <td className="py-2 text-right font-mono font-semibold">{amt(infoPrice.base_amount ?? 0)}</td>
              </tr>
              {ADDON_LABELS.map(([key, label]) => (
                <tr key={key} className="border-b border-[var(--border-color)]">
                  <td className="py-1.5 pl-4" style={{ color: 'var(--text-muted)' }}>+ {label}</td>
                  <td className="py-1.5 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {amt(infoPrice.addons?.[key] ?? 0)}
                  </td>
                </tr>
              ))}
              <tr className="border-b border-[var(--border-color)]">
                <td className="py-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Plating &amp; Finishing total</td>
                <td className="py-1.5 text-right font-mono font-semibold">{amt(infoPrice.addons_total ?? 0)}</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold" style={{ color: 'var(--text-primary)' }}>Unit Price</td>
                <td className="py-2.5 text-right font-mono font-bold" style={{ color: 'var(--accent-gold)' }}>
                  {money(infoPrice.unit_price ?? 0, header.currency_code)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Which rate the percentage was struck against — a price that moves
              day to day should say which day it belongs to, and a line priced
              off its own Gold Rate should say that it left the sheet behind. */}
          {infoPrice.rate_type === 'PERCENTAGE' && (infoPrice.rate_date || infoPrice.rate_overridden) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs rounded-lg border border-[var(--accent-gold)]/30 px-3 py-2"
              style={{ background: 'var(--accent-gold)/5', color: 'var(--text-secondary)' }}>
              {infoPrice.rate_overridden ? (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>Gold Rate:</span>
                  <span className="font-mono font-semibold">₹{amt(infoPrice.gold_rate ?? 0)}/g</span>
                  <span style={{ color: 'var(--text-muted)' }}>·</span>
                  <span>set on this line</span>
                  {infoPrice.master_rate != null && infoPrice.rate_date && (
                    <>
                      <span style={{ color: 'var(--text-muted)' }}>·</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Daily Rate {infoPrice.rate_metal} {infoPrice.rate_purity} ₹{amt(infoPrice.master_rate)}/g
                        {' '}on {formatDate(infoPrice.rate_date)}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>Daily Rate:</span>
                  <span className="font-semibold">
                    {infoPrice.rate_metal} {infoPrice.rate_purity}
                  </span>
                  <span className="font-mono font-semibold">₹{amt(infoPrice.gold_rate ?? 0)}/g</span>
                  <span style={{ color: 'var(--text-muted)' }}>·</span>
                  <span>{formatDate(infoPrice.rate_date!)}</span>
                  {infoPrice.rate_source && (
                    <>
                      <span style={{ color: 'var(--text-muted)' }}>·</span>
                      <span style={{ color: 'var(--text-muted)' }}>{infoPrice.rate_source}</span>
                    </>
                  )}
                </>
              )}
            </div>
          )}
          {!isViewMode && Number(infoLine?.item_price) !== infoPrice.unit_price && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span>
                The Price cell holds {amt(Number(infoLine?.item_price) || 0)}, which differs from the
                calculated {amt(infoPrice.unit_price ?? 0)}.
              </span>
              <button
                type="button"
                className="btn-secondary text-xs py-1 px-2 whitespace-nowrap"
                onClick={() => {
                  setLineField(priceInfoLine!.idx, 'item_price', String(infoPrice.unit_price ?? 0))
                  setPriceInfoLine(null)
                }}
              >
                Use calculated
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )

  // ─────────────────────────────────────────────────────────────────
  // FORM VIEW — full screen (same pattern as FG BOM master)
  // ─────────────────────────────────────────────────────────────────
  if (view === 'form') {
    return (
      <>
        <div className="space-y-5">

          {/* Breadcrumb + back */}
          <div className="flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <div className="flex items-center gap-2">
              <span>Order Management</span>
              <span>/</span>
              <button onClick={askBackToList} className="hover:text-[var(--accent-gold)] flex items-center gap-1">
                <ArrowLeftIcon className="w-3.5 h-3.5" /> Sales Order
              </button>
              <span>/</span>
              <span style={{ color: 'var(--accent-gold)' }}>{isNew ? 'New Order' : editItem?.order_no}</span>
            </div>
            <button onClick={askBackToList} className="btn-secondary text-xs py-1 px-3">Back to List</button>
          </div>

          {/* Title row */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {isNew
                ? 'New Sales Order'
                : `${isViewMode ? 'View' : 'Edit'} Sales Order — ${editItem?.order_no}`}
            </h1>
            {editItem && (
              <Badge label={statusLabel(editItem.order_status)} variant={STATUS_BADGE[editItem.order_status]} />
            )}
            {isViewMode && (
              <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]" style={{ color: 'var(--text-muted)' }}>
                <EyeIcon className="w-3.5 h-3.5" />
                Read-only view — no changes can be made.
                {editItem?.order_status === 'PENDING_APPROVAL' && ' Orders awaiting approval cannot be edited.'}
                {editItem?.order_status === 'APPROVED' && ' Approved orders cannot be edited.'}
              </span>
            )}
          </div>

          {/* ── Approval workflow ── */}
          {/* Only on a saved order: the panel acts on a record id, and a brand
              new order has nothing to submit yet. */}
          {editItem && (
            <WorkflowPanel
              recordType="SALES_ORDER"
              recordId={editItem.id}
              compact
              onActionComplete={async () => { await Promise.all([loadItems(), loadStats()]); await refreshEditItem() }}
            />
          )}

          {/* ── Order Details ── */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-bold" style={{ color: 'var(--accent-gold)' }}>Order Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Business Unit<Req />
                </label>
                <select
                  value={header.buss_unit_id}
                  onChange={e => setBusinessUnit(e.target.value)}
                  disabled={isViewMode}
                  className={`form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
                >
                  <option value="">Select Business Unit</option>
                  {buOpts.map(opt => (
                    <option key={opt.lookup_code} value={opt.lookup_code}>{opt.lookup_name}</option>
                  ))}
                </select>
                {formErrors.buss_unit_id && <p className="text-xs text-red-500 mt-1">{formErrors.buss_unit_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Customer<Req />
                </label>
                <LovSearch
                  display={header.customer_company_name}
                  placeholder="Search customer by code or name…"
                  fetch={searchCustomer}
                  onSelect={handleCustomerSelect}
                  onClear={handleCustomerClear}
                  disabled={isViewMode}
                  error={!!formErrors.customer_id}
                  hint="Type % to show all customers"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Order Date<Req />
                </label>
                <input
                  type="date"
                  value={header.order_date}
                  onChange={e => setField('order_date', e.target.value)}
                  readOnly={isViewMode}
                  className={`form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
                />
                {formErrors.order_date && <p className="text-xs text-red-500 mt-1">{formErrors.order_date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Order Type<Req />
                </label>
                <select
                  value={header.order_type}
                  onChange={e => setField('order_type', e.target.value)}
                  disabled={isViewMode}
                  className={`form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
                >
                  <option value="">Select Order Type</option>
                  {/* A saved order on a type that has since been removed from the
                      lookup still needs its own value present, or the select
                      would silently show blank and rewrite it on save. */}
                  {header.order_type && !orderTypeOpts.some(o => o.lookup_code === header.order_type) && (
                    <option value={header.order_type}>{header.order_type}</option>
                  )}
                  {orderTypeOpts.map(opt => (
                    <option key={opt.lookup_code} value={opt.lookup_code}>{opt.lookup_name}</option>
                  ))}
                </select>
                {formErrors.order_type && <p className="text-xs text-red-500 mt-1">{formErrors.order_type}</p>}
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Decides which master the Item picker searches.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Currency
                </label>
                <select
                  value={header.currency_code}
                  onChange={e => setField('currency_code', e.target.value)}
                  disabled={isViewMode}
                  className={`form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
                >
                  {currencyOpts.map(opt => (
                    <option key={opt.lookup_code} value={opt.lookup_code}>{opt.lookup_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Customer PO
                </label>
                <input
                  value={header.customer_po}
                  onChange={e => setField('customer_po', e.target.value)}
                  readOnly={isViewMode}
                  maxLength={100}
                  className={`form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
                  placeholder="Customer PO reference"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Sales Credit
                </label>
                <input
                  type="number" step="0.01" min="0"
                  value={header.sales_credit}
                  onChange={e => setField('sales_credit', e.target.value)}
                  readOnly={isViewMode}
                  className={`form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Bill To Address
                </label>
                <textarea
                  value={header.bill_to_address}
                  onChange={e => setField('bill_to_address', e.target.value)}
                  rows={3}
                  readOnly={isViewMode}
                  className={`form-input resize-none ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
                  placeholder="Billing address…"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Ship To Address
                  </label>
                  {!isViewMode && (
                    <button
                      type="button"
                      onClick={() => setField('ship_to_address', header.bill_to_address)}
                      className="text-xs text-[var(--accent-gold)] hover:underline"
                    >
                      Same as Bill To
                    </button>
                  )}
                </div>
                <textarea
                  value={header.ship_to_address}
                  onChange={e => setField('ship_to_address', e.target.value)}
                  rows={3}
                  readOnly={isViewMode}
                  className={`form-input resize-none ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`}
                  placeholder="Shipping address…"
                />
              </div>
            </div>
          </div>

          {/* ── Order Lines ── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold" style={{ color: 'var(--accent-gold)' }}>Order Lines</h3>
                {itemSource ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)]" style={{ color: 'var(--text-muted)' }}>
                    Item from {itemSource === 'fg' ? 'FG Master' : 'Finding Master'} variants
                  </span>
                ) : !isViewMode && (
                  <span className="text-xs px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700">
                    Select an Order Type to pick Items
                  </span>
                )}
              </div>
              {!isViewMode && (
                <button
                  type="button"
                  onClick={addLine}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  <PlusIcon className="w-3.5 h-3.5" /> Add Line
                </button>
              )}
            </div>

            {lines.length === 0 ? (
              <div
                className="rounded-lg border border-dashed py-8 text-center text-xs"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
              >
                {isViewMode
                  ? 'This order has no line items.'
                  : 'No order lines yet — fill in the Order Details above, then click "Add Line".'}
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
                      <React.Fragment key={idx}>
                      <tr className="border-t border-[var(--border-color)]">
                        <td className="px-2 py-1.5 text-center font-mono" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td className="px-1 py-1.5" style={{ minWidth: '140px' }}>
                          {itemSource && !isViewMode ? (
                            <ItemSearch
                              value={l.item_name}
                              fetch={searchOrderItems}
                              onSelect={opt => handleItemSelect(idx, opt)}
                              onType={val => setLineItem(idx, val)}
                            />
                          ) : (
                            <input value={l.item_name} onChange={e => setLineField(idx, 'item_name', e.target.value)}
                              disabled={isViewMode} maxLength={300} placeholder="Item"
                              className={lineInputCls} style={lineInputStyle} />
                          )}
                        </td>
                        {/* Customer Item and Sales Group restate the picked Item —
                            read-only so they cannot drift from the master. */}
                        <td className="px-1 py-1.5" style={{ minWidth: '140px' }}>
                          <input value={l.customer_item} readOnly tabIndex={-1}
                            placeholder="—" title={l.customer_item}
                            className={`${lineInputCls} cursor-default`}
                            style={{ ...lineInputStyle, background: 'var(--bg-tertiary)' }} />
                        </td>
                        <td className="px-1 py-1.5" style={{ minWidth: '140px' }}>
                          <input value={l.sales_group ? salesGroupName(l.sales_group) : ''} readOnly tabIndex={-1}
                            placeholder="—" title={l.sales_group ? salesGroupName(l.sales_group) : ''}
                            className={`${lineInputCls} cursor-default`}
                            style={{ ...lineInputStyle, background: 'var(--bg-tertiary)' }} />
                        </td>
                        <td className="px-1 py-1.5" style={{ minWidth: '70px' }}>
                          <input type="number" min="0" step="1" value={l.item_qty}
                            onChange={e => setLineField(idx, 'item_qty', e.target.value.replace(/[.,].*$/, ''))}
                            disabled={isViewMode} placeholder="0"
                            className={`${lineInputCls} text-right`} style={lineInputStyle} />
                        </td>
                        <td className="px-1 py-1.5" style={{ minWidth: '80px' }}>
                          <select value={l.item_uom} onChange={e => setLineField(idx, 'item_uom', e.target.value)}
                            disabled={isViewMode}
                            className={lineInputCls} style={lineInputStyle}>
                            {uomOpts.map(opt => (
                              <option key={opt.lookup_code} value={opt.lookup_code}>{opt.lookup_name}</option>
                            ))}
                          </select>
                        </td>
                        {/* Gold Rate — the metal rate this line is priced
                            against. Filled from the Daily Rate master when the
                            Item is picked, and editable: a line struck at a
                            negotiated rate reprices off that figure instead.
                            Clearing the cell puts the master's rate back. */}
                        <td className="px-1 py-1.5" style={{ minWidth: '110px' }}>
                          <input type="number" min="0" step="0.01" value={l.gold_rate}
                            onChange={e => setLineGoldRate(idx, e.target.value)}
                            disabled={isViewMode}
                            placeholder={l.price_info?.master_rate != null ? amt(l.price_info.master_rate) : '0.00'}
                            title={l.price_info?.rate_type === 'AMOUNT'
                              ? 'This item is priced as a fixed amount on the customer price sheet, so the Gold Rate does not affect its price'
                              : 'Rate per gram from the Daily Rate master — edit to reprice this line, or clear it to go back to the master rate'}
                            className={`${lineInputCls} text-right ${l.price_info?.rate_overridden ? 'font-semibold' : ''}`}
                            style={{
                              ...lineInputStyle,
                              ...(l.price_info?.rate_overridden ? { color: 'var(--accent-gold)' } : {}),
                            }} />
                        </td>
                        {/* Price is filled from the customer's price sheet when
                            the Item is picked; the info button shows the rate,
                            the BOM net weight and the plating & finishing
                            amounts that produced it. */}
                        <td className="px-1 py-1.5" style={{ minWidth: '120px' }}>
                          <div className="flex items-center gap-0.5">
                            <input type="number" min="0" step="0.01" value={l.item_price}
                              onChange={e => setLineField(idx, 'item_price', e.target.value)}
                              disabled={isViewMode} placeholder="0.00"
                              className={`${lineInputCls} text-right`} style={lineInputStyle} />
                            <button
                              type="button"
                              title={header.customer_id ? 'Price breakdown' : 'Select a customer first'}
                              onClick={() => openPriceInfo(idx)}
                              disabled={!l.item_name.trim() || !header.customer_id || pricingIdx === idx}
                              className="shrink-0 p-1 rounded hover:bg-[var(--bg-tertiary)] disabled:opacity-30 disabled:cursor-not-allowed"
                              style={{ color: 'var(--accent-gold)' }}
                            >
                              <InformationCircleIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono font-semibold whitespace-nowrap" style={{ minWidth: '90px', color: 'var(--text-primary)' }}>
                          {lineAmount(l).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        {/* Inventory Org / Subinventory come from the Inventory
                            Structure rows of the header's Business Unit. A value
                            saved under a BU that no longer lists it keeps its own
                            option so the cell cannot silently blank itself. */}
                        <td className="px-1 py-1.5" style={{ minWidth: '130px' }}>
                          <select value={l.inventory_org}
                            onChange={e => setLineInvOrg(idx, e.target.value)}
                            disabled={isViewMode}
                            className={lineInputCls} style={lineInputStyle}>
                            <option value="">Select…</option>
                            {l.inventory_org && !invOrgOpts.some(o => o.code === l.inventory_org) && (
                              <option value={l.inventory_org}>{l.inventory_org}</option>
                            )}
                            {invOrgOpts.map(o => (
                              <option key={o.code} value={o.code}>{o.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-1.5" style={{ minWidth: '130px' }}>
                          <select value={l.supply_subinventory}
                            onChange={e => setLineField(idx, 'supply_subinventory', e.target.value)}
                            disabled={isViewMode}
                            className={lineInputCls} style={lineInputStyle}>
                            <option value="">Select…</option>
                            {l.supply_subinventory && !subInvOptsFor(l.inventory_org).some(o => o.code === l.supply_subinventory) && (
                              <option value={l.supply_subinventory}>{subInvName(l.supply_subinventory)}</option>
                            )}
                            {subInvOptsFor(l.inventory_org).map(o => (
                              <option key={o.code} value={o.code}>{o.name}</option>
                            ))}
                          </select>
                        </td>
                        {/* Same PAYMENT_TERM list Customer Master uses, defaulted
                            from the customer. A legacy free-text term keeps its
                            own option rather than being silently re-saved. */}
                        <td className="px-1 py-1.5" style={{ minWidth: '120px' }}>
                          <select value={l.pay_term}
                            onChange={e => setLineField(idx, 'pay_term', e.target.value)}
                            disabled={isViewMode}
                            className={lineInputCls} style={lineInputStyle}>
                            <option value="">Select…</option>
                            {l.pay_term && !payTermOpts.some(o => o.lookup_code === l.pay_term) && (
                              <option value={l.pay_term}>{l.pay_term}</option>
                            )}
                            {payTermOpts.map(o => (
                              <option key={o.lookup_code} value={o.lookup_code}>{o.lookup_name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1 py-1.5" style={{ minWidth: '130px' }}>
                          <input type="date" value={l.requested_date}
                            onChange={e => setLineField(idx, 'requested_date', e.target.value)}
                            disabled={isViewMode}
                            className={lineInputCls} style={lineInputStyle} />
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <Badge label={statusLabel(l.item_status)} variant={STATUS_BADGE[l.item_status] ?? 'warning'} size="sm" />
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          {/* Removing the last line is allowed — the grid simply
                              goes back to its empty state. */}
                          {!isViewMode && (
                            <button
                              type="button"
                              onClick={() => removeLine(idx)}
                              className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-red-500"
                              title="Remove line"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* How this line's Price was reached, and anything wrong
                          with it. Sits under the row so the warnings are read
                          without a click and without squeezing the columns. */}
                      {(() => {
                        if (!itemSource || !l.item_name.trim()) return null

                        if (!l.price_info) {
                          return pricingIdx === idx ? (
                            <tr style={{ background: 'var(--bg-secondary)' }}>
                              <td />
                              <td colSpan={LINE_COLS.length - 1} className="px-2 pb-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                Reading the price sheet…
                              </td>
                            </tr>
                          ) : null
                        }

                        const warnings = priceWarnings(l.price_info, itemSource)
                        const formula  = priceFormulaInline(l.price_info, header.currency_code)
                        // A line priced off a rate the master no longer carries
                        // says so, and says what the master does carry —
                        // otherwise a price that disagrees with the day's rate
                        // looks like a bug rather than a decision.
                        const rateNote = l.price_info.rate_overridden && l.price_info.rate_type === 'PERCENTAGE'
                          ? (l.price_info.master_rate != null
                              ? `Priced at the Gold Rate on this line — the Daily Rate master has ${curSym(header.currency_code)}${amt(l.price_info.master_rate)}/g`
                              : 'Priced at the Gold Rate on this line — the Daily Rate master carries no rate')
                          : ''
                        if (!warnings.length && !formula && !rateNote) return null

                        return (
                          <tr style={{ background: 'var(--bg-secondary)' }}>
                            <td />
                            <td colSpan={LINE_COLS.length - 1} className="px-2 pb-1.5 pt-0.5">
                              <div className="flex flex-col gap-1">
                                {warnings.map(w => (
                                  <div key={w} className="flex items-start gap-1.5 text-[11px] font-medium leading-snug text-red-600 dark:text-red-400">
                                    <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0 mt-px" />
                                    <span>{w}</span>
                                  </div>
                                ))}
                                {formula && (
                                  <div className="flex items-start gap-1.5 text-[11px] font-mono leading-snug" style={{ color: 'var(--text-muted)' }}>
                                    <span className="shrink-0 not-italic" style={{ color: 'var(--accent-gold)' }}>ƒ</span>
                                    <span>{formula}</span>
                                  </div>
                                )}
                                {rateNote && (
                                  <div className="flex items-start gap-1.5 text-[11px] leading-snug" style={{ color: 'var(--accent-gold)' }}>
                                    <PencilIcon className="w-3 h-3 shrink-0 mt-px" />
                                    <span>{rateNote}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })()}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
                      <td colSpan={4} className="px-2 py-2 text-right font-semibold uppercase text-xs" style={{ color: 'var(--text-muted)' }}>
                        Total
                      </td>
                      <td className="px-2 py-2 text-right font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{formTotals.qty}</td>
                      {/* UOM, Gold Rate, Price */}
                      <td colSpan={3} />
                      <td className="px-2 py-2 text-right font-mono font-bold whitespace-nowrap" style={{ color: 'var(--accent-gold)' }}>
                        {money(formTotals.amount, header.currency_code)}
                      </td>
                      <td colSpan={6} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* ── Bottom action bar ── */}
          <div className="card px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              {!isViewMode && (
                <>
                  <button onClick={() => saveOrder('draft')} disabled={saving} className="btn-secondary flex items-center gap-1.5 disabled:opacity-50">
                    {saving
                      ? <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      : <DocumentDuplicateIcon className="w-4 h-4" />
                    }
                    Save Draft
                  </button>
                  <button onClick={() => { if (validate()) setSubmitAsk(true) }} disabled={saving} className="btn-primary flex items-center gap-1.5 disabled:opacity-50">
                    <CheckCircleIcon className="w-4 h-4" />
                    Submit
                  </button>
                </>
              )}
              <button onClick={printFromForm} className="btn-secondary flex items-center gap-1.5">
                <PrinterIcon className="w-4 h-4" />
                Print
              </button>
              <button onClick={askBackToList} className="btn-secondary ml-auto">
                {isViewMode ? 'Close' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>

        {printModal}
        {priceInfoModal}

        {/* ── Submit confirmation ── */}
        <ConfirmDialog
          isOpen={submitAsk}
          title="Submit Sales Order"
          message={`Submit this sales order${editItem ? ` (${editItem.order_no})` : ''} for approval? It can no longer be edited until an approver acts on it.`}
          confirmLabel="Submit"
          variant="info"
          onConfirm={() => saveOrder('submit')}
          onCancel={() => setSubmitAsk(false)}
        />

        {/* ── Unsaved changes confirmation ── */}
        <ConfirmDialog
          isOpen={backAsk}
          title="Unsaved Changes"
          message="You have unsaved changes. Leave this sales order? All unsaved data will be lost."
          confirmLabel="Yes, leave"
          variant="danger"
          onConfirm={backToList}
          onCancel={() => setBackAsk(false)}
        />
      </>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <span>Order Management</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>Sales Order</span>
      </div>

      {/* Stats + Add button */}
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
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
                {s.icon}
              </div>
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
            New Sales Order
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
              placeholder="Search order no, customer, PO…"
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
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
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
                  className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide sticky right-0 z-10 border-l border-[var(--border-color)] bg-[var(--bg-secondary)]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Actions
                </th>
              </tr>

              {showFilterRow && (
                <tr className="border-b border-[var(--border-color)]" style={{ background: 'var(--bg-primary)' }}>
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
                    colSpan={visibleCols.length + 1}
                    className="px-4 py-16 text-center text-sm"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <SparklesIcon className="w-10 h-10 opacity-30" />
                      {search || Object.values(colFilters).some(v => v)
                        ? 'No sales orders match the current filters.'
                        : 'No sales orders found. Click "New Sales Order" to get started.'
                      }
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-[var(--border-color)] transition-colors hover:bg-[var(--bg-secondary)]
                      ${idx % 2 !== 0 ? 'bg-[var(--bg-primary)]/40' : ''}`}
                  >
                    {visibleCols.map(col => (
                      <td key={col.key} className="px-4 py-2.5">{renderCell(col, item)}</td>
                    ))}
                    <td className="px-4 py-2.5 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]">
                      <div className="flex items-center gap-1">
                        {EDITABLE_STATUSES.includes(item.order_status) && canUpdate && (
                          <button
                            onClick={() => loadOrderIntoForm(item, 'edit')}
                            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canView && (
                          <button
                            onClick={() => loadOrderIntoForm(item, 'view')}
                            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                            title="View"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        )}
                        {(canPrint || canView) && (
                          <button
                            onClick={() => printFromRow(item)}
                            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--accent-gold)]"
                            title="Print"
                          >
                            <PrinterIcon className="w-4 h-4" />
                          </button>
                        )}
                        {item.order_status !== 'CANCELLED' && canDelete && (
                          <button
                            onClick={() => setCancelItem(item)}
                            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-red-500"
                            title="Cancel Order"
                          >
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
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {total === 0
              ? 'No records found'
              : `Showing ${startRow}–${endRow} of ${total} sales orders`
            }
          </span>

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

      {printModal}

      {/* ── Cancel order dialog ── */}
      <DeactivateReasonDialog
        isOpen={!!cancelItem}
        title="Cancel Sales Order"
        itemLabel={`Sales order "${cancelItem?.order_no}" for ${cancelItem?.customer_company_name}`}
        onConfirm={reason => confirmCancel(reason)}
        onCancel={() => setCancelItem(null)}
      />
    </div>
  )
}

export default SalesOrderPage
