import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  PlusIcon, TrashIcon, BoltIcon, ArrowPathIcon, CheckCircleIcon,
  ExclamationTriangleIcon, InformationCircleIcon, KeyIcon, ClockIcon,
} from '@heroicons/react/24/outline'
import { apiService } from '@/api/apiService'
import { usePermission } from '@/hooks'

// Auto Update tab — how the Daily Rate master fills itself in, and which rate
// Sales Order prices against. Two mechanisms, in order of preference:
//
//   1. the configured HTTP/JSON feed, read through the field mapping below
//   2. carrying the previous sheet forward, if the feed is off or failed
//
// Both run on the same schedule and can be triggered on demand with Fetch Now.

interface LookupOption { lookup_code: string; lookup_name: string }

interface FieldMapRow {
  metal_type: string
  purity:     string
  json_path:  string
  multiplier: string
}

interface ConfigForm {
  auto_enabled:       boolean
  provider_name:      string
  provider_url:       string
  auth_header_name:   string
  auth_header_value:  string
  run_at:             string
  markup_pct:         string
  carry_forward:      boolean
  overwrite_manual:   boolean
  pricing_metal_type: string
  pricing_purity:     string
}

const blankConfig: ConfigForm = {
  auto_enabled:       false,
  provider_name:      '',
  provider_url:       '',
  auth_header_name:   '',
  auth_header_value:  '',
  run_at:             '09:00',
  markup_pct:         '0',
  carry_forward:      true,
  overwrite_manual:   false,
  pricing_metal_type: 'GO',
  pricing_purity:     '916',
}

const blankMapRow: FieldMapRow = { metal_type: '', purity: '', json_path: '', multiplier: '1' }

const lineInputCls   = 'w-full text-xs px-2 py-1.5 border border-[var(--border-color)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-gold)] disabled:opacity-60'
const lineInputStyle: React.CSSProperties = { background: 'var(--bg-primary)', color: 'var(--text-primary)' }

const Req = () => <span className="text-red-500 ml-0.5">*</span>

