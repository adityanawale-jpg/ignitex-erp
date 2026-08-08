import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  PencilIcon, MagnifyingGlassIcon, XMarkIcon,
  ViewColumnsIcon, ChevronUpDownIcon, ChevronUpIcon, ChevronDownIcon,
  FunnelIcon, ArrowDownTrayIcon, PlusIcon, TrashIcon,
  CheckCircleIcon, ClockIcon, ArrowPathIcon, ArrowLeftIcon,
  BarsArrowUpIcon, SparklesIcon, EyeIcon, PaperAirplaneIcon,
} from '@heroicons/react/24/outline'
import Badge          from '@/components/common/Badge'
import WorkflowPanel, { ACTION_META } from '@/components/workflow/WorkflowPanel'
import { formatDateTime, exportToCSV, exportToExcel, exportToPDF } from '@/utils/helpers'
import { getLovMany } from '@/utils/lovCache'
import { apiService } from '@/api/apiService'
import { usePermission } from '@/hooks'
import { useLocation } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface BOMVariantRow {
  variant_id: number
  sku_code: string
  karat_color: string | null
  weight_band: string | null
  size: string | null
  collection_name: string | null
  design_code: string
  design_no: string | null
  product_name: string | null
  bom_id: number | null
  bom_status: string
  bom_version: string | null
  gross_weight: number | null
  net_weight: number | null
  min_weight: number | null
  max_weight: number | null
  stone_cts: number | null
  stone_gms: number | null
  bom_updated_at: string | null
}

interface BOMLine {
  _key: string
  id?: number
  item_type: string  // 'FINDING' | 'STONE' | 'METAL' | 'COMPONENT'
  seq_no: number
  item_id: number
  item_code: string
  item_name: string
  item_quantity: number
  uom1_code: string
  purity_code: string     // METAL only
  gross_weight: number
  net_weight: number      // FINDING, METAL only
  component_weight: number // COMPONENT only
  stone_cts: number       // STONE only
  stone_gms: number       // STONE only — auto = stone_cts / 5, readonly
  remarks: string
  gross_weight_base?: number // FINDING only — per-unit master value; gross_weight = base × qty
  net_weight_base?:   number // FINDING only — per-unit master value; net_weight   = base × qty
}

interface LovOpt  { id: number; code: string; name: string; std_cts?: number | null; [key: string]: unknown }
interface UomOpt  { lookup_code: string; lookup_name: string }
interface ColDef  { key: string; label: string; sortKey?: string; visible: boolean; minW?: string }

interface BOMHeaderInfo {
  variant_id: number; sku_code: string; karat_color: string | null
  weight_band: string | null; size: string | null; collection_name: string | null
  design_code: string; design_no: string | null; product_name: string | null
}

interface BOMRecord {
  id: number; bom_version: string; bom_status: string
  gross_weight: number; net_weight: number; component_weight: number
  min_weight: number | null; max_weight: number | null
  stone_cts: number; stone_gms: number; effective_from: string | null; effective_to: string | null
  remarks: string | null; rejection_reason: string | null
  submitted_by_name: string | null; submitted_at: string | null
  approved_by_name:  string | null; approved_at:  string | null
  rejected_by_name:  string | null; rejected_at:  string | null
}

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────
const PAGE_SIZES = [10, 25, 50, 100]

// Strips negative signs and caps decimal digits (0 = whole numbers only, e.g. Qty; 6 = weight/cts/gm fields)
const sanitizeDecimalStr = (raw: string, maxDecimals: number): string => {
  let v = raw.replace(/-/g, '')
  if (maxDecimals === 0) return v.replace(/\./g, '')
  const parts = v.split('.')
  if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('')
  const dot = v.indexOf('.')
  if (dot !== -1 && v.length - dot - 1 > maxDecimals) v = v.slice(0, dot + 1 + maxDecimals)
  return v
}
const blockNumKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault()
}


type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'gold'
const STATUS_META: Record<string, { label: string; variant: BadgeVariant }> = {
  DRAFT:            { label: 'Draft',            variant: 'secondary' },
  PENDING_APPROVAL: { label: 'Pending Approval', variant: 'warning'   },
  ACTIVE:           { label: 'Active',           variant: 'success'   },
  REJECTED:         { label: 'Rejected',         variant: 'danger'    },
  NO_BOM:           { label: 'No BOM',           variant: 'secondary' },
}

const INITIAL_COLS: ColDef[] = [
  { key: 'sku_code',        label: 'SKU Code',    sortKey: 'sku_code',        visible: true,  minW: '140px' },
  { key: 'collection_name', label: 'Collection',  sortKey: 'collection_name', visible: true,  minW: '130px' },
  { key: 'karat_color',     label: 'Karat/Color', sortKey: 'karat_color',     visible: true,  minW: '110px' },
  { key: 'size',            label: 'Size',        sortKey: 'size',            visible: true,  minW: '80px'  },
  { key: 'weight_band',     label: 'Wt Band',     sortKey: 'weight_band',     visible: true,  minW: '100px' },
  { key: 'design_code',     label: 'Design Code', sortKey: 'design_code',     visible: true,  minW: '130px' },
  { key: 'product_name',    label: 'Product',     sortKey: 'product_name',    visible: true,  minW: '120px' },
  { key: 'design_no',       label: 'Design No',   sortKey: 'design_no',       visible: false, minW: '110px' },
  { key: 'bom_version',     label: 'Version',     sortKey: 'bom_version',     visible: true,  minW: '80px'  },
  { key: 'bom_status',      label: 'BOM Status',  sortKey: 'bom_status',      visible: true,  minW: '150px' },
  { key: 'bom_updated_at',  label: 'Last Updated',sortKey: 'bom_updated_at',  visible: false, minW: '140px' },
]

// LOV type per item_type → maps to /fg-bom/lov/:type endpoint
const LOV_BY_ITEM_TYPE: Record<string, string> = {
  FINDING:   'findings',   // fin_item_variant where sku_type='FIN'
  STONE:     'stones',     // stone_item_master
  METAL:     'metals',     // metal_master
  COMPONENT: 'components', // component_master
}

