import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import {
  PlusIcon, PencilIcon, EyeIcon, TrashIcon,
  MagnifyingGlassIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, XMarkIcon, ViewColumnsIcon,
  ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon,
  FunnelIcon, BarsArrowUpIcon,
  NoSymbolIcon, CheckCircleIcon,
  ArrowDownTrayIcon, ArrowLeftIcon,
  SparklesIcon, TagIcon, PhotoIcon, ArrowUpTrayIcon,
  TableCellsIcon, CheckIcon,
} from '@heroicons/react/24/outline'
import Badge                  from '@/components/common/Badge'
import ConfirmDialog          from '@/components/common/ConfirmDialog'
import DeactivateReasonDialog from '@/components/common/DeactivateReasonDialog'
import PageBreadcrumb from '@/components/common/PageBreadcrumb'
import FindingImportWizard    from '@/components/masters/FindingImportWizard'
import { formatDate, formatDateTime, exportToCSV, exportToExcel, exportToPDF } from '@/utils/helpers'
import { apiService, dynamicApi, getFileUrl } from '@/api/apiService'
import { usePermission, useAppDispatch } from '@/hooks'
import { openTab } from '@/redux/slices/tabsSlice'

// ── Types ─────────────────────────────────────────────────────────────────────
interface DesignMaster {
  id: number
  design_code: string
  design_no: string
  collection_name: string
  product_name: string
  design_attributes: string // JSON string
  design_image?: string
}

interface ItemMaster {
  id: number
  design_code: string
  sku_code?: string
  manufacturing_name: string
  collection_name: string
  product_name: string
  sub_category: string
  jewellery_type: string
  sku_type: string
  gender: string
  tech_type: string
  manufacturing_level: string
  occasion: string
  group_sales: string
  status: string
  is_active: boolean
  deactivation_reason: string | null
  deactivated_at: string | null
  used_in_bom: boolean
  variant_count: number
  created_at: string
  // full detail fields
  design_no?: string
  item_image?: string
  design_image?: string  // joined from design_master in fin_item_get_by_id
  design_id?: number
  design_attributes_json?: string
  uom1?: string
  uom2?: string
  video_upload?: string
  video_360?: string
}

interface ItemVariant {
  id: number
  item_id: number
  sku_code: string
  karat_color: string
  weight_band: string
  size: string
  width_size: string
  style_tone: string
  vendor_name: string
  vendor_variant_code: string
  vendor_variant_name: string
  shape: string
  design_source: string
  standard_alloy: string
  catalogue_reference: string
  product_description: string
  pipe_thickness: string
  diamond_cut: string
  squeezing: string
  setting_size: string
  wire_size: string
  hammering: string
  combination_line: string
  compacting: string
  machine_used: string
  kada_salai_size: string
  lead_time: string
  rfid_chip_number: string
  file_link: string
  cad_file_url: string
  manufacturing_drawing_url: string
  technical_documents_url: string
  rubber_die_number: string
  gross_weight: number | null
  net_weight: number | null
  wax_resin_weight: number | null
  ef_batch_number: string
  zinc_surface: string
  zinc_die_number: string
  zinc_weight: number | null
  seo_words: string
  usp: string
  short_description: string
  long_description: string
  retail_brand: string
  keywords_tags: string
  product_title: string
  sku_type: string
  group_sales: string
  old_erp_variant?: string
  is_active: boolean
  bom_id?: number | null
  bom_status?: string
}

interface ClientRow {
  _key: string
  customer_name: string
  customer_variant_code: string
  customer_variant_name: string
  alloy_code: string
  group_sales: string
}

type LookupOption = { lookup_code: string; lookup_name: string }

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZES = [10, 25, 50, 100]

interface ColDef { key: string; label: string; sortKey?: string; visible: boolean; minW?: string }
const INITIAL_COLS: ColDef[] = [
  { key: 'design_code',        label: 'Design Code',        sortKey: 'design_code',        visible: true, minW: '160px' },
  { key: 'manufacturing_name', label: 'Manufacturing Name', sortKey: 'manufacturing_name', visible: true, minW: '180px' },
  { key: 'collection_name',    label: 'Collection',         sortKey: 'collection_name',    visible: true, minW: '120px' },
  { key: 'product_name',       label: 'Category',           sortKey: 'product_name',       visible: true, minW: '110px' },
  { key: 'sub_category',       label: 'Sub Category',       sortKey: 'sub_category',       visible: true, minW: '110px' },
  { key: 'jewellery_type',     label: 'Jewellery Type',     sortKey: 'jewellery_type',     visible: true, minW: '120px' },
  { key: 'sku_type',           label: 'SKU Type',           sortKey: 'sku_type',           visible: true, minW: '90px'  },
  { key: 'gender',             label: 'Gender',             sortKey: 'gender',             visible: true, minW: '80px'  },
  { key: 'tech_type',          label: 'Tech Type',          sortKey: 'tech_type',          visible: true, minW: '100px' },
  { key: 'manufacturing_level',label: 'Manufacturing Level',sortKey: 'manufacturing_level',visible: true, minW: '140px' },
  { key: 'occasion',           label: 'Occasion',           sortKey: 'occasion',           visible: true, minW: '100px' },
  { key: 'group_sales',        label: 'Group Sales',        sortKey: 'group_sales',        visible: true, minW: '100px' },
  { key: 'status',             label: 'Status',             sortKey: 'status',             visible: true, minW: '110px' },
  { key: 'is_active',          label: 'Active',             sortKey: 'is_active',          visible: true, minW: '70px'  },
  { key: 'deactivation_reason',label: 'Deactive Reason',    sortKey: 'deactivation_reason',visible: true, minW: '160px' },
  { key: 'deactivated_at',     label: 'Deactive Date',      sortKey: 'deactivated_at',     visible: true, minW: '120px' },
  { key: 'created_at',         label: 'Created',            sortKey: 'created_at',         visible: true, minW: '130px' },
]

const VARIANT_TABS = [
  { id: 'sku_info',    label: 'SKU Info' },
  { id: 'general',     label: 'General Info' },
  { id: 'mfg',        label: 'Manufacturing' },
  { id: 'casting',    label: 'Casting' },
  { id: 'ecommerce',  label: 'E-Commerce' },
  { id: 'ef',         label: 'Electro Forming' },
]

