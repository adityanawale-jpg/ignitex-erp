import React, { useState, useEffect, useRef, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  PlusIcon, PencilIcon, EyeIcon, MagnifyingGlassIcon, XMarkIcon,
  ViewColumnsIcon, ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon,
  FunnelIcon, BarsArrowUpIcon, NoSymbolIcon, CheckCircleIcon,
  ArrowDownTrayIcon, PrinterIcon, TrashIcon, EnvelopeIcon,
  ChatBubbleLeftRightIcon, DocumentArrowDownIcon, DocumentDuplicateIcon,
  ClockIcon, ArrowLeftIcon, TruckIcon, ClipboardDocumentListIcon, XCircleIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'
import Modal                  from '@/components/common/Modal'
import Badge                  from '@/components/common/Badge'
import ConfirmDialog          from '@/components/common/ConfirmDialog'
import DeactivateReasonDialog from '@/components/common/DeactivateReasonDialog'
import PageBreadcrumb from '@/components/common/PageBreadcrumb'
import WorkflowPanel          from '@/components/workflow/WorkflowPanel'
import {
  formatDate, formatDateTime, exportToCSV, exportToExcel, exportToPDF,
  escapeHtml, escapeHtmlWithBreaks as esc,
} from '@/utils/helpers'
import { apiService } from '@/api/apiService'
import { usePermission } from '@/hooks'

// ── Types ─────────────────────────────────────────────────────
interface PurchaseOrderRow {
  id:                  number
  po_number:           string | null
  buss_unit_id:        string
  supplier_id:         number
  vendor_code:         string | null
  vendor_company_name: string | null
  pay_term:            string | null
  currency_code:       string
  po_date:             string
  expected_date:       string | null
  po_status:           'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  buyer_name:          string | null
  req_number:          string | null
  total_qty:           number | null
  ordered_amount:      number | string | null
  tax_amount:          number | string | null
  total_value:         number | string | null
  cancel_reason:       string | null
  cancelled_at:        string | null
  line_count:          number
  created_at:          string
}

interface PurchaseOrderLine {
  id?:              number
  line_no?:         number
  itemtype:         string
  item_id:          number | null
  sku_code:         string | null
  item_description: string | null
  item_qty:         number | string
  uom:              string | null
  gross_weight:     number | string | null
  net_weight:       number | string | null
  pure_weight:      number | string | null
  rate_per_unit:    number | string
  line_value:       number | string
  tax_pct:          number | string | null
  tax_amount:       number | string | null
  line_total:       number | string | null
  vendor_item_no:   string | null
  req_number:       string | null
  requested_date:   string | null
  line_status:      string
  remarks:          string | null
}

interface LookupOption { lookup_code: string; lookup_name: string }

interface SupplierOpt {
  id:               number
  code:             string | null
  name:             string | null
  gstin_uin_number: string | null
  place_of_supply:  string | null
}

// One row of the SKU picker. Every item type returns this same shape; the
// columns a type has nothing for come back null (see itemLov.service.ts).
interface ItemLovOpt {
  id:             number
  code:           string
  name:           string
  description:    string | null
  gross_weight:   string | number | null
  net_weight:     string | number | null
  purity:         string | null
  std_cts:        string | number | null
  vendor_item_no: string | null
}

// An open requisition offered by the "Requisition Number" picker. Each one
// names a single item, so each becomes one order line.
interface RequisitionOpt {
  id:                 number
  requisition_number: string
  requisition_date:   string
  itemtype:           string
  item_id:            number | null
  sku_code:           string
  item_description:   string | null
  item_qty:           number | string
  uom:                string | null
  gross_weight:       string | number | null
  net_weight:         string | number | null
  pure_weight:        string | number | null
  vendor_item_no:     string | null
  required_date:      string | null
  remarks:            string | null
}

// What the supplier's Rate Contract says about one line's item. Held beside the
// line for display only — the saved order keeps the resulting rate, not its
// provenance.
interface RateInfo {
  rate_found:    boolean
  matched_sku?:  string
  rate_basis?:   'PER_GM' | 'PER_PC'
  rate_type?:    string
  rate_value?:   number
  uom?:          string
  weight_factor?: number
  rate_per_unit: number | null
}

type ItemType = 'FG' | 'FINDING' | 'METAL' | 'STONE' | 'COMPONENT'

// ── Form state (controlled local state per project pattern) ────
type HeaderForm = {
  buss_unit_id:        string
  supplier_id:         string
  vendor_code:         string
  vendor_company_name: string
  supplier_address:    string
  comm_email:          string
  pay_term:            string
  ship_to_location:    string
  bill_to_location:    string
  currency_code:       string
  po_date:             string
  expected_date:       string
  remarks:             string
}

type LineForm = {
  itemtype:         ItemType
  item_id:          number | null
  sku_code:         string
  item_description: string
  item_qty:         string
  uom:              string
  gross_weight:     string
  net_weight:       string
  pure_weight:      string
  rate_per_unit:    string
  tax_pct:          string
  vendor_item_no:   string
  req_number:       string
  requested_date:   string
  line_status:      string
  remarks:          string
  // Where rate_per_unit came from, kept beside the line so the Rate cell can
  // show its working. Null on a hand-typed rate and on a saved order until the
  // contract is re-read — display-only, never persisted.
  rate_info:        RateInfo | null
}

// The plain-text cells of a line — the ones a generic string setter may touch.
// item_id and rate_info are excluded so neither can be overwritten with a string.
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

// Fallback delivery lead time for a line pulled from no requisition
const REQUESTED_DATE_LEAD_DAYS = 15

const ITEM_TYPES: { code: ItemType; label: string }[] = [
  { code: 'FG',        label: 'Finished Goods' },
  { code: 'FINDING',   label: 'Finding / SFG'  },
  { code: 'METAL',     label: 'Metal'          },
  { code: 'STONE',     label: 'Stone'          },
  { code: 'COMPONENT', label: 'Component'      },
]
const itemTypeLabel = (code: string) => ITEM_TYPES.find(t => t.code === code)?.label ?? code

// The unit a type is normally bought in — metal by weight, stone by carat, the
// rest by piece. Pre-selected on a type change; the buyer can still override it.
const DEFAULT_UOM: Record<ItemType, string> = {
  FG: 'PCS', FINDING: 'PCS', COMPONENT: 'PCS', METAL: 'GM', STONE: 'CT',
}

// Only FG and Finding SKUs carry a BOM, so only they can have their weights
// filled in for them. The other three are typed by hand.
const WEIGHTS_FROM_BOM: ItemType[] = ['FG', 'FINDING']

const blankHeader: HeaderForm = {
  buss_unit_id: '', supplier_id: '', vendor_code: '', vendor_company_name: '',
  supplier_address: '', comm_email: '', pay_term: '',
  ship_to_location: '', bill_to_location: '',
  currency_code: 'INR', po_date: '', expected_date: '', remarks: '',
}

const blankLine: LineForm = {
  itemtype: 'FG', item_id: null, sku_code: '', item_description: '',
  item_qty: '', uom: 'PCS',
  gross_weight: '', net_weight: '', pure_weight: '',
  rate_per_unit: '', tax_pct: '',
  vendor_item_no: '', req_number: '', requested_date: '',
  line_status: 'DRAFT', remarks: '', rate_info: null,
}

// ── Constants ─────────────────────────────────────────────────
const PAGE_SIZES = [10, 25, 50, 100]
const Req = () => <span className="text-red-500 ml-0.5">*</span>

// Order Lines grid columns. `req` renders the same red asterisk the header
// fields use, and marks exactly the cells validate() enforces per line.
const LINE_COLS: { label: string; req?: boolean }[] = [
  { label: 'Sl' },
  { label: 'Item Type',   req: true },
  { label: 'SKU / Item',  req: true },
  { label: 'Description' },
  { label: 'Qty',         req: true },
  { label: 'UOM' },
  { label: 'Gr.Wt' },
  { label: 'Net Wt' },
  { label: 'Pure Wt' },
  { label: 'Rate / Unit', req: true },
  { label: 'Value' },
  { label: 'Tax %' },
  { label: 'Tax Amt' },
  { label: 'Line Total' },
  { label: 'Request Date' },
  { label: 'Req No' },
  { label: '' },
]

const CURRENCY_SYMBOL: Record<string, string> = { INR: '₹', USD: '$' }
const curSym = (code: string) => CURRENCY_SYMBOL[code] ?? `${code} `

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

// The list's status tabs. Every key but 'all' and 'pending_requisition' is a
// status code lowercased — the API uppercases it straight back before
// matching. 'pending_requisition' is not a PO status at all: it swaps the grid
// over to open requisitions instead of orders (see isPendingReqTab below).
type StatusFilter = 'all' | 'pending_requisition' | 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled'

// Mirrors ORDER_EDITABLE on the API: the buyer holds the PO in these two states
// and nowhere else.
const EDITABLE_STATUSES: readonly string[] = ['DRAFT', 'REJECTED']

// ── Number helpers ────────────────────────────────────────────
const n = (v: unknown): number => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}
const round2 = (v: number) => Math.round(v * 100) / 100
const round4 = (v: number) => Math.round(v * 10000) / 10000

const amt = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const wt  = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 4 })
const money = (v: number | string | null | undefined, code = 'INR') => `${curSym(code)}${amt(n(v))}`

// PURITY lookup codes come in two spellings — millesimal ('916') and percent
// ('91.60%') — so both are read here rather than assuming one house style.
const purityFactor = (code: string | null | undefined): number | null => {
  const s = String(code ?? '').trim()
  if (!s) return null
  if (/^\d{3}$/.test(s)) return Number(s) / 1000
  const pct = s.match(/^([\d.]+)\s*%$/)
  if (pct && Number.isFinite(Number(pct[1]))) return Number(pct[1]) / 100
  return null
}

// The three money figures on the form's header — Ordered RS, Tax and Total
// Value — worked out from the lines. The server recomputes all of them on save;
// this is what the buyer watches while typing.
const lineValue  = (l: LineForm) => round2(Math.trunc(n(l.item_qty)) * round4(n(l.rate_per_unit)))
const lineTax    = (l: LineForm) => round2(lineValue(l) * n(l.tax_pct) / 100)
const lineTotal  = (l: LineForm) => round2(lineValue(l) + lineTax(l))

// A row the user added and never filled in is not an order line — it is dropped
// on save rather than failing validation, matching what the server does.
const isRealLine = (l: LineForm) =>
  !!l.sku_code.trim() || !!Math.trunc(n(l.item_qty)) || !!n(l.rate_per_unit)

interface ColDef { key: string; label: string; sortKey?: string; visible: boolean; minW?: string }

const INITIAL_COLS: ColDef[] = [
  { key: 'po_number',           label: 'PO Number',    sortKey: 'po_number',           visible: true,  minW: '120px' },
  { key: 'vendor_company_name', label: 'Supplier',     sortKey: 'vendor_company_name', visible: true,  minW: '190px' },
  { key: 'buss_unit_id',        label: 'Procurement BU', sortKey: 'buss_unit_id',      visible: true,  minW: '140px' },
  { key: 'po_date',             label: 'Creation Date', sortKey: 'po_date',            visible: true,  minW: '115px' },
  { key: 'expected_date',       label: 'Expected',     sortKey: 'expected_date',       visible: false, minW: '110px' },
  { key: 'req_number',          label: 'Requisition',                                  visible: true,  minW: '130px' },
  { key: 'pay_term',            label: 'Payment Term',                                 visible: false, minW: '130px' },
  { key: 'currency_code',       label: 'Currency',     sortKey: 'currency_code',       visible: false, minW: '90px'  },
  { key: 'line_count',          label: 'Lines',                                        visible: true,  minW: '70px'  },
  { key: 'total_qty',           label: 'Qty',          sortKey: 'total_qty',           visible: false, minW: '80px'  },
  { key: 'ordered_amount',      label: 'Ordered RS',   sortKey: 'ordered_amount',      visible: true,  minW: '130px' },
  { key: 'tax_amount',          label: 'Tax',                                          visible: false, minW: '110px' },
  { key: 'total_value',         label: 'Total Value',  sortKey: 'total_value',         visible: true,  minW: '140px' },
  { key: 'buyer_name',          label: 'Buyer',                                        visible: false, minW: '140px' },
  { key: 'po_status',           label: 'Status',       sortKey: 'po_status',           visible: true,  minW: '100px' },
  { key: 'cancel_reason',       label: 'Cancel Reason',                                visible: true,  minW: '160px' },
  { key: 'created_at',          label: 'Created',      sortKey: 'created_at',          visible: false, minW: '150px' },
]

