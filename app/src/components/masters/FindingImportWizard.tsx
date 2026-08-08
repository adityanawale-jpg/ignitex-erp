import React, { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import {
  ArrowDownTrayIcon, ArrowUpTrayIcon, CheckCircleIcon,
  ExclamationTriangleIcon, InformationCircleIcon, ChevronDownIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline'
import Modal from '@/components/common/Modal'
import { apiService } from '@/api/apiService'

interface FindingImportWizardProps {
  isOpen: boolean
  onClose: () => void
  onImported: () => void
}

type Row = Record<string, string>

interface LookupOpt { lookup_type: string; lookup_code: string; lookup_name: string }

// ── Sheet header -> field-key maps ─────────────────────────────────
const FIN_HEADER_MAP: Record<string, string> = {
  'design ref': 'design_ref', 'collection name': 'collection_name', 'product name': 'product_name',
  'manufacturing name': 'manufacturing_name', 'jewellery type': 'jewellery_type', 'sku type': 'sku_type',
  'gender': 'gender', 'tech type': 'tech_type', 'manufacturing level': 'manufacturing_level',
  'occasion': 'occasion', 'group sales': 'group_sales', 'sub category': 'sub_category',
  'status': 'status', 'uom1': 'uom1', 'uom2': 'uom2',
}
const VARIANT_HEADER_MAP: Record<string, string> = {
  'design ref': 'design_ref', 'variant ref': 'variant_ref', 'karat color': 'karat_color',
  'sku type': 'sku_type', 'weight band': 'weight_band', 'size': 'size', 'group sales': 'group_sales',
  'style tone': 'style_tone', 'design source': 'design_source', 'standard alloy': 'standard_alloy',
  'vendor name': 'vendor_name', 'vendor variant code': 'vendor_variant_code',
  'vendor variant name': 'vendor_variant_name', 'shape': 'shape', 'old erp variant': 'old_erp_variant',
  'catalogue reference': 'catalogue_reference', 'width size': 'width_size',
  'product description': 'product_description', 'gross weight': 'gross_weight', 'net weight': 'net_weight',
}
const BOM_HEADER_MAP: Record<string, string> = {
  'variant ref': 'variant_ref', 'min weight': 'min_weight', 'max weight': 'max_weight',
  'effective from': 'effective_from', 'effective to': 'effective_to', 'header remarks': 'header_remarks',
  'item type': 'item_type', 'item code': 'item_code', 'item quantity': 'item_quantity',
  'component weight': 'component_weight', 'stone cts': 'stone_cts', 'net weight': 'net_weight',
  'line remarks': 'line_remarks',
}

// A Finding BOM is built from raw inputs only — it cannot nest another Finding.
const BOM_ITEM_TYPES = ['METAL', 'STONE', 'COMPONENT']

const norm = (h: string) => h.replace(/\*/g, '').trim().toLowerCase()

function mapRow(raw: Record<string, unknown>, headerMap: Record<string, string>): Row {
  const row: Row = {}
  Object.entries(raw).forEach(([col, val]) => {
    const field = headerMap[norm(col)]
    if (field) row[field] = String(val ?? '').trim()
  })
  return row
}

const REQUIRED = {
  fin: ['design_ref', 'collection_name', 'product_name', 'manufacturing_name', 'jewellery_type', 'gender', 'tech_type', 'manufacturing_level', 'occasion', 'uom1'],
  variant: ['design_ref', 'variant_ref', 'karat_color', 'sku_type', 'weight_band', 'size'],
  bom: ['variant_ref', 'item_type', 'item_code'],
}

const LOOKUP_FIELDS: Record<string, string> = {
  collection_name: 'COLLECTION', product_name: 'PRODUCT', manufacturing_name: 'MANUFACTURING_NAME',
  jewellery_type: 'JEWELLERY_TYPE', gender: 'GENDER', tech_type: 'TECH_TYPE',
  manufacturing_level: 'MANUFACTURING_LEVEL', group_sales: 'GROUP_SALES', status: 'STATUS',
  uom1: 'UOM1', uom2: 'UOM',
  // Findings carry their own weight-band / size / width LOVs — FG's WEIGHT_BAND
  // and PRODUCT_SIZE do not apply here.
  karat_color: 'KARAT_COL', sku_type: 'FIN_SKU_TYPE', weight_band: 'FINDING_WB', size: 'FINDING_SIZE',
  width_size: 'WIDTH_SIZE', style_tone: 'STYLE_TONE', design_source: 'DESIGN_SOURCE', shape: 'SHAPE',
}

function validateRow(row: Row, sheet: 'fin' | 'variant' | 'bom', lookupSets: Map<string, Set<string>>): string[] {
  const errors: string[] = []
  REQUIRED[sheet].forEach((f) => { if (!row[f]?.trim()) errors.push(`${f.replace(/_/g, ' ')} is required`) })

  Object.entries(row).forEach(([field, value]) => {
    const type = LOOKUP_FIELDS[field]
    if (!type || !value?.trim()) return
    const set = lookupSets.get(type)
    if (set && !set.has(value.trim().toUpperCase())) errors.push(`"${value}" is not a valid ${field.replace(/_/g, ' ')} code`)
  })

  if (sheet === 'fin' && row.occasion) {
    const set = lookupSets.get('OCASSION')
    row.occasion.split(',').map((s) => s.trim()).filter(Boolean).forEach((code) => {
      if (set && !set.has(code.toUpperCase())) errors.push(`Occasion "${code}" is not a valid code`)
    })
  }
  if (sheet === 'bom' && row.item_type) {
    const type = row.item_type.trim().toUpperCase()
    if (!BOM_ITEM_TYPES.includes(type)) {
      errors.push(`Item Type must be ${BOM_ITEM_TYPES.join(', ')}`)
    } else {
      // Same per-type mandatory weights the Finding BOM page enforces on manual
      // entry. Stone Cts may be left blank — the stone master's standard cts is
      // used, so only the server can tell whether that fallback exists.
      if (type === 'METAL' && !Number(row.net_weight)) errors.push('Net Weight is required for Metal lines')
      if (type === 'COMPONENT' && !Number(row.component_weight)) errors.push('Component Weight is required for Component lines')
    }
  }
  return errors
}

const FindingImportWizard: React.FC<FindingImportWizardProps> = ({ isOpen, onClose, onImported }) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [loadingLookups, setLoadingLookups] = useState(false)
  const [lookupSets, setLookupSets] = useState<Map<string, Set<string>>>(new Map())
  const [finRows, setFinRows] = useState<Row[]>([])
  const [variantRows, setVariantRows] = useState<Row[]>([])
  const [bomRows, setBomRows] = useState<Row[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ productsProcessed: number; created: Record<string, number>; failed: { design_ref: string; error: string }[] } | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => { setStep('upload'); setFinRows([]); setVariantRows([]); setBomRows([]); setResult(null) }
  const handleClose = () => { if (!importing) { reset(); onClose() } }

  const ensureLookups = async (): Promise<Map<string, Set<string>>> => {
    if (lookupSets.size > 0) return lookupSets
    setLoadingLookups(true)
    try {
      const res = await apiService.get('/lookup-master', { params: { page: 1, limit: 9999, status: 'active' } })
      const all: LookupOpt[] = res.data?.data ?? []
      const map = new Map<string, Set<string>>()
      all.forEach((l) => {
        if (!map.has(l.lookup_type)) map.set(l.lookup_type, new Set())
        map.get(l.lookup_type)!.add(l.lookup_code.toUpperCase())
      })
      setLookupSets(map)
      return map
    } catch {
      toast.error('Failed to load lookup data')
      return new Map()
    } finally {
      setLoadingLookups(false)
    }
  }

  const downloadTemplate = async () => {
    const sets = await ensureLookups()
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    const finHeaders = ['Design Ref*', 'Collection Name*', 'Product Name*', 'Manufacturing Name*', 'Jewellery Type*', 'Gender*', 'Tech Type*', 'Manufacturing Level*', 'Occasion*', 'SKU Type', 'Group Sales', 'Sub Category', 'Status', 'UOM1*', 'UOM2']
    const finSample  = ['F1', 'ROYAL', 'CLASP', 'IN_HOUSE', 'FINDING', 'WOMEN', 'CASTING', 'HANDMADE', 'BRIDAL,FESTIVE', '', '', '', 'DRAFT', 'NOS', 'GRAM']
    const wsFin = XLSX.utils.aoa_to_sheet([finHeaders, finSample])
    wsFin['!cols'] = finHeaders.map(() => ({ wch: 20 }))
    XLSX.utils.book_append_sheet(wb, wsFin, 'Finding Master')

    const vHeaders = ['Design Ref*', 'Variant Ref*', 'Karat Color*', 'SKU Type*', 'Weight Band*', 'Size*', 'Group Sales', 'Style Tone', 'Design Source', 'Standard Alloy', 'Vendor Name', 'Vendor Variant Code', 'Vendor Variant Name', 'Shape', 'Old ERP Variant', 'Catalogue Reference', 'Width Size', 'Gross Weight', 'Net Weight', 'Product Description']
    const vSample  = ['F1', 'V1', '18KY', 'REGULAR', '2-4GM', 'FREE', '', '', 'IN_HOUSE', '', '', '', '', 'ROUND', '', '', '', '', '', '']
    const wsV = XLSX.utils.aoa_to_sheet([vHeaders, vSample])
    wsV['!cols'] = vHeaders.map(() => ({ wch: 20 }))
    XLSX.utils.book_append_sheet(wb, wsV, 'Variant')

    const bHeaders = ['Variant Ref*', 'Min Weight', 'Max Weight', 'Effective From', 'Effective To', 'Header Remarks', 'Item Type*', 'Item Code*', 'Item Quantity', 'Net Weight', 'Component Weight', 'Stone Cts', 'Line Remarks']
    const bSample  = ['V1', '', '', '', '', '', 'METAL', 'MTL-001', '1', '2.5', '', '', '']
    const wsB = XLSX.utils.aoa_to_sheet([bHeaders, bSample])
    wsB['!cols'] = bHeaders.map(() => ({ wch: 18 }))
    XLSX.utils.book_append_sheet(wb, wsB, 'Finding BOM')

    const refRows: (string | number)[][] = [['Lookup Type', 'Lookup Code', 'Lookup Name']]
    sets.forEach((codes, type) => codes.forEach((code) => refRows.push([type, code, code])))
    const wsRef = XLSX.utils.aoa_to_sheet(refRows)
    wsRef['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, wsRef, 'Lookup Reference')

    XLSX.writeFile(wb, `finding_master_import_template_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleFile = async (file: File) => {
    await ensureLookups()
    const XLSX = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })

    const readSheet = (name: string, headerMap: Record<string, string>): Row[] => {
      const ws = wb.Sheets[name]
      if (!ws) return []
      return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' }).map((r) => mapRow(r, headerMap))
    }

    const fin = readSheet('Finding Master', FIN_HEADER_MAP)
    const variant = readSheet('Variant', VARIANT_HEADER_MAP)
    const bom = readSheet('Finding BOM', BOM_HEADER_MAP)

    if (!fin.length && !variant.length && !bom.length) {
      toast.error('No data found — make sure the workbook has "Finding Master", "Variant" and "Finding BOM" sheets')
      return
    }

    setFinRows(fin); setVariantRows(variant); setBomRows(bom)
    setExpanded(new Set(fin.map((r) => r.design_ref).filter(Boolean)))
    setStep('preview')
  }

  // ── Group rows by Design Ref for the preview ─────────────────────
  const groups = React.useMemo(() => {
    const byRef = new Map<string, { fin?: Row; variants: Row[]; boms: Row[] }>()
    const get = (ref: string) => {
      if (!byRef.has(ref)) byRef.set(ref, { variants: [], boms: [] })
      return byRef.get(ref)!
    }
    finRows.forEach((r) => { if (r.design_ref) get(r.design_ref).fin = r })
    const variantRefToDesign = new Map<string, string>()
    variantRows.forEach((r) => {
      if (!r.design_ref || !r.variant_ref) return
      get(r.design_ref).variants.push(r)
      variantRefToDesign.set(r.variant_ref, r.design_ref)
    })
    bomRows.forEach((r) => {
      if (!r.variant_ref) return
      const designRef = variantRefToDesign.get(r.variant_ref) ?? `(existing SKU: ${r.variant_ref})`
      get(designRef).boms.push(r)
    })
    return Array.from(byRef.entries()).map(([ref, g]) => ({
      ref,
      fin: g.fin,
      finErrors: g.fin ? validateRow(g.fin, 'fin', lookupSets) : [],
      variants: g.variants.map((v) => ({ row: v, errors: validateRow(v, 'variant', lookupSets) })),
      boms: g.boms.map((b) => ({ row: b, errors: validateRow(b, 'bom', lookupSets) })),
    }))
  }, [finRows, variantRows, bomRows, lookupSets])

  const totalErrors = groups.reduce((sum, g) => sum + g.finErrors.length + g.variants.reduce((s, v) => s + v.errors.length, 0) + g.boms.reduce((s, b) => s + b.errors.length, 0), 0)

  const toggleExpand = (ref: string) => setExpanded((prev) => {
    const next = new Set(prev)
    if (next.has(ref)) next.delete(ref); else next.add(ref)
    return next
  })

  const runImport = async () => {
    setImporting(true); setStep('result')
    try {
      const res = await apiService.post('/findings/import', { finRows, variantRows, bomRows })
      setResult(res.data?.data ?? null)
      if ((res.data?.data?.productsProcessed ?? 0) > (res.data?.data?.failed?.length ?? 0)) onImported()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Import failed'
      setResult({ productsProcessed: 0, created: {}, failed: [{ design_ref: '', error: msg }] })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'upload' ? 'Import Finding Master from Excel' : step === 'preview' ? 'Preview Import Data' : 'Import Results'}
      size={step === 'preview' ? '4xl' : 'md'}
      footer={
        step === 'upload' ? (
          <>
            <button onClick={handleClose} className="btn-secondary">Cancel</button>
            <button onClick={() => fileRef.current?.click()} disabled={loadingLookups} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              <ArrowUpTrayIcon className="w-4 h-4" /> Choose File
            </button>
          </>
        ) : step === 'preview' ? (
          <>
            <button onClick={() => setStep('upload')} className="btn-secondary">← Back</button>
            <button onClick={runImport} disabled={totalErrors > 0 || groups.length === 0} className="btn-primary disabled:opacity-50">
              Import {groups.length} Finding{groups.length !== 1 ? 's' : ''}
            </button>
          </>
        ) : (
          <button onClick={handleClose} disabled={importing} className="btn-primary">Close</button>
        )
      }
    >
      <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }} />

      {step === 'upload' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Download the template — it has 3 sheets (<strong>Finding Master</strong>, <strong>Variant</strong>, <strong>Finding BOM</strong>) plus a
              <strong> Lookup Reference</strong> sheet listing valid codes. Link rows with a <strong>Design Ref</strong> (e.g. F1) and
              <strong> Variant Ref</strong> (e.g. V1) — or use an existing Design Code / SKU Code to add to a finding that already exists.
              BOM lines accept METAL, STONE and COMPONENT items (a Finding cannot contain another Finding) and are
              always imported as DRAFT. Metal lines need a Net Weight and Component lines a Component Weight;
              Stone Cts falls back to the stone master's standard cts when left blank.
            </p>
          </div>
          <button onClick={downloadTemplate} disabled={loadingLookups}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-[var(--accent-gold)]/50 text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/5 transition-colors text-sm font-medium w-full justify-center disabled:opacity-50">
            <ArrowDownTrayIcon className="w-4 h-4" /> {loadingLookups ? 'Preparing…' : 'Download Template (.xlsx)'}
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 w-full py-8 rounded-xl border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent-gold)]/50 hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-muted)]">
            <ArrowUpTrayIcon className="w-7 h-7" />
            <span className="text-sm font-medium">Click to upload the filled-in Excel file</span>
            <span className="text-xs">.xlsx or .xls</span>
          </button>
        </div>
      )}

      {step === 'preview' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-green-600 font-medium">
              <CheckCircleIcon className="w-4 h-4" /> {groups.length} finding{groups.length !== 1 ? 's' : ''} found
            </span>
            {totalErrors > 0 && (
              <span className="flex items-center gap-1.5 text-red-500 font-medium">
                <ExclamationTriangleIcon className="w-4 h-4" /> {totalErrors} error{totalErrors !== 1 ? 's' : ''} — fix in the file and re-upload
              </span>
            )}
          </div>
          <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-[var(--border-color)] divide-y divide-[var(--border-color)]">
            {groups.map((g) => {
              const groupErrCount = g.finErrors.length + g.variants.reduce((s, v) => s + v.errors.length, 0) + g.boms.reduce((s, b) => s + b.errors.length, 0)
              const isOpen = expanded.has(g.ref)
              return (
                <div key={g.ref}>
                  <button onClick={() => toggleExpand(g.ref)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--bg-secondary)]">
                    {isOpen ? <ChevronDownIcon className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronRightIcon className="w-4 h-4 text-[var(--text-muted)]" />}
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">{g.ref}</span>
                    <span className="text-sm text-[var(--text-secondary)]">
                      {g.fin ? `${g.fin.product_name || ''} ${g.fin.collection_name || ''}`.trim() || 'New finding' : 'Existing finding'}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">· {g.variants.length} variant{g.variants.length !== 1 ? 's' : ''} · {g.boms.length} BOM line{g.boms.length !== 1 ? 's' : ''}</span>
                    <span className="ml-auto">
                      {groupErrCount === 0
                        ? <span className="text-green-600 text-xs font-semibold">✓ Valid</span>
                        : <span className="text-red-600 text-xs font-semibold">✗ {groupErrCount} error{groupErrCount !== 1 ? 's' : ''}</span>}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-8 pb-3 text-xs space-y-2">
                      {g.finErrors.length > 0 && (
                        <ul className="text-red-700 space-y-0.5">{g.finErrors.map((e, i) => <li key={i}>• Finding Master: {e}</li>)}</ul>
                      )}
                      {g.variants.map((v, i) => (
                        <div key={i} className="flex flex-col gap-0.5">
                          <span className="text-[var(--text-secondary)]">Variant {v.row.variant_ref}: {v.row.karat_color} / {v.row.weight_band} / {v.row.size}</span>
                          {v.errors.map((e, j) => <span key={j} className="text-red-700 pl-3">• {e}</span>)}
                        </div>
                      ))}
                      {g.boms.map((b, i) => (
                        <div key={i} className="flex flex-col gap-0.5">
                          <span className="text-[var(--text-secondary)]">BOM line {i + 1} ({b.row.variant_ref}): {b.row.item_type} — {b.row.item_code}</span>
                          {b.errors.map((e, j) => <span key={j} className="text-red-700 pl-3">• {e}</span>)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {step === 'result' && (
        <div className="flex flex-col gap-4">
          {importing ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[var(--text-secondary)]">Importing Finding Master data…</p>
            </div>
          ) : result && (
            <>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800 font-medium">
                  {result.productsProcessed - result.failed.length}/{result.productsProcessed} finding(s) imported —
                  {' '}{result.created?.designs ?? 0} design(s), {result.created?.variants ?? 0} variant(s), {result.created?.boms ?? 0} BOM(s)
                </p>
              </div>
              {result.failed.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1.5">
                    <ExclamationTriangleIcon className="w-4 h-4" /> {result.failed.length} finding{result.failed.length !== 1 ? 's' : ''} failed:
                  </p>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-red-200 bg-red-50/50">
                    {result.failed.map((f, i) => (
                      <p key={i} className="px-3 py-1.5 text-xs text-red-700 border-b border-red-100 last:border-0">
                        {f.design_ref && <strong>{f.design_ref}: </strong>}{f.error}
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
  )
}

export default FindingImportWizard