// ── Schemas ───────────────────────────────────────────────────────────────────
// Accepts an http(s)/ftp URL or a local/UNC Windows file path — matches how
// "CAD file link / path" is actually used, while still rejecting typos/junk.
const FILE_LINK_URL_RE = /^(https?|ftp):\/\/[^\s]+\.[^\s]+$/i
const FILE_LINK_WIN_RE = /^[a-zA-Z]:[\\/](?:[^\\/:*?"<>|\r\n]+[\\/])*[^\\/:*?"<>|\r\n]+$/
const FILE_LINK_UNC_RE = /^\\\\[^\\/:*?"<>|\r\n]+\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]+$/
const isValidFileLink = (v: string | undefined) => {
  if (!v) return true
  const s = v.trim()
  return FILE_LINK_URL_RE.test(s) || FILE_LINK_WIN_RE.test(s) || FILE_LINK_UNC_RE.test(s)
}

const itemSchema = yup.object({
  design_code:         yup.string().required('Design Code is required'),
  manufacturing_name:  yup.string().required('Manufacturing Name is required').default(''),
  jewellery_type:      yup.string().required('Jewellery Type is required').default(''),
  sku_type:            yup.string().default(''),
  gender:              yup.string().required('Gender is required').default(''),
  tech_type:           yup.string().required('Tech Type is required').default(''),
  manufacturing_level: yup.string().required('Manufacturing Level is required').default(''),
  occasion:            yup.string().required('Occasion is required').default(''),
  group_sales:         yup.string().default(''),
  sub_category:        yup.string().default(''),
  status:              yup.string().required('Status is required').default('DRAFT'),
  uom1:                yup.string().required('UOM1 is required').default(''),
  uom2:                yup.string().default(''),
  video_upload:        yup.string().default('').test('valid-file-link', 'Enter a valid URL (https://…) or file path (e.g. \\\\server\\share\\file.mp4)', isValidFileLink),
  video_360:           yup.string().default('').test('valid-file-link', 'Enter a valid URL (https://…) or file path (e.g. \\\\server\\share\\file.mp4)', isValidFileLink),
})
type ItemFormValues = yup.InferType<typeof itemSchema>

const variantSchema = yup.object({
  karat_color:         yup.string().required('Karat / Color is required'),
  sku_type:            yup.string().required('SKU Type is required'),
  group_sales:         yup.string().default(''),
  weight_band:         yup.string().required('Weight Band is required').default(''),
  size:                yup.string().required('Size is required').default(''),
  old_erp_variant:     yup.string().default(''),
  width_size:          yup.string().default(''),
  style_tone:          yup.string().default(''),
  vendor_name:         yup.string().default(''),
  vendor_variant_code: yup.string().default(''),
  vendor_variant_name: yup.string().default(''),
  shape:               yup.string().default(''),
  design_source:       yup.string().default(''),
  standard_alloy:      yup.string().default(''),
  catalogue_reference: yup.string().default(''),
  product_description: yup.string().default(''),
  pipe_thickness:      yup.string().default(''),
  diamond_cut:         yup.string().default(''),
  squeezing:           yup.string().default(''),
  setting_size:        yup.string().default(''),
  wire_size:           yup.string().default(''),
  hammering:           yup.string().default(''),
  combination_line:    yup.string().default(''),
  compacting:          yup.string().default(''),
  machine_used:        yup.string().default(''),
  kada_salai_size:     yup.string().default(''),
  lead_time:           yup.string().default(''),
  rfid_chip_number:    yup.string().default(''),
  file_link:           yup.string().default('').test('valid-file-link', 'Enter a valid URL (https://…) or file path (e.g. \\\\server\\share\\file.dwg)', isValidFileLink),
  cad_file_url:              yup.string().default(''),
  manufacturing_drawing_url: yup.string().default(''),
  technical_documents_url:   yup.string().default(''),
  rubber_die_number:   yup.string().default(''),
  gross_weight:        yup.string().default(''),
  net_weight:          yup.string().default(''),
  wax_resin_weight:    yup.string().default(''),
  ef_batch_number:     yup.string().default(''),
  zinc_surface:        yup.string().default(''),
  zinc_die_number:     yup.string().default(''),
  zinc_weight:         yup.string().default(''),
  seo_words:           yup.string().default(''),
  usp:                 yup.string().default(''),
  short_description:   yup.string().default(''),
  long_description:    yup.string().default(''),
  retail_brand:        yup.string().default(''),
  keywords_tags:       yup.string().default(''),
  product_title:       yup.string().default(''),
})
type VariantFormValues = yup.InferType<typeof variantSchema>

const designSchema = yup.object({
  product_name:    yup.string().required('Product is required'),
  collection_name: yup.string().required('Collection is required'),
  design_no:       yup.string().default(''),
  design_code:     yup.string().default(''),
})
type DesignFormValues = yup.InferType<typeof designSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────
const Req = () => <span className="text-red-500 ml-0.5">*</span>

// ── Design Photo Panel ────────────────────────────────────────────────────────
const LB_LENS_SIZE = 160
const LB_LENS_ZOOM = 2.5

interface DesignImage { id: number; image_name: string; image_url: string; is_default: boolean; sort_order: number }

interface DesignPhotoPanelProps {
  image?: string
  designId?: number
  canUpload?: boolean
  onUploaded?: (newUrl: string) => void
}

const DesignPhotoPanel: React.FC<DesignPhotoPanelProps> = ({ image, designId, canUpload = false, onUploaded }) => {
  const [broken,       setBroken]       = useState(false)
  const [lightbox,     setLightbox]     = useState(false)
  const [lbZoom,       setLbZoom]       = useState(1)
  const [lbPan,        setLbPan]        = useState({ x: 0, y: 0 })
  const [lbDragging,   setLbDragging]   = useState(false)
  const lbDraggingRef                   = useRef(false)
  const lbDragStart                     = useRef({ x: 0, y: 0 })
  const [showLens,     setShowLens]     = useState(true)
  const [lensPos,      setLensPos]      = useState<{ cx: number; cy: number; relX: number; relY: number; imgW: number; imgH: number } | null>(null)
  const lbContainerRef                  = useRef<HTMLDivElement>(null)
  const lbImgRef                        = useRef<HTMLImageElement>(null)
  // Gallery popup state
  const [galleryOpen,  setGalleryOpen]  = useState(false)
  const [images,       setImages]       = useState<DesignImage[]>([])
  const [loadingImgs,  setLoadingImgs]  = useState(false)
  const [uploading,    setUploading]    = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const currentImage = getFileUrl(image) ?? undefined

  useEffect(() => { setBroken(false) }, [image])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  useEffect(() => {
    if (!galleryOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setGalleryOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [galleryOpen])

  const loadImages = async (): Promise<DesignImage[]> => {
    if (!designId) return []
    setLoadingImgs(true)
    try {
      const res = await apiService.get(`/masters/design/${designId}/photos`)
      const data: DesignImage[] = res.data?.data ?? []
      setImages(data)
      return data
    } catch { return [] }
    finally { setLoadingImgs(false) }
  }

  const openGallery = async () => { setGalleryOpen(true); await loadImages() }

  const openLightbox  = () => { setLightbox(true); setLbZoom(1); setLbPan({ x: 0, y: 0 }); setLensPos(null) }
  const lbZoomIn  = () => setLbZoom(z => Math.min(z + 0.25, 5))
  const lbZoomOut = () => setLbZoom(z => Math.max(z - 0.25, 0.25))
  const lbWheel   = (e: React.WheelEvent) => { e.preventDefault(); e.deltaY < 0 ? lbZoomIn() : lbZoomOut() }
  const lbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); lbDraggingRef.current = true; setLbDragging(true); setLensPos(null)
    lbDragStart.current = { x: e.clientX - lbPan.x, y: e.clientY - lbPan.y }
  }
  const lbMouseMove = (e: React.MouseEvent) => {
    if (lbDraggingRef.current) { setLbPan({ x: e.clientX - lbDragStart.current.x, y: e.clientY - lbDragStart.current.y }); return }
    if (!showLens) { setLensPos(null); return }
    const img = lbImgRef.current; const container = lbContainerRef.current
    if (!img || !container) return
    const imgRect = img.getBoundingClientRect(); const cRect = container.getBoundingClientRect()
    const relX = e.clientX - imgRect.left; const relY = e.clientY - imgRect.top
    if (relX < 0 || relY < 0 || relX > imgRect.width || relY > imgRect.height) { setLensPos(null); return }
    setLensPos({ cx: e.clientX - cRect.left, cy: e.clientY - cRect.top, relX, relY, imgW: imgRect.width, imgH: imgRect.height })
  }
  const lbMouseUp    = () => { lbDraggingRef.current = false; setLbDragging(false) }
  const lbMouseLeave = () => { lbDraggingRef.current = false; setLbDragging(false); setLensPos(null) }

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(file)
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length || !designId) return
    setUploading(true)
    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) { toast.error(`${file.name}: not an image`); continue }
        if (file.size > 5 * 1024 * 1024)    { toast.error(`${file.name}: must be under 5 MB`); continue }
        const base64 = await toBase64(file)
        await apiService.post(`/masters/design/${designId}/photos`, { photo: base64 })
      }
      toast.success(`${files.length} photo${files.length > 1 ? 's' : ''} uploaded`)
      const updated = await loadImages()
      // Only update the main panel with the default image (not last-uploaded)
      const defaultImg = updated.find(i => i.is_default)
      if (defaultImg) onUploaded?.(defaultImg.image_url)
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Upload failed')
    } finally { setUploading(false) }
  }

  const handleSetDefault = async (img: DesignImage) => {
    try {
      await apiService.put(`/masters/design/${designId}/photos/${img.id}/default`, {})
      await loadImages()
      onUploaded?.(img.image_url)
      toast.success('Default image updated')
    } catch { toast.error('Failed to set default') }
  }

  const handleDelete = async (img: DesignImage) => {
    try {
      await apiService.delete(`/masters/design/${designId}/photos/${img.id}`)
      const updated = await loadImages()
      if (img.is_default) {
        // API promoted the next image as default; sync parent with the new default
        const newDefault = updated.find(i => i.is_default)
        onUploaded?.(newDefault?.image_url ?? '')
      }
      toast.success('Photo deleted')
    } catch { toast.error('Failed to delete photo') }
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={handleFileChange} />

      {/* Main display */}
      {currentImage && !broken ? (
        <div className="relative w-full rounded-xl overflow-hidden border-2 cursor-zoom-in group"
          style={{ height: '190px', borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)' }}
          onClick={openLightbox}>
          <img src={currentImage} alt="Design" className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105" onError={() => setBroken(true)} />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-end p-2">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded text-xs font-medium text-white bg-black/50">Click to enlarge</span>
          </div>
        </div>
      ) : (
        <div className="w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2"
          style={{ height: '190px', borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)' }}>
          <PhotoIcon className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
          <p className="text-xs text-center px-3" style={{ color: 'var(--text-muted)' }}>
            {currentImage && broken ? 'Image failed to load' : 'No design photo'}
          </p>
        </div>
      )}

      {/* Manage Photos button */}
      {canUpload && (
        <button type="button" disabled={!designId} onClick={openGallery}
          title={!designId ? 'Select a design first' : undefined}
          className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}>
          <ArrowUpTrayIcon className="w-3.5 h-3.5" /> Manage Photos
        </button>
      )}

      {/* ── Photo Gallery Modal ─────────────────────────────────── */}
      {galleryOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setGalleryOpen(false)}>
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden"
            style={{ background: 'var(--bg-modal)', border: '1px solid var(--border-color)' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-modal-header)' }}>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Design Photos</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {images.length} photo{images.length !== 1 ? 's' : ''} — named {'{designcode}'}_1, {'{designcode}'}_2 …
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                  style={{ background: 'var(--accent-gold)', color: '#fff' }}>
                  {uploading
                    ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading…</>
                    : <><PlusIcon className="w-3.5 h-3.5" /> Add Photos</>}
                </button>
                <button type="button" onClick={() => setGalleryOpen(false)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="overflow-y-auto flex-1 p-4">
              {loadingImgs ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-gold)' }} />
                </div>
              ) : images.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <PhotoIcon className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No photos yet. Click "Add Photos" to upload.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {images.map(img => {
                    const url = getFileUrl(img.image_url)
                    return (
                      <div key={img.id} className="rounded-xl overflow-hidden border-2 flex flex-col"
                        style={{ borderColor: img.is_default ? 'var(--accent-gold)' : 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                        {/* Thumbnail */}
                        <div className="relative" style={{ height: '130px', background: 'var(--bg-tertiary)' }}>
                          {url
                            ? <img src={url} alt={img.image_name} className="w-full h-full object-contain" />
                            : <div className="w-full h-full flex items-center justify-center"><PhotoIcon className="w-8 h-8" style={{ color: 'var(--text-muted)' }} /></div>
                          }
                          {img.is_default && (
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                              style={{ background: 'var(--accent-gold)' }}>DEFAULT</span>
                          )}
                        </div>
                        {/* Name + actions */}
                        <div className="px-2 py-2 flex flex-col gap-1.5">
                          <p className="text-xs font-mono truncate" style={{ color: 'var(--text-secondary)' }} title={img.image_name}>{img.image_name}</p>
                          <div className="flex gap-1">
                            {!img.is_default && (
                              <button type="button" onClick={() => handleSetDefault(img)}
                                className="flex-1 text-[10px] py-1 rounded font-medium border"
                                style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}>
                                Set Default
                              </button>
                            )}
                            <button type="button" onClick={() => handleDelete(img)}
                              className="flex-1 text-[10px] py-1 rounded font-medium border border-red-400 text-red-500">
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox (zoom / pan / lens) ────────────────────────── */}
      {lightbox && currentImage && !broken && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setLightbox(false)}>
          <div className="flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#111', width: 'min(900px, 92vw)', height: '90vh' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ background: '#1c1c1c', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-white/70 text-sm font-medium select-none">Design Photo</span>
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={lbZoomOut} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"><MagnifyingGlassMinusIcon className="w-4 h-4" /></button>
                <span className="text-white/70 text-xs w-10 text-center tabular-nums">{Math.round(lbZoom * 100)}%</span>
                <button type="button" onClick={lbZoomIn} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"><MagnifyingGlassPlusIcon className="w-4 h-4" /></button>
                <div className="w-px h-4 bg-white/15 mx-1.5" />
                <button type="button" onClick={() => setShowLens(v => !v)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${showLens ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
                  <MagnifyingGlassIcon className="w-4 h-4" /><span>Lens</span>
                </button>
                <div className="w-px h-4 bg-white/15 mx-1.5" />
                <button type="button" onClick={() => { setLbZoom(1); setLbPan({ x: 0, y: 0 }) }} className="px-2 py-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 text-xs">Reset</button>
                <div className="w-px h-4 bg-white/15 mx-1.5" />
                <button type="button" onClick={() => setLightbox(false)} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"><XMarkIcon className="w-4 h-4" /></button>
              </div>
            </div>
            <div ref={lbContainerRef}
              className={`relative overflow-hidden flex items-center justify-center select-none ${lbDragging ? 'cursor-grabbing' : showLens ? 'cursor-crosshair' : 'cursor-grab'}`}
              style={{ flex: 1, minHeight: 0, background: '#0d0d0d' }}
              onMouseDown={lbMouseDown} onMouseMove={lbMouseMove} onMouseUp={lbMouseUp} onMouseLeave={lbMouseLeave} onWheel={lbWheel}>
              <img ref={lbImgRef} src={currentImage} alt="Design" draggable={false}
                style={{ transform: `translate(${lbPan.x}px,${lbPan.y}px) scale(${lbZoom})`, transformOrigin: 'center center', transition: lbDragging ? 'none' : 'transform 0.15s ease', width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }} />
              {showLens && lensPos && !lbDragging && (
                <div style={{ position: 'absolute', left: lensPos.cx - LB_LENS_SIZE / 2, top: lensPos.cy - LB_LENS_SIZE / 2, width: LB_LENS_SIZE, height: LB_LENS_SIZE, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.85)', overflow: 'hidden', pointerEvents: 'none', backgroundImage: `url(${currentImage})`, backgroundRepeat: 'no-repeat', backgroundSize: `${lensPos.imgW * LB_LENS_ZOOM}px ${lensPos.imgH * LB_LENS_ZOOM}px`, backgroundPosition: `${-(lensPos.relX * LB_LENS_ZOOM - LB_LENS_SIZE / 2)}px ${-(lensPos.relY * LB_LENS_ZOOM - LB_LENS_SIZE / 2)}px`, boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 4px 24px rgba(0,0,0,0.7)', zIndex: 10 }} />
              )}
            </div>
            <div className="flex items-center justify-center gap-3 py-2 flex-shrink-0 select-none" style={{ background: '#1c1c1c', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-white/25 text-xs">Scroll to zoom</span><span className="text-white/15">·</span>
              <span className="text-white/25 text-xs">Drag to pan</span><span className="text-white/15">·</span>
              <span className="text-white/25 text-xs">Esc to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Reusable searchable lookup dropdown ──────────────────────────────────────
const DROPDOWN_MAX_H = 192 // max-h-48 = 12rem = 192px
const DROPDOWN_GAP   = 4   // mt-1

// The real clipping boundary is the nearest scrollable ancestor (e.g. a modal's
// overflow-y-auto body), not the browser window — a field near the bottom of a
// tall modal has plenty of room left in the *window* but the dropdown still gets
// cut off by the modal body's edge (and visually hidden under the footer) if we
// only check window height.
function getClippingBottom(el: HTMLElement): number {
  let node: HTMLElement | null = el.parentElement
  while (node) {
    const { overflowY } = window.getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'hidden') {
      return node.getBoundingClientRect().bottom
    }
    node = node.parentElement
  }
  return window.innerHeight
}

const SearchSelect: React.FC<{
  options: LookupOption[]
  value: string
  onChange: (code: string) => void
  placeholder?: string
  disabled?: boolean
}> = ({ options, value, onChange, placeholder = 'Search…', disabled = false }) => {
  const [search, setSearch] = React.useState('')
  const [open,   setOpen]   = React.useState(false)
  const [dropUp, setDropUp] = React.useState(false)
  const ref                 = React.useRef<HTMLDivElement>(null)
  const inputRef            = React.useRef<HTMLInputElement>(null)

  const selectedOpt = options.find(o => o.lookup_code === value)
  const displayVal  = open ? search : (selectedOpt ? selectedOpt.lookup_name : (value || ''))

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase()
    return q
      ? options.filter(o => o.lookup_code.toLowerCase().includes(q) || o.lookup_name.toLowerCase().includes(q))
      : options
  }, [options, search])

  const openDropdown = () => {
    if (inputRef.current) {
      const rect        = inputRef.current.getBoundingClientRect()
      const spaceBelow  = getClippingBottom(inputRef.current) - rect.bottom
      setDropUp(spaceBelow < DROPDOWN_MAX_H + DROPDOWN_GAP)
    }
    setSearch('')
    setOpen(true)
  }

  React.useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  if (disabled) {
    return (
      <div className="form-input cursor-not-allowed opacity-70 bg-[var(--bg-tertiary)]" style={{ minHeight: '38px' }}>
        {selectedOpt?.lookup_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          value={displayVal}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={openDropdown}
          placeholder={placeholder}
          className="form-input pr-8"
          style={{ cursor: open ? 'text' : 'pointer', background: 'var(--bg-secondary)' }}
          autoComplete="off"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
          {value ? (
            <button type="button" className="pointer-events-auto" onClick={() => { onChange(''); setSearch(''); }}
              style={{ color: 'var(--text-muted)' }}>
              <XMarkIcon className="w-4 h-4" />
            </button>
          ) : (
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
              style={{ color: 'var(--text-muted)' }}
            />
          )}
        </span>
      </div>
      {open && filtered.length > 0 && (
        <div
          className="absolute z-50 w-full rounded-xl border shadow-lg max-h-48 overflow-y-auto"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--bg-card)',
            ...(dropUp
              ? { bottom: 'calc(100% + 4px)' }
              : { top: 'calc(100% + 4px)' }),
          }}
        >
          {filtered.map(opt => (
            <button key={opt.lookup_code} type="button"
              onClick={() => { onChange(opt.lookup_code); setSearch(''); setOpen(false) }}
              className="w-full text-left px-3 py-2 hover:bg-[var(--bg-secondary)] flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{opt.lookup_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const MultiSearchSelect: React.FC<{
  options: LookupOption[]
  value: string
  onChange: (csv: string) => void
  placeholder?: string
  disabled?: boolean
}> = ({ options, value, onChange, placeholder = 'Search…', disabled = false }) => {
  const [search, setSearch] = React.useState('')
  const [open,   setOpen]   = React.useState(false)
  const [dropUp, setDropUp] = React.useState(false)
  const ref                 = React.useRef<HTMLDivElement>(null)
  const inputRef            = React.useRef<HTMLInputElement>(null)

  const selected = React.useMemo(
    () => value ? value.split(',').filter(Boolean) : [],
    [value]
  )

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase()
    return q
      ? options.filter(o => o.lookup_code.toLowerCase().includes(q) || o.lookup_name.toLowerCase().includes(q))
      : options
  }, [options, search])

  const toggle = (code: string) => {
    const next = selected.includes(code)
      ? selected.filter(c => c !== code)
      : [...selected, code]
    onChange(next.join(','))
  }

  const remove = (code: string) => {
    onChange(selected.filter(c => c !== code).join(','))
  }

  const openDropdown = () => {
    if (inputRef.current) {
      const rect       = inputRef.current.getBoundingClientRect()
      const spaceBelow = getClippingBottom(inputRef.current) - rect.bottom
      setDropUp(spaceBelow < DROPDOWN_MAX_H + DROPDOWN_GAP)
    }
    setSearch('')
    setOpen(true)
  }

  React.useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  if (disabled) {
    const labels = selected.map(c => options.find(o => o.lookup_code === c)?.lookup_name ?? c)
    return (
      <div className="form-input cursor-not-allowed opacity-70 bg-[var(--bg-tertiary)] flex flex-wrap gap-1" style={{ minHeight: '38px' }}>
        {labels.length ? labels.map(l => (
          <span key={l} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>{l}</span>
        )) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <div
        className="form-input flex flex-wrap gap-1 items-center cursor-pointer"
        style={{ minHeight: '38px', background: 'var(--bg-secondary)' }}
        onClick={openDropdown}
      >
        {selected.map(code => {
          const label = options.find(o => o.lookup_code === code)?.lookup_name ?? code
          return (
            <span key={code} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'var(--accent-gold)', color: '#1a1a1a' }}>
              {label}
              <button type="button" onClick={e => { e.stopPropagation(); remove(code) }}
                className="hover:opacity-70"><XMarkIcon className="w-3 h-3" /></button>
            </span>
          )
        })}
        <input
          ref={inputRef}
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={openDropdown}
          placeholder={selected.length ? '' : placeholder}
          className="flex-1 min-w-[60px] outline-none bg-transparent text-sm"
          style={{ color: 'var(--text-primary)' }}
          autoComplete="off"
        />
        <span className="ml-auto pointer-events-none flex items-center">
          <ChevronDownIcon
            className={`w-4 h-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-muted)' }}
          />
        </span>
      </div>
      {open && filtered.length > 0 && (
        <div
          className="absolute z-50 w-full rounded-xl border shadow-lg max-h-48 overflow-y-auto"
          style={{
            borderColor: 'var(--border-color)',
            background: 'var(--bg-card)',
            ...(dropUp ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
          }}
        >
          {filtered.map(opt => (
            <button key={opt.lookup_code} type="button"
              onClick={() => toggle(opt.lookup_code)}
              className="w-full text-left px-3 py-2 hover:bg-[var(--bg-secondary)] flex items-center gap-2">
              <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.includes(opt.lookup_code) ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]' : 'border-[var(--border-color)]'}`}>
                {selected.includes(opt.lookup_code) && <CheckIcon className="w-3 h-3 text-[#1a1a1a]" />}
              </span>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{opt.lookup_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const VariantDocUpload: React.FC<{
  label: string
  docType: 'cad' | 'drawing' | 'techdoc' | 'video' | 'video360'
  accept: string
  hint: string
  value: string
  onChange: (url: string) => void
  disabled?: boolean
  maxMB?: number
}> = ({ label, docType, accept, hint, value, onChange, disabled = false, maxMB = 25 }) => {
  const [uploading, setUploading] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const allowed = accept.split(',').map(a => a.trim().replace(/^\./, '').toLowerCase())
    if (!allowed.includes(ext)) { toast.error(`${file.name}: unsupported file type`); return }
    if (file.size > maxMB * 1024 * 1024) { toast.error(`${file.name}: must be under ${maxMB} MB`); return }
    setUploading(true)
    try {
      const data = await toBase64(file)
      const res = await apiService.post('/masters/document-upload', { doc_type: docType, file_name: file.name, data })
      onChange(res.data?.data?.url ?? '')
      toast.success(`${label} uploaded`)
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Upload failed')
    } finally { setUploading(false) }
  }

  const fileName = value ? decodeURIComponent(value.split('/').pop() ?? '').replace(/\?.*$/, '') : ''

  return (
    <div className="rounded-xl border border-dashed p-3" style={{ borderColor: 'var(--border-color)' }}>
      <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {value ? (
        <div className="flex items-center gap-1.5">
          <a href={getFileUrl(value) ?? '#'} target="_blank" rel="noopener noreferrer" title={fileName}
            className="flex-1 min-w-0 truncate text-xs underline" style={{ color: 'var(--accent-gold)' }}>
            {fileName}
          </a>
          {!disabled && (
            <>
              <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
                className="flex-shrink-0 text-xs px-2 py-1 rounded-lg border disabled:opacity-50"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                Replace
              </button>
              <button type="button" onClick={() => onChange('')} className="flex-shrink-0 p-1" style={{ color: 'var(--text-muted)' }}>
                <XMarkIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ) : disabled ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No file attached</p>
      ) : (
        <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium disabled:opacity-50"
          style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}>
          {uploading
            ? <><div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-gold)' }} /> Uploading…</>
            : <><ArrowUpTrayIcon className="w-3.5 h-3.5" /> Upload</>}
        </button>
      )}
      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{hint}</p>
    </div>
  )
}

// Fills a plain link/path text field (e.g. Video Upload URL) from a picked
// file instead of manual typing — unlike VariantDocUpload, it never shows
// its own "attached file" card, since the text input right above it is
// already the single visible representation of that field's value.
const QuickUploadButton: React.FC<{
  label: string
  docType: 'video' | 'video360'
  accept: string
  maxMB: number
  onUploaded: (url: string) => void
  disabled?: boolean
}> = ({ label, docType, accept, maxMB, onUploaded, disabled = false }) => {
  const [uploading, setUploading] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const allowed = accept.split(',').map(a => a.trim().replace(/^\./, '').toLowerCase())
    if (!allowed.includes(ext)) { toast.error(`${file.name}: unsupported file type`); return }
    if (file.size > maxMB * 1024 * 1024) { toast.error(`${file.name}: must be under ${maxMB} MB`); return }
    setUploading(true)
    try {
      const data = await toBase64(file)
      const res = await apiService.post('/masters/document-upload', { doc_type: docType, file_name: file.name, data })
      onUploaded(res.data?.data?.url ?? '')
      toast.success(`${label} uploaded`)
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Upload failed')
    } finally { setUploading(false) }
  }

  return (
    <>
      <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      <button type="button" disabled={disabled || uploading} onClick={() => fileRef.current?.click()}
        className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium disabled:opacity-50"
        style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}>
        {uploading
          ? <><div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-gold)' }} /> Uploading…</>
          : <><ArrowUpTrayIcon className="w-3.5 h-3.5" /> {label}</>}
      </button>
    </>
  )
}

interface ItemMediaItem { id: number; media_type: 'image' | 'video'; media_name: string | null; media_url: string; is_default: boolean; sort_order: number }

const ItemMediaPanel: React.FC<{ masterType: 'fg' | 'fin'; itemId?: number; canUpload?: boolean }> = ({ masterType, itemId, canUpload = false }) => {
  const [media,      setMedia]      = React.useState<ItemMediaItem[]>([])
  const [loading,    setLoading]    = React.useState(false)
  const [uploading,  setUploading]  = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const loadMedia = React.useCallback(async () => {
    if (!itemId) { setMedia([]); return }
    setLoading(true)
    try {
      const res = await apiService.get(`/masters/item-media/${masterType}/${itemId}`)
      setMedia(res.data?.data ?? [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [masterType, itemId])

  React.useEffect(() => { loadMedia() }, [loadMedia])

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp']
  const VIDEO_EXT = ['mp4', 'mov']

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length || !itemId) return
    setUploading(true)
    try {
      for (const file of files) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
        const isImage = IMAGE_EXT.includes(ext)
        const isVideo = VIDEO_EXT.includes(ext)
        if (!isImage && !isVideo) { toast.error(`${file.name}: unsupported file type`); continue }
        const maxBytes = (isImage ? 5 : 50) * 1024 * 1024
        if (file.size > maxBytes) { toast.error(`${file.name}: must be under ${isImage ? 5 : 50} MB`); continue }
        const data = await toBase64(file)
        await apiService.post(`/masters/item-media/${masterType}/${itemId}`, { file_name: file.name, data })
      }
      toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`)
      await loadMedia()
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Upload failed')
    } finally { setUploading(false) }
  }

  const handleSetDefault = async (m: ItemMediaItem) => {
    if (!itemId) return
    try {
      await apiService.put(`/masters/item-media/${masterType}/${itemId}/${m.id}/default`, {})
      await loadMedia()
      toast.success('Default image updated')
    } catch { toast.error('Failed to set default') }
  }

  const handleDelete = async (m: ItemMediaItem) => {
    if (!itemId) return
    try {
      await apiService.delete(`/masters/item-media/${masterType}/${itemId}/${m.id}`)
      await loadMedia()
      toast.success('Media deleted')
    } catch { toast.error('Failed to delete media') }
  }

  return (
    <div className="rounded-xl border border-dashed p-4" style={{ borderColor: 'var(--border-color)' }}>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" multiple className="hidden" onChange={handleFileChange} />
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Product Image Gallery</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Supported: JPG, PNG, WEBP for images (up to 5 MB) · MP4, MOV for videos (up to 50 MB)
          </p>
        </div>
        {canUpload && itemId && (
          <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{ background: 'var(--accent-gold)', color: '#fff' }}>
            {uploading
              ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading…</>
              : <><PlusIcon className="w-3.5 h-3.5" /> Add Media</>}
          </button>
        )}
      </div>

      {!itemId ? (
        <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>Save the item first to add photos or videos.</p>
      ) : loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-gold)' }} />
        </div>
      ) : media.length === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>No media yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {media.map(m => {
            const url = getFileUrl(m.media_url)
            return (
              <div key={m.id} className="relative rounded-lg overflow-hidden border-2 group"
                style={{ borderColor: m.is_default ? 'var(--accent-gold)' : 'var(--border-color)', height: '110px', background: 'var(--bg-tertiary)' }}>
                {m.media_type === 'image'
                  ? <img src={url ?? ''} alt={m.media_name ?? ''} className="w-full h-full object-cover" />
                  : <video src={url ?? ''} className="w-full h-full object-cover" muted controls />}
                {m.is_default && (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ background: 'var(--accent-gold)' }}>DEFAULT</span>
                )}
                {canUpload && (
                  <div className="absolute inset-x-0 bottom-0 flex opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                    {m.media_type === 'image' && !m.is_default && (
                      <button type="button" onClick={() => handleSetDefault(m)} title="Set as default"
                        className="flex-1 py-1 text-[10px] font-medium text-white hover:bg-white/10">★</button>
                    )}
                    <button type="button" onClick={() => handleDelete(m)} title="Delete"
                      className="flex-1 py-1 text-[10px] font-medium text-red-300 hover:bg-white/10">
                      <TrashIcon className="w-3 h-3 mx-auto" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const FindingMasterPage: React.FC = () => {

  // ── Permissions ─────────────────────────────────────────────
  const { canView, canCreate, canUpdate, canDelete } = usePermission('MM_FIN_ITEMS')
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  // ── View state ──────────────────────────────────────────────
  const [view,        setView]        = useState<'list' | 'form'>('list')
  const [formMode,    setFormMode]    = useState<'add' | 'edit' | 'view'>('add')
  const [currentItem, setCurrentItem] = useState<ItemMaster | null>(null)

  // ── List state ──────────────────────────────────────────────
  const [rawItems,     setRawItems]     = useState<ItemMaster[]>([])
  const [loading,      setLoading]      = useState(true)
  const [fetching,     setFetching]     = useState(false)
  const isFirstLoad                     = useRef(true)
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active')
  const [stats,        setStats]        = useState({ active: 0, inactive: 0 })
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(25)
  const [searchInput,  setSearchInput]  = useState('')
  const [search,       setSearch]       = useState('')
  const [sortBy,       setSortBy]       = useState('design_code')
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('asc')
  const [total,        setTotal]        = useState(0)
  const [totalPages,   setTotalPages]   = useState(1)
  const [cols,         setCols]         = useState<ColDef[]>(INITIAL_COLS)
  const [showColPicker,setShowColPicker]= useState(false)
  const [showFilterRow,setShowFilterRow]= useState(false)
  const [showSorting,  setShowSorting]  = useState(true)
  const [colFilters,   setColFilters]   = useState<Record<string, string>>({})
  const [debouncedCF,  setDebouncedCF]  = useState<Record<string, string>>({})
  const [selectedRows, setSelectedRows] = useState<ItemMaster[]>([])
  const [exportOpen,   setExportOpen]   = useState(false)
  const [exporting,    setExporting]    = useState(false)
  const [importOpen,   setImportOpen]   = useState(false)
  const [toggleItem,   setToggleItem]   = useState<ItemMaster | null>(null)
  const colPickerRef                    = useRef<HTMLDivElement>(null)
  const exportRef                       = useRef<HTMLDivElement>(null)
  const searchTimer                     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cfTimer                         = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Design / Lookup state ───────────────────────────────────
  const [designs,      setDesigns]      = useState<DesignMaster[]>([])
  const [selectedDesign,setSelectedDesign] = useState<DesignMaster | null>(null)
  const [designSearch, setDesignSearch] = useState('')
  const [showDesignDD, setShowDesignDD] = useState(false)
  const [lookupMap,    setLookupMap]    = useState<Record<string, LookupOption[]>>({})
  const [suppliers,    setSuppliers]    = useState<{ id: number; vendor_company_name: string }[]>([])
  const [customers,    setCustomers]    = useState<{ id: number; customer_company_name: string }[]>([])
  const [alloys,       setAlloys]       = useState<{ id: number; alloy_code: string; alloy_name: string }[]>([])
  const [savingHeader, setSavingHeader] = useState(false)
  const [itemTab,      setItemTab]      = useState<'attrs' | 'media'>('attrs')
  const designRef                       = useRef<HTMLDivElement>(null)
  // Guards to ensure each heavy lookup is fetched only once per component mount
  const lookupsLoadedRef   = useRef(false)
  const suppliersLoadedRef = useRef(false)
  const customersLoadedRef = useRef(false)
  const alloysLoadedRef    = useRef(false)

  // ── Variant state ───────────────────────────────────────────
  const [variants,      setVariants]      = useState<ItemVariant[]>([])
  const [variantsLoading,setVariantsLoading]= useState(false)
  const [variantModal,  setVariantModal]  = useState(false)
  const [editingVariant,setEditingVariant]= useState<ItemVariant | null>(null)
  const [variantTab,    setVariantTab]    = useState('sku_info')
  const [clientRows,    setClientRows]    = useState<ClientRow[]>([])
  const [clientEdit,    setClientEdit]    = useState<ClientRow | null>(null)
  const [savingVariant, setSavingVariant] = useState(false)
  const [deleteVariant, setDeleteVariant] = useState<ItemVariant | null>(null)
  const [clientEditError, setClientEditError] = useState<Partial<Record<'customer_name'|'customer_variant_code'|'customer_variant_name', string>>>({})
  const [variantSaveError, setVariantSaveError] = useState<string | null>(null)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [variantViewOnly,   setVariantViewOnly]   = useState(false)
  const clientAddPanelRef                 = useRef<HTMLDivElement>(null)

  // ── Design drawer state ─────────────────────────────────────
  const [showDesignDrawer,  setShowDesignDrawer]  = useState(false)
  const [savingDesign,      setSavingDesign]      = useState(false)

  // ── Forms ────────────────────────────────────────────────────
  const {
    register: regItem, handleSubmit: submitItem, reset: resetItem,
    setValue: setItemVal, watch: watchItem, control: controlItem,
    formState: { errors: itemErrors },
  } = useForm<ItemFormValues>({ resolver: yupResolver(itemSchema) as never, defaultValues: { status: 'DRAFT', uom1: 'NOS', uom2: 'GRAM' } })

  const {
    register: regVar, handleSubmit: submitVar, reset: resetVar,
    control: controlVar, watch: watchVar,
    formState: { errors: varErrors, isDirty: varIsDirty },
  } = useForm<VariantFormValues>({ resolver: yupResolver(variantSchema) as never })

  const watchedDesignCode = watchItem('design_code')
  const watchedStatus     = watchItem('status')

  const {
    register: regDesign, handleSubmit: submitDesign, reset: resetDesign,
    setValue: setDesignVal, control: controlDesign, watch: watchDesign,
    formState: { errors: designErrors },
  } = useForm<DesignFormValues>({ resolver: yupResolver(designSchema) as never })

  // ══════════════════════════════════════════════════════════════
  // Derived list — col-filters + sort applied client-side on the
  // current server-returned page (search/status/paging = DB-side)
  // ══════════════════════════════════════════════════════════════
  const items = useMemo(() => {
    let result = [...rawItems]
    Object.entries(debouncedCF).forEach(([k, v]) => {
      if (!v) return
      result = result.filter(r =>
        String((r as unknown as Record<string, unknown>)[k] ?? '').toLowerCase().includes(v.toLowerCase())
      )
    })
    result.sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[sortBy] ?? '')
      const bv = String((b as unknown as Record<string, unknown>)[sortBy] ?? '')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return result
  }, [rawItems, debouncedCF, sortBy, sortDir])

  // ══════════════════════════════════════════════════════════════
  // Data loading
  // ══════════════════════════════════════════════════════════════
  const loadItems = useCallback(async () => {
    if (isFirstLoad.current) setLoading(true)
    else setFetching(true)
    try {
      const res = await dynamicApi.get('fin_item_list_get', {}, {
        page,
        limit:  pageSize,
        search: search || undefined,
        status: statusFilter,
      })
      const rows: ItemMaster[] = res.data?.data ?? []
      const meta = res.data?.meta ?? {}
      setRawItems(rows)
      setTotal(Number(meta.total ?? rows.length))
      setTotalPages(Number(meta.total_pages ?? 1))
    } catch {
      toast.error('Failed to load items')
    } finally {
      setLoading(false); setFetching(false); isFirstLoad.current = false
    }
  }, [statusFilter, search, page, pageSize])

  const loadStats = useCallback(async () => {
    try {
      const res = await dynamicApi.get('fin_item_stats')
      const s = res.data?.data?.[0] ?? { active: 0, inactive: 0 }
      setStats({ active: Number(s.active ?? 0), inactive: Number(s.inactive ?? 0) })
    } catch { /* silent */ }
  }, [])

  const loadDesigns = useCallback(async () => {
    try {
      const res = await dynamicApi.get('design_list_get', { design_type: 'FINDING' })
      setDesigns(res.data?.data ?? [])
    } catch {
      // Not silent: an empty Design Code list is indistinguishable from "no
      // designs on file", which hid a broken query template once already.
      setDesigns([])
      toast.error('Failed to load designs')
    }
  }, [])

  const loadLookups = useCallback(async () => {
    if (lookupsLoadedRef.current) return
    try {
      const res = await apiService.get('/lookup-master', { params: { page: 1, limit: 9999, status: 'active' } })
      const all: { lookup_type: string; lookup_code: string; lookup_name: string }[] = res.data?.data ?? []
      const map: Record<string, LookupOption[]> = {}
      all.forEach(l => {
        if (!map[l.lookup_type]) map[l.lookup_type] = []
        map[l.lookup_type].push({ lookup_code: l.lookup_code, lookup_name: l.lookup_name })
      })
      setLookupMap(map)
      lookupsLoadedRef.current = true
    } catch { /* silent */ }
  }, [])

  const loadSuppliers = useCallback(async () => {
    if (suppliersLoadedRef.current) return
    try {
      const res = await apiService.get('/suppliers', { params: { page: 1, limit: 9999, status: 'active' } })
      setSuppliers(res.data?.data ?? [])
      suppliersLoadedRef.current = true
    } catch { /* silent */ }
  }, [])

  const loadCustomers = useCallback(async () => {
    if (customersLoadedRef.current) return
    try {
      const res = await apiService.get('/customers', { params: { page: 1, limit: 9999, status: 'active' } })
      setCustomers(res.data?.data ?? [])
      customersLoadedRef.current = true
    } catch { /* silent */ }
  }, [])

  const loadAlloys = useCallback(async () => {
    if (alloysLoadedRef.current) return
    try {
      const res = await apiService.get('/alloys', { params: { page: 1, limit: 9999, status: 'active' } })
      setAlloys(res.data?.data ?? [])
      alloysLoadedRef.current = true
    } catch { /* silent */ }
  }, [])

  const loadVariantClients = async (variantId: number) => {
    try {
      const res = await dynamicApi.get('fin_variant_client_get', { variant_id: variantId })
      const rows: ClientRow[] = (res.data?.data ?? []).map((r: Record<string, unknown>, i: number) => ({
        _key: `vc_${i}`,
        customer_name:         String(r.customer_name          ?? ''),
        customer_variant_code: String(r.customer_variant_code  ?? ''),
        customer_variant_name: String(r.customer_variant_name  ?? ''),
        alloy_code:            String(r.alloy_code             ?? ''),
        group_sales:           String(r.group_sales            ?? ''),
      }))
      setClientRows(rows)
    } catch { /* silent */ }
  }

  const loadVariants = useCallback(async (itemId: number) => {
    setVariantsLoading(true)
    try {
      const res = await dynamicApi.get('fin_variant_list_get', { item_id: itemId })
      setVariants(res.data?.data ?? [])
    } catch {
      toast.error('Failed to load variants')
    } finally { setVariantsLoading(false) }
  }, [])

  // Auto-scroll add panel into view when a new client entry is opened
  useEffect(() => {
    if (clientEdit && !clientRows.find(r => r._key === clientEdit._key)) {
      setTimeout(() => clientAddPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
    }
  }, [clientEdit]) // eslint-disable-line

  // effects
  useEffect(() => { loadItems() }, [loadItems])
  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { loadLookups() }, [loadLookups])
  useEffect(() => {
    if (view === 'form') { loadDesigns(); loadSuppliers(); loadCustomers(); loadAlloys() }
  }, [view, loadDesigns, loadSuppliers, loadCustomers])
  useEffect(() => {
    if (cfTimer.current) clearTimeout(cfTimer.current)
    cfTimer.current = setTimeout(() => { setDebouncedCF(colFilters); setPage(1) }, 400)
  }, [colFilters]) // eslint-disable-line
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) setShowColPicker(false)
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
      if (designRef.current && !designRef.current.contains(e.target as Node)) setShowDesignDD(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ══════════════════════════════════════════════════════════════
  // List event handlers
  // ══════════════════════════════════════════════════════════════
  const onSearchInput = (val: string) => {
    setSearchInput(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1) }, 400)
  }
  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
    setPage(1)
  }
  const toggleCol     = (key: string) => setCols(cs => cs.map(c => c.key === key ? { ...c, visible: !c.visible } : c))
  const gridCols = statusFilter === 'inactive' ? cols : cols.filter(c => c.key !== 'deactivation_reason' && c.key !== 'deactivated_at')
  const visibleCols   = gridCols.filter(c => c.visible)
  const currentIds    = items.map(r => r.id)
  const allSelected   = currentIds.length > 0 && currentIds.every(id => selectedRows.some(r => r.id === id))
  const someSelected  = currentIds.some(id => selectedRows.some(r => r.id === id))
  const masterRef     = useRef<HTMLInputElement>(null)
  useEffect(() => { if (masterRef.current) masterRef.current.indeterminate = someSelected && !allSelected }, [someSelected, allSelected])
  const toggleSelectPage = () => {
    if (allSelected) setSelectedRows(prev => prev.filter(r => !currentIds.includes(r.id)))
    else { const toAdd = items.filter(u => !selectedRows.some(r => r.id === u.id)); setSelectedRows(prev => [...prev, ...toAdd]) }
  }
  const toggleSelectRow = (item: ItemMaster) =>
    setSelectedRows(prev => prev.some(r => r.id === item.id) ? prev.filter(r => r.id !== item.id) : [...prev, item])

  const pageNumbers = useMemo((): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 4)               return [1,2,3,4,5,'...',totalPages]
    if (page >= totalPages - 3)  return [1,'...',totalPages-4,totalPages-3,totalPages-2,totalPages-1,totalPages]
    return [1,'...',page-1,page,page+1,'...',totalPages]
  }, [page, totalPages])

  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endRow   = Math.min(page * pageSize, total)

  const getExportData = (rows: ItemMaster[]) => rows.map(r => ({
    'Design Code': r.design_code, 'SKU Code': r.sku_code ?? '',
    'Manufacturing Name': lookupLabel('MANUFACTURING_NAME', r.manufacturing_name),
    'Collection': lookupLabel('COLLECTION', r.collection_name),
    'Category': lookupLabel('PRODUCT', r.product_name),
    'Sub Category': lookupLabel('SUB-CATEGORY', r.sub_category),
    'Jewellery Type': lookupLabel('JEWELLERY_TYPE', r.jewellery_type),
    'SKU Type': lookupLabel('FIN_SKU_TYPE', r.sku_type),
    'Gender': lookupLabel('GENDER', r.gender),
    'Tech Type': lookupLabel('TECH_TYPE', r.tech_type),
    'Manufacturing Level': lookupLabel('MANUFACTURING_LEVEL', r.manufacturing_level),
    'Occasion': lookupLabels('OCASSION', r.occasion),
    'Group Sales': lookupLabel('GROUP_SALES', r.group_sales),
    'Status': lookupLabel('STATUS', r.status) || r.status,
    'Active': r.is_active ? 'Yes' : 'No',
    ...(statusFilter === 'inactive' && {
      'Deactive Reason': r.deactivation_reason || '',
      'Deactive Date': r.deactivated_at ? formatDate(String(r.deactivated_at)) : '',
    }),
    'Created At': formatDateTime(r.created_at),
  }))

  const handleExport = async (scope: 'all' | 'selected', fmt: 'csv' | 'excel' | 'pdf') => {
    setExportOpen(false)
    let rows: ItemMaster[]
    if (scope === 'selected') {
      rows = selectedRows
      if (!rows.length) { toast.error('No rows selected'); return }
    } else {
      setExporting(true)
      try {
        const res = await dynamicApi.get('fin_item_list_get', {}, { page: 1, limit: 9999, status: statusFilter })
        rows = res.data?.data ?? []
      } catch { toast.error('Failed to fetch data'); setExporting(false); return }
      setExporting(false)
    }
    const fname = `fg_items_${statusFilter}`
    const data  = getExportData(rows)
    if (fmt === 'csv')        exportToCSV(data, fname)
    else if (fmt === 'excel') void exportToExcel(data, fname)
    else                      void exportToPDF(data, fname, 'Finding Master')
  }

  const confirmToggle = async (reason?: string) => {
    if (!toggleItem) return
    try {
      await dynamicApi.put('fin_item_toggle', { id: toggleItem.id }, reason ? { reason } : {})
      toast.success('Status updated')
      setToggleItem(null)
      isFirstLoad.current = true
      loadItems()
      loadStats()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'
      toast.error(msg)
    }
  }

  const renderCell = (key: string, row: ItemMaster) => {
    switch (key) {
      case 'design_code':
        return <span className="font-mono text-sm font-semibold text-[var(--accent-gold)]">{row.design_code}</span>
      case 'sku_code':
        return <span className="text-xs text-[var(--text-secondary)]">{row.sku_code || '—'}</span>
      case 'manufacturing_name':
        return <span className="text-sm text-[var(--text-secondary)]">{lookupLabel('MANUFACTURING_NAME', row.manufacturing_name) || '—'}</span>
      case 'collection_name':
        return <span className="text-sm text-[var(--text-secondary)]">{lookupLabel('COLLECTION', row.collection_name) || '—'}</span>
      case 'product_name':
        return <span className="text-sm text-[var(--text-secondary)]">{lookupLabel('PRODUCT', row.product_name) || '—'}</span>
      case 'sub_category':
        return <span className="text-sm text-[var(--text-secondary)]">{lookupLabel('SUB-CATEGORY', row.sub_category) || '—'}</span>
      case 'jewellery_type':
        return <span className="text-sm text-[var(--text-secondary)]">{lookupLabel('JEWELLERY_TYPE', row.jewellery_type) || '—'}</span>
      case 'sku_type':
        return <span className="text-sm text-[var(--text-secondary)]">{lookupLabel('FIN_SKU_TYPE', row.sku_type) || '—'}</span>
      case 'gender':
        return <span className="text-sm text-[var(--text-secondary)]">{lookupLabel('GENDER', row.gender) || '—'}</span>
      case 'tech_type':
        return <span className="text-sm text-[var(--text-secondary)]">{lookupLabel('TECH_TYPE', row.tech_type) || '—'}</span>
      case 'manufacturing_level':
        return <span className="text-sm text-[var(--text-secondary)]">{lookupLabel('MANUFACTURING_LEVEL', row.manufacturing_level) || '—'}</span>
      case 'occasion':
        return <span className="text-sm text-[var(--text-secondary)]">{lookupLabels('OCASSION', row.occasion) || '—'}</span>
      case 'group_sales':
        return <span className="text-sm text-[var(--text-secondary)]">{lookupLabel('GROUP_SALES', row.group_sales) || '—'}</span>
      case 'status':
        return <span className="text-sm text-[var(--text-secondary)]">{lookupLabel('STATUS', row.status) || row.status || '—'}</span>
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

  // ══════════════════════════════════════════════════════════════
  // Form event handlers
  // ══════════════════════════════════════════════════════════════
  const openAddForm = async () => {
    await loadLookups()
    setFormMode('add'); setCurrentItem(null); setSelectedDesign(null)
    setDesignSearch(''); setVariants([])
    resetItem({ design_code: '', manufacturing_name: '', jewellery_type: '', sku_type: '', gender: '', tech_type: '', manufacturing_level: '', occasion: '', group_sales: '', sub_category: '', status: 'DRAFT', uom1: 'NOS', uom2: 'GRAM', video_upload: '', video_360: '' })
    setView('form')
  }

  const openEditForm = async (item: ItemMaster, mode: 'edit' | 'view' = 'edit') => {
    setFormMode(mode); setCurrentItem(item)
    // load full item details
    try {
      const [itemRes, designsRes] = await Promise.all([
        dynamicApi.get('fin_item_get_by_id', { id: item.id }),
        dynamicApi.get('design_list_get', { design_type: 'FINDING' }),
      ])
      const full: ItemMaster = itemRes.data?.data?.[0] ?? item
      const allDesigns: DesignMaster[] = designsRes.data?.data ?? []
      setCurrentItem(full)
      setDesigns(allDesigns)
      // Auto-select matching design so DesignPhotoPanel gets design_image
      const matched = allDesigns.find(d => d.design_code === full.design_code) ?? null
      setSelectedDesign(matched)
      resetItem({
        design_code:         full.design_code         ?? '',
        manufacturing_name:  full.manufacturing_name  ?? '',
        jewellery_type:      full.jewellery_type       ?? '',
        sku_type:            full.sku_type             ?? '',
        gender:              full.gender               ?? '',
        tech_type:           full.tech_type            ?? '',
        manufacturing_level: full.manufacturing_level  ?? '',
        occasion:            full.occasion             ?? '',
        group_sales:         full.group_sales          ?? '',
        sub_category:        full.sub_category         ?? '',
        status:              full.status               ?? 'DRAFT',
        uom1:                full.uom1                 ?? '',
        uom2:                full.uom2                 ?? '',
        video_upload:        full.video_upload          ?? '',
        video_360:           full.video_360             ?? '',
      })
    } catch {
      resetItem({
        design_code: item.design_code ?? '', manufacturing_name: item.manufacturing_name ?? '',
        jewellery_type: item.jewellery_type ?? '', sku_type: item.sku_type ?? '',
        gender: item.gender ?? '', tech_type: item.tech_type ?? '',
        manufacturing_level: item.manufacturing_level ?? '',
        occasion: item.occasion ?? '', group_sales: item.group_sales ?? '',
        sub_category: item.sub_category ?? '',
        status: item.status ?? 'DRAFT',
        uom1: item.uom1 ?? '', uom2: item.uom2 ?? '',
        video_upload: item.video_upload ?? '', video_360: item.video_360 ?? '',
      })
    }
    await loadLookups()
    await loadVariants(item.id)
    setView('form')
  }

  const handleDesignSelect = (d: DesignMaster) => {
    setSelectedDesign(d)
    setItemVal('design_code', d.design_code)
    setDesignSearch(d.design_code)
    setShowDesignDD(false)
  }

  const handleSaveHeader = async (data: ItemFormValues) => {
    const design = designs.find(d => d.design_code === data.design_code) ?? selectedDesign
    if (!design && formMode === 'add') { toast.error('Please select a valid Design Code'); return }
    setSavingHeader(true)
    try {
      if (formMode === 'add') {
        const payload = {
          design_id:           design?.id ?? null,
          design_code:         data.design_code,
          design_no:           design?.design_no ?? '',
          collection_name:     design?.collection_name ?? '',
          product_name:        design?.product_name ?? '',
          manufacturing_name:  data.manufacturing_name || null,
          jewellery_type:      data.jewellery_type || null,
          sku_type:            data.sku_type || null,
          gender:              data.gender || null,
          tech_type:           data.tech_type || null,
          manufacturing_level: data.manufacturing_level || null,
          occasion:            data.occasion || null,
          group_sales:         data.group_sales || null,
          sub_category:        data.sub_category || null,
          status:              data.status || 'DRAFT',
          uom1:                data.uom1 || null,
          uom2:                data.uom2 || null,
          video_upload:        data.video_upload || null,
          video_360:           data.video_360 || null,
        }
        const res = await dynamicApi.post('fin_item_create', {}, payload)
        const created: ItemMaster = res.data?.data?.[0]
        setCurrentItem(created)
        setFormMode('edit')
        toast.success(`Item ${created.design_code} created`)
      } else if (currentItem) {
        const payload = {
          id:                  currentItem.id,
          manufacturing_name:  data.manufacturing_name || null,
          jewellery_type:      data.jewellery_type || null,
          sku_type:            data.sku_type || null,
          gender:              data.gender || null,
          tech_type:           data.tech_type || null,
          manufacturing_level: data.manufacturing_level || null,
          occasion:            data.occasion || null,
          group_sales:         data.group_sales || null,
          sub_category:        data.sub_category || null,
          status:              data.status || 'DRAFT',
          uom1:                data.uom1 || null,
          uom2:                data.uom2 || null,
          video_upload:        data.video_upload || null,
          video_360:           data.video_360 || null,
        }
        const res = await dynamicApi.put('fin_item_update', { id: currentItem.id }, payload)
        const updated: ItemMaster = res.data?.data?.[0]
        setCurrentItem(prev => ({ ...prev!, ...updated }))
        toast.success('Item updated')
      }
      isFirstLoad.current = true
      loadItems()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save item'
      toast.error(msg)
    } finally { setSavingHeader(false) }
  }

  const openDesignDrawer = () => {
    // Collection defaults to the Finding collection — 'FIN' is its lookup_code
    // under lookup_type COLLECTION ('FINDING' is only that row's display name,
    // and design_code is built directly from this value, so it must be the code).
    const findingCollection = lo('COLLECTION').find(o => o.lookup_name === 'FINDING')?.lookup_code ?? ''
    resetDesign({ product_name: '', collection_name: findingCollection, design_no: '', design_code: '' })
    setShowDesignDrawer(true)
  }

  // Auto-generate Design No + Design Code when both product_name and collection_name are set
  // Formula: Design Code = Product + Collection + 3-digit sequence (sequence per product+collection pair)
  const watchedDesignProduct    = watchDesign('product_name')
  const watchedDesignCollection = watchDesign('collection_name')
  useEffect(() => {
    if (!showDesignDrawer || !watchedDesignProduct || !watchedDesignCollection) {
      setDesignVal('design_no',   '')
      setDesignVal('design_code', '')
      return
    }
    dynamicApi.get('design_next_no', { product_name: watchedDesignProduct, collection_name: watchedDesignCollection })
      .then(res => {
        const nextNo: string = res.data?.data?.[0]?.next_no ?? '001'
        setDesignVal('design_no',   nextNo)
        setDesignVal('design_code', `${watchedDesignCollection}-${watchedDesignProduct}-${nextNo}`)
      }).catch(() => {})
  }, [watchedDesignProduct, watchedDesignCollection, showDesignDrawer])

  const handleSaveDesign = async (data: DesignFormValues) => {
    setSavingDesign(true)
    try {
      const design_no   = watchDesign('design_no')
      const design_code = watchDesign('design_code')
      if (!design_no || !design_code) {
        toast.error('Design No and Design Code must be auto-generated before saving')
        setSavingDesign(false)
        return
      }
      const payload = { ...data, design_no, design_code, design_attributes: '{}', design_type: 'FINDING' }
      const res = await dynamicApi.post('design_create', {}, payload)
      const created: DesignMaster = res.data?.data?.[0]
      toast.success(`Design ${created.design_code} created`)
      await loadDesigns()
      handleDesignSelect({
        id:               created.id,
        design_code:      created.design_code,
        design_no:        created.design_no       ?? '',
        collection_name:  created.collection_name ?? '',
        product_name:     created.product_name    ?? '',
        design_attributes: '{}',
        design_image:     created.design_image,
      })
      setShowDesignDrawer(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save design'
      toast.error(msg)
    } finally { setSavingDesign(false) }
  }

  // ── SKU code generator
  const buildSkuCode = (designCode: string, karatColor: string, weightBand: string, size: string) => {
    const parts = [designCode, karatColor, weightBand, size].filter(Boolean)
    return parts.join('-')
  }

  // ── Variant modal handlers
  const openAddVariant = () => {
    if (!currentItem) return
    setVariantViewOnly(false)
    setEditingVariant(null); setVariantTab('sku_info')
    setClientRows([]); setClientEdit(null); setClientEditError({}); setVariantSaveError(null)
    resetVar({
      karat_color: '', sku_type: lo('FIN_SKU_TYPE')[0]?.lookup_code ?? '', group_sales: '', old_erp_variant: '', weight_band: '', size: '', width_size: '', style_tone: '',
      vendor_name: '',
      vendor_variant_code: '', vendor_variant_name: '',
      shape: '', design_source: '', standard_alloy: '', catalogue_reference: '', product_description: '',
      pipe_thickness: '', diamond_cut: '', squeezing: '', setting_size: '',
      wire_size: '', hammering: '', combination_line: '', compacting: '',
      machine_used: '', kada_salai_size: '', lead_time: '',
      rfid_chip_number: '', file_link: '',
      cad_file_url: '', manufacturing_drawing_url: '', technical_documents_url: '',
      rubber_die_number: '',
      gross_weight: '', net_weight: '', wax_resin_weight: '',
      ef_batch_number: '', zinc_surface: '', zinc_die_number: '', zinc_weight: '',
      seo_words: '', usp: '', short_description: '', long_description: '',
      retail_brand: '', keywords_tags: '', product_title: '',
    })
    setVariantModal(true)
  }

  const openEditVariant = async (v: ItemVariant, viewOnly = false) => {
    setVariantViewOnly(viewOnly)
    setEditingVariant(v); setVariantTab('sku_info')
    setClientEditError({}); setVariantSaveError(null)
    resetVar({
      karat_color:         v.karat_color         ?? '',
      sku_type:            v.sku_type             ?? '',
      group_sales:         v.group_sales          ?? '',
      old_erp_variant:     v.old_erp_variant      ?? '',
      weight_band:         v.weight_band          ?? '',
      size:                v.size                 ?? '',
      width_size:          v.width_size           ?? '',
      style_tone:          v.style_tone           ?? '',
      vendor_name:         v.vendor_name           ?? '',
      vendor_variant_code: v.vendor_variant_code  ?? '',
      vendor_variant_name: v.vendor_variant_name  ?? '',
      shape:               v.shape                ?? '',
      design_source:       v.design_source        ?? '',
      standard_alloy:      v.standard_alloy       ?? '',
      catalogue_reference: v.catalogue_reference  ?? '',
      product_description: v.product_description  ?? '',
      pipe_thickness:      v.pipe_thickness        ?? '',
      diamond_cut:         v.diamond_cut           ?? '',
      squeezing:           v.squeezing             ?? '',
      setting_size:        v.setting_size          ?? '',
      wire_size:           v.wire_size             ?? '',
      hammering:           v.hammering             ?? '',
      combination_line:    v.combination_line      ?? '',
      compacting:          v.compacting            ?? '',
      machine_used:        v.machine_used          ?? '',
      kada_salai_size:     v.kada_salai_size        ?? '',
      lead_time:           v.lead_time              ?? '',
      rfid_chip_number:    v.rfid_chip_number       ?? '',
      file_link:           v.file_link              ?? '',
      cad_file_url:              v.cad_file_url              ?? '',
      manufacturing_drawing_url: v.manufacturing_drawing_url ?? '',
      technical_documents_url:   v.technical_documents_url   ?? '',
      rubber_die_number:   v.rubber_die_number      ?? '',
      gross_weight:        v.gross_weight   != null ? String(v.gross_weight)   : '',
      net_weight:          v.net_weight     != null ? String(v.net_weight)     : '',
      wax_resin_weight:    v.wax_resin_weight != null ? String(v.wax_resin_weight) : '',
      ef_batch_number:     v.ef_batch_number        ?? '',
      zinc_surface:        v.zinc_surface           ?? '',
      zinc_die_number:     v.zinc_die_number        ?? '',
      zinc_weight:         v.zinc_weight != null ? String(v.zinc_weight) : '',
      seo_words:           v.seo_words              ?? '',
      usp:                 v.usp                    ?? '',
      short_description:   v.short_description      ?? '',
      long_description:    v.long_description       ?? '',
      retail_brand:        v.retail_brand           ?? '',
      keywords_tags:       v.keywords_tags          ?? '',
      product_title:       v.product_title          ?? '',
    })
    setClientEdit(null)
    await loadVariantClients(v.id)
    setVariantModal(true)
  }

  const handleSaveVariant = async (data: VariantFormValues) => {
    if (!currentItem) return
    setVariantSaveError(null)
    setSavingVariant(true)
    try {
      let variantId: number
      const skuCode = editingVariant
        ? editingVariant.sku_code
        : buildSkuCode(currentItem.design_code, data.karat_color, data.weight_band, data.size)

      const payload = {
        item_id: currentItem.id,
        sku_code: skuCode,
        ...data,
        gross_weight:     data.gross_weight     ? parseFloat(data.gross_weight)     : null,
        net_weight:       data.net_weight       ? parseFloat(data.net_weight)       : null,
        wax_resin_weight: data.wax_resin_weight ? parseFloat(data.wax_resin_weight) : null,
        zinc_weight:      data.zinc_weight      ? parseFloat(data.zinc_weight)      : null,
      }

      if (editingVariant) {
        await dynamicApi.put('fin_variant_update', { id: editingVariant.id }, { ...payload, id: editingVariant.id })
        variantId = editingVariant.id
        toast.success('Variant updated')
      } else {
        const res = await dynamicApi.post('fin_variant_create', {}, payload)
        variantId = res.data?.data?.[0]?.id
        toast.success('Variant created')
      }

      // Save variant clients: delete all then re-insert
      await dynamicApi.delete('fin_variant_client_delete_all', { variant_id: variantId })
      await Promise.all(
        clientRows.map(({ _key: _, ...c }) =>
          dynamicApi.post('fin_variant_client_create', {}, { variant_id: variantId, ...c })
        )
      )

      setVariantModal(false)
      await loadVariants(currentItem.id)
      isFirstLoad.current = true
      loadItems()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save variant'
      toast.error(msg)
    } finally { setSavingVariant(false) }
  }

  const handleInvalidVariant = (errors: Partial<Record<keyof VariantFormValues, unknown>>) => {
    const skuInfoMissing: string[] = []
    if (errors.karat_color) skuInfoMissing.push('Karat / Color')
    if (errors.weight_band) skuInfoMissing.push('Weight Band')
    if (errors.size)        skuInfoMissing.push('Size')

    if (skuInfoMissing.length > 0) {
      setVariantTab('sku_info')
      setVariantSaveError(`Please fill required fields on the SKU Info tab: ${skuInfoMissing.join(', ')}`)
    } else if (errors.sku_type) {
      setVariantTab('general')
      setVariantSaveError('Please fill required fields on the General Info tab: SKU Type')
    } else if (errors.file_link) {
      setVariantTab('casting')
      setVariantSaveError('Please fix the File Link on the Casting tab')
    }
  }

  const confirmDeleteVariant = async () => {
    if (!deleteVariant || !currentItem) return
    try {
      await dynamicApi.put('fin_variant_toggle', { id: deleteVariant.id }, {})
      toast.success('Variant removed')
      setDeleteVariant(null)
      await loadVariants(currentItem.id)
    } catch { toast.error('Failed to remove variant') }
  }

  const lo = (type: string) => lookupMap[type] ?? []
  const lookupLabel = (type: string, code: string) => {
    if (!code) return ''
    const opt = lo(type).find(o => o.lookup_code === code)
    return opt ? opt.lookup_name : code
  }
  const lookupLabels = (type: string, csv: string) =>
    csv ? csv.split(',').filter(Boolean).map(c => lookupLabel(type, c)).join(', ') : ''

  // Add Variant is hidden once Status is Discontinued — no new SKUs on a dead design.
  const isDiscontinued = lookupLabel('STATUS', watchedStatus).toUpperCase() === 'DISCONTINUED'

  const alloyOpts: LookupOption[] = alloys.map(a => ({ lookup_code: a.alloy_code, lookup_name: `${a.alloy_code} – ${a.alloy_name}` }))
  const alloyLabel = (code: string) => alloyOpts.find(o => o.lookup_code === code)?.lookup_name || code || ''

  // ══════════════════════════════════════════════════════════════
  // Render: list view
  // ══════════════════════════════════════════════════════════════
  const renderList = () => (
    <div>
      <PageBreadcrumb parent="Master Management" current="Finding Master" />

      {/* Top bar */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 pl-3">
          {(['active','inactive'] as const).map(s => (
            <button key={s}
              onClick={() => { setStatusFilter(s); setPage(1); setColFilters({}); setSearchInput(''); setSearch('') }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all w-36 ${
                statusFilter === s
                  ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                  : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-gold)]/50'
              }`}>
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
        {canCreate && (
          <button onClick={openAddForm} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> Add Item
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[var(--border-color)]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input value={searchInput} onChange={e => onSearchInput(e.target.value)}
              placeholder="Search items…" className="form-input pl-9 pr-8 py-1.5 text-sm w-full" />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setShowFilterRow(s => !s)} title="Column Filters"
              className={`p-1.5 rounded-lg border transition-colors ${showFilterRow ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
              <FunnelIcon className="w-4 h-4" />
            </button>
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
                  {gridCols.map(col => (
                    <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer">
                      <input type="checkbox" checked={col.visible} onChange={() => toggleCol(col.key)} className="w-3.5 h-3.5 accent-[var(--color-primary)]" />
                      <span className="text-sm text-[var(--text-secondary)]">{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {/* Import */}
            {canCreate && (
              <button onClick={() => setImportOpen(true)} title="Bulk import from Excel"
                className="p-1.5 rounded-lg border transition-colors border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                <ArrowUpTrayIcon className="w-4 h-4" />
              </button>
            )}
            {/* Export */}
            <div ref={exportRef} className="relative">
              <button onClick={() => setExportOpen(o => !o)} disabled={exporting} title="Export"
                className={`p-1.5 rounded-lg border transition-colors ${exportOpen ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--accent-gold)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
                {exporting ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <ArrowDownTrayIcon className="w-4 h-4" />}
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg p-1.5">
                  {(['all','selected'] as const).map(scope => (
                    <div key={scope}>
                      <p className="px-2 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                        {scope === 'all' ? 'Export All' : `Export Selected ${selectedRows.length > 0 ? `(${selectedRows.length})` : ''}`}
                      </p>
                      {(['csv','excel','pdf'] as const).map(fmt => (
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
                      <input value={colFilters[col.key] ?? ''} onChange={e => setColFilters(f => ({ ...f, [col.key]: e.target.value }))}
                        placeholder="Filter…" className="w-full px-2 py-1 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]" />
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
                    <td className="px-4 py-3 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]"><div className="h-4 w-20 rounded animate-pulse bg-[var(--bg-tertiary)]" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length + 2} className="px-4 py-14 text-center">
                    <SparklesIcon className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {search ? 'No items match the search.' : 'No finished goods items yet.'}
                    </p>
                  </td>
                </tr>
              ) : items.map((row, idx) => (
                <tr key={row.id}
                  className={`border-b border-[var(--border-color)] transition-colors hover:bg-[var(--bg-secondary)] ${idx % 2 !== 0 ? 'bg-[var(--bg-primary)]/40' : ''} ${selectedRows.some(r => r.id === row.id) ? 'bg-[var(--accent-gold)]/5' : ''}`}>
                  <td className="px-4 py-2.5">
                    <input type="checkbox" checked={selectedRows.some(r => r.id === row.id)} onChange={() => toggleSelectRow(row)}
                      className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer" />
                  </td>
                  {visibleCols.map(col => (
                    <td key={col.key} className="px-4 py-2.5">{renderCell(col.key, row)}</td>
                  ))}
                  <td className="px-4 py-2.5 sticky right-0 z-10 bg-[var(--bg-card)] border-l border-[var(--border-color)]">
                    <div className="flex items-center justify-center gap-1">
                      {canUpdate && (
                        <button onClick={() => openEditForm(row)} className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500 ${(!row.is_active || row.used_in_bom) ? 'invisible' : ''}`} title="Edit">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      )}
                      {canView && (
                        <button onClick={() => openEditForm(row, 'view')} className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]" title="View">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setToggleItem(row)}
                          className={`p-1.5 rounded hover:bg-[var(--bg-tertiary)] ${row.is_active ? 'text-red-500' : 'text-green-600'} ${row.used_in_bom ? 'invisible' : ''}`}
                          title={row.is_active ? 'Deactivate' : 'Activate'}>
                          {row.is_active ? <NoSymbolIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
                        </button>
                      )}
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
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-gold)]/15 border border-[var(--accent-gold)]/30">{selectedRows.length} selected</span>
                <button onClick={() => setSelectedRows([])} className="text-xs text-[var(--text-muted)] hover:underline">Clear</button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button disabled={page===1} onClick={() => setPage(1)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">«</button>
            <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">‹</button>
            {pageNumbers.map((n, i) =>
              n==='...' ? <span key={`d${i}`} className="px-1.5 text-xs text-[var(--text-muted)]">…</span> : (
                <button key={n} onClick={() => setPage(n as number)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${page===n ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)] text-white font-semibold' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                  {n}
                </button>
              )
            )}
            <button disabled={page>=totalPages} onClick={() => setPage(p=>p+1)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">›</button>
            <button disabled={page>=totalPages} onClick={() => setPage(totalPages)} className="px-2 py-1 text-xs rounded border border-[var(--border-color)] disabled:opacity-35 hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">»</button>
          </div>
          <span className="text-sm text-[var(--text-muted)] hidden sm:block">Page {page} of {totalPages||1}</span>
        </div>
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════════════════
  // Render: item form view
  // ══════════════════════════════════════════════════════════════
  const filteredDesigns = useMemo(() =>
    designs.filter(d =>
      d.design_code.toLowerCase().includes(designSearch.toLowerCase()) ||
      d.design_no.toLowerCase().includes(designSearch.toLowerCase())
    ).slice(0, 20)
  , [designs, designSearch])


  const renderForm = () => (
    <div>
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <button onClick={() => setView('list')} className="hover:text-[var(--accent-gold)] flex items-center gap-1">
          <ArrowLeftIcon className="w-3.5 h-3.5" /> Finding Master
        </button>
        <span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>
          {formMode === 'add' ? 'New Item' : formMode === 'view' ? `View: ${currentItem?.design_code}` : `Edit: ${currentItem?.design_code}`}
        </span>
      </div>

      <form onSubmit={submitItem(handleSaveHeader)}>
        {/* ── Section: Design ─────────────────────────────── */}
        <div className="card p-5 mb-4">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <SparklesIcon className="w-4 h-4 text-[var(--accent-gold)]" /> Design
          </h3>

          {/* Two-column layout: fields left, photo right */}
          <div className="flex flex-col lg:flex-row gap-5">

            {/* ── Left: fields ── */}
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Design Code LOV */}
                <div ref={designRef} className="relative sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Design Code{formMode === 'add' && <Req />}
                    </label>
                    {formMode === 'add' && (
                      <button type="button" onClick={openDesignDrawer}
                        className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg border transition-colors"
                        style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}>
                        <PlusIcon className="w-3 h-3" /> New Design
                      </button>
                    )}
                  </div>
                  {formMode !== 'add' ? (
                    <div className="form-input font-mono font-semibold cursor-default select-all" style={{ color: 'var(--accent-gold)', background: 'var(--bg-tertiary)' }}>
                      {currentItem?.design_code ?? selectedDesign?.design_code ?? '—'}
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        value={designSearch}
                        onChange={e => { setDesignSearch(e.target.value); setShowDesignDD(true); if (!e.target.value) setItemVal('design_code', '') }}
                        onFocus={() => setShowDesignDD(true)}
                        placeholder="Search design code…"
                        className="form-input pr-8"
                      />
                      {designSearch && (
                        <button type="button" onClick={() => { setDesignSearch(''); setItemVal('design_code', ''); setSelectedDesign(null) }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                  {showDesignDD && filteredDesigns.length > 0 && formMode === 'add' && (
                    <div className="absolute z-40 w-full top-full mt-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg max-h-52 overflow-y-auto">
                      {filteredDesigns.map(d => (
                        <button key={d.id} type="button" onClick={() => handleDesignSelect(d)}
                          className="w-full text-left px-3 py-2 hover:bg-[var(--bg-secondary)] flex items-center gap-3">
                          {/* Thumbnail in dropdown */}
                          {d.design_image ? (
                            <img src={getFileUrl(d.design_image) ?? ''} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-[var(--border-color)]" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          ) : (
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-tertiary)' }}>
                              <PhotoIcon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                            </div>
                          )}
                          <div>
                            <span className="font-mono text-sm font-semibold block" style={{ color: 'var(--accent-gold)' }}>{d.design_code}</span>
                            <span className="text-xs text-[var(--text-muted)]">{d.design_no} — {d.collection_name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <input type="hidden" {...regItem('design_code')} />
                  {itemErrors.design_code && <p className="text-xs text-red-500 mt-1">{itemErrors.design_code.message}</p>}
                </div>

                {/* Auto-populated read-only fields */}
                {[
                  { label: 'Collection',   val: lookupLabel('COLLECTION', (selectedDesign ?? currentItem)?.collection_name ?? '') },
                  { label: 'Finding Name', val: lookupLabel('PRODUCT',    (selectedDesign ?? currentItem)?.product_name    ?? '') },
                  { label: 'Design No',    val: (selectedDesign ?? currentItem)?.design_no ?? '' },
                  { label: 'Creation Date', val: new Date(currentItem?.created_at ?? Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                    <div className="form-input cursor-not-allowed opacity-70 bg-[var(--bg-tertiary)]" style={{ minHeight: '38px' }}>
                      {f.val || <span className="text-[var(--text-muted)]">Auto-populated</span>}
                    </div>
                  </div>
                ))}

              </div>
            </div>

            {/* ── Right: Design Photo ── */}
            <div className="lg:w-52 flex-shrink-0">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Design Photo</label>
              <DesignPhotoPanel
                image={selectedDesign?.design_image ?? currentItem?.design_image}
                designId={selectedDesign?.id ?? currentItem?.design_id}
                canUpload={formMode !== 'view'}
                onUploaded={url => {
                  if (selectedDesign) setSelectedDesign(prev => prev ? { ...prev, design_image: url } : prev)
                  setCurrentItem(prev => prev ? { ...prev, design_image: url } : prev)
                  setDesigns(prev => prev.map(d =>
                    d.id === (selectedDesign?.id ?? currentItem?.design_id) ? { ...d, design_image: url } : d
                  ))
                }}
              />
            </div>
          </div>

        </div>

        {/* ── Design Attributes / Media tabs ───────────────────── */}
        <div className="card p-5 mb-4">
          {/* Tab bar */}
          <div className="flex border-b mb-5" style={{ borderColor: 'var(--border-color)' }}>
            {([
              { id: 'attrs', label: 'Design Attributes', icon: <TagIcon className="w-4 h-4" /> },
              { id: 'media', label: 'Media',             icon: <PhotoIcon className="w-4 h-4" /> },
            ] as const).map(t => (
              <button key={t.id} type="button" onClick={() => setItemTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  itemTab === t.id
                    ? 'border-[var(--accent-gold)] text-[var(--accent-gold)]'
                    : 'border-transparent hover:text-[var(--text-secondary)]'
                }`}
                style={{ color: itemTab === t.id ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Design Attributes */}
          {itemTab === 'attrs' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {([
                { name: 'jewellery_type'      as const, label: 'Jewellery Type',      type: 'JEWELLERY_TYPE',      req: true  },
                { name: 'gender'              as const, label: 'Gender',              type: 'GENDER',              req: true  },
                { name: 'tech_type'           as const, label: 'Tech Type',           type: 'TECH_TYPE',           req: true  },
                { name: 'manufacturing_level' as const, label: 'Manufacturing Level', type: 'MANUFACTURING_LEVEL', req: true  },
                { name: 'sub_category'        as const, label: 'Sub Category',        type: 'SUB-CATEGORY',        req: false },
                { name: 'status'             as const, label: 'Status',             type: 'STATUS',             req: true  },
                { name: 'uom1'               as const, label: 'UOM1',               type: 'UOM1',               req: true  },
                { name: 'uom2'               as const, label: 'UOM2',               type: 'UOM',                req: false },
              ]).map(f => (
                <div key={f.name}>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    {f.label}{f.req && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <Controller name={f.name} control={controlItem} render={({ field }) => (
                    <SearchSelect
                      options={lo(f.type)}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder={`Search ${f.label}…`}
                      disabled={formMode === 'view' || variantViewOnly}
                    />
                  )} />
                  {f.req && itemErrors[f.name] && <p className="text-xs text-red-500 mt-1">{itemErrors[f.name]?.message}</p>}
                </div>
              ))}

              {/* Occasion — multi-select */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Occasion <span className="text-red-500">*</span></label>
                <Controller name="occasion" control={controlItem} render={({ field }) => (
                  <MultiSearchSelect
                    options={lo('OCASSION')}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="Search Occasion…"
                    disabled={formMode === 'view' || variantViewOnly}
                  />
                )} />
                {itemErrors.occasion && <p className="text-xs text-red-500 mt-1">{itemErrors.occasion.message}</p>}
              </div>

              {/* Manufacturing Name */}
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Manufacturing Name <span className="text-red-500">*</span></label>
                <Controller name="manufacturing_name" control={controlItem} render={({ field }) => (
                  <SearchSelect
                    options={lo('MANUFACTURING_NAME')}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="Search manufacturing name…"
                    disabled={formMode === 'view' || variantViewOnly}
                  />
                )} />
                {itemErrors.manufacturing_name && <p className="text-xs text-red-500 mt-1">{itemErrors.manufacturing_name.message}</p>}
              </div>
            </div>
          )}

          {/* Tab 2: Media */}
          {itemTab === 'media' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Video Upload URL</label>
                  <Controller name="video_upload" control={controlItem} render={({ field }) => (
                    <>
                      <input value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur}
                        className="form-input" placeholder="https://… or \\server\share\file.mp4" readOnly={formMode === 'view' || variantViewOnly} />
                      {itemErrors.video_upload && <p className="text-xs text-red-500 mt-1">{itemErrors.video_upload.message}</p>}
                      {formMode !== 'view' && !variantViewOnly && (
                        <QuickUploadButton label="Upload Video File" docType="video" accept=".mp4,.mov" maxMB={50} onUploaded={field.onChange} />
                      )}
                    </>
                  )} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>360° Video URL</label>
                  <Controller name="video_360" control={controlItem} render={({ field }) => (
                    <>
                      <input value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur}
                        className="form-input" placeholder="https://… or \\server\share\file.mp4" readOnly={formMode === 'view' || variantViewOnly} />
                      {itemErrors.video_360 && <p className="text-xs text-red-500 mt-1">{itemErrors.video_360.message}</p>}
                      {formMode !== 'view' && !variantViewOnly && (
                        <QuickUploadButton label="Upload 360° Video File" docType="video360" accept=".mp4,.mov" maxMB={50} onUploaded={field.onChange} />
                      )}
                    </>
                  )} />
                </div>
              </div>
              <ItemMediaPanel masterType="fin" itemId={currentItem?.id} canUpload={formMode !== 'view'} />
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4 mb-4">
          {formMode === 'view' ? (
            <button type="button" onClick={() => setView('list')} className="btn-secondary">Back</button>
          ) : (
            <>
              <button type="button" onClick={() => setView('list')} className="btn-secondary mr-2">Cancel</button>
              <button type="submit" disabled={savingHeader} className="btn-primary">
                {savingHeader ? 'Saving…' : formMode === 'add' ? 'Save & Continue' : 'Update Item'}
              </button>
            </>
          )}
        </div>
      </form>

      {/* ── Section: Variant Management (only when item exists) */}
      {currentItem && (formMode === 'edit' || formMode === 'view') ? (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Variant Management</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {variants.length} variant{variants.length !== 1 ? 's' : ''} — SKU Code = Design Code + Karat/Color + Weight Band + Size
              </p>
            </div>
            {formMode === 'edit' && !isDiscontinued && (
              <button onClick={openAddVariant} className="btn-primary flex items-center gap-2">
                <PlusIcon className="w-4 h-4" /> Add Variant
              </button>
            )}
          </div>
          {variantsLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-[var(--accent-gold)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : variants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <SparklesIcon className="w-8 h-8 mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {isDiscontinued ? 'No variants yet.' : 'No variants yet. Click "Add Variant" to create the first SKU.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                  {['SKU Code','Collection','Finding Name','SKU Type','Karat / Color','Weight Band','Size','BOM Status','Actions'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.map(v => (
                  <tr key={v.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-4 py-2.5 font-mono text-sm font-semibold" style={{ color: 'var(--accent-gold)' }}>{v.sku_code}</td>
                    <td className="px-4 py-2.5 text-sm text-[var(--text-secondary)]">{lookupLabel('COLLECTION', currentItem?.collection_name ?? '') || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-[var(--text-secondary)]">{lookupLabel('PRODUCT', currentItem?.product_name ?? '') || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-[var(--text-secondary)]">{lookupLabel('FIN_SKU_TYPE', v.sku_type) || v.sku_type || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-[var(--text-secondary)]">{v.karat_color || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-[var(--text-secondary)]">{v.weight_band || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-[var(--text-secondary)]">{v.size || '—'}</td>
                    <td className="px-4 py-2.5">
                      {(() => {
                        const bst = v.bom_status ?? 'NO_BOM'
                        const meta: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'secondary' }> = {
                          ACTIVE:           { label: 'Active',           variant: 'success'   },
                          PENDING_APPROVAL: { label: 'Pending Approval', variant: 'warning'   },
                          DRAFT:            { label: 'Draft',            variant: 'secondary' },
                          REJECTED:         { label: 'Rejected',         variant: 'danger'    },
                          NO_BOM:           { label: 'No BOM',           variant: 'secondary' },
                        }
                        const m = meta[bst] ?? meta.NO_BOM
                        return <Badge label={m.label} variant={m.variant} />
                      })()}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {formMode === 'edit' ? (
                          <>
                            {!v.bom_id ? (
                              <button onClick={() => openEditVariant(v)} className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500" title="Edit Variant">
                                <PencilIcon className="w-4 h-4" />
                              </button>
                            ) : (
                              <button onClick={() => openEditVariant(v, true)} className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]" title="View Variant">
                                <EyeIcon className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => {
                              dispatch(openTab({ id: 'master-mgmt-sfg-bom', title: 'Bill of Materials (Finding BOM)', path: '/master-mgmt/sfg-bom' }))
                              navigate('/master-mgmt/sfg-bom', { state: { openVariantId: v.id, skuCode: v.sku_code } })
                            }} className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--accent-gold)]" title="Open Finding BOM">
                              <TableCellsIcon className="w-4 h-4" />
                            </button>
                            {!v.bom_id && (
                              <button onClick={() => setDeleteVariant(v)} className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-red-500" title="Remove Variant">
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        ) : (
                          <button onClick={() => openEditVariant(v, true)} className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]" title="View Variant">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : formMode === 'add' && (
        <div className="card p-6 text-center" style={{ borderStyle: 'dashed', borderColor: 'var(--border-color)' }}>
          <SparklesIcon className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Save the item header first to enable variant management.</p>
        </div>
      )}
    </div>
  )

  // ══════════════════════════════════════════════════════════════
  // Render: variant modal
  // ══════════════════════════════════════════════════════════════
  const renderVariantModal = () => {
    if (!variantModal) return null
    const isNewVariant = !editingVariant

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
        <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl flex flex-col animate-fade-in"
          style={{ background: 'var(--bg-modal)', border: '1px solid var(--border-color)', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 rounded-t-2xl"
            style={{ background: 'var(--bg-modal-header)', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {isNewVariant ? 'Add New Variant' : (formMode === 'view' || variantViewOnly) ? `View Variant: ${editingVariant?.sku_code}` : `Edit Variant: ${editingVariant?.sku_code}`}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Item: <span className="font-mono font-semibold text-[var(--accent-gold)]">{currentItem?.design_code}</span>
                {' '} | {currentItem?.collection_name} — {currentItem?.product_name}
              </p>
            </div>
            <button onClick={() => setVariantModal(false)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Sub-tab bar */}
          <div className="flex flex-wrap gap-1 px-4 pt-3 pb-0 flex-shrink-0 overflow-x-auto"
            style={{ borderBottom: '1px solid var(--border-color)' }}>
            {VARIANT_TABS.map(t => (
              <button key={t.id} type="button" onClick={() => setVariantTab(t.id)}
                className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap border-b-2 ${
                  variantTab === t.id
                    ? 'border-[var(--accent-gold)] text-[var(--accent-gold)] bg-[var(--accent-gold)]/5'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <form onSubmit={submitVar(handleSaveVariant, handleInvalidVariant)} className="flex flex-col flex-1 min-h-0">
            <div className="px-6 py-5 overflow-y-auto flex-1">
              {variantSaveError && (
                <div className="mb-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm"
                  style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}>
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <span>{variantSaveError}</span>
                </div>
              )}

              {/* ── SKU Info ─────────────────────────────────── */}
              {variantTab === 'sku_info' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Readonly: Collection, Finding Name, Design No */}
                  {[
                    { label: 'Collection',   val: lookupLabel('COLLECTION', currentItem?.collection_name ?? '') },
                    { label: 'Finding Name', val: lookupLabel('PRODUCT',    currentItem?.product_name    ?? '') },
                    { label: 'Design No',  val: currentItem?.design_no ?? '' },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                      <div className="form-input cursor-not-allowed opacity-70 bg-[var(--bg-tertiary)]" style={{ minHeight: '38px' }}>
                        {f.val || <span className="text-[var(--text-muted)]">—</span>}
                      </div>
                    </div>
                  ))}
                  {/* Karat / Color — locked once variant exists so SKU Code can't drift */}
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Karat / Color<Req /></label>
                    <Controller name="karat_color" control={controlVar} render={({ field }) => (
                      <SearchSelect options={lo('KARAT_COL')} value={field.value ?? ''} onChange={field.onChange} placeholder="Search karat / color…" disabled={formMode === 'view' || variantViewOnly || !isNewVariant} />
                    )} />
                    {varErrors.karat_color && <p className="text-xs text-red-500 mt-1">{varErrors.karat_color.message}</p>}
                  </div>
                  {/* Weight Band — locked once variant exists so SKU Code can't drift */}
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Weight Band <span className="text-red-500">*</span></label>
                    <Controller name="weight_band" control={controlVar} render={({ field }) => (
                      <SearchSelect options={lo('FINDING_WB')} value={field.value ?? ''} onChange={field.onChange} placeholder="Search weight band…" disabled={formMode === 'view' || variantViewOnly || !isNewVariant} />
                    )} />
                    {varErrors.weight_band && <p className="text-xs text-red-500 mt-1">{varErrors.weight_band.message}</p>}
                  </div>
                  {/* Size — locked once variant exists so SKU Code can't drift */}
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Size <span className="text-red-500">*</span></label>
                    <Controller name="size" control={controlVar} render={({ field }) => (
                      <SearchSelect options={lo('FINDING_SIZE')} value={field.value ?? ''} onChange={field.onChange} placeholder="Search size…" disabled={formMode === 'view' || variantViewOnly || !isNewVariant} />
                    )} />
                    {varErrors.size && <p className="text-xs text-red-500 mt-1">{varErrors.size.message}</p>}
                  </div>
                  {/* SKU Code — readonly, live preview */}
                  <div className="lg:col-span-3">
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>SKU Code</label>
                    <div className="form-input cursor-not-allowed opacity-70 bg-[var(--bg-tertiary)] font-mono font-semibold" style={{ color: 'var(--accent-gold)', minHeight: '38px' }}>
                      {editingVariant?.sku_code ||
                        buildSkuCode(currentItem?.design_code ?? '', watchVar('karat_color') ?? '', watchVar('weight_band') ?? '', watchVar('size') ?? '') ||
                        <span className="text-[var(--text-muted)] font-normal">Auto-generated on save</span>
                      }
                    </div>
                  </div>
                </div>
              )}

              {/* ── General Info ─────────────────────────────── */}
              {variantTab === 'general' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>SKU Type<Req /></label>
                    <Controller name="sku_type" control={controlVar} render={({ field }) => (
                      <SearchSelect options={lo('FIN_SKU_TYPE')} value={field.value ?? ''} onChange={field.onChange} placeholder="Search SKU type…" disabled={formMode === 'view' || variantViewOnly} />
                    )} />
                    {varErrors.sku_type && <p className="text-xs text-red-500 mt-1">{varErrors.sku_type.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Group Sales</label>
                    <Controller name="group_sales" control={controlVar} render={({ field }) => (
                      <SearchSelect options={lo('GROUP_SALES')} value={field.value ?? ''} onChange={field.onChange} placeholder="Search group sales…" disabled={formMode === 'view' || variantViewOnly} />
                    )} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Old ERP Variant</label>
                    <input {...regVar('old_erp_variant')} className="form-input" placeholder="Old ERP variant code" readOnly={formMode === 'view' || variantViewOnly} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Width Size</label>
                    <Controller name="width_size" control={controlVar} render={({ field }) => (
                      <SearchSelect options={lo('WIDTH_SIZE')} value={field.value ?? ''} onChange={field.onChange} placeholder="Search width size…" disabled={formMode === 'view' || variantViewOnly} />
                    )} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Style Tone</label>
                    <Controller name="style_tone" control={controlVar} render={({ field }) => (
                      <SearchSelect options={lo('STYLE_TONE')} value={field.value ?? ''} onChange={field.onChange} placeholder="Search style tone…" disabled={formMode === 'view' || variantViewOnly} />
                    )} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Shape</label>
                    <Controller name="shape" control={controlVar} render={({ field }) => (
                      <SearchSelect options={lo('SHAPE')} value={field.value ?? ''} onChange={field.onChange} placeholder="Search shape…" disabled={formMode === 'view' || variantViewOnly} />
                    )} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Design Source</label>
                    <Controller name="design_source" control={controlVar} render={({ field }) => (
                      <SearchSelect options={lo('DESIGN_SOURCE')} value={field.value ?? ''} onChange={field.onChange} placeholder="Search design source…" disabled={formMode === 'view' || variantViewOnly} />
                    )} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Standard Alloy</label>
                    <Controller name="standard_alloy" control={controlVar} render={({ field }) => (
                      <SearchSelect options={alloyOpts} value={field.value ?? ''} onChange={field.onChange} placeholder="Search alloy…" disabled={formMode === 'view' || variantViewOnly} />
                    )} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Catalogue Reference</label>
                    <input {...regVar('catalogue_reference')} className="form-input" placeholder="Catalogue reference" readOnly={formMode === 'view' || variantViewOnly} />
                  </div>
                  {(watchVar('design_source') === 'VENDOR' || ((formMode === 'view' || variantViewOnly) && watchVar('vendor_name'))) && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Vendor Name</label>
                        <Controller name="vendor_name" control={controlVar} render={({ field }) => (
                          <SearchSelect
                            options={suppliers.map(s => ({ lookup_code: s.vendor_company_name, lookup_name: s.vendor_company_name }))}
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            placeholder="Search vendor…"
                            disabled={formMode === 'view' || variantViewOnly}
                          />
                        )} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Vendor Variant Code</label>
                        <input {...regVar('vendor_variant_code')} className="form-input" placeholder="Vendor's variant code" readOnly={formMode === 'view' || variantViewOnly} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Vendor Variant Name</label>
                        <input {...regVar('vendor_variant_name')} className="form-input" placeholder="Vendor's variant name" readOnly={formMode === 'view' || variantViewOnly} />
                      </div>
                    </>
                  )}
                  <div className="lg:col-span-3">
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Product Description</label>
                    <textarea {...regVar('product_description')} rows={2} className="form-input resize-none" placeholder="Variant product description" readOnly={formMode === 'view' || variantViewOnly} />
                  </div>

                  {/* ── Client Entries ──────────────────────────── */}
                  <div className="lg:col-span-3 mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Client Variants</span>
                      {formMode !== 'view' && !variantViewOnly && !clientEdit && (
                        <button type="button"
                          onClick={() => setClientEdit({ _key: `vc_${Date.now()}`, customer_name: '', customer_variant_code: '', customer_variant_name: '', alloy_code: '', group_sales: '' })}
                          className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
                          <PlusIcon className="w-3.5 h-3.5" /> Add Client
                        </button>
                      )}
                    </div>

                    {/* Client rows — edit panel renders inline in place of the row being edited */}
                    {clientRows.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {clientRows.map(row => (
                          clientEdit && clientEdit._key === row._key ? (
                            /* ── Inline edit form for this row ── */
                            <div key={row._key} ref={el => { if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }} className="rounded-xl p-4 space-y-3" style={{ border: '2px solid var(--accent-gold)', background: 'var(--bg-secondary)' }}>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Customer Name<Req /></label>
                                  <SearchSelect
                                    options={customers.map(c => ({ lookup_code: c.customer_company_name, lookup_name: c.customer_company_name }))}
                                    value={clientEdit.customer_name}
                                    onChange={v => { setClientEdit(e => e && ({ ...e, customer_name: v })); setClientEditError(er => ({ ...er, customer_name: undefined })) }}
                                    placeholder="Search customer…"
                                  />
                                  {clientEditError.customer_name && <p className="text-xs text-red-500 mt-1">{clientEditError.customer_name}</p>}
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Customer Variant Code<Req /></label>
                                  <input className="form-input" placeholder="Customer's variant code"
                                    value={clientEdit.customer_variant_code}
                                    onChange={e => { setClientEdit(ce => ce && ({ ...ce, customer_variant_code: e.target.value })); setClientEditError(er => ({ ...er, customer_variant_code: undefined })) }} />
                                  {clientEditError.customer_variant_code && <p className="text-xs text-red-500 mt-1">{clientEditError.customer_variant_code}</p>}
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Customer Variant Name<Req /></label>
                                  <input className="form-input" placeholder="Customer's variant name"
                                    value={clientEdit.customer_variant_name}
                                    onChange={e => { setClientEdit(ce => ce && ({ ...ce, customer_variant_name: e.target.value })); setClientEditError(er => ({ ...er, customer_variant_name: undefined })) }} />
                                  {clientEditError.customer_variant_name && <p className="text-xs text-red-500 mt-1">{clientEditError.customer_variant_name}</p>}
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Customer Alloy</label>
                                  <SearchSelect options={alloyOpts} value={clientEdit.alloy_code}
                                    onChange={v => setClientEdit(ce => ce && ({ ...ce, alloy_code: v }))} placeholder="Search alloy…" />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Customer Sales Group</label>
                                  <SearchSelect options={lo('GROUP_SALES')} value={clientEdit.group_sales}
                                    onChange={v => setClientEdit(ce => ce && ({ ...ce, group_sales: v }))} placeholder="Search group sales…" />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => { setClientEdit(null); setClientEditError({}) }} className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
                                <button type="button" onClick={() => {
                                  const errs: typeof clientEditError = {}
                                  if (!clientEdit.customer_name) errs.customer_name = 'Customer Name is required'
                                  if (!clientEdit.customer_variant_code?.trim()) errs.customer_variant_code = 'Customer Variant Code is required'
                                  if (!clientEdit.customer_variant_name?.trim()) errs.customer_variant_name = 'Customer Variant Name is required'
                                  if (Object.keys(errs).length) { setClientEditError(errs); return }
                                  setClientEditError({})
                                  setClientRows(rows => rows.map(r => r._key === clientEdit._key ? clientEdit : r))
                                  setClientEdit(null)
                                }} className="btn-primary text-xs py-1.5 px-3">Save</button>
                              </div>
                            </div>
                          ) : (
                            /* ── Read-only row ── */
                            <div key={row._key} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
                              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                              <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-3">
                                <div>
                                  <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Customer</span>
                                  <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{row.customer_name || '—'}</p>
                                </div>
                                <div>
                                  <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Variant Code</span>
                                  <p className="font-mono truncate" style={{ color: 'var(--text-primary)' }}>{row.customer_variant_code || '—'}</p>
                                </div>
                                <div>
                                  <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Variant Name</span>
                                  <p className="truncate" style={{ color: 'var(--text-primary)' }}>{row.customer_variant_name || '—'}</p>
                                </div>
                                <div>
                                  <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Customer Alloy</span>
                                  <p className="truncate" style={{ color: 'var(--text-primary)' }}>{alloyLabel(row.alloy_code) || '—'}</p>
                                </div>
                                <div>
                                  <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Customer Sales Group</span>
                                  <p className="truncate" style={{ color: 'var(--text-primary)' }}>{lookupLabel('GROUP_SALES', row.group_sales) || row.group_sales || '—'}</p>
                                </div>
                              </div>
                              {formMode !== 'view' && !variantViewOnly && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button type="button" onClick={() => setClientEdit({ ...row, alloy_code: row.alloy_code ?? '', group_sales: row.group_sales ?? '' })}
                                    className="px-2 py-1 rounded text-xs font-medium"
                                    style={{ color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)' }}>
                                    Edit
                                  </button>
                                  <button type="button" onClick={() => setClientRows(r => r.filter(x => x._key !== row._key))}
                                    className="px-2 py-1 rounded text-xs font-medium text-red-500"
                                    style={{ border: '1px solid currentColor' }}>
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        ))}
                      </div>
                    )}

                    {/* Add-new panel — only shown when adding (key doesn't match any existing row) */}
                    {clientEdit && !clientRows.find(r => r._key === clientEdit._key) && (
                      <div ref={clientAddPanelRef} className="rounded-xl p-4 space-y-3" style={{ border: '2px solid var(--accent-gold)', background: 'var(--bg-secondary)' }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Customer Name<Req /></label>
                            <SearchSelect
                              options={customers.map(c => ({ lookup_code: c.customer_company_name, lookup_name: c.customer_company_name }))}
                              value={clientEdit.customer_name}
                              onChange={v => { setClientEdit(e => e && ({ ...e, customer_name: v })); setClientEditError(er => ({ ...er, customer_name: undefined })) }}
                              placeholder="Search customer…"
                            />
                            {clientEditError.customer_name && <p className="text-xs text-red-500 mt-1">{clientEditError.customer_name}</p>}
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Customer Variant Code<Req /></label>
                            <input
                              className="form-input"
                              placeholder="Customer's variant code"
                              value={clientEdit.customer_variant_code}
                              onChange={e => { setClientEdit(ce => ce && ({ ...ce, customer_variant_code: e.target.value })); setClientEditError(er => ({ ...er, customer_variant_code: undefined })) }}
                            />
                            {clientEditError.customer_variant_code && <p className="text-xs text-red-500 mt-1">{clientEditError.customer_variant_code}</p>}
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Customer Variant Name<Req /></label>
                            <input
                              className="form-input"
                              placeholder="Customer's variant name"
                              value={clientEdit.customer_variant_name}
                              onChange={e => { setClientEdit(ce => ce && ({ ...ce, customer_variant_name: e.target.value })); setClientEditError(er => ({ ...er, customer_variant_name: undefined })) }}
                            />
                            {clientEditError.customer_variant_name && <p className="text-xs text-red-500 mt-1">{clientEditError.customer_variant_name}</p>}
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Customer Alloy</label>
                            <SearchSelect
                              options={alloyOpts}
                              value={clientEdit.alloy_code}
                              onChange={v => setClientEdit(ce => ce && ({ ...ce, alloy_code: v }))}
                              placeholder="Search alloy…"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Customer Sales Group</label>
                            <SearchSelect
                              options={lo('GROUP_SALES')}
                              value={clientEdit.group_sales}
                              onChange={v => setClientEdit(ce => ce && ({ ...ce, group_sales: v }))}
                              placeholder="Search group sales…"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => { setClientEdit(null); setClientEditError({}) }} className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
                          <button type="button" onClick={() => {
                            const errs: typeof clientEditError = {}
                            if (!clientEdit.customer_name) errs.customer_name = 'Customer Name is required'
                            if (!clientEdit.customer_variant_code?.trim()) errs.customer_variant_code = 'Customer Variant Code is required'
                            if (!clientEdit.customer_variant_name?.trim()) errs.customer_variant_name = 'Customer Variant Name is required'
                            if (Object.keys(errs).length) { setClientEditError(errs); return }
                            setClientEditError({})
                            setClientRows(rows => {
                              const exists = rows.find(r => r._key === clientEdit._key)
                              return exists
                                ? rows.map(r => r._key === clientEdit._key ? clientEdit : r)
                                : [...rows, clientEdit]
                            })
                            setClientEdit(null)
                          }} className="btn-primary text-xs py-1.5 px-3">Save</button>
                        </div>
                      </div>
                    )}

                    {clientRows.length === 0 && !clientEdit && (
                      <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>
                        No client variants added. {formMode !== 'view' && !variantViewOnly && 'Click "Add Client" above.'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Manufacturing ─────────────────────────────── */}
              {variantTab === 'mfg' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {([
                    ['pipe_thickness',   'Pipe Thickness',    'PIPE_THICKNESS'],
                    ['diamond_cut',      'Diamond Cut',       'DIAMOND_CUT'],
                    ['squeezing',        'Squeezing',         'SQUEEZING'],
                    ['setting_size',     'Setting Size',      'SETTING_SIZE'],
                    ['wire_size',        'Wire Size',         'WIRE_SIZE'],
                    ['hammering',        'Hammering',         'HAMMERING'],
                    ['combination_line', 'Combination Line',  'COMBINATION_LINE'],
                    ['compacting',       'Compacting',        'COMPACTING'],
                    ['kada_salai_size',  'Kada Salai Size',   'KADA_SALAI_SIZE'],
                    ['lead_time',        'Lead Time',         'LEAD_TIME'],
                  ] as const).map(([name, label, lookupType]) => (
                    <div key={name}>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                      <Controller name={name} control={controlVar} render={({ field }) => (
                        <SearchSelect
                          options={lo(lookupType)}
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          placeholder={`Search ${label}…`}
                          disabled={formMode === 'view' || variantViewOnly}
                        />
                      )} />
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Machine Used</label>
                    <Controller name="machine_used" control={controlVar} render={({ field }) => (
                      <MultiSearchSelect
                        options={lo('MACHINE_TYPE')}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        placeholder="Search Machine Used…"
                        disabled={formMode === 'view' || variantViewOnly}
                      />
                    )} />
                  </div>
                </div>
              )}

              {/* ── Casting ───────────────────────────────────── */}
              {variantTab === 'casting' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>RFID Chip Number</label>
                    <input {...regVar('rfid_chip_number')} className="form-input" placeholder="RFID chip number" readOnly={formMode === 'view' || variantViewOnly} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Rubber Die Number</label>
                    <input {...regVar('rubber_die_number')} className="form-input" placeholder="Rubber die number" readOnly={formMode === 'view' || variantViewOnly} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Gross Weight (gm)</label>
                    <input type="number" {...regVar('gross_weight')} className="form-input" placeholder="0.0000" step="0.0001" min="0" readOnly={formMode === 'view' || variantViewOnly} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Net Weight (gm)</label>
                    <input type="number" {...regVar('net_weight')} className="form-input" placeholder="0.0000" step="0.0001" min="0" readOnly={formMode === 'view' || variantViewOnly} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Wax / Resin Weight</label>
                    <input type="number" {...regVar('wax_resin_weight')} className="form-input" placeholder="0.000" step="0.001" min="0" readOnly={formMode === 'view' || variantViewOnly} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>File Link</label>
                    <input {...regVar('file_link')} className="form-input" placeholder="https://… or \\server\share\file.dwg" readOnly={formMode === 'view' || variantViewOnly} />
                    {varErrors.file_link && <p className="text-xs text-red-500 mt-1">{varErrors.file_link.message}</p>}
                  </div>
                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Controller name="cad_file_url" control={controlVar} render={({ field }) => (
                      <VariantDocUpload label="CAD File" docType="cad" accept=".dwg,.dxf,.step,.stp,.stl,.3dm,.igs,.iges"
                        hint="DWG, DXF, STEP, STL, 3DM, IGES · up to 25 MB" value={field.value ?? ''} onChange={field.onChange}
                        disabled={formMode === 'view' || variantViewOnly} />
                    )} />
                    <Controller name="manufacturing_drawing_url" control={controlVar} render={({ field }) => (
                      <VariantDocUpload label="Manufacturing Drawing" docType="drawing" accept=".pdf,.jpg,.jpeg,.png"
                        hint="PDF, JPG, PNG · up to 25 MB" value={field.value ?? ''} onChange={field.onChange}
                        disabled={formMode === 'view' || variantViewOnly} />
                    )} />
                    <Controller name="technical_documents_url" control={controlVar} render={({ field }) => (
                      <VariantDocUpload label="Technical Documents" docType="techdoc" accept=".pdf,.doc,.docx,.xls,.xlsx"
                        hint="PDF, DOC, XLS · up to 25 MB" value={field.value ?? ''} onChange={field.onChange}
                        disabled={formMode === 'view' || variantViewOnly} />
                    )} />
                  </div>
                </div>
              )}

              {/* ── E-Commerce ────────────────────────────────── */}
              {variantTab === 'ecommerce' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Product Title</label>
                    <input {...regVar('product_title')} className="form-input" placeholder="eCommerce product title" readOnly={formMode === 'view' || variantViewOnly} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Retail Brand</label>
                    <input {...regVar('retail_brand')} className="form-input" placeholder="Brand name" readOnly={formMode === 'view' || variantViewOnly} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>USP (Unique Selling Proposition)</label>
                    <input {...regVar('usp')} className="form-input" placeholder="Key selling points" readOnly={formMode === 'view' || variantViewOnly} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Short Description</label>
                    <textarea {...regVar('short_description')} rows={2} className="form-input resize-none" placeholder="Brief product description (2-3 lines)" readOnly={formMode === 'view' || variantViewOnly} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Long Description</label>
                    <textarea {...regVar('long_description')} rows={4} className="form-input resize-none" placeholder="Detailed product description for product page" readOnly={formMode === 'view' || variantViewOnly} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>SEO Words</label>
                    <input {...regVar('seo_words')} className="form-input" placeholder="SEO meta keywords, comma-separated" readOnly={formMode === 'view' || variantViewOnly} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Keywords / Tags</label>
                    <input {...regVar('keywords_tags')} className="form-input" placeholder="Tags for product discovery" readOnly={formMode === 'view' || variantViewOnly} />
                  </div>
                </div>
              )}

              {/* ── Electro Forming ───────────────────────────── */}
              {variantTab === 'ef' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>EF Batch Number</label>
                    <input {...regVar('ef_batch_number')} className="form-input" placeholder="EF batch number" readOnly={formMode === 'view' || variantViewOnly} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Zinc Die Number</label>
                    <input {...regVar('zinc_die_number')} className="form-input" placeholder="Zinc die number" readOnly={formMode === 'view' || variantViewOnly} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Zinc Surface</label>
                    <input {...regVar('zinc_surface')} className="form-input" placeholder="Zinc surface details" readOnly={formMode === 'view' || variantViewOnly} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Zinc Weight</label>
                    <input type="number" {...regVar('zinc_weight')} className="form-input" placeholder="0.000" step="0.001" min="0" readOnly={formMode === 'view' || variantViewOnly} />
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 flex-shrink-0 rounded-b-2xl"
              style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-modal-footer)' }}>
              {formMode === 'view' || variantViewOnly ? (
                <button type="button" onClick={() => setVariantModal(false)} className="btn-secondary">Close</button>
              ) : (
                <>
                  <button type="button" onClick={() => {
                    if (varIsDirty || clientRows.length > 0 || !!clientEdit) { setCancelConfirmOpen(true) }
                    else { setVariantModal(false) }
                  }} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={savingVariant} className="btn-primary">
                    {savingVariant
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" /> Saving…</>
                      : isNewVariant ? 'Create Variant' : 'Update Variant'
                    }
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════
  // Render: design drawer (right-side panel)
  // ══════════════════════════════════════════════════════════════
  const renderDesignDrawer = () => {
    if (!showDesignDrawer) return null
    return (
      <>
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        <div className="fixed inset-0 z-[300]">
          {/* Backdrop */}
          <div className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
            onClick={() => setShowDesignDrawer(false)} />

          {/* Drawer panel */}
          <div className="absolute top-0 right-0 h-full flex flex-col"
            style={{
              width: 'min(480px, 100vw)',
              background: 'var(--bg-card)',
              borderLeft: '1px solid var(--border-color)',
              boxShadow: '-4px 0 30px rgba(0,0,0,0.2)',
              animation: 'slideInRight 0.25s ease-out',
            }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-modal-header)' }}>
              <div>
                <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <SparklesIcon className="w-4 h-4 text-[var(--accent-gold)]" /> Add New Design
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Create a new design master record</p>
              </div>
              <button type="button" onClick={() => setShowDesignDrawer(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                style={{ color: 'var(--text-secondary)' }}>
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={submitDesign(handleSaveDesign)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                {/* Collection */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Collection<Req />
                  </label>
                  <Controller name="collection_name" control={controlDesign} render={({ field }) => (
                    <SearchSelect options={lo('COLLECTION')} value={field.value ?? ''} onChange={field.onChange} placeholder="Search collection…" />
                  )} />
                  {designErrors.collection_name && <p className="text-xs text-red-500 mt-1">{designErrors.collection_name.message}</p>}
                </div>

                {/* Product */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Finding Name<Req />
                  </label>
                  <Controller name="product_name" control={controlDesign} render={({ field }) => (
                    <SearchSelect options={lo('PRODUCT')} value={field.value ?? ''} onChange={field.onChange} placeholder="Search product…" />
                  )} />
                  {designErrors.product_name && <p className="text-xs text-red-500 mt-1">{designErrors.product_name.message}</p>}
                </div>

                {/* Auto-generated — read only */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Design No</label>
                    <input {...regDesign('design_no')} readOnly placeholder="Auto-generated"
                      className="form-input cursor-not-allowed"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Design Code</label>
                    <input {...regDesign('design_code')} readOnly placeholder="Auto-generated"
                      className="form-input font-mono cursor-not-allowed"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-gold)' }} />
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="flex-shrink-0 px-5 py-4 flex justify-end gap-2"
                style={{ borderTop: '1px solid var(--border-color)' }}>
                <button type="button" onClick={() => setShowDesignDrawer(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={savingDesign} className="btn-primary flex items-center gap-1.5">
                  {savingDesign
                    ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                    : 'Save Design'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </>
    )
  }

  // ══════════════════════════════════════════════════════════════
  // Main render
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="animate-fade-in">
      {view === 'list' ? renderList() : renderForm()}
      {renderVariantModal()}
      {renderDesignDrawer()}

      <FindingImportWizard
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => { loadItems(); loadStats() }}
      />

      {/* Toggle status confirm */}
      <ConfirmDialog
        isOpen={!!toggleItem && !toggleItem.is_active}
        title="Activate Item"
        message={`Activate item "${toggleItem?.design_code}"?`}
        confirmLabel="Activate"
        variant="info"
        onConfirm={() => confirmToggle()}
        onCancel={() => setToggleItem(null)}
      />

      <DeactivateReasonDialog
        isOpen={!!toggleItem?.is_active}
        title="Deactivate Item"
        itemLabel={`Item "${toggleItem?.design_code}" — all its variants will become inaccessible`}
        onConfirm={reason => confirmToggle(reason)}
        onCancel={() => setToggleItem(null)}
      />

      {/* Unsaved changes confirm */}
      <ConfirmDialog
        isOpen={cancelConfirmOpen}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to close? All unsaved data will be lost."
        confirmLabel="Close Anyway"
        variant="danger"
        onConfirm={() => { setCancelConfirmOpen(false); setVariantModal(false); setClientEdit(null); setClientEditError({}); setVariantSaveError(null) }}
        onCancel={() => setCancelConfirmOpen(false)}
      />

      {/* Delete variant confirm */}
      <ConfirmDialog
        isOpen={!!deleteVariant}
        title="Remove Variant"
        message={`Remove variant "${deleteVariant?.sku_code}"? This will deactivate the variant and all its BOM data.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={confirmDeleteVariant}
        onCancel={() => setDeleteVariant(null)}
      />
    </div>
  )
}

export default FindingMasterPage