// ─────────────────────────────────────────────────────────────────
// Print document builders
// ─────────────────────────────────────────────────────────────────
interface PrintData {
  po_number:           string
  po_status:           string
  po_date:             string
  expected_date:       string
  currency_code:       string
  bu_name:             string
  vendor_code:         string
  vendor_company_name: string
  supplier_address:    string
  comm_email:          string
  pay_term:            string
  ship_to_location:    string
  bill_to_location:    string
  buyer_name:          string
  req_number:          string
  remarks:             string
  total_qty:           number
  ordered_amount:      number
  tax_amount:          number
  total_value:         number
  lines: {
    line_no: number; itemtype: string; sku_code: string; item_description: string
    item_qty: number; uom: string; net_weight: number; rate_per_unit: number
    line_value: number; tax_pct: number; tax_amount: number; line_total: number
    requested_date: string
  }[]
}

// Self-contained HTML document — used for the on-screen preview, the browser
// print dialog and the Word export, so all three always show the same page.
function buildOrderHTML(d: PrintData): string {
  const sym = curSym(d.currency_code)
  const fmt = (v: number) => `${sym}${amt(v)}`
  const cell = 'border:1px solid #d1d5db;padding:6px 8px;'
  const rows = d.lines.map(l => `
    <tr>
      <td style="${cell}text-align:center;">${l.line_no}</td>
      <td style="${cell}">${esc(itemTypeLabel(l.itemtype))}</td>
      <td style="${cell}font-weight:600;">${esc(l.sku_code)}</td>
      <td style="${cell}">${esc(l.item_description) || '—'}</td>
      <td style="${cell}text-align:right;">${l.item_qty}</td>
      <td style="${cell}text-align:center;">${esc(l.uom)}</td>
      <td style="${cell}text-align:right;">${l.net_weight ? wt(l.net_weight) : '—'}</td>
      <td style="${cell}text-align:right;">${fmt(l.rate_per_unit)}</td>
      <td style="${cell}text-align:right;">${fmt(l.line_value)}</td>
      <td style="${cell}text-align:right;">${l.tax_pct ? `${l.tax_pct}%` : '—'}</td>
      <td style="${cell}text-align:right;font-weight:600;">${fmt(l.line_total)}</td>
      <td style="${cell}text-align:center;">${l.requested_date ? formatDate(l.requested_date) : '—'}</td>
    </tr>`).join('')

  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;color:#111827;font-size:13px;line-height:1.45;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
      <tr>
        <td style="vertical-align:top;">
          <div style="font-size:22px;font-weight:700;letter-spacing:1px;color:#92700c;">PURCHASE ORDER</div>
          <div style="font-size:15px;font-weight:600;margin-top:2px;">${esc(d.bu_name)}</div>
        </td>
        <td style="vertical-align:top;text-align:right;">
          <div style="font-size:16px;font-weight:700;">${esc(d.po_number)}</div>
          <div style="margin-top:2px;">PO Date: <b>${d.po_date ? formatDate(d.po_date) : '—'}</b></div>
          <div>Status: <b>${statusLabel(d.po_status)}</b></div>
        </td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
      <tr>
        <td style="width:50%;vertical-align:top;${cell}">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">Supplier</div>
          <div style="font-weight:600;">${esc(d.vendor_company_name)} <span style="color:#6b7280;font-weight:400;">(${esc(d.vendor_code)})</span></div>
          <div>${esc(d.supplier_address) || '—'}</div>
          ${d.comm_email ? `<div style="margin-top:3px;color:#6b7280;">${esc(d.comm_email)}</div>` : ''}
        </td>
        <td style="width:50%;vertical-align:top;${cell}">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">Ship To</div>
          <div>${esc(d.ship_to_location) || '—'}</div>
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;margin:6px 0 4px;">Bill To</div>
          <div>${esc(d.bill_to_location) || '—'}</div>
        </td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:12px;">
      <tr>
        <td style="${cell}"><b>Payment Term:</b> ${esc(d.pay_term) || '—'}</td>
        <td style="${cell}"><b>Currency:</b> ${esc(d.currency_code)}</td>
        <td style="${cell}"><b>Buyer:</b> ${esc(d.buyer_name) || '—'}</td>
        <td style="${cell}"><b>Expected:</b> ${d.expected_date ? formatDate(d.expected_date) : '—'}</td>
      </tr>
      <tr>
        <td style="${cell}" colspan="4"><b>Requisition No:</b> ${esc(d.req_number) || '—'}</td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f3f4f6;">
          ${['Sl', 'Item Type', 'SKU / Item', 'Description', 'Qty', 'UOM', 'Net Wt',
             'Rate / Unit', 'Value', 'Tax %', 'Line Total', 'Request Date']
            .map(h => `<th style="${cell}font-size:11px;text-transform:uppercase;">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="12" style="${cell}text-align:center;color:#6b7280;padding:14px;">No line items</td></tr>`}
      </tbody>
      <tfoot>
        <tr style="background:#f9fafb;">
          <td colspan="4" style="${cell}font-weight:700;text-align:right;">Total</td>
          <td style="${cell}font-weight:700;text-align:right;">${d.total_qty}</td>
          <td colspan="3" style="${cell}"></td>
          <td style="${cell}font-weight:700;text-align:right;">${fmt(d.ordered_amount)}</td>
          <td style="${cell}"></td>
          <td style="${cell}font-weight:700;text-align:right;">${fmt(d.total_value)}</td>
          <td style="${cell}"></td>
        </tr>
      </tfoot>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:12px;">
      <tr>
        <td style="width:60%;vertical-align:top;padding-right:12px;">
          ${d.remarks ? `<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;">Remarks</div><div>${esc(d.remarks)}</div>` : ''}
        </td>
        <td style="width:40%;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="${cell}">Ordered RS</td><td style="${cell}text-align:right;">${fmt(d.ordered_amount)}</td></tr>
            <tr><td style="${cell}">Tax</td><td style="${cell}text-align:right;">${fmt(d.tax_amount)}</td></tr>
            <tr style="background:#f9fafb;"><td style="${cell}font-weight:700;">Total Value</td><td style="${cell}text-align:right;font-weight:700;">${fmt(d.total_value)}</td></tr>
          </table>
        </td>
      </tr>
    </table>

    <div style="margin-top:36px;display:flex;justify-content:space-between;font-size:12px;">
      <div style="border-top:1px solid #9ca3af;padding-top:4px;width:200px;text-align:center;">Prepared By</div>
      <div style="border-top:1px solid #9ca3af;padding-top:4px;width:200px;text-align:center;">Authorized Signatory</div>
    </div>
  </div>`
}

// Plain-text summary — used for the mail body and the WhatsApp message
function buildOrderText(d: PrintData): string {
  const L: string[] = []
  L.push(`PURCHASE ORDER ${d.po_number}`)
  L.push(`Procurement BU: ${d.bu_name}`)
  L.push(`Supplier: ${d.vendor_company_name} (${d.vendor_code})`)
  L.push(`PO Date: ${d.po_date ? formatDate(d.po_date) : '-'}   Status: ${statusLabel(d.po_status)}`)
  if (d.expected_date) L.push(`Expected Delivery: ${formatDate(d.expected_date)}`)
  if (d.pay_term)      L.push(`Payment Term: ${d.pay_term}`)
  if (d.req_number)    L.push(`Requisition No: ${d.req_number}`)
  L.push(`Currency: ${d.currency_code}`)
  L.push('')
  L.push('Items:')
  d.lines.forEach(l => {
    L.push(`${l.line_no}. [${itemTypeLabel(l.itemtype)}] ${l.sku_code} — ${l.item_qty} ${l.uom} × ${amt(l.rate_per_unit)} = ${amt(l.line_total)}`)
  })
  L.push('')
  L.push(`Total Qty: ${d.total_qty}`)
  L.push(`Ordered RS: ${d.currency_code} ${amt(d.ordered_amount)}`)
  L.push(`Tax: ${d.currency_code} ${amt(d.tax_amount)}`)
  L.push(`Total Value: ${d.currency_code} ${amt(d.total_value)}`)
  if (d.remarks) { L.push(''); L.push(`Remarks: ${d.remarks}`) }
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
  // 10 columns, twips
  const cellx = [500, 1700, 3400, 4100, 4700, 5600, 6800, 7900, 9000, 10200]
  const rowDef = '\\trowd\\trgaph80' + cellx.map(x => `\\cellx${x}`).join('')
  const row = (cells: string[], bold = false) =>
    `${rowDef}${cells.map(c => `\\intbl ${bold ? '\\b ' : ''}${c}${bold ? '\\b0' : ''}\\cell`).join('')}\\row\n`

  let body = ''
  body += `{\\b\\fs36 PURCHASE ORDER}\\par {\\b\\fs24 ${r(d.bu_name)}}\\par\\par `
  body += `{\\b PO No:} ${r(d.po_number)}\\tab {\\b Date:} ${d.po_date ? r(formatDate(d.po_date)) : '-'}\\tab {\\b Status:} ${r(statusLabel(d.po_status))}\\par `
  body += `{\\b Supplier:} ${r(d.vendor_company_name)} (${r(d.vendor_code)})\\par `
  body += `${r(d.supplier_address || '-')}\\par `
  if (d.comm_email) body += `{\\b Email:} ${r(d.comm_email)}\\par `
  body += `{\\b Payment Term:} ${r(d.pay_term || '-')}\\tab {\\b Currency:} ${r(d.currency_code)}\\tab {\\b Buyer:} ${r(d.buyer_name || '-')}\\par `
  if (d.req_number) body += `{\\b Requisition No:} ${r(d.req_number)}\\par `
  body += `\\par {\\b Ship To:}\\par ${r(d.ship_to_location || '-')}\\par\\par {\\b Bill To:}\\par ${r(d.bill_to_location || '-')}\\par\\par `

  body += row(['Sl', 'Item Type', 'SKU / Item', 'Qty', 'UOM', 'Rate / Unit', 'Value', 'Tax %', 'Line Total', 'Request Date'], true)
  d.lines.forEach(l => {
    body += row([
      String(l.line_no), r(itemTypeLabel(l.itemtype)), r(l.sku_code),
      String(l.item_qty), r(l.uom), amt(l.rate_per_unit), amt(l.line_value),
      l.tax_pct ? `${l.tax_pct}%` : '-', amt(l.line_total),
      l.requested_date ? r(formatDate(l.requested_date)) : '-',
    ])
  })
  body += row(['', '', 'Total', String(d.total_qty), '', '', amt(d.ordered_amount), '', amt(d.total_value), ''], true)

  body += `\\par {\\b Ordered RS:} ${r(d.currency_code)} ${amt(d.ordered_amount)}\\par `
  body += `{\\b Tax:} ${r(d.currency_code)} ${amt(d.tax_amount)}\\par `
  body += `{\\b Total Value:} ${r(d.currency_code)} ${amt(d.total_value)}\\par `
  if (d.remarks) body += `\\par {\\b Remarks:} ${r(d.remarks)}\\par `

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

// ─────────────────────────────────────────────────────────────────
// Form furniture. Module scope, not nested in the page component: a component
// declared inside a render is a new type on every render, so React remounts its
// subtree and a controlled input loses focus after each keystroke.
// ─────────────────────────────────────────────────────────────────
const lineInputCls = 'w-full text-xs px-2 py-1.5 border border-[var(--border-color)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-gold)] disabled:opacity-60'
const lineInputStyle: React.CSSProperties = { background: 'var(--bg-primary)', color: 'var(--text-primary)' }

const Field = ({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode
}) => (
  <div>
    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
      {label}{required && <Req />}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    {!error && hint && <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
  </div>
)

// ─────────────────────────────────────────────────────────────────
// SupplierSearch — type-ahead supplier picker
// ─────────────────────────────────────────────────────────────────
interface SupplierSearchProps {
  display:  string
  disabled?: boolean
  error?:   boolean
  fetch:    (q: string) => Promise<SupplierOpt[]>
  onSelect: (opt: SupplierOpt) => void
  onClear:  () => void
}
function SupplierSearch({ display, disabled, error, fetch, onSelect, onClear }: SupplierSearchProps) {
  const [q,    setQ]    = useState(display)
  const [opts, setOpts] = useState<SupplierOpt[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => setQ(display), [display])

  const doSearch = async (val: string) => {
    setQ(val)
    if (!val.length) { setOpts([]); setOpen(false); return }
    setBusy(true)
    try {
      setOpts(await fetch(val === '%' ? '' : val)); setOpen(true)
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
        placeholder="Search supplier by code or name, or % to list all…"
        disabled={disabled}
        className={`w-full text-sm pl-3 ${showClear ? 'pr-8' : 'pr-3'} py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] disabled:opacity-60 disabled:cursor-not-allowed`}
        style={{
          borderColor: error ? '#ef4444' : 'var(--border-color)',
          background: 'var(--bg-primary)', color: 'var(--text-primary)',
        }}
      />
      {busy && <span className="absolute right-8 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />}
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
            <div key={o.id} className="px-3 py-2 cursor-pointer hover:bg-[var(--bg-secondary)]"
              onMouseDown={() => { onSelect(o); setQ(o.name ?? ''); setOpen(false) }}>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-xs" style={{ color: 'var(--accent-gold)' }}>{o.code}</span>
                <span style={{ color: 'var(--text-primary)' }}>{o.name}</span>
              </div>
              {o.gstin_uin_number && (
                <div className="truncate text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>GSTIN {o.gstin_uin_number}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// ItemSearch — per-line SKU picker. Searches the master named by the line's own
// Item Type, so a PO can order across all five in one document.
// ─────────────────────────────────────────────────────────────────
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
  const [busy, setBusy] = useState(false)
  useEffect(() => setQ(value), [value])

  const doSearch = async (val: string) => {
    setQ(val); onType(val)
    if (!val.length) { setOpts([]); setOpen(false); return }
    setBusy(true)
    try {
      setOpts(await fetch(val === '%' ? '' : val)); setOpen(true)
    } catch { /* the toast is raised by the caller */ }
    finally { setBusy(false) }
  }

  return (
    <div className="relative">
      <input
        value={q}
        onChange={e => doSearch(e.target.value)}
        onFocus={() => { if (q.length && opts.length) setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="Search, % for all"
        disabled={disabled}
        className={lineInputCls}
        style={lineInputStyle}
      />
      {busy && <span className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />}
      {open && opts.length > 0 && (
        <div className="absolute z-50 top-full left-0 min-w-full w-max max-w-sm border shadow-lg rounded-lg max-h-56 overflow-y-auto text-xs mt-0.5"
          style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)' }}>
          {opts.map(o => (
            <div key={o.id} className="px-2.5 py-1.5 cursor-pointer hover:bg-[var(--bg-secondary)]"
              onMouseDown={() => { onSelect(o); setQ(o.code); setOpen(false) }}>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold" style={{ color: 'var(--accent-gold)' }}>{o.code}</span>
                {o.vendor_item_no && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[var(--accent-gold)]/30 text-[var(--accent-gold)]">
                    vendor mapped
                  </span>
                )}
              </div>
              {o.description && o.description !== o.code && (
                <div className="truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{o.description}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// RequisitionSearch — "Select Req and Populate lines below". Picking a
// requisition appends it as an order line; requisitions already on another live
// PO are not offered.
// ─────────────────────────────────────────────────────────────────
interface RequisitionSearchProps {
  disabled?: boolean
  fetch:    (q: string) => Promise<RequisitionOpt[]>
  onSelect: (opt: RequisitionOpt) => void
}
function RequisitionSearch({ disabled, fetch, onSelect }: RequisitionSearchProps) {
  const [q,    setQ]    = useState('')
  const [opts, setOpts] = useState<RequisitionOpt[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const doSearch = async (val: string) => {
    setQ(val)
    if (!val.length) { setOpts([]); setOpen(false); return }
    setBusy(true)
    try {
      setOpts(await fetch(val === '%' ? '' : val)); setOpen(true)
    } catch { /* the toast is raised by the caller */ }
    finally { setBusy(false) }
  }

  return (
    <div className="relative">
      <input
        value={q}
        onChange={e => doSearch(e.target.value)}
        onFocus={() => { if (q.length && opts.length) setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="Select Req and populate lines below — type % to list all"
        disabled={disabled}
        className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
      />
      {busy && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />}
      {open && (
        <div className="absolute z-50 top-full left-0 w-full border shadow-lg rounded-lg max-h-64 overflow-y-auto text-sm mt-0.5"
          style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)' }}>
          {opts.length === 0 ? (
            <div className="px-3 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              No open requisitions match — one already pulled onto a live PO is not offered again.
            </div>
          ) : opts.map(o => (
            <div key={o.id} className="px-3 py-2 cursor-pointer hover:bg-[var(--bg-secondary)]"
              onMouseDown={() => { onSelect(o); setQ(''); setOpts([]); setOpen(false) }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-semibold text-xs" style={{ color: 'var(--accent-gold)' }}>{o.requisition_number}</span>
                <Badge label={itemTypeLabel(o.itemtype)} variant="secondary" />
                <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{o.sku_code}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>× {Math.trunc(n(o.item_qty))} {o.uom ?? ''}</span>
              </div>
              {o.item_description && (
                <div className="truncate text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{o.item_description}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────
const PurchaseOrderPage: React.FC = () => {
  // ── Permissions ──────────────────────────────────────────────
  const { canView, canCreate, canUpdate, canDelete, canPrint } = usePermission('PM_ORDERS')

  // ── Lookups ──────────────────────────────────────────────────
  const [buOpts,       setBuOpts]       = useState<LookupOption[]>([])
  const [currencyOpts, setCurrencyOpts] = useState<LookupOption[]>([])
  const [uomOpts,      setUomOpts]      = useState<LookupOption[]>([])
  const [payTermOpts,  setPayTermOpts]  = useState<LookupOption[]>([])

  useEffect(() => {
    apiService.get('/common/lookup/INV_BU')
      .then(r => setBuOpts(r.data?.data ?? []))
      .catch(() => toast.error('Failed to load BU list'))
    apiService.get('/common/lookup/CURRENCY')
      .then(r => setCurrencyOpts(r.data?.data ?? []))
      .catch(() => toast.error('Failed to load currencies'))
    apiService.get('/common/lookup/UOM')
      .then(r => setUomOpts(r.data?.data ?? []))
      .catch(() => toast.error('Failed to load UOM list'))
    apiService.get('/common/lookup/PAYMENT_TERM')
      .then(r => setPayTermOpts(r.data?.data ?? []))
      .catch(() => toast.error('Failed to load payment terms'))
  }, [])

  const lookupName = (opts: LookupOption[], code: string | null | undefined) =>
    code ? (opts.find(o => o.lookup_code === code)?.lookup_name ?? code) : ''
  const buName      = (code: string) => lookupName(buOpts, code) || code
  const payTermName = (code: string | null | undefined) => lookupName(payTermOpts, code)

  // ── Grid state ───────────────────────────────────────────────
  const [items,        setItems]        = useState<PurchaseOrderRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetching,     setFetching]     = useState(false)
  const isFirstLoad                     = useRef(true)
  const [stats,        setStats]        = useState({ draft: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0, pending_requisitions: 0 })
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
  const [selectedRows,  setSelectedRows]  = useState<PurchaseOrderRow[]>([])
  const [exportOpen,    setExportOpen]    = useState(false)
  const [exporting,     setExporting]     = useState(false)
  const colPickerRef   = useRef<HTMLDivElement>(null)
  const exportRef      = useRef<HTMLDivElement>(null)
  const masterCheckRef = useRef<HTMLInputElement>(null)
  const searchTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cfTimer        = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Pending Requisition tab state — a second, much simpler grid over open
  // requisitions rather than orders, so it gets its own paging/search/selection
  // state instead of overloading the PO grid's. ──
  const [reqItems,       setReqItems]       = useState<RequisitionOpt[]>([])
  const [reqLoading,     setReqLoading]     = useState(true)
  const [reqFetching,    setReqFetching]    = useState(false)
  const reqIsFirstLoad                      = useRef(true)
  const [reqPage,        setReqPage]        = useState(1)
  const [reqPageSize,    setReqPageSize]    = useState(25)
  const [reqSearchInput, setReqSearchInput] = useState('')
  const [reqSearch,      setReqSearch]      = useState('')
  const [reqTotal,       setReqTotal]       = useState(0)
  const [reqTotalPages,  setReqTotalPages]  = useState(1)
  const [reqSelected,    setReqSelected]    = useState<RequisitionOpt[]>([])
  const reqMasterCheckRef = useRef<HTMLInputElement>(null)
  const reqSearchTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── View state — full-screen form instead of a popup (same as Sales Order) ──
  const [view, setView] = useState<'list' | 'form'>('list')

  // ── Form / confirm state ─────────────────────────────────────
  const [formMode,   setFormMode]   = useState<'add' | 'edit' | 'view'>('add')
  const [editItem,   setEditItem]   = useState<PurchaseOrderRow | null>(null)
  const [cancelItem, setCancelItem] = useState<PurchaseOrderRow | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [submitAsk,  setSubmitAsk]  = useState(false)
  const [backAsk,    setBackAsk]    = useState(false)
  const isNew      = formMode === 'add'
  const isViewMode = formMode === 'view'

  const [header,     setHeader]     = useState<HeaderForm>(blankHeader)
  const [lines,      setLines]      = useState<LineForm[]>([])
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof HeaderForm, string>>>({})
  // Leaving the form is a full page change, so warn only when something was
  // actually edited — every mutating helper below flips this.
  const [dirty,      setDirty]      = useState(false)
  // The line whose rate is being read off the supplier's contract, so only that
  // row shows a spinner.
  const [ratingIdx,  setRatingIdx]  = useState<number | null>(null)
  // Whether the workflow's SUBMIT step auto-approves. Read off WorkflowPanel so
  // the bottom bar's Submit button can say so — it fires the identical SUBMIT
  // action WorkflowPanel's own (now-hidden) button would have.
  const [wfSelfApproval, setWfSelfApproval] = useState(false)

  const setField = (key: keyof HeaderForm, val: string) => {
    setHeader(f => ({ ...f, [key]: val }))
    setDirty(true)
    if (formErrors[key]) setFormErrors(e => ({ ...e, [key]: undefined }))
  }

  const setLineField = (idx: number, key: LineTextKey, val: string) => {
    setLines(ls => ls.map((l, i) => i === idx ? { ...l, [key]: val } : l))
    setDirty(true)
  }

  // ── Data loaders ──────────────────────────────────────────────
  const loadStats = async () => {
    try {
      const res = await apiService.get('/purchase-orders/stats')
      setStats(res.data?.data ?? { draft: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0, pending_requisitions: 0 })
    } catch { /* silent — the grid is the page, the tiles are decoration */ }
  }

  const loadItems = async () => {
    if (isFirstLoad.current) setLoading(true)
    else setFetching(true)
    try {
      const activeCF = Object.fromEntries(Object.entries(debouncedCF).filter(([, v]) => v.trim()))
      const res = await apiService.get('/purchase-orders', {
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
      toast.error(msg || 'Failed to load purchase orders')
    } finally {
      setLoading(false); setFetching(false); isFirstLoad.current = false
    }
  }

  const loadPendingReqs = async () => {
    if (reqIsFirstLoad.current) setReqLoading(true)
    else setReqFetching(true)
    try {
      const res = await apiService.get('/purchase-orders/requisitions/pending', {
        params: { page: reqPage, limit: reqPageSize, search: reqSearch },
      })
      setReqItems(res.data?.data ?? [])
      setReqTotal(res.data?.meta?.total ?? 0)
      setReqTotalPages(res.data?.meta?.total_pages ?? 1)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to load pending requisitions')
    } finally {
      setReqLoading(false); setReqFetching(false); reqIsFirstLoad.current = false
    }
  }

  const isPendingReqTab = statusFilter === 'pending_requisition'

  useEffect(() => { loadStats() }, []) // eslint-disable-line
  useEffect(() => {
    if (isPendingReqTab) return
    loadItems()
  }, [page, pageSize, search, sortBy, sortDir, debouncedCF, statusFilter]) // eslint-disable-line
  useEffect(() => {
    if (!isPendingReqTab) return
    loadPendingReqs()
  }, [reqPage, reqPageSize, reqSearch, isPendingReqTab]) // eslint-disable-line

  // Saving, submitting or cancelling an order can change which requisitions
  // count as "open" (consumed by a new line, or freed back up by a cancel), so
  // every reload refreshes that grid too — regardless of which tab is showing,
  // it must not go on displaying rows that were just acted on.
  const reload = () => Promise.all([loadItems(), loadStats(), loadPendingReqs()])

  // ── Debounce ──────────────────────────────────────────────────
  const onSearchInput = (val: string) => {
    setSearchInput(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1) }, 400)
  }

  const onReqSearchInput = (val: string) => {
    setReqSearchInput(val)
    if (reqSearchTimer.current) clearTimeout(reqSearchTimer.current)
    reqSearchTimer.current = setTimeout(() => { setReqSearch(val); setReqPage(1) }, 400)
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

  // ── Sort / page / columns ─────────────────────────────────────
  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
    setPage(1)
  }
  const handlePageSize = (v: number) => { setPageSize(v); setPage(1) }
  const toggleCol = (key: string) => setCols(cs => cs.map(c => c.key === key ? { ...c, visible: !c.visible } : c))
  // Cancel Reason is only ever populated on a cancelled row, so it stays out of
  // the way while any other list is showing.
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
  const toggleSelectRow = (item: PurchaseOrderRow) =>
    setSelectedRows(p => p.some(r => r.id === item.id) ? p.filter(r => r.id !== item.id) : [...p, item])

  // ── Pending Requisition row selection ───────────────────────────
  const reqPageIds        = reqItems.map(r => r.id)
  const reqAllPageSelected  = reqPageIds.length > 0 && reqPageIds.every(id => reqSelected.some(r => r.id === id))
  const reqSomePageSelected = reqPageIds.some(id => reqSelected.some(r => r.id === id))

  useEffect(() => {
    if (reqMasterCheckRef.current)
      reqMasterCheckRef.current.indeterminate = reqSomePageSelected && !reqAllPageSelected
  }, [reqSomePageSelected, reqAllPageSelected])

  const toggleSelectReqPage = () => {
    if (reqAllPageSelected) setReqSelected(p => p.filter(r => !reqPageIds.includes(r.id)))
    else setReqSelected(p => [...p, ...reqItems.filter(u => !p.some(r => r.id === u.id))])
  }
  const toggleSelectReqRow = (item: RequisitionOpt) =>
    setReqSelected(p => p.some(r => r.id === item.id) ? p.filter(r => r.id !== item.id) : [...p, item])

  // ── Grid export ───────────────────────────────────────────────
  const buildExportRows = (rows: PurchaseOrderRow[]) =>
    rows.map(r => ({
      'PO Number':      r.po_number ?? '',
      'Supplier':       r.vendor_company_name ?? '',
      'Supplier Code':  r.vendor_code ?? '',
      'Procurement BU': buName(r.buss_unit_id),
      'Creation Date':  formatDate(String(r.po_date)),
      'Expected':       r.expected_date ? formatDate(String(r.expected_date)) : '',
      'Requisition':    r.req_number ?? '',
      'Payment Term':   payTermName(r.pay_term),
      'Currency':       r.currency_code,
      'Lines':          r.line_count,
      'Qty':            r.total_qty ?? 0,
      'Ordered RS':     amt(n(r.ordered_amount)),
      'Tax':            amt(n(r.tax_amount)),
      'Total Value':    amt(n(r.total_value)),
      'Buyer':          r.buyer_name ?? '',
      'Status':         statusLabel(r.po_status),
      ...(statusFilter === 'cancelled' && { 'Cancel Reason': r.cancel_reason ?? '' }),
      'Created':        formatDateTime(String(r.created_at)),
    }))

  const handleExport = async (scope: 'all' | 'selected', format: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false)
    let rows: PurchaseOrderRow[]
    if (scope === 'selected') {
      rows = selectedRows
      if (!rows.length) { toast.error('No rows selected'); return }
    } else {
      setExporting(true)
      try {
        const res = await apiService.get('/purchase-orders', {
          params: { page: 1, limit: 9999, search, sort_by: sortBy, sort_dir: sortDir, status: statusFilter },
        })
        rows = res.data?.data ?? []
      } catch { toast.error('Failed to fetch export data'); setExporting(false); return }
      setExporting(false)
    }
    const data  = buildExportRows(rows)
    const fname = `purchase_order_${statusFilter}`
    if (format === 'csv')        exportToCSV(data, fname)
    else if (format === 'excel') void exportToExcel(data, fname)
    else                         void exportToPDF(data, fname, 'Purchase Order Report')
  }

  // ── Cell renderer ─────────────────────────────────────────────
  const renderCell = (col: ColDef, row: PurchaseOrderRow) => {
    const muted = { color: 'var(--text-muted)' }
    const dash  = <span style={muted}>—</span>
    switch (col.key) {
      case 'po_number':
        return <span className="font-mono text-sm font-semibold" style={{ color: 'var(--accent-gold)' }}>{row.po_number ?? '—'}</span>
      case 'vendor_company_name':
        return (
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{row.vendor_company_name ?? '—'}</div>
            {row.vendor_code && <div className="font-mono text-xs" style={muted}>{row.vendor_code}</div>}
          </div>
        )
      case 'buss_unit_id':
        return <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{buName(row.buss_unit_id)}</span>
      case 'po_date':
        return <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(String(row.po_date))}</span>
      case 'expected_date':
        return row.expected_date
          ? <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(String(row.expected_date))}</span>
          : dash
      case 'req_number':
        return row.req_number
          ? <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{row.req_number}</span>
          : dash
      case 'pay_term':
        return payTermName(row.pay_term)
          ? <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{payTermName(row.pay_term)}</span>
          : dash
      case 'currency_code':
        return <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{row.currency_code}</span>
      case 'line_count':
        return <span className="text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>{row.line_count}</span>
      case 'total_qty':
        return <span className="text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>{row.total_qty ?? 0}</span>
      case 'ordered_amount':
      case 'tax_amount':
        return <span className="text-sm font-mono tabular-nums" style={{ color: 'var(--text-secondary)' }}>{money(row[col.key], row.currency_code)}</span>
      case 'total_value':
        return <span className="text-sm font-mono font-semibold tabular-nums" style={{ color: 'var(--accent-gold)' }}>{money(row.total_value, row.currency_code)}</span>
      case 'buyer_name':
        return row.buyer_name
          ? <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{row.buyer_name}</span>
          : dash
      case 'po_status':
        return <Badge label={statusLabel(row.po_status)} variant={STATUS_BADGE[row.po_status]} />
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

  const reqPageNumbers = useMemo((): (number | '...')[] => {
    if (reqTotalPages <= 7) return Array.from({ length: reqTotalPages }, (_, i) => i + 1)
    if (reqPage <= 4) return [1, 2, 3, 4, 5, '...', reqTotalPages]
    if (reqPage >= reqTotalPages - 3) return [1, '...', reqTotalPages-4, reqTotalPages-3, reqTotalPages-2, reqTotalPages-1, reqTotalPages]
    return [1, '...', reqPage - 1, reqPage, reqPage + 1, '...', reqTotalPages]
  }, [reqPage, reqTotalPages])

  const reqStartRow = reqTotal === 0 ? 0 : (reqPage - 1) * reqPageSize + 1
  const reqEndRow    = Math.min(reqPage * reqPageSize, reqTotal)

  // ── Supplier ──────────────────────────────────────────────────
  const searchSuppliers = async (q: string): Promise<SupplierOpt[]> => {
    try {
      const r = await apiService.get('/purchase-orders/lov/suppliers', { params: { search: q || '%' } })
      return r.data?.data ?? []
    } catch {
      toast.error('Failed to search suppliers')
      return []
    }
  }

  // Everything the order takes from the supplier lands here. All of it
  // overwrites what was on screen — picking a different supplier must not leave
  // the previous one's address behind — which is safe because opening a saved
  // order never runs this.
  const handleSupplierSelect = async (opt: SupplierOpt) => {
    setHeader(f => ({
      ...f,
      supplier_id:         String(opt.id),
      vendor_code:         opt.code ?? '',
      vendor_company_name: opt.name ?? '',
    }))
    setDirty(true)
    if (formErrors.supplier_id) setFormErrors(e => ({ ...e, supplier_id: undefined }))
    try {
      const r = await apiService.get(`/purchase-orders/suppliers/${opt.id}/defaults`)
      const d = r.data?.data ?? {}
      setHeader(f => ({
        ...f,
        supplier_address: d.supplier_address ?? '',
        comm_email:       d.comm_email ?? '',
      }))
    } catch { /* best-effort — the fields stay editable either way */ }
    // Rates are struck against the supplier's own contract, so every rate note
    // on screen describes the previous supplier. The rates themselves are left
    // alone — they may have been negotiated by hand — but the stale working is
    // dropped.
    setLines(ls => ls.map(l => ({ ...l, rate_info: null })))
  }

  const handleSupplierClear = () => {
    setHeader(f => ({ ...f, supplier_id: '', vendor_code: '', vendor_company_name: '' }))
    setDirty(true)
  }

  // ── Line item picker ──────────────────────────────────────────
  const searchLineItems = async (itemtype: ItemType, q: string): Promise<ItemLovOpt[]> => {
    try {
      const r = await apiService.get(`/purchase-orders/lov/items/${itemtype}`, { params: { search: q || '%' } })
      return r.data?.data ?? []
    } catch {
      toast.error('Failed to search items')
      return []
    }
  }

  // The rate a line is bought at, read off the supplier's Rate Contract. Called
  // when an item is picked and when a weight that a per-gram contract multiplies
  // by is edited. `applyRate` is false when the caller only wants the working
  // refreshed, so a hand-negotiated rate is never overwritten behind the buyer's
  // back.
  const rateLine = async (
    idx: number,
    line: LineForm,
    opts: { applyRate?: boolean } = {},
  ) => {
    const { applyRate = true } = opts
    const supplierId = header.supplier_id
    if (!supplierId || !line.sku_code.trim()) return

    setRatingIdx(idx)
    try {
      const r = await apiService.get('/purchase-orders/item-rate', {
        params: {
          supplier_id: supplierId,
          itemtype:    line.itemtype,
          sku_code:    line.sku_code.trim(),
          net_weight:  n(line.net_weight),
        },
      })
      const info: RateInfo = r.data?.data
      if (!info) return
      setLines(ls => ls.map((l, i) => {
        if (i !== idx) return l
        const next: LineForm = { ...l, rate_info: info }
        if (applyRate && info.rate_found && info.rate_per_unit !== null) {
          next.rate_per_unit = String(info.rate_per_unit)
        }
        return next
      }))
    } catch { /* a missing contract is not an error — the cell stays editable */ }
    finally { setRatingIdx(c => (c === idx ? null : c)) }
  }

  const handleItemSelect = (idx: number, opt: ItemLovOpt) => {
    const current = lines[idx]
    if (!current) return

    const gross = n(opt.gross_weight)
    const net   = n(opt.net_weight)
    const pf    = purityFactor(opt.purity)
    const pure  = pf !== null ? net * pf : 0
    // Only the BOM-backed types have weights to offer; for the rest these stay
    // as the buyer left them.
    const fromBom = WEIGHTS_FROM_BOM.includes(current.itemtype)

    const picked: LineForm = {
      ...current,
      item_id:          opt.id,
      sku_code:         opt.code,
      item_description: opt.description ?? current.item_description,
      gross_weight:     fromBom ? (gross ? gross.toFixed(4) : '') : current.gross_weight,
      net_weight:       fromBom ? (net   ? net.toFixed(4)   : '') : current.net_weight,
      pure_weight:      pure ? pure.toFixed(4) : current.pure_weight,
      vendor_item_no:   opt.vendor_item_no ?? current.vendor_item_no,
      rate_info:        null,
    }

    setLines(ls => ls.map((l, i) => i === idx ? picked : l))
    setDirty(true)
    void rateLine(idx, picked)
  }

  // Typing over the cell without picking from the dropdown: the code is kept as
  // typed but the master row it pointed at is not, or the line would carry an
  // item_id belonging to a different SKU.
  const setLineItemText = (idx: number, val: string) => {
    setLines(ls => ls.map((l, i) => i === idx ? { ...l, sku_code: val, item_id: null, rate_info: null } : l))
    setDirty(true)
  }

  const onItemTypeChange = (idx: number, t: ItemType) => {
    // The SKU belongs to the old master, so it goes with it — keeping it would
    // leave a code the new type's picker could never have produced.
    setLines(ls => ls.map((l, i) => i === idx ? {
      ...l,
      itemtype: t,
      item_id: null, sku_code: '', item_description: '',
      gross_weight: '', net_weight: '', pure_weight: '',
      vendor_item_no: '', uom: DEFAULT_UOM[t], rate_info: null,
    } : l))
    setDirty(true)
  }

  // Pure Wt is the fine-metal content of Net Wt, and a per-gram rate contract
  // multiplies by Net Wt — so editing that cell re-reads the contract.
  const onNetWeightChange = (idx: number, val: string) => {
    setLines(ls => ls.map((l, i) => i === idx ? { ...l, net_weight: val } : l))
    setDirty(true)
    const l = lines[idx]
    if (l?.rate_info?.rate_found && l.rate_info.rate_basis === 'PER_GM') {
      void rateLine(idx, { ...l, net_weight: val })
    }
  }

  // ── Lines ─────────────────────────────────────────────────────
  // The header decides what a line can even contain — the supplier decides which
  // rate contract prices it — so it is validated before a line is added rather
  // than leaving the buyer to fill a row that has nothing to price against.
  const validateHeader = (): boolean => {
    const errs: Partial<Record<keyof HeaderForm, string>> = {}
    if (!header.buss_unit_id) errs.buss_unit_id = 'Procurement BU is required'
    if (!header.supplier_id)  errs.supplier_id  = 'Supplier is required'
    if (!header.po_date)      errs.po_date      = 'Creation Date is required'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const newLine = (): LineForm => ({
    ...blankLine,
    requested_date: header.expected_date || dateFromToday(REQUESTED_DATE_LEAD_DAYS),
  })

  const addLine = () => {
    if (!validateHeader()) {
      toast.error('Complete the Header above before adding a line')
      return
    }
    setLines(ls => [...ls, newLine()])
    setDirty(true)
  }

  const removeLine = (idx: number) => {
    setLines(ls => ls.filter((_, i) => i !== idx))
    setDirty(true)
  }

  // ── Requisition → lines ───────────────────────────────────────
  const searchRequisitions = async (q: string): Promise<RequisitionOpt[]> => {
    try {
      const r = await apiService.get('/purchase-orders/lov/requisitions', {
        params: { search: q || '%', ...(editItem && { exclude_po: editItem.id }) },
      })
      return r.data?.data ?? []
    } catch {
      toast.error('Failed to search requisitions')
      return []
    }
  }

  // Shared by the interactive "Select Req and populate lines below" picker
  // above and by the bulk "Convert to PO" action off the Pending Requisition
  // tab — both turn one open requisition into an order line the same way.
  const requisitionToLine = (req: RequisitionOpt, fallbackRequestedDate: string): LineForm => {
    const itemtype = (ITEM_TYPES.some(t => t.code === req.itemtype) ? req.itemtype : 'FG') as ItemType
    return {
      ...blankLine,
      itemtype,
      item_id:          req.item_id,
      sku_code:         req.sku_code,
      item_description: req.item_description ?? '',
      item_qty:         String(Math.trunc(n(req.item_qty))),
      uom:              req.uom || DEFAULT_UOM[itemtype],
      gross_weight:     n(req.gross_weight) ? n(req.gross_weight).toFixed(4) : '',
      net_weight:       n(req.net_weight)   ? n(req.net_weight).toFixed(4)   : '',
      pure_weight:      n(req.pure_weight)  ? n(req.pure_weight).toFixed(4)  : '',
      vendor_item_no:   req.vendor_item_no ?? '',
      req_number:       req.requisition_number,
      // The date the requisition asked for, which is the date the PO promises.
      requested_date:   req.required_date ? String(req.required_date).slice(0, 10) : fallbackRequestedDate,
      remarks:          req.remarks ?? '',
    }
  }

  const pullRequisition = (req: RequisitionOpt) => {
    if (!validateHeader()) {
      toast.error('Complete the Header above before populating lines')
      return
    }
    if (lines.some(l => l.req_number === req.requisition_number)) {
      toast.error(`${req.requisition_number} is already on this order`)
      return
    }
    const pulled = requisitionToLine(req, header.expected_date || dateFromToday(REQUESTED_DATE_LEAD_DAYS))
    setLines(ls => [...ls, pulled])
    setDirty(true)
    toast.success(`${req.requisition_number} added as line ${lines.length + 1}`)
    // Price it off the supplier's contract, the same as a hand-picked item.
    void rateLine(lines.length, pulled)
  }

  // ── Totals ────────────────────────────────────────────────────
  const formTotals = useMemo(() => {
    const real = lines.filter(isRealLine)
    const ordered = round2(real.reduce((s, l) => s + lineValue(l), 0))
    const tax     = round2(real.reduce((s, l) => s + lineTax(l), 0))
    return {
      qty:     real.reduce((s, l) => s + Math.trunc(n(l.item_qty)), 0),
      ordered,
      tax,
      total:   round2(ordered + tax),
    }
  }, [lines])

  // ── Open / close the form ─────────────────────────────────────
  const openAdd = () => {
    setFormMode('add'); setEditItem(null)
    setHeader({ ...blankHeader, po_date: today() })
    setLines([]); setFormErrors({}); setDirty(false); setView('form')
  }

  // The Pending Requisition tab's bulk action: the buyer has multi-selected
  // open requisitions with no order raised yet, so there is no supplier to
  // validate against — unlike pullRequisition above, the header opens blank
  // and the buyer picks the supplier (and BU) after the lines are already in.
  const openAddFromRequisitions = () => {
    if (reqSelected.length === 0) return
    const fallbackRequestedDate = dateFromToday(REQUESTED_DATE_LEAD_DAYS)
    const newLines = reqSelected.map(req => requisitionToLine(req, fallbackRequestedDate))
    setFormMode('add'); setEditItem(null)
    setHeader({ ...blankHeader, po_date: today() })
    setLines(newLines); setFormErrors({}); setDirty(true); setView('form')
    setReqSelected([])
  }

  // After a workflow action the PO's status has moved on, so the badge and the
  // form's editability have to catch up without reloading the whole screen. A PO
  // that has left the buyer's hands drops straight into read-only.
  const refreshEditItem = async () => {
    if (!editItem) return
    try {
      const res = await apiService.get(`/purchase-orders/${editItem.id}`)
      const status = res.data?.data?.po_status as PurchaseOrderRow['po_status'] | undefined
      if (!status) return
      setEditItem(prev => prev && ({ ...prev, po_status: status }))
      if (!EDITABLE_STATUSES.includes(status)) setFormMode('view')
    } catch { /* the panel already reported the action's own outcome */ }
  }

  const loadOrderIntoForm = async (row: PurchaseOrderRow, mode: 'edit' | 'view') => {
    try {
      const res = await apiService.get(`/purchase-orders/${row.id}`)
      const d = res.data?.data
      if (!d) { toast.error('Failed to load purchase order'); return }
      setFormMode(mode); setEditItem(row)
      setHeader({
        buss_unit_id:        d.buss_unit_id ?? '',
        supplier_id:         String(d.supplier_id ?? ''),
        vendor_code:         d.vendor_code ?? '',
        vendor_company_name: d.vendor_company_name ?? '',
        supplier_address:    d.supplier_address ?? '',
        comm_email:          d.comm_email ?? '',
        pay_term:            d.pay_term ?? '',
        ship_to_location:    d.ship_to_location ?? '',
        bill_to_location:    d.bill_to_location ?? '',
        currency_code:       d.currency_code ?? 'INR',
        po_date:             String(d.po_date ?? '').slice(0, 10),
        expected_date:       d.expected_date ? String(d.expected_date).slice(0, 10) : '',
        remarks:             d.remarks ?? '',
      })
      const dl: PurchaseOrderLine[] = d.lines ?? []
      setLines(dl.map(l => ({
        itemtype:         (l.itemtype ?? 'FG') as ItemType,
        item_id:          l.item_id ?? null,
        sku_code:         l.sku_code ?? '',
        item_description: l.item_description ?? '',
        item_qty:         String(Math.trunc(n(l.item_qty))),
        uom:              l.uom ?? '',
        gross_weight:     n(l.gross_weight) ? n(l.gross_weight).toFixed(4) : '',
        net_weight:       n(l.net_weight)   ? n(l.net_weight).toFixed(4)   : '',
        pure_weight:      n(l.pure_weight)  ? n(l.pure_weight).toFixed(4)  : '',
        rate_per_unit:    String(n(l.rate_per_unit)),
        tax_pct:          n(l.tax_pct) ? String(n(l.tax_pct)) : '',
        vendor_item_no:   l.vendor_item_no ?? '',
        req_number:       l.req_number ?? '',
        requested_date:   l.requested_date ? String(l.requested_date).slice(0, 10) : '',
        line_status:      l.line_status ?? 'DRAFT',
        remarks:          l.remarks ?? '',
        // Only the resulting rate is stored, not the contract behind it — the
        // working is re-read when the item or a weight is touched.
        rate_info:        null,
      })))
      setFormErrors({}); setDirty(false); setView('form')
    } catch {
      toast.error('Failed to load purchase order')
    }
  }

  const backToList = () => {
    setView('list'); setBackAsk(false)
    setHeader(blankHeader); setLines([]); setFormErrors({}); setDirty(false)
  }
  // A read-only view has nothing to lose — leave straight away
  const askBackToList = () => { if (isViewMode || !dirty) backToList(); else setBackAsk(true) }

  // ── Save ──────────────────────────────────────────────────────
  const validate = (): boolean => {
    if (!validateHeader()) { toast.error('Complete the required header fields'); return false }

    const real = lines.filter(isRealLine)
    if (real.length === 0) { toast.error('Add at least one order line'); return false }

    for (let i = 0; i < real.length; i++) {
      const l   = real[i]
      const qty = Math.trunc(n(l.item_qty))
      if (!l.sku_code.trim()) { toast.error(`Line ${i + 1}: SKU / Item is required`); return false }
      if (qty <= 0)           { toast.error(`Line ${i + 1}: Qty must be a whole number greater than 0`); return false }
      if (n(l.rate_per_unit) < 0) { toast.error(`Line ${i + 1}: Rate / Unit cannot be negative`); return false }

      const g = n(l.gross_weight), nw = n(l.net_weight), p = n(l.pure_weight)
      if (g < 0 || nw < 0 || p < 0) { toast.error(`Line ${i + 1}: Weights cannot be negative`); return false }
      if (g > 0 && nw > g)  { toast.error(`Line ${i + 1}: Net Wt cannot be greater than Gr.Wt`); return false }
      if (nw > 0 && p > nw) { toast.error(`Line ${i + 1}: Pure Wt cannot be greater than Net Wt`); return false }

      const t = n(l.tax_pct)
      if (t < 0 || t > 100) { toast.error(`Line ${i + 1}: Tax % must be between 0 and 100`); return false }
    }
    return true
  }

  const buildPayload = (action: 'draft' | 'submit') => ({
    action,
    buss_unit_id:     header.buss_unit_id,
    supplier_id:      Number(header.supplier_id),
    supplier_address: header.supplier_address.trim() || null,
    comm_email:       header.comm_email.trim() || null,
    pay_term:         header.pay_term || null,
    ship_to_location: header.ship_to_location.trim() || null,
    bill_to_location: header.bill_to_location.trim() || null,
    currency_code:    header.currency_code,
    po_date:          header.po_date,
    expected_date:    header.expected_date || null,
    remarks:          header.remarks.trim() || null,
    lines: lines.filter(isRealLine).map(l => ({
      itemtype:         l.itemtype,
      item_id:          l.item_id,
      sku_code:         l.sku_code.trim(),
      item_description: l.item_description.trim() || null,
      item_qty:         Math.trunc(n(l.item_qty)),
      uom:              l.uom || null,
      gross_weight:     n(l.gross_weight),
      net_weight:       n(l.net_weight),
      pure_weight:      n(l.pure_weight),
      // Value, tax and line total are the server's to derive — sending them
      // would only invite the two to disagree.
      rate_per_unit:    n(l.rate_per_unit),
      tax_pct:          n(l.tax_pct),
      vendor_item_no:   l.vendor_item_no.trim() || null,
      req_number:       l.req_number.trim() || null,
      requested_date:   l.requested_date || null,
      remarks:          l.remarks.trim() || null,
    })),
  })

  const saveOrder = async (action: 'draft' | 'submit') => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = buildPayload(action)
      const res = isNew
        ? await apiService.post('/purchase-orders', payload)
        : await apiService.put(`/purchase-orders/${editItem!.id}`, payload)
      toast.success(res.data?.message || 'Purchase order saved')
      backToList()
      await reload()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to save purchase order')
    } finally { setSaving(false); setSubmitAsk(false) }
  }

  const confirmCancel = async (reason?: string) => {
    if (!cancelItem) return
    try {
      const res = await apiService.delete(
        `/purchase-orders/${cancelItem.id}`,
        reason ? { data: { reason } } : undefined,
      )
      toast.success(res.data?.message || 'Purchase order cancelled')
      setCancelItem(null)
      await reload()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to cancel purchase order')
    }
  }

  // ── Print preview ─────────────────────────────────────────────
  const [printData,    setPrintData]    = useState<PrintData | null>(null)
  const [printExpOpen, setPrintExpOpen] = useState(false)
  const printExpRef                     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (printExpRef.current && !printExpRef.current.contains(e.target as Node)) setPrintExpOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Build print data from the currently open form
  const printFromForm = () => {
    const real = lines.filter(isRealLine)
    setPrintData({
      po_number:           editItem?.po_number ?? '(Unsaved Draft)',
      po_status:           editItem ? (isViewMode ? editItem.po_status : 'DRAFT') : 'DRAFT',
      po_date:             header.po_date,
      expected_date:       header.expected_date,
      currency_code:       header.currency_code,
      bu_name:             buName(header.buss_unit_id) || '—',
      vendor_code:         header.vendor_code,
      vendor_company_name: header.vendor_company_name || '—',
      supplier_address:    header.supplier_address,
      comm_email:          header.comm_email,
      pay_term:            payTermName(header.pay_term),
      ship_to_location:    header.ship_to_location,
      bill_to_location:    header.bill_to_location,
      buyer_name:          editItem?.buyer_name ?? '',
      req_number:          [...new Set(real.map(l => l.req_number).filter(Boolean))].join(', '),
      remarks:             header.remarks,
      total_qty:           formTotals.qty,
      ordered_amount:      formTotals.ordered,
      tax_amount:          formTotals.tax,
      total_value:         formTotals.total,
      lines: real.map((l, i) => ({
        line_no:          i + 1,
        itemtype:         l.itemtype,
        sku_code:         l.sku_code,
        item_description: l.item_description,
        item_qty:         Math.trunc(n(l.item_qty)),
        uom:              l.uom,
        net_weight:       n(l.net_weight),
        rate_per_unit:    n(l.rate_per_unit),
        line_value:       lineValue(l),
        tax_pct:          n(l.tax_pct),
        tax_amount:       lineTax(l),
        line_total:       lineTotal(l),
        requested_date:   l.requested_date,
      })),
    })
  }

  // Build print data from a grid row (fetches the full detail)
  const printFromRow = async (row: PurchaseOrderRow) => {
    try {
      const res = await apiService.get(`/purchase-orders/${row.id}`)
      const d = res.data?.data
      if (!d) { toast.error('Failed to load purchase order'); return }
      const dl: PurchaseOrderLine[] = d.lines ?? []
      setPrintData({
        po_number:           d.po_number ?? '',
        po_status:           d.po_status ?? 'DRAFT',
        po_date:             String(d.po_date ?? '').slice(0, 10),
        expected_date:       d.expected_date ? String(d.expected_date).slice(0, 10) : '',
        currency_code:       d.currency_code ?? 'INR',
        bu_name:             buName(d.buss_unit_id ?? ''),
        vendor_code:         d.vendor_code ?? '',
        vendor_company_name: d.vendor_company_name ?? '',
        supplier_address:    d.supplier_address ?? '',
        comm_email:          d.comm_email ?? '',
        pay_term:            payTermName(d.pay_term),
        ship_to_location:    d.ship_to_location ?? '',
        bill_to_location:    d.bill_to_location ?? '',
        buyer_name:          d.buyer_name ?? '',
        req_number:          d.req_number ?? '',
        remarks:             d.remarks ?? '',
        total_qty:           n(d.total_qty),
        ordered_amount:      n(d.ordered_amount),
        tax_amount:          n(d.tax_amount),
        total_value:         n(d.total_value),
        lines: dl.map((l, i) => ({
          line_no:          l.line_no ?? i + 1,
          itemtype:         l.itemtype ?? '',
          sku_code:         l.sku_code ?? '',
          item_description: l.item_description ?? '',
          item_qty:         Math.trunc(n(l.item_qty)),
          uom:              l.uom ?? '',
          net_weight:       n(l.net_weight),
          rate_per_unit:    n(l.rate_per_unit),
          line_value:       n(l.line_value),
          tax_pct:          n(l.tax_pct),
          tax_amount:       n(l.tax_amount),
          line_total:       n(l.line_total),
          requested_date:   l.requested_date ? String(l.requested_date).slice(0, 10) : '',
        })),
      })
    } catch {
      toast.error('Failed to load purchase order')
    }
  }

  const printFileBase = () => (printData?.po_number ?? 'purchase_order').replace(/[^\w-]/g, '_')

  const doBrowserPrint = () => {
    if (!printData) return
    const w = window.open('', '_blank', 'width=1000,height=750')
    if (!w) { toast.error('Popup blocked — allow popups to print'); return }
    w.document.write(`<!doctype html><html><head><title>${escapeHtml(printData.po_number)} — Purchase Order</title></head><body style="margin:24px;">${buildOrderHTML(printData)}</body></html>`)
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
    const fmt = (v: number) => `${d.currency_code} ${amt(v)}`
    const pageW = doc.internal.pageSize.getWidth()

    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text('PURCHASE ORDER', 40, 44)
    doc.setFontSize(12)
    doc.text(d.bu_name, 40, 62)
    doc.setFontSize(11)
    doc.text(d.po_number, pageW - 40, 44, { align: 'right' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text(`PO Date: ${d.po_date ? formatDate(d.po_date) : '-'}    Status: ${statusLabel(d.po_status)}`, pageW - 40, 58, { align: 'right' })

    const info = [
      `Supplier: ${d.vendor_company_name} (${d.vendor_code})`,
      `Address: ${d.supplier_address || '-'}`,
      `Email: ${d.comm_email || '-'}    Payment Term: ${d.pay_term || '-'}    Currency: ${d.currency_code}    Buyer: ${d.buyer_name || '-'}`,
      `Requisition No: ${d.req_number || '-'}    Expected: ${d.expected_date ? formatDate(d.expected_date) : '-'}`,
      `Ship To: ${d.ship_to_location || '-'}`,
      `Bill To: ${d.bill_to_location || '-'}`,
    ]
    let y = 82
    info.forEach(line => {
      const wrapped = doc.splitTextToSize(line, pageW - 80)
      doc.text(wrapped, 40, y)
      y += wrapped.length * 12
    })

    autoTable(doc, {
      startY: y + 6,
      head: [['Sl', 'Item Type', 'SKU / Item', 'Description', 'Qty', 'UOM', 'Net Wt', 'Rate / Unit', 'Value', 'Tax %', 'Line Total', 'Request Date']],
      body: d.lines.map(l => [
        l.line_no, itemTypeLabel(l.itemtype), l.sku_code, l.item_description,
        l.item_qty, l.uom, l.net_weight ? wt(l.net_weight) : '-',
        fmt(l.rate_per_unit), fmt(l.line_value), l.tax_pct ? `${l.tax_pct}%` : '-',
        fmt(l.line_total), l.requested_date ? formatDate(l.requested_date) : '-',
      ]),
      foot: [['', '', '', 'Total', d.total_qty, '', '', '', fmt(d.ordered_amount), '', fmt(d.total_value), '']],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [146, 112, 12] },
      footStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: 'bold' },
    })

    // jspdf-autotable records where the table finished on the doc it drew into
    const endY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
    doc.setFontSize(9)
    doc.text(`Ordered RS: ${fmt(d.ordered_amount)}`, pageW - 40, endY + 18, { align: 'right' })
    doc.text(`Tax: ${fmt(d.tax_amount)}`,            pageW - 40, endY + 31, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.text(`Total Value: ${fmt(d.total_value)}`,   pageW - 40, endY + 44, { align: 'right' })

    doc.save(`${printFileBase()}_purchase_order.pdf`)
    setPrintExpOpen(false)
  }

  const doExportWord = () => {
    if (!printData) return
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${escapeHtml(printData.po_number)}</title></head><body>${buildOrderHTML(printData)}</body></html>`
    downloadBlob(html, `${printFileBase()}_purchase_order.doc`, 'application/msword')
    setPrintExpOpen(false)
  }

  const doExportRTF = () => {
    if (!printData) return
    downloadBlob(buildOrderRTF(printData), `${printFileBase()}_purchase_order.rtf`, 'application/rtf')
    setPrintExpOpen(false)
  }

  // Addressed to the supplier's communication email when the order carries one —
  // that address is the whole point of capturing it on the header.
  const doMail = () => {
    if (!printData) return
    const to      = encodeURIComponent(printData.comm_email || '')
    const subject = encodeURIComponent(`Purchase Order ${printData.po_number} — ${printData.vendor_company_name}`)
    const body    = encodeURIComponent(buildOrderText(printData))
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`
  }

  const doWhatsApp = () => {
    if (!printData) return
    window.open(`https://wa.me/?text=${encodeURIComponent(buildOrderText(printData))}`, '_blank')
  }

  // ── Print preview modal — reachable from both the list and the form ──
  const printModal = (
    <Modal
      isOpen={!!printData}
      onClose={() => setPrintData(null)}
      title={`Print Preview — ${printData?.po_number ?? ''}`}
      size="4xl"
      footer={
        <>
          <button onClick={() => setPrintData(null)} className="btn-secondary">Close</button>

          <div ref={printExpRef} className="relative">
            <button onClick={() => setPrintExpOpen(o => !o)} className="btn-secondary flex items-center gap-1.5">
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export
              <ChevronDownIcon className="w-3.5 h-3.5" />
            </button>
            {printExpOpen && (
              <div className="absolute right-0 bottom-full mb-1 z-50 w-44 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg p-1.5">
                {([
                  ['PDF (.pdf)',  doExportPDF],
                  ['Word (.doc)', doExportWord],
                  ['RTF (.rtf)',  doExportRTF],
                ] as const).map(([label, fn]) => (
                  <button key={label} onClick={fn}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] text-left">
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
          {/* eslint-disable-next-line react/no-danger */}
          <div className="p-6" dangerouslySetInnerHTML={{ __html: buildOrderHTML(printData) }} />
        </div>
      )}
    </Modal>
  )

  // ── Stat cards config ─────────────────────────────────────────
  const statCards: Array<{ key: StatusFilter; label: string; count: number; icon: React.ReactNode; iconBg: string }> = [
    { key: 'pending_requisition', label: 'Pending Requisition', count: stats.pending_requisitions, icon: <ClipboardDocumentListIcon className="w-3.5 h-3.5 text-purple-600" />, iconBg: 'bg-purple-100' },
    { key: 'all',              label: 'All',              count: stats.draft + stats.pending + stats.approved + stats.rejected + stats.cancelled, icon: <ClockIcon className="w-3.5 h-3.5 text-blue-500" />,        iconBg: 'bg-blue-100'  },
    { key: 'draft',            label: 'Draft',            count: stats.draft,     icon: <PencilIcon className="w-3.5 h-3.5 text-amber-600" />,      iconBg: 'bg-amber-100' },
    { key: 'pending_approval', label: 'Pending Approval', count: stats.pending,   icon: <ClockIcon className="w-3.5 h-3.5 text-blue-600" />,        iconBg: 'bg-blue-100'  },
    { key: 'approved',         label: 'Approved',         count: stats.approved,  icon: <CheckCircleIcon className="w-3.5 h-3.5 text-green-600" />, iconBg: 'bg-green-100' },
    { key: 'rejected',         label: 'Rejected',         count: stats.rejected,  icon: <XCircleIcon className="w-3.5 h-3.5 text-red-600" />,       iconBg: 'bg-red-100'   },
    { key: 'cancelled',        label: 'Cancelled',        count: stats.cancelled, icon: <NoSymbolIcon className="w-3.5 h-3.5 text-red-500" />,      iconBg: 'bg-red-100'   },
  ]

  const inputCls = `form-input ${isViewMode ? 'cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]' : ''}`

  // ─────────────────────────────────────────────────────────────────
  // FORM VIEW — full screen (same pattern as Sales Order)
  // ─────────────────────────────────────────────────────────────────
  if (view === 'form') {
    return (
      <>
        <div className="space-y-5">

          {/* Breadcrumb + back */}
          <div className="flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <div className="flex items-center gap-2">
              <span>Purchase Management</span>
              <span>/</span>
              <button onClick={askBackToList} className="hover:text-[var(--accent-gold)] flex items-center gap-1">
                <ArrowLeftIcon className="w-3.5 h-3.5" /> Purchase Order
              </button>
              <span>/</span>
              <span style={{ color: 'var(--accent-gold)' }}>{isNew ? 'New Order' : editItem?.po_number}</span>
            </div>
            <button onClick={askBackToList} className="btn-secondary text-xs py-1 px-3">Back to List</button>
          </div>

          {/* Title row */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {isNew ? 'New Purchase Order' : `${isViewMode ? 'View' : 'Edit'} Purchase Order — ${editItem?.po_number}`}
            </h1>
            {editItem && <Badge label={statusLabel(editItem.po_status)} variant={STATUS_BADGE[editItem.po_status]} />}
            {isViewMode && (
              <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]" style={{ color: 'var(--text-muted)' }}>
                <EyeIcon className="w-3.5 h-3.5" />
                Read-only view — no changes can be made.
                {editItem?.po_status === 'PENDING_APPROVAL' && ' Orders awaiting approval cannot be edited.'}
                {editItem?.po_status === 'APPROVED' && ' Approved orders cannot be edited.'}
              </span>
            )}
          </div>

          {/* ── Approval workflow ── */}
          {/* Only on a saved PO: the panel acts on a record id, and a brand new
              order has nothing to submit yet. */}
          {editItem && (
            <WorkflowPanel
              recordType="PURCHASE_ORDER"
              recordId={editItem.id}
              compact
              // While the order is still editable, the bottom bar's own Submit
              // button already covers SUBMIT — and does so more safely, since it
              // saves the form's current edits first. Showing WorkflowPanel's own
              // button too would let a click submit stale, previously-saved data
              // while looking identical to the safe one. Once the order is
              // read-only (awaiting approval, approved, etc.) there is no bottom-
              // bar equivalent, so WorkflowPanel's own actions (Approve/Reject/
              // RFC) are shown normally.
              hideActions={!isViewMode}
              onSelfApprovalChange={setWfSelfApproval}
              onActionComplete={async () => { await Promise.all([loadItems(), loadStats(), loadPendingReqs()]); await refreshEditItem() }}
            />
          )}

          {/* ── Header ── */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-bold" style={{ color: 'var(--accent-gold)' }}>Header</h3>

            {/* Left block: procurement · Right block: supplier */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-4">
                <Field label="Procurement BU" required error={formErrors.buss_unit_id}>
                  <select value={header.buss_unit_id} disabled={isViewMode}
                    onChange={e => setField('buss_unit_id', e.target.value)} className={inputCls}>
                    <option value="">Select Business Unit</option>
                    {buOpts.map(o => <option key={o.lookup_code} value={o.lookup_code}>{o.lookup_name}</option>)}
                  </select>
                </Field>

                <Field label="Ship to Location">
                  <textarea value={header.ship_to_location} readOnly={isViewMode} rows={2}
                    onChange={e => setField('ship_to_location', e.target.value)}
                    placeholder="Where the goods are to be delivered…"
                    className={`${inputCls} resize-none`} />
                </Field>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Bill to Location
                    </label>
                    {!isViewMode && (
                      <button type="button"
                        onClick={() => setField('bill_to_location', header.ship_to_location)}
                        className="text-xs text-[var(--accent-gold)] hover:underline">
                        Same as Ship To
                      </button>
                    )}
                  </div>
                  <textarea value={header.bill_to_location} readOnly={isViewMode} rows={2}
                    onChange={e => setField('bill_to_location', e.target.value)}
                    placeholder="Where the supplier's invoice is to be sent…"
                    className={`${inputCls} resize-none`} />
                </div>

                <Field label="Currency">
                  <select value={header.currency_code} disabled={isViewMode}
                    onChange={e => setField('currency_code', e.target.value)} className={inputCls}>
                    {currencyOpts.map(o => <option key={o.lookup_code} value={o.lookup_code}>{o.lookup_name}</option>)}
                  </select>
                </Field>
              </div>

              <div className="space-y-4">
                <Field label="Supplier" required error={formErrors.supplier_id}>
                  <SupplierSearch
                    display={header.vendor_company_name}
                    disabled={isViewMode}
                    error={!!formErrors.supplier_id}
                    fetch={searchSuppliers}
                    onSelect={handleSupplierSelect}
                    onClear={handleSupplierClear}
                  />
                </Field>

                <Field label="Supplier Address" hint="Filled from Supplier Master; edit if this order ships from elsewhere.">
                  <textarea value={header.supplier_address} readOnly={isViewMode} rows={2}
                    onChange={e => setField('supplier_address', e.target.value)}
                    className={`${inputCls} resize-none`} />
                </Field>

                <Field label="Communication Email">
                  <input type="email" value={header.comm_email} readOnly={isViewMode}
                    onChange={e => setField('comm_email', e.target.value)}
                    placeholder="supplier@example.com"
                    className={inputCls} />
                </Field>

                <Field label="Payment Term">
                  <select value={header.pay_term} disabled={isViewMode}
                    onChange={e => setField('pay_term', e.target.value)} className={inputCls}>
                    <option value="">Select Payment Term</option>
                    {payTermOpts.map(o => <option key={o.lookup_code} value={o.lookup_code}>{o.lookup_name}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            {/* System-assigned strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <Field label="PO Number" hint={isNew ? 'Assigned when the order is first saved.' : undefined}>
                <input value={editItem?.po_number ?? ''} readOnly placeholder="PO-000000 (auto)"
                  className="form-input font-mono font-semibold cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]"
                  style={{ color: 'var(--accent-gold)' }} />
              </Field>

              <Field label="Creation Date" required error={formErrors.po_date}>
                <input type="date" value={header.po_date} readOnly={isViewMode}
                  onChange={e => setField('po_date', e.target.value)} className={inputCls} />
              </Field>

              <Field label="Status">
                <div className="flex items-center h-[38px]">
                  <Badge label={statusLabel(editItem?.po_status ?? 'DRAFT')}
                    variant={STATUS_BADGE[editItem?.po_status ?? 'DRAFT']} />
                </div>
              </Field>

              <Field label="Buyer" hint={isNew ? 'Recorded from your login on save.' : undefined}>
                <input value={editItem?.buyer_name ?? ''} readOnly placeholder="Current user"
                  className="form-input cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]" />
              </Field>
            </div>

            {/* Requisition + expected date + remarks */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
              <div className="lg:col-span-2">
                <Field label="Requisition Number"
                  hint="Each requisition picked is appended as an order line below, with its item, qty and weights.">
                  {isViewMode ? (
                    <input value={editItem?.req_number ?? ''} readOnly placeholder="—"
                      className="form-input font-mono cursor-not-allowed opacity-75 bg-[var(--bg-tertiary)]" />
                  ) : (
                    <RequisitionSearch fetch={searchRequisitions} onSelect={pullRequisition} />
                  )}
                </Field>
              </div>

              <Field label="Expected Delivery">
                <input type="date" value={header.expected_date} readOnly={isViewMode}
                  onChange={e => setField('expected_date', e.target.value)} className={inputCls} />
              </Field>

              <div className="lg:col-span-3">
                <Field label="Remarks">
                  <textarea value={header.remarks} readOnly={isViewMode} rows={2}
                    onChange={e => setField('remarks', e.target.value)}
                    placeholder="Terms, packing or delivery instructions for the supplier…"
                    className={`${inputCls} resize-none`} />
                </Field>
              </div>
            </div>

            {/* Money summary — Ordered RS / Tax / Total Value */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
              {([
                ['Ordered RS',  formTotals.ordered, false],
                ['Tax',         formTotals.tax,     false],
                ['Total Value', formTotals.total,   true ],
              ] as const).map(([label, value, strong]) => (
                <div key={label} className="rounded-lg border px-3 py-2"
                  style={{ borderColor: strong ? 'var(--accent-gold)' : 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className={`font-mono tabular-nums ${strong ? 'text-lg font-bold' : 'text-base font-semibold'}`}
                    style={{ color: strong ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
                    {money(value, header.currency_code)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Lines ── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold" style={{ color: 'var(--accent-gold)' }}>Lines</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)]" style={{ color: 'var(--text-muted)' }}>
                  {lines.length} {lines.length === 1 ? 'line' : 'lines'}
                </span>
                {!isViewMode && header.supplier_id && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)]" style={{ color: 'var(--text-muted)' }}>
                    Rates from {header.vendor_company_name}&apos;s Rate Contract
                  </span>
                )}
              </div>
              {!isViewMode && (
                <button type="button" onClick={addLine} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
                  <PlusIcon className="w-3.5 h-3.5" /> Add +
                </button>
              )}
            </div>

            {lines.length === 0 ? (
              <div className="rounded-lg border border-dashed py-8 text-center text-xs"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                {isViewMode
                  ? 'This order has no line items.'
                  : 'No lines yet — complete the Header above, then pick a Requisition or click "Add +".'}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--bg-secondary)]">
                    <tr>
                      {LINE_COLS.map((c, i) => (
                        <th key={i} className="px-2 py-2 text-left font-semibold uppercase tracking-wide whitespace-nowrap"
                          style={{ color: 'var(--text-muted)' }}>
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

                          <td className="px-1 py-1.5" style={{ minWidth: '120px' }}>
                            <select value={l.itemtype} disabled={isViewMode}
                              onChange={e => onItemTypeChange(idx, e.target.value as ItemType)}
                              className={lineInputCls} style={lineInputStyle}>
                              {ITEM_TYPES.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                            </select>
                          </td>

                          <td className="px-1 py-1.5" style={{ minWidth: '150px' }}>
                            {isViewMode ? (
                              <input value={l.sku_code} readOnly className={lineInputCls} style={lineInputStyle} />
                            ) : (
                              <ItemSearch
                                key={`${idx}-${l.itemtype}`}
                                value={l.sku_code}
                                fetch={q => searchLineItems(l.itemtype, q)}
                                onSelect={opt => handleItemSelect(idx, opt)}
                                onType={val => setLineItemText(idx, val)}
                              />
                            )}
                          </td>

                          <td className="px-1 py-1.5" style={{ minWidth: '160px' }}>
                            <input value={l.item_description} disabled={isViewMode} maxLength={500}
                              onChange={e => setLineField(idx, 'item_description', e.target.value)}
                              placeholder="Description" className={lineInputCls} style={lineInputStyle} />
                          </td>

                          <td className="px-1 py-1.5" style={{ minWidth: '70px' }}>
                            <input type="number" min="1" step="1" value={l.item_qty} disabled={isViewMode}
                              // The column is INTEGER, so a decimal point here
                              // only ever ends in a rejected save.
                              onChange={e => setLineField(idx, 'item_qty', e.target.value.replace(/[^\d]/g, ''))}
                              className={`${lineInputCls} text-right`} style={lineInputStyle} />
                          </td>

                          <td className="px-1 py-1.5" style={{ minWidth: '80px' }}>
                            <select value={l.uom} disabled={isViewMode}
                              onChange={e => setLineField(idx, 'uom', e.target.value)}
                              className={lineInputCls} style={lineInputStyle}>
                              <option value="">—</option>
                              {uomOpts.map(o => <option key={o.lookup_code} value={o.lookup_code}>{o.lookup_name}</option>)}
                            </select>
                          </td>

                          <td className="px-1 py-1.5" style={{ minWidth: '90px' }}>
                            <input type="number" min="0" step="0.0001" value={l.gross_weight} disabled={isViewMode}
                              onChange={e => setLineField(idx, 'gross_weight', e.target.value)}
                              className={`${lineInputCls} text-right`} style={lineInputStyle} />
                          </td>

                          <td className="px-1 py-1.5" style={{ minWidth: '90px' }}>
                            <input type="number" min="0" step="0.0001" value={l.net_weight} disabled={isViewMode}
                              onChange={e => onNetWeightChange(idx, e.target.value)}
                              className={`${lineInputCls} text-right`} style={lineInputStyle} />
                          </td>

                          <td className="px-1 py-1.5" style={{ minWidth: '90px' }}>
                            <input type="number" min="0" step="0.0001" value={l.pure_weight} disabled={isViewMode}
                              onChange={e => setLineField(idx, 'pure_weight', e.target.value)}
                              className={`${lineInputCls} text-right`} style={lineInputStyle} />
                          </td>

                          <td className="px-1 py-1.5" style={{ minWidth: '110px' }}>
                            <div className="relative">
                              <input type="number" min="0" step="0.0001" value={l.rate_per_unit} disabled={isViewMode}
                                onChange={e => setLineField(idx, 'rate_per_unit', e.target.value)}
                                className={`${lineInputCls} text-right`} style={lineInputStyle} />
                              {ratingIdx === idx && (
                                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />
                              )}
                            </div>
                          </td>

                          <td className="px-2 py-1.5 text-right font-mono tabular-nums whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                            {amt(lineValue(l))}
                          </td>

                          <td className="px-1 py-1.5" style={{ minWidth: '70px' }}>
                            <input type="number" min="0" max="100" step="0.001" value={l.tax_pct} disabled={isViewMode}
                              onChange={e => setLineField(idx, 'tax_pct', e.target.value)}
                              placeholder="0" className={`${lineInputCls} text-right`} style={lineInputStyle} />
                          </td>

                          <td className="px-2 py-1.5 text-right font-mono tabular-nums whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                            {amt(lineTax(l))}
                          </td>

                          <td className="px-2 py-1.5 text-right font-mono font-semibold tabular-nums whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                            {amt(lineTotal(l))}
                          </td>

                          <td className="px-1 py-1.5" style={{ minWidth: '130px' }}>
                            <input type="date" value={l.requested_date} disabled={isViewMode}
                              onChange={e => setLineField(idx, 'requested_date', e.target.value)}
                              className={lineInputCls} style={lineInputStyle} />
                          </td>

                          <td className="px-2 py-1.5 font-mono whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {l.req_number || '—'}
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

                        {/* Where the Rate came from. Sits under the row so it is
                            read without a click and without squeezing the columns. */}
                        {l.rate_info && l.sku_code.trim() && (
                          <tr style={{ background: 'var(--bg-secondary)' }}>
                            <td />
                            <td colSpan={LINE_COLS.length - 1} className="px-2 pb-1.5 pt-0.5 text-[11px]">
                              {l.rate_info.rate_found ? (
                                <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                                  <span className="not-italic mr-1" style={{ color: 'var(--accent-gold)' }}>ƒ</span>
                                  Rate Contract {l.rate_info.matched_sku === 'ALL' ? `(${itemTypeLabel(l.itemtype)} catch-all)` : ''}
                                  {' '}{curSym(header.currency_code)}{amt(l.rate_info.rate_value ?? 0)}
                                  {l.rate_info.rate_basis === 'PER_GM'
                                    ? ` /gm × ${wt(n(l.net_weight))} gm`
                                    : ' per pc'}
                                  {' = '}{curSym(header.currency_code)}{amt(l.rate_info.rate_per_unit ?? 0)}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>
                                  No Rate Contract on file for {l.sku_code} with this supplier — enter the rate by hand,
                                  or add one under Masters → Supplier Rate Contract.
                                </span>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
                      <td colSpan={4} className="px-2 py-2 text-right font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
                        Total
                      </td>
                      <td className="px-2 py-2 text-right font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{formTotals.qty}</td>
                      {/* UOM, Gr.Wt, Net Wt, Pure Wt, Rate */}
                      <td colSpan={5} />
                      <td className="px-2 py-2 text-right font-mono font-bold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                        {amt(formTotals.ordered)}
                      </td>
                      <td />
                      <td className="px-2 py-2 text-right font-mono font-bold whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                        {amt(formTotals.tax)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono font-bold whitespace-nowrap" style={{ color: 'var(--accent-gold)' }}>
                        {money(formTotals.total, header.currency_code)}
                      </td>
                      <td colSpan={3} />
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
                  <button onClick={() => saveOrder('draft')} disabled={saving}
                    className="btn-secondary flex items-center gap-1.5 disabled:opacity-50">
                    {saving
                      ? <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      : <DocumentDuplicateIcon className="w-4 h-4" />
                    }
                    Save Draft
                  </button>
                  <button onClick={() => { if (validate()) setSubmitAsk(true) }} disabled={saving}
                    className="btn-primary flex items-center gap-1.5 disabled:opacity-50">
                    <PaperAirplaneIcon className="w-4 h-4" />
                    {wfSelfApproval ? 'Submit & Auto-Approve' : 'Submit for Approval'}
                  </button>
                </>
              )}
              {canPrint && (
                <button onClick={printFromForm} className="btn-secondary flex items-center gap-1.5">
                  <PrinterIcon className="w-4 h-4" />
                  Print
                </button>
              )}
              <button onClick={askBackToList} className="btn-secondary ml-auto">
                {isViewMode ? 'Close' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>

        {printModal}

        {/* ── Submit confirmation ── */}
        <ConfirmDialog
          isOpen={submitAsk}
          title="Submit Purchase Order"
          message={`Submit this purchase order${editItem ? ` (${editItem.po_number})` : ''} for approval? It can no longer be edited until an approver acts on it.`}
          confirmLabel="Submit"
          variant="info"
          onConfirm={() => saveOrder('submit')}
          onCancel={() => setSubmitAsk(false)}
        />

        {/* ── Unsaved changes confirmation ── */}
        <ConfirmDialog
          isOpen={backAsk}
          title="Unsaved Changes"
          message="You have unsaved changes. Leave this purchase order? All unsaved data will be lost."
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
      <PageBreadcrumb parent="Purchase Management" current="Purchase Order" />

      {/* Stats + Add */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 pl-1 flex-wrap">
          {statCards.map(s => (
            <button
              key={s.key}
              onClick={() => {
                setStatusFilter(s.key)
                setPage(1); setColFilters({}); setSearchInput(''); setSearch('')
                setReqPage(1); setReqSearchInput(''); setReqSearch('')
              }}
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
          isPendingReqTab ? (
            <button
              onClick={openAddFromRequisitions}
              disabled={reqSelected.length === 0}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <ClipboardDocumentListIcon className="w-4 h-4" />
              Convert to PO{reqSelected.length > 0 ? ` (${reqSelected.length})` : ''}
            </button>
          ) : (
            <button onClick={openAdd} className="btn-primary flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              New Purchase Order
            </button>
          )
        )}
      </div>

      {/* Card */}
      {isPendingReqTab ? (
      <div className="card overflow-hidden">
        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[var(--border-color)]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input value={reqSearchInput} onChange={e => onReqSearchInput(e.target.value)}
              placeholder="Search requisition no, SKU, description…"
              className="form-input pl-9 pr-8 py-1.5 text-sm w-full" />
            {reqSearchInput && (
              <button onClick={() => { setReqSearchInput(''); setReqSearch(''); setReqPage(1) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-sm ml-auto" style={{ color: 'var(--text-secondary)' }}>
            <span className="hidden sm:inline">Show</span>
            <select value={reqPageSize} onChange={e => { setReqPageSize(Number(e.target.value)); setReqPage(1) }}
              className="form-input py-1.5 text-sm" style={{ width: '72px' }}>
              {PAGE_SIZES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <span className="hidden sm:inline">per page</span>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                <th className="px-4 py-2.5 w-10">
                  <input type="checkbox" ref={reqMasterCheckRef} checked={reqAllPageSelected} onChange={toggleSelectReqPage}
                    className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer" />
                </th>
                {['Req No', 'Req Date', 'Item Type', 'SKU / Item', 'Description', 'Qty', 'UOM', 'Required Date', 'Remarks'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                    style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={reqFetching ? 'opacity-50 pointer-events-none' : ''}>
              {reqLoading ? (
                Array.from({ length: Math.min(reqPageSize, 6) }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-color)]">
                    <td className="px-4 py-3"><div className="h-4 w-4 rounded animate-pulse bg-[var(--bg-tertiary)]" /></td>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 rounded animate-pulse bg-[var(--bg-tertiary)]" style={{ width: '80px' }} /></td>
                    ))}
                  </tr>
                ))
              ) : reqItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex flex-col items-center gap-3">
                      <ClipboardDocumentListIcon className="w-10 h-10 opacity-30" />
                      {reqSearch
                        ? 'No open requisitions match the current search.'
                        : 'No open requisitions — every active requisition is already on a purchase order.'
                      }
                    </div>
                  </td>
                </tr>
              ) : (
                reqItems.map((r, idx) => (
                  <tr key={r.id}
                    className={`border-b border-[var(--border-color)] transition-colors hover:bg-[var(--bg-secondary)]
                      ${idx % 2 !== 0 ? 'bg-[var(--bg-primary)]/40' : ''}
                      ${reqSelected.some(s => s.id === r.id) ? 'bg-[var(--accent-gold)]/5' : ''}`}>
                    <td className="px-4 py-2.5">
                      <input type="checkbox" checked={reqSelected.some(s => s.id === r.id)} onChange={() => toggleSelectReqRow(r)}
                        className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer" />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold" style={{ color: 'var(--accent-gold)' }}>{r.requisition_number}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(String(r.requisition_date))}</td>
                    <td className="px-4 py-2.5"><Badge label={itemTypeLabel(r.itemtype)} variant="secondary" /></td>
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{r.sku_code}</td>
                    <td className="px-4 py-2.5 text-xs truncate max-w-xs" style={{ color: 'var(--text-secondary)' }}>{r.item_description || '—'}</td>
                    <td className="px-4 py-2.5 text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>{Math.trunc(n(r.item_qty))}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{r.uom || '—'}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{r.required_date ? formatDate(String(r.required_date)) : '—'}</td>
                    <td className="px-4 py-2.5 text-xs truncate max-w-xs" style={{ color: 'var(--text-secondary)' }}>{r.remarks || '—'}</td>
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
              {reqTotal === 0 ? 'No records found' : `Showing ${reqStartRow}–${reqEndRow} of ${reqTotal} open requisitions`}
            </span>
            {reqSelected.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent-gold)]">
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-gold)]/15 border border-[var(--accent-gold)]/30">
                  {reqSelected.length} selected
                </span>
                <button onClick={() => setReqSelected([])} className="text-xs hover:text-[var(--text-primary)] underline underline-offset-2" style={{ color: 'var(--text-muted)' }}>
                  Clear
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button disabled={reqPage === 1} onClick={() => setReqPage(1)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">«</button>
            <button disabled={reqPage === 1} onClick={() => setReqPage(p => p - 1)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">‹</button>
            {reqPageNumbers.map((p, i) =>
              p === '...' ? (
                <span key={`d-${i}`} className="px-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>…</span>
              ) : (
                <button key={p} onClick={() => setReqPage(p as number)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${reqPage === p ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)] text-white font-semibold' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                  {p}
                </button>
              )
            )}
            <button disabled={reqPage >= reqTotalPages} onClick={() => setReqPage(p => p + 1)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">›</button>
            <button disabled={reqPage >= reqTotalPages} onClick={() => setReqPage(reqTotalPages)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">»</button>
          </div>

          <span className="text-sm hidden sm:block" style={{ color: 'var(--text-muted)' }}>
            Page {reqPage} of {reqTotalPages || 1}
          </span>
        </div>
      </div>
      ) : (
      <div className="card overflow-hidden">

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[var(--border-color)]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input value={searchInput} onChange={e => onSearchInput(e.target.value)}
              placeholder="Search PO no, supplier, requisition…"
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
              <button onClick={() => setExportOpen(o => !o)} disabled={exporting} title="Export"
                className={`p-1.5 rounded-lg border transition-colors ${exportOpen ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
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
                <th className="px-4 py-2.5 w-40 text-center text-xs font-semibold uppercase tracking-wide sticky right-0 z-10 border-l border-[var(--border-color)] bg-[var(--bg-secondary)]"
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
                          style={{ width: col.key === 'vendor_company_name' ? '150px' : '80px' }} />
                      </td>
                    ))}
                    <td className="px-4 py-3 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]">
                      <div className="h-4 w-24 rounded animate-pulse bg-[var(--bg-tertiary)]" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length + 2} className="px-4 py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex flex-col items-center gap-3">
                      <TruckIcon className="w-10 h-10 opacity-30" />
                      {search || Object.values(colFilters).some(v => v)
                        ? 'No purchase orders match the current filters.'
                        : `No ${statusFilter === 'all' ? '' : statusFilter} purchase orders found. Click "New Purchase Order" to raise one.`
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
                          <button onClick={() => loadOrderIntoForm(item, 'edit')}
                            className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500 ${!EDITABLE_STATUSES.includes(item.po_status) ? 'invisible' : ''}`}
                            title="Edit">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canView && (
                          <button onClick={() => loadOrderIntoForm(item, 'view')}
                            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]" title="View">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canPrint && (
                          <button onClick={() => printFromRow(item)}
                            className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--accent-gold)]" title="Print preview">
                            <PrinterIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setCancelItem(item)}
                            className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-red-500 ${item.po_status === 'CANCELLED' ? 'invisible' : ''}`}
                            title="Cancel order">
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
              {total === 0 ? 'No records found' : `Showing ${startRow}–${endRow} of ${total} purchase orders`}
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
      )}

      {printModal}

      {/* ── Cancel order dialog ── */}
      <DeactivateReasonDialog
        isOpen={!!cancelItem}
        title="Cancel Purchase Order"
        itemLabel={`Purchase order "${cancelItem?.po_number}" to ${cancelItem?.vendor_company_name ?? 'this supplier'}`}
        onConfirm={reason => confirmCancel(reason)}
        onCancel={() => setCancelItem(null)}
      />
    </div>
  )
}

export default PurchaseOrderPage