// ─────────────────────────────────────────────────────────────────
// LovSearch
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
    // '%' or empty → fetch all (send '' so backend returns everything)
    const q2 = (val === '%') ? '' : val
    if (val.length < 1) { setOpts([]); setOpen(false); return }
    try { const r = await fetch(q2); setOpts(r); setOpen(true) } catch { /* */ }
  }
  return (
    <div>
      <div className="relative">
        <input value={q} onChange={e => doSearch(e.target.value)}
          onFocus={() => { if (q.length >= 1 && opts.length) setOpen(true) }}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder={placeholder} disabled={disabled}
          className="w-full text-sm px-3 py-2 pr-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] disabled:opacity-50"
          style={{
            borderColor: error ? '#ef4444' : 'var(--border-color)',
            background: 'var(--bg-primary)', color: 'var(--text-primary)',
            boxShadow: error ? '0 0 0 1px #ef4444' : undefined,
          }} />
        {onClear && q && !disabled && (
          <button type="button" title="Clear — select another item"
            onMouseDown={() => { onClear(); setQ(''); setOpts([]); setOpen(false) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-red-500">
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
// BOMLineGrid — unified single grid (replaces 3-tab design)
// ─────────────────────────────────────────────────────────────────
interface BOMLineGridProps {
  lines: BOMLine[]
  setLines: React.Dispatch<React.SetStateAction<BOMLine[]>>
  readOnly: boolean
  uomOpts: UomOpt[]
  itemTypeOpts: UomOpt[]  // from FG_ITEM_TYPE LOV
  purityOpts: UomOpt[]    // from PURITY LOV (Metal Master purity)
  karatColor?: string | null
}
function BOMLineGrid({ lines, setLines, readOnly, uomOpts, itemTypeOpts, purityOpts, karatColor }: BOMLineGridProps) {
  const [editing,    setEditing]    = useState<BOMLine | null>(null)
  const [fetchingW,  setFetchingW]  = useState(false)
  const [gridSearch, setGridSearch] = useState('')
  const [triedSave,  setTriedSave]  = useState(false)

  const defaultItemType = itemTypeOpts[0]?.lookup_code || 'FINDING'

  const defaultUomFor = (type: string) =>
    (type === 'STONE' || type === 'FINDING' || type === 'COMPONENT') ? 'PCS' : ''

  const emptyLine = (): BOMLine => ({
    _key: `_${Date.now()}`, item_type: defaultItemType, seq_no: lines.length + 1,
    item_id: 0, item_code: '', item_name: '', item_quantity: 1, uom1_code: defaultUomFor(defaultItemType), purity_code: '',
    gross_weight: 0, net_weight: 0, component_weight: 0, stone_cts: 0, stone_gms: 0, remarks: '',
  })

  const cancelEdit = () => { setEditing(null); setTriedSave(false) }

  const saveLine = () => {
    setTriedSave(true)
    if (!editing || !editing.item_id) return
    if (editing.item_type === 'COMPONENT') {
      if (!editing.uom1_code) { toast.error('UOM 1 is mandatory for Component lines'); return }
      if (!editing.component_weight) { toast.error('Component Wt (gm) is mandatory for Component lines'); return }
    }
    if (editing.item_type === 'METAL' && !editing.net_weight) {
      toast.error('Net Wt (gm) is mandatory for Metal lines'); return
    }
    if (editing.item_type === 'STONE') {
      if (!editing.uom1_code) { toast.error('UOM 1 is mandatory for Stone lines'); return }
      if (!editing.item_quantity) { toast.error('Qty is mandatory for Stone lines'); return }
      if (!editing.stone_cts) { toast.error('Stone Cts is mandatory for Stone lines'); return }
    }
    if (editing.item_type === 'FINDING') {
      if (!editing.uom1_code) { toast.error('UOM 1 is mandatory for Finding lines'); return }
      if (!editing.item_quantity) { toast.error('Qty is mandatory for Finding lines'); return }
    }
    const exists = lines.some(l => l._key === editing._key)
    setLines(prev => exists
      ? prev.map(l => l._key === editing._key ? editing : l)
      : [...prev, { ...editing, seq_no: prev.length + 1 }])
    setTriedSave(false)
    cancelEdit()
  }

  const deleteLine = (_key: string) => setLines(prev => prev.filter(l => l._key !== _key))

  // Cancel the current item selection so the user can search & pick another item
  // of the same item_type, without resetting the rest of the line form.
  const clearItemSelection = () => {
    setTriedSave(false)
    setEditing(p => p && ({
      ...p, item_id: 0, item_code: '', item_name: '', purity_code: '',
      gross_weight: 0, net_weight: 0, component_weight: 0, stone_cts: 0, stone_gms: 0,
      gross_weight_base: undefined, net_weight_base: undefined,
    }))
  }

  const searchLov = async (q: string, itemType: string): Promise<LovOpt[]> => {
    const lovType = LOV_BY_ITEM_TYPE[itemType] || 'variants'
    const params = new URLSearchParams({ search: q })
    // karat_color filter not applied for FINDING — findings have their own karat
    const r = await apiService.get(`/fg-bom/lov/${lovType}?${params}`)
    return r.data?.data ?? []
  }

  const handleItemTypeChange = (newType: string) => {
    setTriedSave(false)
    setEditing(p => p && ({
      ...p, item_type: newType,
      item_id: 0, item_code: '', item_name: '', purity_code: '',
      uom1_code: defaultUomFor(newType),
      gross_weight: 0, net_weight: 0, component_weight: 0, stone_cts: 0, stone_gms: 0,
      gross_weight_base: undefined, net_weight_base: undefined,
    }))
  }

  const handleItemSelect = (id: number, code: string, name: string, opt: LovOpt) => {
    const currentType = editing?.item_type
    setEditing(p => {
      if (!p) return p
      const base = {
        ...p, item_id: id, item_code: code, item_name: name,
        gross_weight: 0, net_weight: 0, component_weight: 0, stone_cts: 0, stone_gms: 0,
        gross_weight_base: undefined, net_weight_base: undefined,
      }
      if (currentType === 'STONE' && opt.std_cts != null) {
        const cts = Number(opt.std_cts)
        return { ...base, stone_cts: cts, stone_gms: +((cts / 5).toFixed(6)), uom1_code: 'PCS' }
      }
      if (currentType === 'METAL' && opt.purity) {
        return { ...base, purity_code: String(opt.purity) }
      }
      if (currentType === 'FINDING') {
        // opt.gross_weight / opt.net_weight are the per-unit (Qty=1) master values —
        // keep them as the "base" and scale the displayed totals by the current Qty.
        const grossBase = Number(opt.gross_weight ?? 0)
        const netBase    = Number(opt.net_weight   ?? 0)
        const qty        = p.item_quantity || 1
        return {
          ...base,
          gross_weight: +(grossBase * qty).toFixed(6),
          net_weight:   +(netBase   * qty).toFixed(6),
          gross_weight_base: grossBase,
          net_weight_base:   netBase,
          stone_cts:    Number(opt.stone_cts    ?? 0),
          stone_gms:    Number(opt.stone_gms    ?? 0),
          uom1_code: 'PCS',
        }
      }
      return base
    })
  }

  const updateStoneCts = (cts: number) => {
    const gms = +((cts / 5).toFixed(6))
    setEditing(p => p && ({ ...p, stone_cts: cts, stone_gms: gms }))
  }

  // METAL: Net Wt drives Gross Wt
  const updateNetWt = (v: number) =>
    setEditing(p => p && ({ ...p, net_weight: v, gross_weight: v }))

  // FINDING: Qty change rescales Gross Wt / Net Wt from the per-unit master value.
  // If no base is cached yet (e.g. editing a previously-saved line), derive it from
  // the currently stored total ÷ current Qty, then cache it for further edits.
  const updateFindingQty = (newQty: number) =>
    setEditing(p => {
      if (!p) return p
      const prevQty    = p.item_quantity || 1
      const grossBase  = p.gross_weight_base ?? (p.gross_weight / prevQty)
      const netBase    = p.net_weight_base   ?? (p.net_weight   / prevQty)
      return {
        ...p,
        item_quantity: newQty,
        gross_weight_base: grossBase,
        net_weight_base:   netBase,
        gross_weight: +(grossBase * newQty).toFixed(6),
        net_weight:   +(netBase   * newQty).toFixed(6),
      }
    })

  // COMPONENT: Component Wt drives Gross Wt
  const updateCompWt = (v: number) =>
    setEditing(p => p && ({ ...p, component_weight: v, gross_weight: v }))

  const fld = (label: string, node: React.ReactNode, required = false) => (
    <div>
      <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {node}
    </div>
  )

  const numIn = (val: number, onChange: (v: number) => void, readOnlyFld = false, integer = false, error = false) => (
    <div>
      <input type="number" step={integer ? '1' : '0.000001'} min="0" value={val || ''}
        readOnly={readOnlyFld}
        onKeyDown={readOnlyFld ? undefined : blockNumKeys}
        onChange={e => {
          if (readOnlyFld) return
          const raw = sanitizeDecimalStr(e.target.value, integer ? 0 : 6)
          const parsed = parseFloat(raw)
          onChange(isNaN(parsed) ? 0 : Math.max(0, parsed))
        }}
        className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
        style={{
          borderColor: error ? '#ef4444' : 'var(--border-color)',
          background: readOnlyFld ? 'var(--bg-secondary)' : 'var(--bg-primary)',
          color: readOnlyFld ? 'var(--text-muted)' : 'var(--text-primary)',
          boxShadow: error ? '0 0 0 1px #ef4444' : undefined,
        }} />
      {error && <p className="mt-1 text-xs text-red-500">Required</p>}
    </div>
  )

  const selIn = (val: string, onChange: (v: string) => void, opts: UomOpt[], error = false) => (
    <div>
      <select value={val} onChange={e => onChange(e.target.value)}
        className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
        style={{
          borderColor: error ? '#ef4444' : 'var(--border-color)',
          background: 'var(--bg-primary)', color: 'var(--text-primary)',
          boxShadow: error ? '0 0 0 1px #ef4444' : undefined,
        }}>
        <option value="">— Select —</option>
        {opts.map(o => <option key={o.lookup_code} value={o.lookup_code}>{o.lookup_name}</option>)}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">Required</p>}
    </div>
  )

  const isF = editing?.item_type === 'FINDING'
  const isS = editing?.item_type === 'STONE'
  const isM = editing?.item_type === 'METAL'
  const isC = editing?.item_type === 'COMPONENT'

  // Filter grid rows by search
  const filteredLines = useMemo(() => {
    const q = gridSearch.trim().toLowerCase()
    if (!q) return lines
    return lines.filter(l =>
      l.item_code.toLowerCase().includes(q) ||
      l.item_name.toLowerCase().includes(q) ||
      l.item_type.toLowerCase().includes(q)
    )
  }, [lines, gridSearch])

  const fmt4 = (v?: number | null) => (v != null && v !== 0) ? (+v).toFixed(4) : '—'

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input value={gridSearch} onChange={e => setGridSearch(e.target.value)}
            placeholder="Search item code, name, type…"
            className="form-input pl-9 pr-8 py-1.5 text-sm w-full" />
          {gridSearch && (
            <button onClick={() => setGridSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        <span className="text-xs text-[var(--text-muted)]">{filteredLines.length} / {lines.length} lines</span>
      </div>

      {/* Grid table */}
      {lines.length > 0 && (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                {['#', 'Type', 'Item Code', 'Item Name', 'Qty', 'UOM 1', 'Purity',
                  'Gross Wt (gm)', 'Net Wt (gm)', 'Comp Wt (gm)', 'Stone Cts', 'Stone Gm',
                  ...(readOnly ? [] : [''])
                ].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap"
                    style={{ color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLines.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-3 py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    No lines match the search
                  </td>
                </tr>
              )}
              {filteredLines.map(l => (
                <tr key={l._key} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="px-3 py-2 text-xs text-center w-8 text-[var(--text-muted)]">{l.seq_no}</td>
                  <td className="px-3 py-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'var(--accent-gold)/15', color: 'var(--accent-gold)',
                               backgroundColor: 'color-mix(in srgb, var(--accent-gold) 15%, transparent)' }}>
                      {l.item_type}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs font-semibold" style={{ color: 'var(--accent-gold)' }}>{l.item_code || '—'}</td>
                  <td className="px-3 py-2 text-xs max-w-[160px] truncate" style={{ color: 'var(--text-secondary)' }}>{l.item_name || '—'}</td>
                  <td className="px-3 py-2 text-xs text-right">{l.item_type !== 'METAL' ? l.item_quantity : '—'}</td>
                  <td className="px-3 py-2 text-xs">{l.item_type !== 'METAL' ? (uomOpts.find(o => o.lookup_code === l.uom1_code)?.lookup_name || l.uom1_code || '—') : '—'}</td>
                  <td className="px-3 py-2 text-xs">{l.item_type === 'METAL' ? (l.purity_code || '—') : '—'}</td>
                  <td className="px-3 py-2 text-xs text-right">{fmt4(l.gross_weight)}</td>
                  <td className="px-3 py-2 text-xs text-right">
                    {(l.item_type === 'FINDING' || l.item_type === 'METAL') ? fmt4(l.net_weight) : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-right">
                    {l.item_type === 'COMPONENT' ? fmt4(l.component_weight) : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-right">
                    {l.item_type === 'STONE' ? fmt4(l.stone_cts) : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-right font-semibold">
                    {l.item_type === 'STONE' ? fmt4(l.stone_gms) : '—'}
                  </td>
                  {!readOnly && (
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setEditing({ ...l })}
                          className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-blue-500">
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => deleteLine(l._key)}
                          className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-red-400">
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lines.length === 0 && readOnly && (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>No BOM lines defined</p>
      )}

      {!readOnly && !editing && (
        <button type="button" onClick={() => setEditing(emptyLine())}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-dashed transition-colors"
          style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}>
          <PlusIcon className="w-4 h-4" /> Add BOM Line
        </button>
      )}

      {/* Edit form */}
      {editing && !readOnly && (
        <div className="p-5 rounded-xl border-2 space-y-4"
          style={{ borderColor: 'var(--accent-gold)', background: 'var(--bg-secondary)' }}>
          <p className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--accent-gold)' }}>
            {editing.id ? 'Edit BOM Line' : 'New BOM Line'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Item Type — always editable */}
            {fld('Item Type',
              <select value={editing.item_type} onChange={e => handleItemTypeChange(e.target.value)}
                className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                {itemTypeOpts.map(o => (
                  <option key={o.lookup_code} value={o.lookup_code}>{o.lookup_name}</option>
                ))}
              </select>,
              true
            )}

            {/* Item search — always editable; remounts on type change via key */}
            <div className="sm:col-span-2">
              {fld('Item',
                <LovSearch
                  key={editing.item_type}
                  display={editing.item_code}
                  placeholder={`Search ${editing.item_type.toLowerCase()}…`}
                  fetch={q => searchLov(q, editing!.item_type)}
                  onSelect={handleItemSelect}
                  onClear={clearItemSelection}
                  error={triedSave && !editing.item_id}
                  hint="Type % to show all items"
                />,
                true
              )}
            </div>

            {/* Qty — hidden for METAL; editable for FINDING (rescales Gross/Net Wt from the master per-unit value); mandatory for STONE */}
            {!isM && fld('Qty', numIn(editing.item_quantity,
              isF ? updateFindingQty : v => setEditing(p => p && ({ ...p, item_quantity: v })),
              false, true, triedSave && (isS || isF) && !editing.item_quantity),
              isS || isF
            )}

            {/* UOM 1 — hidden for METAL; readonly for FINDING; mandatory (default PCS) for COMPONENT, STONE and FINDING */}
            {!isM && fld('UOM 1',
              isF
                ? <input readOnly
                    value={uomOpts.find(o => o.lookup_code === editing.uom1_code)?.lookup_name || editing.uom1_code || '—'}
                    className="w-full text-sm px-3 py-2 border rounded-lg cursor-not-allowed"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }} />
                : selIn(editing.uom1_code, v => setEditing(p => p && ({ ...p, uom1_code: v })), uomOpts, triedSave && (isC || isS) && !editing.uom1_code),
              isC || isS || isF
            )}

            {/* Purity — METAL only */}
            {isM && fld('Purity',
              <select value={editing.purity_code}
                onChange={e => setEditing(p => p && ({ ...p, purity_code: e.target.value }))}
                className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                <option value="">— Select —</option>
                {purityOpts.map(o => <option key={o.lookup_code} value={o.lookup_code}>{o.lookup_name}</option>)}
              </select>
            )}

            {/* Gross Wt:
                FINDING  → readonly (auto-fetched from variant BOM, scaled by Qty)
                METAL    → readonly (mirrors Net Wt)
                COMPONENT→ readonly (mirrors Component Wt)
                STONE    → editable */}
            <div className={`transition-opacity duration-150 ${fetchingW ? 'opacity-40 pointer-events-none' : ''}`}>
              {fld('Gross Wt (gm)',
                numIn(editing.gross_weight,
                  v => setEditing(p => p && ({ ...p, gross_weight: v })),
                  isF || isM || isC
                )
              )}
            </div>

            {/* Net Wt — FINDING (readonly, auto-fetched & scaled by Qty) and METAL (editable, mandatory → drives Gross Wt) */}
            {(isF || isM) && (
              <div className={`transition-opacity duration-150 ${fetchingW && isF ? 'opacity-40 pointer-events-none' : ''}`}>
                {fld('Net Wt (gm)',
                  numIn(editing.net_weight, isM ? updateNetWt : v => setEditing(p => p && ({ ...p, net_weight: v })), isF, false, triedSave && isM && !editing.net_weight),
                  isM
                )}
              </div>
            )}

            {/* Component Wt — COMPONENT only, mandatory, editable → drives Gross Wt */}
            {isC && fld('Component Wt (gm)',
              numIn(editing.component_weight, updateCompWt, false, false, triedSave && !editing.component_weight),
              true
            )}

            {/* Stone Cts — STONE editable, mandatory; FINDING readonly (auto-fetched) */}
            {isS && fld('Stone Cts',
              numIn(editing.stone_cts, updateStoneCts, false, false, triedSave && !editing.stone_cts),
              true
            )}
            {isF && fld('Stone Cts (auto)', numIn(editing.stone_cts, () => {}, true))}

            {/* Stone Gm — STONE and FINDING, always readonly (auto = cts ÷ 5) */}
            {(isS || isF) && fld('Stone Gm (auto)', numIn(editing.stone_gms, () => {}, true))}

          </div>

          {/* Remarks — always editable */}
          <div>{fld('Remarks',
            <input type="text" value={editing.remarks}
              onChange={e => setEditing(p => p && ({ ...p, remarks: e.target.value }))}
              placeholder="Optional note…"
              className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
          )}</div>

          <div className="flex gap-3">
            <button type="button" onClick={saveLine} className="btn-primary text-sm">Save Line</button>
            <button type="button" onClick={cancelEdit} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────
export default function FGBOMPage() {

  // ── Navigation state (from FG Master "Open BOM") ─────────────────
  const location = useLocation()
  const navState = location.state as { openVariantId?: number; skuCode?: string } | null
  const openVariantHandled = useRef(false)

  // ── Permissions ──────────────────────────────────────────────────
  const { canCreate, canUpdate } = usePermission('MM_FG_BOM')
  const isMaker = canCreate || canUpdate

  // ── Workflow access (drives tab visibility independently of menu perms) ──
  const [wfAccess, setWfAccess] = useState<{ can_submit: boolean; can_approve: boolean } | null>(null)
  // While loading, fall back to menu-permission-based isMaker
  const wfCanSubmit = wfAccess !== null ? wfAccess.can_submit : isMaker

  // ── View state ──────────────────────────────────────────────────
  const [view, setView] = useState<'list' | 'form'>('list')

  // ── List state ──────────────────────────────────────────────────
  const [items,        setItems]        = useState<BOMVariantRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetching,     setFetching]     = useState(false)
  const isFirstLoad                     = useRef(true)
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(25)
  const [total,        setTotal]        = useState(0)
  const [totalPages,   setTotalPages]   = useState(1)
  const [sortBy,       setSortBy]       = useState('sku_code')
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('asc')
  const [searchInput,  setSearchInput]  = useState('')
  const [search,       setSearch]       = useState('')
  // Makers (canCreate/canUpdate) default to Draft; approvers default to Pending
  const [statusFilter, setStatusFilter] = useState<'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE'>(
    () => (canCreate || canUpdate) ? 'DRAFT' : 'PENDING_APPROVAL'
  )
  const [stats,        setStats]        = useState({ draft: 0, pending_approval: 0, active: 0 })
  const [cols,         setCols]         = useState<ColDef[]>(INITIAL_COLS)
  const [showColPicker,setShowColPicker]= useState(false)
  const [showFilterRow,setShowFilterRow]= useState(false)
  const [showSorting,  setShowSorting]  = useState(true)
  const [colFilters,   setColFilters]   = useState<Record<string, string>>({})
  const [selectedRows, setSelectedRows] = useState<BOMVariantRow[]>([])
  const [exportOpen,   setExportOpen]   = useState(false)
  const [exporting,    setExporting]    = useState(false)
  const colPickerRef                    = useRef<HTMLDivElement>(null)
  const exportRef                       = useRef<HTMLDivElement>(null)
  const masterRef                       = useRef<HTMLInputElement>(null)
  const searchTimer                     = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Form state ──────────────────────────────────────────────────
  const [bomLoading,    setBomLoading]    = useState(false)
  const [editRow,       setEditRow]       = useState<BOMVariantRow | null>(null)
  const [headerInfo,    setHeaderInfo]    = useState<BOMHeaderInfo | null>(null)
  const [bomRecord,     setBomRecord]     = useState<BOMRecord | null>(null)
  const [bomId,         setBomId]         = useState<number | null>(null)
  const [bomStatus,     setBomStatus]     = useState('DRAFT')
  const [bomVersion,    setBomVersion]    = useState('1.0')
  const [minWeight,     setMinWeight]     = useState('')
  const [maxWeight,     setMaxWeight]     = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [effectiveTo,   setEffectiveTo]   = useState('')
  const [remarks,       setRemarks]       = useState('')
  const [bomLines,      setBomLines]      = useState<BOMLine[]>([])
  const [linesModified, setLinesModified] = useState(false)
  // ── LOV ─────────────────────────────────────────────────────────
  const [uomOpts,      setUomOpts]      = useState<UomOpt[]>([])
  const [itemTypeOpts, setItemTypeOpts] = useState<UomOpt[]>([])
  const [purityOpts,   setPurityOpts]   = useState<UomOpt[]>([])

  // ── Computed totals (BOM form) ───────────────────────────────────
  const stoneCts       = useMemo(() =>
    bomLines.filter(l => l.item_type === 'STONE').reduce((s, l) => s + (Number(l.stone_cts) || 0), 0), [bomLines])
  const stoneGms       = useMemo(() =>
    bomLines.filter(l => l.item_type === 'STONE').reduce((s, l) => s + (Number(l.stone_gms) || 0), 0), [bomLines])
  const componentWeight = useMemo(() =>
    bomLines.filter(l => l.item_type === 'COMPONENT').reduce((s, l) => s + (Number(l.component_weight) || 0), 0), [bomLines])
  const grossWeight    = useMemo(() =>
    +bomLines.reduce((s, l) => s + (Number(l.gross_weight) || 0), 0).toFixed(6), [bomLines])
  const netWeight      = useMemo(() =>
    +bomLines.filter(l => l.item_type === 'FINDING' || l.item_type === 'METAL')
      .reduce((s, l) => s + (Number(l.net_weight) || 0), 0).toFixed(6), [bomLines])

  // Wrapper that marks lines as modified when user adds/edits/deletes a line
  const setBomLinesTracked = useCallback((a: React.SetStateAction<BOMLine[]>) => { setBomLines(a); setLinesModified(true) }, [])

  const isReadOnly = bomStatus !== 'DRAFT' || !isMaker

  // ── Grid derived ─────────────────────────────────────────────────
  const visibleCols = useMemo(() => cols.filter(c => c.visible), [cols])
  const allSelected = items.length > 0 && selectedRows.length === items.length
  const someSelected = selectedRows.length > 0 && !allSelected
  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endRow   = Math.min(page * pageSize, total)

  // indeterminate master checkbox
  useEffect(() => {
    if (masterRef.current) masterRef.current.indeterminate = someSelected
  }, [someSelected])

  // close col-picker / export on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setShowColPicker(false)
      if (exportRef.current   && !exportRef.current.contains(e.target as Node))   setExportOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Smart page numbers ───────────────────────────────────────────
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | '...')[] = []
    if (page <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages)
    } else if (page >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      pages.push(1, '...', page - 1, page, page + 1, '...', totalPages)
    }
    return pages
  }, [page, totalPages])

  // ── Load data ────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    if (view !== 'list') return
    try {
      const r = await apiService.get('/fg-bom/stats')
      setStats(r.data?.data ?? { draft: 0, pending_approval: 0, active: 0 })
    } catch { /* silent */ }
  }, [view])

  const loadList = useCallback(async () => {
    if (view !== 'list') return
    // Block first fetch until wfAccess is resolved so statusFilter is already correct
    if (wfAccess === null) return
    if (isFirstLoad.current) setLoading(true); else setFetching(true)
    try {
      const r = await apiService.get('/fg-bom', {
        params: {
          page, limit: pageSize, search, sort_by: sortBy, sort_dir: sortDir,
          status: statusFilter,
          ...(Object.keys(colFilters).some(k => colFilters[k]) && { col_filters: JSON.stringify(colFilters) }),
        },
      })
      setItems(r.data?.data ?? [])
      setTotal(r.data?.meta?.total ?? 0)
      setTotalPages(r.data?.meta?.total_pages ?? 1)
    } catch { toast.error('Failed to load BOM list') }
    finally { setLoading(false); setFetching(false); isFirstLoad.current = false }
  }, [view, wfAccess, page, pageSize, search, sortBy, sortDir, statusFilter, colFilters])

  useEffect(() => {
    // setTimeout + return cleanup: React StrictMode fires cleanup before the timer can fire,
    // so only the second (real) invocation makes the API call. Prevents duplicate calls.
    const t = setTimeout(() => loadList(), 0)
    return () => clearTimeout(t)
  }, [loadList])
  useEffect(() => {
    const t = setTimeout(() => loadStats(), 0)
    return () => clearTimeout(t)
  }, [loadStats])
  useEffect(() => {
    getLovMany(['UOM', 'FG_ITEM_TYPE', 'PURITY']).then(map => {
      setUomOpts(      (map as Record<string, UomOpt[]>).UOM          ?? [])
      setItemTypeOpts( (map as Record<string, UomOpt[]>).FG_ITEM_TYPE ?? [])
      setPurityOpts(   (map as Record<string, UomOpt[]>).PURITY       ?? [])
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    apiService.get('/workflow/access/FG_BOM').then(r => {
      if (cancelled) return
      const access = r.data?.data as { can_submit: boolean; can_approve: boolean }
      setWfAccess(access)
      if (!access?.can_submit) setStatusFilter(prev => prev === 'DRAFT' ? 'PENDING_APPROVAL' : prev)
    }).catch(() => {
      if (cancelled) return
      // On failure, unblock loadList using the menu-permission fallback
      setWfAccess({ can_submit: isMaker, can_approve: !isMaker })
    })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────
  const onSearchInput = (val: string) => {
    setSearchInput(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1) }, 350)
  }

  const switchStatus = (s: typeof statusFilter) => {
    setStatusFilter(s); setPage(1); setSelectedRows([]); setColFilters({})
    setSearchInput(''); setSearch('')
  }

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
    setPage(1)
  }

  const toggleCol = (key: string) =>
    setCols(prev => prev.map(c => c.key === key ? { ...c, visible: !c.visible } : c))

  const toggleSelectPage = () => setSelectedRows(allSelected ? [] : [...items])
  const toggleSelectRow  = (row: BOMVariantRow) =>
    setSelectedRows(prev =>
      prev.some(r => r.variant_id === row.variant_id)
        ? prev.filter(r => r.variant_id !== row.variant_id)
        : [...prev, row]
    )

  // ── Export ───────────────────────────────────────────────────────
  const handleExport = async (scope: 'all' | 'selected', fmt: 'csv' | 'excel' | 'pdf') => {
    setExporting(true); setExportOpen(false)
    try {
      let rows = scope === 'selected' ? selectedRows : items
      if (scope === 'all' && total > items.length) {
        const r = await apiService.get('/fg-bom', { params: { page: 1, limit: 9999, status: statusFilter } })
        rows = r.data?.data ?? items
      }
      const data = rows.map(r => ({
        'SKU Code': r.sku_code, 'Collection': r.collection_name ?? '', 'Karat/Color': r.karat_color ?? '',
        'Size': r.size ?? '', 'Wt Band': r.weight_band ?? '', 'Design Code': r.design_code,
        'Product': r.product_name ?? '', 'Version': r.bom_version ?? '',
        'BOM Status': STATUS_META[r.bom_status]?.label ?? r.bom_status,
      }))
      const fname = `FG_BOM_${statusFilter}_${Date.now()}`
      if (fmt === 'csv')   exportToCSV(data, fname)
      else if (fmt === 'excel') await exportToExcel(data, fname)
      else await exportToPDF(data, fname, 'FG Bill of Materials')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  // ── Open BOM form ─────────────────────────────────────────────────
  const openBOM = async (row: BOMVariantRow) => {
    setEditRow(row)
    setBomLoading(true)
    setView('form')
    try {
      const r = await apiService.get(`/fg-bom/variant/${row.variant_id}`)
      const d = r.data?.data
      setHeaderInfo({
        variant_id: d.variant_id, sku_code: d.sku_code, karat_color: d.karat_color,
        weight_band: d.weight_band, size: d.size, collection_name: d.collection_name,
        design_code: d.design_code, design_no: d.design_no, product_name: d.product_name,
      })
      const bom: BOMRecord | null = d.bom ?? null
      setBomRecord(bom); setBomId(bom?.id ?? null)
      setBomStatus(bom?.bom_status ?? 'DRAFT')
      setBomVersion(bom?.bom_version ?? '1.0')
      setMinWeight(bom?.min_weight != null ? String(bom.min_weight) : '')
      setMaxWeight(bom?.max_weight != null ? String(bom.max_weight) : '')
      setEffectiveFrom(bom?.effective_from ?? '')
      setEffectiveTo(bom?.effective_to ?? '')
      setRemarks(bom?.remarks ?? '')
      setBomLines((d.lines ?? []).map((l: BOMLine) => ({ ...l, _key: `e${l.id}`, purity_code: l.purity_code ?? '' })))
      setLinesModified(false)
    } catch { toast.error('Failed to load BOM data') }
    finally { setBomLoading(false) }
  }

  // Open BOM directly when navigated here from FG Master via "Open BOM" button
  useEffect(() => {
    if (openVariantHandled.current || !navState?.openVariantId) return
    openVariantHandled.current = true
    window.history.replaceState({}, '')
    openBOM({ variant_id: navState.openVariantId, sku_code: navState.skuCode ?? '' } as BOMVariantRow)
  }, [navState, openBOM])

  const backToList = () => {
    setView('list'); setEditRow(null); setHeaderInfo(null); setBomRecord(null)
    setBomLines([]); setBomId(null)
    // loadList/loadStats fire automatically via their view-dep effects when view → 'list'
  }

  // ── Confirm modal ─────────────────────────────────────────────────
  const [confirmState, setConfirmState] = useState<{
    title: string; message: string; confirmLabel: string; cls: string; onConfirm: () => void
  } | null>(null)
  const closeConfirm = () => setConfirmState(null)

  const WF_CONFIRM: Record<string, { title: string; message: string; confirmLabel: string; cls: string }> = {
    SUBMIT:  { title: 'Submit for Approval', message: 'Are you sure you want to submit this BOM for approval?',              confirmLabel: 'Submit',    cls: 'bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium' },
    APPROVE: { title: 'Approve BOM',         message: 'Are you sure you want to approve this BOM? This cannot be undone.',   confirmLabel: 'Approve',   cls: 'bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-medium' },
    REJECT:  { title: 'Reject BOM',          message: 'Are you sure you want to reject this BOM?',                           confirmLabel: 'Reject',    cls: 'bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium' },
    RFC:     { title: 'Request for Change',  message: 'Are you sure you want to return this BOM for correction (RFC)?',      confirmLabel: 'Yes, RFC',  cls: 'border-2 border-orange-400 text-orange-500 hover:bg-orange-50 rounded-lg px-4 py-2 text-sm font-medium' },
  }

  const askBackToList = () => setConfirmState({
    title: 'Unsaved Changes',
    message: 'You have unsaved changes. Are you sure you want to close? All unsaved data will be lost.',
    confirmLabel: 'Yes, leave',
    cls: 'bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium',
    onConfirm: backToList,
  })

  // ── Save (Draft) ─────────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState(false)
  const [wfActions,      setWfActions]      = useState<string[]>([])
  const [wfActing,       setWfActing]       = useState(false)
  const [wfSelfApproval, setWfSelfApproval] = useState(false)
  const wfTriggerRef = useRef<((action: string) => void) | null>(null)

  const handleWfActionsChange = useCallback((actions: string[], acting: boolean) => {
    setWfActions(actions)
    setWfActing(acting)
  }, [])
  const saveDraft = async (): Promise<boolean> => {
    if (!headerInfo) return false
    if (bomLines.length === 0) {
      toast.error('Add at least 1 BOM line before saving')
      return false
    }
    setActionLoading(true)
    try {
      const payload = {
        variant_id: headerInfo.variant_id,
        min_weight:     minWeight     ? parseFloat(minWeight)     : null,
        max_weight:     maxWeight     ? parseFloat(maxWeight)     : null,
        effective_from: effectiveFrom || null,
        effective_to:   effectiveTo   || null,
        remarks:        remarks       || null,
        gross_weight: grossWeight, net_weight: netWeight,
        stone_cts: stoneCts, stone_gms: stoneGms,
        component_weight: componentWeight,
        lines: bomLines,
      }
      if (bomId) {
        await apiService.put(`/fg-bom/${bomId}`, payload)
        toast.success('BOM saved')
      } else {
        const r = await apiService.post('/fg-bom', payload)
        setBomId(r.data?.data?.id ?? null); setBomStatus('DRAFT')
        toast.success('BOM created')
      }
      return true
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Failed to save BOM')
      return false
    } finally { setActionLoading(false) }
  }

  const handleBeforeWfAction = async (action: string): Promise<boolean> => {
    if (action === 'SUBMIT' && bomStatus === 'DRAFT') {
      return await saveDraft()
    }
    return true
  }

  // Called by WorkflowPanel when any action completes
  const handleWfAction = (_action: string, newStatus: string) => {
    if (newStatus === 'PENDING') {
      // Submitted — go to list and switch to Pending tab so record is visible
      switchStatus('PENDING_APPROVAL')
      backToList()
    } else if (newStatus === 'APPROVED') {
      switchStatus('ACTIVE')
      backToList()
    } else if (newStatus === 'REJECTED') {
      switchStatus('DRAFT')  // rejected BOMs reset to DRAFT status
      backToList()
    } else if (newStatus === 'RFC') {
      // RFC raised a new draft for the Supervisor to rework.
      // Manager goes back to Pending Approval — the new Draft is in the Supervisor's queue.
      switchStatus('PENDING_APPROVAL')
      backToList()
    }
  }

  // ── Cell renderer ─────────────────────────────────────────────────
  const renderCell = (col: ColDef, row: BOMVariantRow) => {
    switch (col.key) {
      case 'sku_code':
        return <span className="font-mono font-semibold text-sm text-[var(--accent-gold)]">{row.sku_code}</span>
      case 'bom_status': {
        const m = STATUS_META[row.bom_status] ?? STATUS_META.NO_BOM
        return <Badge label={m.label} variant={m.variant} />
      }
      case 'bom_updated_at':
        return <span className="text-xs text-[var(--text-muted)]">{row.bom_updated_at ? formatDateTime(row.bom_updated_at) : '—'}</span>
      default:
        return <span className="text-sm text-[var(--text-secondary)]">{(row as unknown as Record<string, unknown>)[col.key] as string ?? '—'}</span>
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // FORM VIEW
  // ─────────────────────────────────────────────────────────────────
  if (view === 'form') {
    const RoCard = ({ label, value }: { label: string; value?: string | number | null }) => (
      <div>
        <p className="text-xs font-medium mb-1 text-[var(--text-muted)]">{label}</p>
        <p className="text-sm font-semibold text-[var(--text-primary)]">{value ?? <span className="text-[var(--text-muted)]">—</span>}</p>
      </div>
    )
    return (
      <>
      <div className="p-4 sm:p-6 space-y-5">

        {/* Breadcrumb + back */}
        <div className="flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div className="flex items-center gap-2">
            <button onClick={askBackToList} className="hover:text-[var(--accent-gold)] flex items-center gap-1">
              <ArrowLeftIcon className="w-3.5 h-3.5" /> Bill of Materials (FG BOM)
            </button>
            <span>/</span>
            <span style={{ color: 'var(--accent-gold)' }}>{editRow?.sku_code ?? '…'}</span>
          </div>
          <button onClick={askBackToList} className="btn-secondary text-xs py-1 px-3">Back to List</button>
        </div>

        {/* Page title row */}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            BOM — {editRow?.sku_code ?? '…'}
          </h1>
          {(() => {
            const m = STATUS_META[bomStatus] ?? STATUS_META.DRAFT
            return <Badge label={m.label} variant={m.variant} />
          })()}
        </div>

        {bomLoading ? (
          <div className="card flex flex-col items-center justify-center py-32 gap-3 text-[var(--text-muted)]">
            <ArrowPathIcon className="w-10 h-10 animate-spin" />
            <p className="text-sm">Loading BOM data…</p>
          </div>
        ) : (
          <>
            {/* Rejection banner */}
            {bomRecord?.rejection_reason && bomStatus === 'DRAFT' && (
              <div className="flex gap-3 p-4 rounded-xl border text-sm"
                style={{ background: 'rgba(239,68,68,0.07)', borderColor: 'rgba(239,68,68,0.3)', color: '#dc2626' }}>
                <XMarkIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Rejected</span>
                  {bomRecord.rejected_by_name && ` by ${bomRecord.rejected_by_name}`}
                  {': '}{bomRecord.rejection_reason}
                </div>
              </div>
            )}

            {/* Variant Info */}
            <div className="card p-5">
              <h3 className="text-sm font-bold mb-4 text-[var(--accent-gold)]">Variant Information</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <RoCard label="SKU Code"    value={headerInfo?.sku_code} />
                <RoCard label="Collection"  value={headerInfo?.collection_name} />
                <RoCard label="Karat/Color" value={headerInfo?.karat_color} />
                <RoCard label="Size"        value={headerInfo?.size} />
                <RoCard label="Weight Band" value={headerInfo?.weight_band} />
                <RoCard label="Design Code" value={headerInfo?.design_code} />
                <RoCard label="Product"     value={headerInfo?.product_name} />
                <RoCard label="Design No"   value={headerInfo?.design_no} />
                <RoCard label="BOM Version" value={bomVersion} />
              </div>
            </div>

            {/* Weight Summary */}
            <div className="card p-5">
              <h3 className="text-sm font-bold mb-4 text-[var(--accent-gold)]">Weight Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {(() => {
                  const useSaved = !linesModified && bomRecord != null
                  return [
                    { label: 'Gross Weight (gm)',     value: Number(useSaved ? bomRecord!.gross_weight     : grossWeight    ).toFixed(6) },
                    { label: 'Net Weight (gm)',        value: Number(useSaved ? bomRecord!.net_weight       : netWeight      ).toFixed(6) },
                    { label: 'Component Weight (gm)',  value: Number(useSaved ? bomRecord!.component_weight : componentWeight).toFixed(6) },
                    { label: 'Stone Cts',              value: Number(useSaved ? bomRecord!.stone_cts        : stoneCts       ).toFixed(6) },
                    { label: 'Stone Gms',              value: Number(useSaved ? bomRecord!.stone_gms        : stoneGms       ).toFixed(6) },
                  ]
                })().map(f => (
                  <div key={f.label}>
                    <label className="text-xs font-medium block mb-1 text-[var(--text-secondary)]">{f.label}</label>
                    <div className="text-sm font-semibold px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                      {f.value}
                    </div>
                  </div>
                ))}
                {[
                  { label: 'Min Weight (gm)', val: minWeight, set: setMinWeight },
                  { label: 'Max Weight (gm)', val: maxWeight, set: setMaxWeight },
                ].map(f => (
                  <div key={f.label}>
                    <label className="text-xs font-medium block mb-1 text-[var(--text-secondary)]">{f.label}</label>
                    <input type="number" step="0.000001" min="0" value={f.val}
                      onKeyDown={blockNumKeys}
                      onChange={e => f.set(sanitizeDecimalStr(e.target.value, 6))} disabled={isReadOnly} placeholder="0.000000"
                      className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] disabled:opacity-50 border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]" />
                  </div>
                ))}
                {[
                  { label: 'Effective From', val: effectiveFrom, set: setEffectiveFrom },
                  { label: 'Effective To',   val: effectiveTo,   set: setEffectiveTo   },
                ].map(f => (
                  <div key={f.label}>
                    <label className="text-xs font-medium block mb-1 text-[var(--text-secondary)]">{f.label}</label>
                    <input type="date" value={f.val} onChange={e => f.set(e.target.value)} disabled={isReadOnly}
                      className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] disabled:opacity-50 border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]" />
                  </div>
                ))}
                <div className="sm:col-span-2 lg:col-span-4">
                  <label className="text-xs font-medium block mb-1 text-[var(--text-secondary)]">Remarks</label>
                  <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
                    disabled={isReadOnly} placeholder="Optional remarks…"
                    className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] disabled:opacity-50 border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]" />
                </div>
              </div>
            </div>

            {/* BOM Lines */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[var(--accent-gold)]">BOM Lines</h3>
                {bomLines.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: 'color-mix(in srgb, var(--accent-gold) 15%, transparent)', color: 'var(--accent-gold)' }}>
                    {bomLines.length} line{bomLines.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <BOMLineGrid
                lines={bomLines}
                setLines={setBomLinesTracked}
                readOnly={isReadOnly}
                uomOpts={uomOpts}
                itemTypeOpts={itemTypeOpts}
                purityOpts={purityOpts}
                karatColor={headerInfo?.karat_color}
              />
            </div>

            {/* Bottom action bar — Save Draft + workflow actions + Back */}
            <div className="card px-5 py-4">
              <div className="flex flex-wrap items-center gap-3">
                {bomStatus === 'DRAFT' && isMaker && (
                  <button type="button" onClick={saveDraft} disabled={actionLoading || wfActing}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50">
                    {actionLoading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : null}
                    Save Draft
                  </button>
                )}
                {/* Submit button — shown directly once BOM is saved as DRAFT, no WorkflowPanel dependency */}
                {bomId && bomStatus === 'DRAFT' && wfCanSubmit && (
                  <button type="button"
                    onClick={() => setConfirmState({ ...WF_CONFIRM.SUBMIT, onConfirm: () => wfTriggerRef.current?.('SUBMIT') })}
                    disabled={actionLoading || wfActing}
                    className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 bg-blue-600 hover:bg-blue-700 text-white">
                    {wfActing ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PaperAirplaneIcon className="w-4 h-4" />}
                    {wfSelfApproval ? 'Submit & Auto-Approve' : 'Submit for Approval'}
                  </button>
                )}
                {/* Other workflow actions (Approve / Reject / RFC) from WorkflowPanel */}
                {wfActions.filter(a => a !== 'SUBMIT').map(act => {
                  const m = ACTION_META[act]
                  if (!m) return null
                  const Icon = m.icon
                  const cfg  = WF_CONFIRM[act]
                  return (
                    <button key={act} type="button"
                      onClick={() => cfg
                        ? setConfirmState({ ...cfg, onConfirm: () => wfTriggerRef.current?.(act) })
                        : wfTriggerRef.current?.(act)
                      }
                      disabled={actionLoading || wfActing}
                      className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${m.cls}`}>
                      {wfActing ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                      {m.label}
                    </button>
                  )
                })}
                <button type="button" onClick={askBackToList} className="btn-secondary ml-auto">Back to List</button>
              </div>
            </div>

            {/* Workflow Panel — step tracker + history only, action buttons rendered above */}
            {/* key forces a fresh mount (and re-fetch) whenever bomId changes, */}
            {/* including null→id after first save, preventing stale available_actions */}
            <WorkflowPanel
              key={bomId ?? 'new'}
              recordType="FG_BOM"
              recordId={bomId}
              hideActions
              triggerRef={wfTriggerRef}
              onAvailableActionsChange={handleWfActionsChange}
              onSelfApprovalChange={setWfSelfApproval}
              onBeforeAction={handleBeforeWfAction}
              onActionComplete={handleWfAction}
            />
          </>
        )}
      </div>

      {/* ── Confirmation modal ─────────────────────────────────── */}
      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl border w-full max-w-sm mx-4 p-6 space-y-4"
            style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {confirmState.title}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {confirmState.message}
            </p>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={closeConfirm} className="btn-secondary">Cancel</button>
              <button
                onClick={() => { confirmState.onConfirm(); closeConfirm() }}
                className={confirmState.cls}>
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <span>Master Management</span><span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>Bill of Materials (FG BOM)</span>
      </div>

      {/* Status tab row + title */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {([
            { key: 'DRAFT'            as const, label: 'Draft',            count: stats.draft,            bg: 'bg-gray-100',   txt: 'text-gray-600',  makerOnly: true  },
            { key: 'PENDING_APPROVAL' as const, label: 'Pending Approval', count: stats.pending_approval, bg: 'bg-yellow-100', txt: 'text-yellow-600', makerOnly: false },
            { key: 'ACTIVE'           as const, label: 'Active',           count: stats.active,           bg: 'bg-green-100',  txt: 'text-green-600',  makerOnly: false },
          ].filter(tab => !tab.makerOnly || wfCanSubmit)).map(tab => (
            <button key={tab.key}
              onClick={() => switchStatus(tab.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all min-w-[120px] ${
                statusFilter === tab.key
                  ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                  : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/50'
              }`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${tab.bg}`}>
                {tab.key === 'ACTIVE'
                  ? <CheckCircleIcon className={`w-3.5 h-3.5 ${tab.txt}`} />
                  : tab.key === 'PENDING_APPROVAL'
                  ? <ClockIcon className={`w-3.5 h-3.5 ${tab.txt}`} />
                  : <ArrowPathIcon className={`w-3.5 h-3.5 ${tab.txt}`} />}
              </div>
              <div className="text-left">
                <p className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{tab.count}</p>
                <p className={`text-xs mt-0.5 font-medium ${tab.txt}`}>{tab.label}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="card overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[var(--border-color)]">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input value={searchInput} onChange={e => onSearchInput(e.target.value)}
              placeholder="Search SKU, design, collection…"
              className="form-input pl-9 pr-8 py-1.5 text-sm w-full" />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right-side icon buttons */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Filter */}
            <button onClick={() => setShowFilterRow(s => !s)} title="Column Filters"
              className={`p-1.5 rounded-lg border transition-colors ${showFilterRow ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
              <FunnelIcon className="w-4 h-4" />
            </button>

            {/* Sorting toggle */}
            <button onClick={() => setShowSorting(s => !s)} title="Toggle Sorting"
              className={`p-1.5 rounded-lg border transition-colors ${showSorting ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
              <BarsArrowUpIcon className="w-4 h-4" />
            </button>

            {/* Column picker */}
            <div ref={colPickerRef} className="relative">
              <button onClick={() => setShowColPicker(s => !s)} title="Columns"
                className={`p-1.5 rounded-lg border transition-colors ${showColPicker ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
                <ViewColumnsIcon className="w-4 h-4" />
              </button>
              {showColPicker && (
                <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg p-1.5">
                  <p className="px-2 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Show / Hide</p>
                  {cols.map(col => (
                    <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer">
                      <input type="checkbox" checked={col.visible} onChange={() => toggleCol(col.key)}
                        className="w-3.5 h-3.5 accent-[var(--color-primary)]" />
                      <span className="text-sm text-[var(--text-secondary)]">{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Export */}
            <div ref={exportRef} className="relative">
              <button onClick={() => setExportOpen(o => !o)} disabled={exporting} title="Export"
                className={`p-1.5 rounded-lg border transition-colors ${exportOpen ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
                {exporting ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <ArrowDownTrayIcon className="w-4 h-4" />}
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg p-1.5">
                  {(['all', 'selected'] as const).map(scope => (
                    <div key={scope}>
                      <p className="px-2 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                        {scope === 'all' ? 'Export All' : `Export Selected${selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}`}
                      </p>
                      {(['csv', 'excel', 'pdf'] as const).map(fmt => (
                        <button key={fmt} onClick={() => handleExport(scope, fmt)}
                          disabled={scope === 'selected' && !selectedRows.length}
                          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] text-left disabled:opacity-40">
                          <span>{fmt === 'csv' ? '📄' : fmt === 'excel' ? '📊' : '📋'}</span>
                          <span className="font-medium">{fmt.toUpperCase()}</span>
                        </button>
                      ))}
                      {scope === 'all' && <div className="my-1 border-t border-[var(--border-color)]" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Page size */}
            <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
              <span className="hidden sm:inline">Show</span>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                className="form-input py-1.5 text-sm" style={{ width: '72px' }}>
                {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                <th className="px-4 py-2.5 w-10">
                  <input type="checkbox" ref={masterRef} checked={allSelected} onChange={toggleSelectPage}
                    className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer" />
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
                      {col.sortKey && (
                        col.key === 'bom_status' ? (
                          <select
                            value={colFilters['bom_status'] ?? ''}
                            onChange={e => { setColFilters(f => ({ ...f, bom_status: e.target.value })); setPage(1) }}
                            className="w-full px-2 py-1 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]">
                            <option value="">All</option>
                            {statusFilter === 'DRAFT' && <>
                              <option value="DRAFT">Draft</option>
                              <option value="NO_BOM">No BOM</option>
                            </>}
                            {statusFilter === 'PENDING_APPROVAL' && <option value="PENDING_APPROVAL">Pending Approval</option>}
                            {statusFilter === 'ACTIVE' && <option value="ACTIVE">Active</option>}
                          </select>
                        ) : (
                          <input value={colFilters[col.key] ?? ''}
                            onChange={e => { setColFilters(f => ({ ...f, [col.key]: e.target.value })); setPage(1) }}
                            placeholder="Filter…"
                            className="w-full px-2 py-1 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]" />
                        )
                      )}
                    </th>
                  ))}
                  <th className="px-2 py-1.5 sticky right-0 z-10 border-l border-[var(--border-color)]" style={{ background: 'var(--bg-primary)' }}>
                    {Object.values(colFilters).some(v => v) && (
                      <button onClick={() => setColFilters({})} className="text-xs text-[var(--accent-gold)] hover:underline">Clear</button>
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
                      <td key={col.key} className="px-4 py-3"><div className="h-4 rounded animate-pulse bg-[var(--bg-tertiary)]" style={{ width: '80px' }} /></td>
                    ))}
                    <td className="px-4 py-3 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]">
                      <div className="h-4 w-20 rounded animate-pulse bg-[var(--bg-tertiary)]" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length + 2} className="px-4 py-14 text-center">
                    <SparklesIcon className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
                    <p className="text-sm text-[var(--text-muted)]">
                      {search ? 'No records match the search.' : `No ${STATUS_META[statusFilter]?.label ?? statusFilter} BOM records.`}
                    </p>
                  </td>
                </tr>
              ) : items.map((row, idx) => (
                <tr key={row.variant_id}
                  className={`border-b border-[var(--border-color)] transition-colors hover:bg-[var(--bg-secondary)] ${idx % 2 !== 0 ? 'bg-[var(--bg-primary)]/40' : ''} ${selectedRows.some(r => r.variant_id === row.variant_id) ? 'bg-[var(--accent-gold)]/5' : ''}`}>
                  <td className="px-4 py-2.5">
                    <input type="checkbox" checked={selectedRows.some(r => r.variant_id === row.variant_id)}
                      onChange={() => toggleSelectRow(row)}
                      className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer" />
                  </td>
                  {visibleCols.map(col => (
                    <td key={col.key} className="px-4 py-2.5">{renderCell(col, row)}</td>
                  ))}
                  <td className="px-4 py-2.5 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openBOM(row)}
                        className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500"
                        title={statusFilter === 'ACTIVE' || statusFilter === 'PENDING_APPROVAL' ? 'View BOM' : (row.bom_id ? 'Edit BOM' : 'Create BOM')}>
                        {statusFilter === 'ACTIVE' || statusFilter === 'PENDING_APPROVAL'
                          ? <EyeIcon className="w-4 h-4" />
                          : <PencilIcon className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--text-muted)]">
              {total === 0 ? 'No records' : `Showing ${startRow}–${endRow} of ${total}`}
            </span>
            {selectedRows.length > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent-gold)]">
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-gold)]/15 border border-[var(--accent-gold)]/30">
                  {selectedRows.length} selected
                </span>
                <button onClick={() => setSelectedRows([])} className="text-xs text-[var(--text-muted)] hover:underline">Clear</button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage(1)}
              className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">«</button>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">‹</button>
            {pageNumbers.map((n, i) =>
              n === '...'
                ? <span key={`d${i}`} className="px-1.5 text-xs text-[var(--text-muted)]">…</span>
                : <button key={n} onClick={() => setPage(n as number)}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${page === n ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)] text-white font-semibold' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                    {n}
                  </button>
            )}
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">›</button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}
              className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">»</button>
          </div>
          <span className="text-sm text-[var(--text-muted)] hidden sm:block">Page {page} of {totalPages || 1}</span>
        </div>
      </div>
    </div>
  )
}