// ── Toggle switch ─────────────────────────────────────────────
const Toggle: React.FC<{
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  label: string
  hint?: string
}> = ({ checked, onChange, disabled, label, hint }) => (
  <label className={`flex items-start gap-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className="relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 mt-0.5"
      style={{
        height: 22,
        background: checked ? 'var(--accent-gold)' : 'var(--border-color)',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span
        className="absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-all"
        style={{ left: checked ? 20 : 2 }}
      />
    </button>
    <span>
      <span className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
      {hint && <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
    </span>
  </label>
)

// ── Section card ──────────────────────────────────────────────
const Section: React.FC<{
  title: string
  subtitle?: string
  icon: React.ReactNode
  children: React.ReactNode
}> = ({ title, subtitle, icon, children }) => (
  <div className="card p-5">
    <div className="flex items-start gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(201,151,58,0.12)', color: 'var(--accent-gold)' }}>
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
)

// ── Component ─────────────────────────────────────────────────
const DailyRateConfigTab: React.FC<{ onRatesChanged?: () => void }> = ({ onRatesChanged }) => {
  const { canUpdate } = usePermission('MM_DAILY_RATE')

  const [metalOpts,  setMetalOpts]  = useState<LookupOption[]>([])
  const [purityOpts, setPurityOpts] = useState<LookupOption[]>([])

  const [form,    setForm]    = useState<ConfigForm>(blankConfig)
  const [mapRows, setMapRows] = useState<FieldMapRow[]>([{ ...blankMapRow }])
  // The stored credential never comes back from the server; this only records
  // whether one exists so the field can say so instead of looking empty.
  const [authStored, setAuthStored] = useState(false)
  const [authTouched, setAuthTouched] = useState(false)

  const [lastRun, setLastRun] = useState<{ at: string | null; status: string | null; message: string | null }>({
    at: null, status: null, message: null,
  })

  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [fetching, setFetching] = useState(false)

  const readOnly = !canUpdate

  // ── Load ──────────────────────────────────────────────────────
  const applyConfig = useCallback((c: Record<string, unknown>) => {
    setForm({
      auto_enabled:       !!c.auto_enabled,
      provider_name:      String(c.provider_name    ?? ''),
      provider_url:       String(c.provider_url     ?? ''),
      auth_header_name:   String(c.auth_header_name ?? ''),
      auth_header_value:  '',
      run_at:             String(c.run_at ?? '09:00'),
      markup_pct:         String(c.markup_pct ?? 0),
      carry_forward:      c.carry_forward    !== false,
      overwrite_manual:   !!c.overwrite_manual,
      pricing_metal_type: String(c.pricing_metal_type ?? 'GO'),
      pricing_purity:     String(c.pricing_purity     ?? '916'),
    })
    setAuthStored(!!c.auth_header_set)
    setAuthTouched(false)

    const fm = Array.isArray(c.field_map) ? c.field_map as Record<string, unknown>[] : []
    setMapRows(fm.length
      ? fm.map(r => ({
          metal_type: String(r.metal_type ?? ''),
          purity:     String(r.purity     ?? ''),
          json_path:  String(r.json_path  ?? ''),
          multiplier: String(r.multiplier ?? 1),
        }))
      : [{ ...blankMapRow }])

    setLastRun({
      at:      (c.last_run_at      as string | null) ?? null,
      status:  (c.last_run_status  as string | null) ?? null,
      message: (c.last_run_message as string | null) ?? null,
    })
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const [m, p, cfg] = await Promise.all([
          apiService.get('/common/lookup/METAL_TYPE'),
          apiService.get('/common/lookup/PURITY'),
          apiService.get('/daily-rate/config'),
        ])
        setMetalOpts(m.data?.data ?? [])
        setPurityOpts(p.data?.data ?? [])
        applyConfig((cfg.data?.data ?? {}) as Record<string, unknown>)
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        toast.error(msg || 'Failed to load the auto update settings')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [applyConfig])

  // ── Field map editing ─────────────────────────────────────────
  const setMapRow = (idx: number, patch: Partial<FieldMapRow>) =>
    setMapRows(rs => rs.map((r, i) => i === idx ? { ...r, ...patch } : r))
  const addMapRow    = () => setMapRows(rs => [...rs, { ...blankMapRow }])
  const removeMapRow = (idx: number) =>
    setMapRows(rs => rs.length === 1 ? [{ ...blankMapRow }] : rs.filter((_, i) => i !== idx))

  const filledMapRows = mapRows.filter(r => r.metal_type || r.purity || r.json_path)

  // ── Save ──────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(form.run_at)) return 'Update time must be in HH:MM (24-hour) format'
    const markup = Number(form.markup_pct)
    if (!Number.isFinite(markup))            return 'Markup % must be a number'
    if (markup < -100 || markup > 100)       return 'Markup % must be between -100 and 100'
    if (form.provider_url && !/^https?:\/\//i.test(form.provider_url))
      return 'Provider URL must start with http:// or https://'
    if (form.auto_enabled && !form.provider_url.trim())
      return 'A provider URL is required before auto update can be switched on'
    if (!form.pricing_metal_type || !form.pricing_purity)
      return 'The Sales Order pricing metal and purity are both required'

    const seen = new Set<string>()
    for (let i = 0; i < filledMapRows.length; i++) {
      const r = filledMapRows[i]
      if (!r.metal_type) return `Mapping ${i + 1}: Metal Type is required`
      if (!r.purity)     return `Mapping ${i + 1}: Purity is required`
      if (!r.json_path)  return `Mapping ${i + 1}: Response field is required`
      const key = `${r.metal_type}|${r.purity}`
      if (seen.has(key)) return `Mapping ${i + 1}: this metal and purity is already mapped`
      seen.add(key)
      const mult = Number(r.multiplier)
      if (!Number.isFinite(mult) || mult === 0) return `Mapping ${i + 1}: Multiplier must be a non-zero number`
    }
    if (form.auto_enabled && filledMapRows.length === 0)
      return 'Map at least one rate before switching auto update on — otherwise there is nothing to read from the response'
    return null
  }

  const onSave = async () => {
    const err = validate()
    if (err) { toast.error(err); return }

    setSaving(true)
    try {
      const res = await apiService.put('/daily-rate/config', {
        auto_enabled:       form.auto_enabled,
        provider_name:      form.provider_name.trim() || null,
        provider_url:       form.provider_url.trim()  || null,
        auth_header_name:   form.auth_header_name.trim() || null,
        // Omitted unless the field was actually typed in, so saving the form
        // without retyping the key leaves the stored one intact.
        ...(authTouched && { auth_header_value: form.auth_header_value }),
        run_at:             form.run_at,
        markup_pct:         Number(form.markup_pct),
        carry_forward:      form.carry_forward,
        overwrite_manual:   form.overwrite_manual,
        pricing_metal_type: form.pricing_metal_type,
        pricing_purity:     form.pricing_purity,
        field_map: filledMapRows.map(r => ({
          metal_type: r.metal_type,
          purity:     r.purity,
          json_path:  r.json_path.trim(),
          multiplier: Number(r.multiplier),
        })),
      })
      applyConfig((res.data?.data ?? {}) as Record<string, unknown>)
      toast.success('Auto update settings saved')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  // ── Fetch now ─────────────────────────────────────────────────
  const onFetchNow = async () => {
    setFetching(true)
    try {
      const res = await apiService.post('/daily-rate/fetch-now', {})
      toast.success(res.data?.message || 'Rates updated')
      onRatesChanged?.()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      // A skipped or failed run is expected often enough (manual sheet already
      // in place, provider down) that it reads as information, not an error.
      toast(msg || 'Rate fetch did not update anything', { icon: '⚠️' })
    } finally {
      setFetching(false)
      // Either way the last-run stamp moved, so pull the config back.
      try {
        const cfg = await apiService.get('/daily-rate/config')
        applyConfig((cfg.data?.data ?? {}) as Record<string, unknown>)
      } catch { /* stale stamp is harmless */ }
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="card p-5">
            <div className="h-5 w-40 rounded animate-pulse bg-[var(--bg-tertiary)] mb-4" />
            <div className="space-y-3">
              {[0, 1, 2].map(j => <div key={j} className="h-9 rounded animate-pulse bg-[var(--bg-tertiary)]" />)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const statusTone =
    lastRun.status === 'OK'      ? { bg: 'rgba(16,185,129,0.1)',  fg: '#059669', icon: <CheckCircleIcon className="w-4 h-4" /> } :
    lastRun.status === 'FAILED'  ? { bg: 'rgba(239,68,68,0.1)',   fg: '#dc2626', icon: <ExclamationTriangleIcon className="w-4 h-4" /> } :
    lastRun.status === 'SKIPPED' ? { bg: 'rgba(245,158,11,0.1)',  fg: '#d97706', icon: <InformationCircleIcon className="w-4 h-4" /> } :
                                   { bg: 'var(--bg-secondary)',   fg: 'var(--text-muted)', icon: <ClockIcon className="w-4 h-4" /> }

  return (
    <div className="space-y-4">

      {/* ── Last run banner ── */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: statusTone.bg, color: statusTone.fg }}>
            {statusTone.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {lastRun.status ? `Last run — ${lastRun.status}` : 'Not run yet'}
              </span>
              {lastRun.at && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{lastRun.at}</span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {lastRun.message || (form.auto_enabled
                ? `Scheduled to run daily at ${form.run_at}`
                : 'Auto update is switched off — rates are entered by hand')}
            </p>
          </div>
        </div>

        {canUpdate && (
          <button onClick={onFetchNow} disabled={fetching} className="btn-primary flex items-center gap-2">
            {fetching
              ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Fetching…</>
              : <><ArrowPathIcon className="w-4 h-4" />Fetch Now</>
            }
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Schedule ── */}
        <Section
          title="Schedule"
          subtitle="When the rates refresh on their own"
          icon={<BoltIcon className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <Toggle
              checked={form.auto_enabled}
              disabled={readOnly}
              onChange={v => setForm(f => ({ ...f, auto_enabled: v }))}
              label="Auto update enabled"
              hint="Runs once a day at the time below. Off means rates are entered by hand only."
            />
            <Toggle
              checked={form.carry_forward}
              disabled={readOnly}
              onChange={v => setForm(f => ({ ...f, carry_forward: v }))}
              label="Carry forward on failure"
              hint="If the feed is off or unreachable, copy the previous sheet to today so orders still price."
            />
            <Toggle
              checked={form.overwrite_manual}
              disabled={readOnly}
              onChange={v => setForm(f => ({ ...f, overwrite_manual: v }))}
              label="Overwrite manual sheets"
              hint="Off (recommended) — a sheet someone typed by hand is left untouched by the scheduler."
            />

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Run daily at{!readOnly && <Req />}
                </label>
                <input
                  type="time"
                  value={form.run_at}
                  onChange={e => setForm(f => ({ ...f, run_at: e.target.value }))}
                  disabled={readOnly}
                  className="form-input"
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Server time</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Markup %</label>
                <input
                  type="number" step="0.01" min="-100" max="100" inputMode="decimal"
                  value={form.markup_pct}
                  onChange={e => setForm(f => ({ ...f, markup_pct: e.target.value }))}
                  disabled={readOnly}
                  className="form-input text-right font-mono"
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Applied to every fetched rate</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Sales Order pricing rate ── */}
        <Section
          title="Sales Order Pricing Rate"
          subtitle="Which rate a percentage-based customer price multiplies against"
          icon={<InformationCircleIcon className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Metal Type{!readOnly && <Req />}
                </label>
                <select
                  value={form.pricing_metal_type}
                  onChange={e => setForm(f => ({ ...f, pricing_metal_type: e.target.value }))}
                  disabled={readOnly}
                  className="form-input"
                >
                  <option value="">Select…</option>
                  {metalOpts.map(o => <option key={o.lookup_code} value={o.lookup_code}>{o.lookup_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Purity{!readOnly && <Req />}
                </label>
                <select
                  value={form.pricing_purity}
                  onChange={e => setForm(f => ({ ...f, pricing_purity: e.target.value }))}
                  disabled={readOnly}
                  className="form-input"
                >
                  <option value="">Select…</option>
                  {purityOpts.map(o => <option key={o.lookup_code} value={o.lookup_code}>{o.lookup_name}</option>)}
                </select>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5">
              <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                A <b>Percentage</b> line on Customer Price Master prices as:
              </p>
              <code className="block text-[11px] font-mono px-2.5 py-2 rounded"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                rate ₹/g × price % × BOM net weight + add-ons
              </code>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                The rate comes from the most recent active sheet on or before the order date.
                An <b>Amount</b> line does not use it at all.
              </p>
            </div>
          </div>
        </Section>

        {/* ── Provider ── */}
        <Section
          title="Rate Feed"
          subtitle="The HTTP endpoint the scheduled fetch calls"
          icon={<KeyIcon className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Provider Name</label>
                <input
                  value={form.provider_name}
                  onChange={e => setForm(f => ({ ...f, provider_name: e.target.value }))}
                  disabled={readOnly}
                  maxLength={100}
                  placeholder="e.g. Bullion API"
                  className="form-input"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Provider URL{form.auto_enabled && !readOnly && <Req />}
                </label>
                <input
                  value={form.provider_url}
                  onChange={e => setForm(f => ({ ...f, provider_url: e.target.value }))}
                  disabled={readOnly}
                  maxLength={500}
                  placeholder="https://api.example.com/rates"
                  className="form-input font-mono text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Auth Header Name</label>
                <input
                  value={form.auth_header_name}
                  onChange={e => setForm(f => ({ ...f, auth_header_name: e.target.value }))}
                  disabled={readOnly}
                  maxLength={100}
                  placeholder="X-API-KEY"
                  className="form-input font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Auth Header Value
                  {authStored && !authTouched && (
                    <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}>
                      Stored
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.auth_header_value}
                  onChange={e => { setAuthTouched(true); setForm(f => ({ ...f, auth_header_value: e.target.value })) }}
                  disabled={readOnly}
                  maxLength={500}
                  placeholder={authStored ? '•••••••• — leave blank to keep' : 'API key or token'}
                  className="form-input font-mono text-sm"
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  Write-only — the saved value is never sent back to this screen.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Field mapping ── */}
        <Section
          title="Response Mapping"
          subtitle="Where each rate sits in the provider's JSON"
          icon={<ArrowPathIcon className="w-5 h-5" />}
        >
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    {['Metal Type', 'Purity', 'Response Field', '×', ''].map((h, i) => (
                      <th key={i} className="px-2 py-2 text-left font-semibold uppercase tracking-wide whitespace-nowrap"
                        style={{ color: 'var(--text-muted)' }}>
                        {h}{i < 3 && !readOnly && <Req />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mapRows.map((r, idx) => (
                    <tr key={idx} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <td className="px-2 py-1.5" style={{ minWidth: 120 }}>
                        <select
                          value={r.metal_type}
                          onChange={e => setMapRow(idx, { metal_type: e.target.value })}
                          disabled={readOnly}
                          className={lineInputCls} style={lineInputStyle}
                        >
                          <option value="">Select…</option>
                          {metalOpts.map(o => <option key={o.lookup_code} value={o.lookup_code}>{o.lookup_name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5" style={{ minWidth: 130 }}>
                        <select
                          value={r.purity}
                          onChange={e => setMapRow(idx, { purity: e.target.value })}
                          disabled={readOnly}
                          className={lineInputCls} style={lineInputStyle}
                        >
                          <option value="">Select…</option>
                          {purityOpts.map(o => <option key={o.lookup_code} value={o.lookup_code}>{o.lookup_name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5" style={{ minWidth: 160 }}>
                        <input
                          value={r.json_path}
                          onChange={e => setMapRow(idx, { json_path: e.target.value })}
                          disabled={readOnly}
                          placeholder="rates.gold.916"
                          className={`${lineInputCls} font-mono`} style={lineInputStyle}
                        />
                      </td>
                      <td className="px-2 py-1.5" style={{ minWidth: 80 }}>
                        <input
                          type="number" step="any" inputMode="decimal"
                          value={r.multiplier}
                          onChange={e => setMapRow(idx, { multiplier: e.target.value })}
                          disabled={readOnly}
                          className={`${lineInputCls} text-right font-mono`} style={lineInputStyle}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {!readOnly && (
                          <button type="button" onClick={() => removeMapRow(idx)}
                            className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-red-500" title="Remove mapping">
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!readOnly && (
              <button type="button" onClick={addMapRow}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-[var(--bg-tertiary)]"
                style={{ borderColor: 'var(--border-color)', color: 'var(--accent-gold)' }}>
                <PlusIcon className="w-3.5 h-3.5" />
                Add Mapping
              </button>
            )}

            <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
              <p className="text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                <b>Response Field</b> walks the JSON the provider returns — <span className="font-mono">rates.gold.916</span>,{' '}
                <span className="font-mono">data[0].price</span>, <span className="font-mono">$.XAU</span>.
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                <b>×</b> converts the provider&apos;s unit to ₹ per gram — 1 if it already quotes per gram,
                0.1 for a per-10-gram quote, 0.0321507 for a per-troy-ounce one.
              </p>
            </div>
          </div>
        </Section>
      </div>

      {/* ── Save ── */}
      {canUpdate && (
        <div className="flex justify-end">
          <button onClick={onSave} disabled={saving} className="btn-primary">
            {saving
              ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />Saving…</>
              : 'Save Settings'
            }
          </button>
        </div>
      )}
    </div>
  )
}

export default DailyRateConfigTab
