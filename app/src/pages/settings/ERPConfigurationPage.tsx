import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Settings2, Upload, X, Save, RefreshCw, Image, Globe,
  Building2, Gem, Eye, Check, AlertCircle, KeyRound,
} from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/hooks'
import { setAppConfig, applyFavicon } from '@/redux/slices/appConfigSlice'
import { apiService, getFileUrl } from '@/api/apiService'
import toast from 'react-hot-toast'

// ── helpers ────────────────────────────────────────────────────────────────────
const toBase64 = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(file)
  })

// ── image upload zone ─────────────────────────────────────────────────────────
interface UploadZoneProps {
  label: string
  hint: string
  current: string | null
  preview: string | null
  accept?: string
  maxKb?: number
  square?: boolean
  onFile: (b64: string) => void
  onClear: () => void
}

const UploadZone: React.FC<UploadZoneProps> = ({
  label, hint, current, preview, accept = 'image/*', maxKb = 2048,
  square = false, onFile, onClear,
}) => {
  const inputRef  = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const handle = useCallback(async (file: File) => {
    if (file.size > maxKb * 1024) { toast.error(`File must be under ${maxKb}KB`); return }
    if (!file.type.startsWith('image/')) { toast.error('Select a valid image'); return }
    onFile(await toBase64(file))
  }, [maxKb, onFile])

  const displaySrc = preview || current

  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>{hint}</p>

      <div
        className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer flex items-center justify-center
          ${drag ? 'border-amber-400 bg-amber-50/30' : 'hover:border-amber-400'} ${square ? 'w-24 h-24' : 'h-28 w-full'}`}
        style={{ borderColor: drag ? 'var(--accent-gold)' : 'var(--border-color)', background: 'var(--bg-secondary)' }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handle(f) }}
      >
        {displaySrc ? (
          <>
            <img src={displaySrc} alt={label}
                 className={`object-contain rounded-lg ${square ? 'w-16 h-16' : 'max-h-20 max-w-full px-4'}`} />
            {preview && (
              <span className="absolute top-1 right-1 text-[9px] px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700">
                New
              </span>
            )}
          </>
        ) : (
          <div className="text-center p-3">
            <Upload className="w-6 h-6 mx-auto mb-1.5 opacity-30" style={{ color: 'var(--text-muted)' }} />
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Click or drag to upload</p>
          </div>
        )}
      </div>

      {displaySrc && (
        <div className="flex gap-2 mt-2">
          <button onClick={() => inputRef.current?.click()}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            <Upload className="w-3 h-3" /> Change
          </button>
          <button onClick={onClear}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border text-red-500 border-red-200">
            <X className="w-3 h-3" /> Remove
          </button>
        </div>
      )}

      <input ref={inputRef} type="file" accept={accept} className="hidden"
             onChange={async (e) => { const f = e.target.files?.[0]; if (f) await handle(f); e.target.value = '' }} />
    </div>
  )
}

// ── sidebar mini-preview ──────────────────────────────────────────────────────
const SidebarPreview: React.FC<{
  logo: string | null; name: string; subtitle: string; footer: string
}> = ({ logo, name, subtitle, footer }) => (
  <div className="rounded-xl overflow-hidden border shadow-lg" style={{ borderColor: 'var(--border-color)' }}>
    {/* Sidebar strip */}
    <div className="flex" style={{ height: 280 }}>
      <div className="w-36 flex flex-col" style={{ background: '#0F172A' }}>
        {/* Logo area */}
        <div className="flex items-center gap-2 px-3 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
               style={{ background: '#1E293B' }}>
            {logo
              ? <img src={logo} alt={name} className="w-full h-full object-contain" />
              : <Gem className="w-3 h-3 text-white" />}
          </div>
          <div className="overflow-hidden">
            <p className="text-[10px] font-bold leading-tight truncate" style={{ color: '#F1F5F9', fontFamily: 'Playfair Display, serif' }}>
              {name || 'ERP Name'}
            </p>
            <p className="text-[8px] leading-tight truncate" style={{ color: '#94A3B8' }}>{subtitle || 'SUBTITLE'}</p>
          </div>
        </div>
        {/* Fake menu items */}
        <div className="flex-1 py-2 space-y-0.5 px-2">
          {['Dashboard', 'Masters', 'Inventory', 'Sales', 'System Admin'].map((m, i) => (
            <div key={m} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md"
                 style={{ background: i === 0 ? 'rgba(201,165,53,0.15)' : 'transparent' }}>
              <div className="w-2 h-2 rounded-sm opacity-40" style={{ background: i === 0 ? '#C9A535' : '#94A3B8' }} />
              <span className="text-[9px] truncate" style={{ color: i === 0 ? '#C9A535' : '#94A3B8' }}>{m}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col" style={{ background: 'var(--bg-primary)' }}>
        <div className="h-6 border-b flex items-center px-2 gap-1" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
          <div className="flex-1 h-2 rounded-full opacity-10" style={{ background: 'var(--text-primary)' }} />
          <div className="w-4 h-4 rounded-full opacity-20" style={{ background: 'var(--text-primary)' }} />
        </div>
        <div className="flex-1 p-2 space-y-1.5">
          {[80, 60, 70].map((w, i) => (
            <div key={i} className="h-2 rounded-full opacity-10" style={{ background: 'var(--text-primary)', width: `${w}%` }} />
          ))}
        </div>
        <div className="px-2 py-1 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <p className="text-[7px] truncate" style={{ color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} {footer || 'Company Name'} — ERP
          </p>
        </div>
      </div>
    </div>
  </div>
)

// ── favicon preview ───────────────────────────────────────────────────────────
const FaviconPreview: React.FC<{ src: string | null }> = ({ src }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
    <div className="w-8 h-8 rounded border flex items-center justify-center flex-shrink-0"
         style={{ borderColor: 'var(--border-color)', background: '#fff' }}>
      {src ? <img src={src} alt="favicon" className="w-5 h-5 object-contain" /> : <Globe className="w-4 h-4 opacity-30" />}
    </div>
    <div>
      <p className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>Browser Tab Preview</p>
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Appears in browser tab & bookmarks</p>
    </div>
  </div>
)

// ── page ──────────────────────────────────────────────────────────────────────
const ERPConfigurationPage: React.FC = () => {
  const dispatch  = useAppDispatch()
  const cfg       = useAppSelector((s) => s.appConfig)

  // form state (mirrors what will be saved)
  const [erpName,       setErpName]       = useState(cfg.erpName)
  const [erpSubtitle,   setErpSubtitle]   = useState(cfg.erpSubtitle)
  const [footerCompany, setFooterCompany] = useState(cfg.footerCompany)
  const [showDemoCredentials, setShowDemoCredentials] = useState(cfg.showDemoCredentials)

  const [logoPreview,    setLogoPreview]    = useState<string | null>(null)
  const [logoB64,        setLogoB64]        = useState<string | null | ''>( null)  // '' = clear
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  const [faviconB64,     setFaviconB64]     = useState<string | null | ''>( null)  // '' = clear

  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  // sync when Redux loads from server
  useEffect(() => {
    setErpName(cfg.erpName)
    setErpSubtitle(cfg.erpSubtitle)
    setFooterCompany(cfg.footerCompany)
    setShowDemoCredentials(cfg.showDemoCredentials)
  }, [cfg.erpName, cfg.erpSubtitle, cfg.footerCompany, cfg.showDemoCredentials])

  // live preview derived values
  const previewLogo    = logoPreview ?? getFileUrl(cfg.erpLogoUrl)
  const previewFavicon = faviconPreview ?? getFileUrl(cfg.faviconUrl)

  const handleSave = useCallback(async () => {
    if (!erpName.trim()) { toast.error('ERP Name is required'); return }
    setSaving(true)
    try {
      const body: Record<string, string | boolean> = {
        erp_name:              erpName.trim(),
        erp_subtitle:          erpSubtitle.trim(),
        footer_company:        footerCompany.trim(),
        show_demo_credentials: showDemoCredentials,
      }
      if (logoB64    !== null) body.erp_logo = logoB64    // '' = clear, b64 = new
      if (faviconB64 !== null) body.favicon  = faviconB64

      const res = await apiService.put('/settings/erp', body)
      if (res.data.success) {
        const d = res.data.data as Record<string, string | null>
        dispatch(setAppConfig({
          erpName:             d.erp_name        ?? erpName,
          erpSubtitle:         d.erp_subtitle    ?? erpSubtitle,
          footerCompany:       d.footer_company  ?? footerCompany,
          erpLogoUrl:          d.erp_logo_url    ?? null,
          faviconUrl:          d.favicon_url     ?? null,
          showDemoCredentials: d.show_demo_credentials !== 'false',
        }))
        applyFavicon(getFileUrl(d.favicon_url ?? null))
        // reset dirty state
        setLogoB64(null);    setLogoPreview(null)
        setFaviconB64(null); setFaviconPreview(null)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        toast.success('ERP configuration saved')
      } else {
        toast.error(res.data.message || 'Save failed')
      }
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }, [erpName, erpSubtitle, footerCompany, showDemoCredentials, logoB64, faviconB64, dispatch])

  const isDirty = erpName !== cfg.erpName || erpSubtitle !== cfg.erpSubtitle ||
    footerCompany !== cfg.footerCompany || showDemoCredentials !== cfg.showDemoCredentials ||
    logoB64 !== null || faviconB64 !== null

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
        <span>System Admin</span><span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>ERP Configuration</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text-primary)' }}>ERP Configuration</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Manage branding, logo, and UI settings for the entire system</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
          ) : saved ? (
            <><Check className="w-4 h-4" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save Changes</>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* ── LEFT: live preview ── */}
        <div className="xl:col-span-2 space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Live Preview</span>
            </div>
            <SidebarPreview
              logo={previewLogo}
              name={erpName}
              subtitle={erpSubtitle}
              footer={footerCompany}
            />
            <p className="text-[11px] mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
              Changes reflect here in real-time
            </p>
          </div>

          {/* Favicon preview */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Favicon Preview</span>
            </div>
            <FaviconPreview src={previewFavicon} />
          </div>
        </div>

        {/* ── RIGHT: settings form ── */}
        <div className="xl:col-span-3 space-y-5">

          {/* Branding / Logo */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Image className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>ERP Logo</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Shown in sidebar header (32×32 px recommended)</p>
              </div>
            </div>
            <UploadZone
              label="Logo Image"
              hint="PNG, JPG, SVG, WebP · Max 2 MB · Transparent PNG recommended"
              current={getFileUrl(cfg.erpLogoUrl)}
              preview={logoPreview}
              onFile={(b64) => { setLogoPreview(b64); setLogoB64(b64) }}
              onClear={() => { setLogoPreview(null); setLogoB64('') }}
            />
          </div>

          {/* ERP Identity */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>ERP Identity</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Names shown in the sidebar and throughout the UI</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  ERP Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={erpName}
                  onChange={(e) => setErpName(e.target.value)}
                  placeholder="e.g. IgniteX.ai"
                  className="form-input w-full"
                  maxLength={40}
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  Shown in bold at the top of the sidebar
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  ERP Subtitle
                </label>
                <input
                  value={erpSubtitle}
                  onChange={(e) => setErpSubtitle(e.target.value)}
                  placeholder="e.g. ENTERPRISE ERP"
                  className="form-input w-full"
                  maxLength={40}
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  Shown in smaller text below the ERP Name
                </p>
              </div>
            </div>
          </div>

          {/* Favicon */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Favicon</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Browser tab icon (ICO, PNG, SVG · 16×16 or 32×32 recommended)</p>
              </div>
            </div>
            <div className="flex items-start gap-5">
              <UploadZone
                label="Favicon Image"
                hint="ICO, PNG, SVG · Max 512 KB"
                current={getFileUrl(cfg.faviconUrl)}
                preview={faviconPreview}
                accept="image/x-icon,image/png,image/svg+xml,image/*"
                maxKb={512}
                square
                onFile={(b64) => { setFaviconPreview(b64); setFaviconB64(b64) }}
                onClear={() => { setFaviconPreview(null); setFaviconB64('') }}
              />
              <div className="flex-1 space-y-2 pt-1">
                <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
                  <span>After saving, reload the browser tab to see the updated favicon</span>
                </div>
                <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Settings2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>Square images work best (1:1 ratio)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Footer Settings</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Text shown at the bottom of every page</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Company Name</label>
              <input
                value={footerCompany}
                onChange={(e) => setFooterCompany(e.target.value)}
                placeholder="e.g. Royal Rise Jewellers"
                className="form-input w-full"
                maxLength={80}
              />
              <p className="text-[11px] mt-2 p-2 rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                Preview: <span style={{ color: 'var(--text-primary)' }}>
                  © {new Date().getFullYear()} {footerCompany || '—'} — Enterprise Resource Planning for Jewellery Business
                </span>
              </p>
            </div>
          </div>

          {/* Login page security */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Login Page Security</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Controls what's exposed on the sign-in screen</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Show Demo Credentials</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Displays clickable sample login credentials on the sign-in page. Turn this off on UAT/production servers.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showDemoCredentials}
                onClick={() => setShowDemoCredentials((v) => !v)}
                className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
                style={{ background: showDemoCredentials ? 'var(--accent-gold)' : 'var(--border-color)' }}
              >
                <span
                  className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  style={{ transform: showDemoCredentials ? 'translateX(22px)' : 'translateX(4px)' }}
                />
              </button>
            </div>
            {!showDemoCredentials && (
              <p className="text-[11px] mt-3 flex items-start gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
                Demo credentials will be hidden from the login page after saving.
              </p>
            )}
          </div>

          {/* Save row */}
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
            {isDirty ? (
              <p className="text-xs flex items-center gap-1.5 text-amber-600">
                <AlertCircle className="w-3.5 h-3.5" /> You have unsaved changes
              </p>
            ) : (
              <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <Check className="w-3.5 h-3.5 text-green-500" /> All changes saved
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

export default ERPConfigurationPage
