import React, { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  CheckCircleIcon, XMarkIcon, ArrowPathIcon, ClockIcon,
  PaperAirplaneIcon, ChevronDownIcon, ChevronUpIcon, BoltIcon,
} from '@heroicons/react/24/outline'
import { apiService } from '@/api/apiService'
import { formatDateTime } from '@/utils/helpers'

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface WfStep {
  id: number; step_no: number; step_name: string
  role_id: number | null; role_name: string | null
  user_id: number | null; user_name: string | null
  can_submit: boolean; can_approve: boolean; can_reject: boolean; can_rfc: boolean
  rfc_to_step: number
}

interface WfHistory {
  id: number; step_no: number; step_name: string
  action: string; action_by_name: string; action_at: string; remarks: string | null
}

interface WfRequest {
  id: number; current_step: number; wf_status: string
}

interface PanelData {
  configured: boolean
  config?: { config_id: number; wf_code: string; wf_name: string; self_approval: boolean; steps: WfStep[] }
  request?: WfRequest | null
  history?: WfHistory[]
  current_step?: number
  wf_status?: string
  available_actions?: string[]
}

export interface WorkflowPanelProps {
  recordType: string          // e.g. 'FG_BOM'
  recordId: number | null     // null = new unsaved record
  onActionComplete?: (action: string, newStatus: string) => void
  onBeforeAction?: (action: string) => Promise<boolean>  // return false to cancel
  hideActions?: boolean       // hide action buttons (render them externally instead)
  triggerRef?: React.MutableRefObject<((action: string) => void) | null>
  onAvailableActionsChange?: (actions: string[], acting: boolean) => void
  onSelfApprovalChange?: (selfApproval: boolean) => void
  compact?: boolean           // hide history by default
}

// ─────────────────────────────────────────────────────────────────
// Action metadata
// ─────────────────────────────────────────────────────────────────
export const ACTION_META: Record<string, {
  label: string; cls: string; icon: React.ElementType; confirmMsg?: string
}> = {
  SUBMIT:  { label: 'Submit for Approval', icon: PaperAirplaneIcon, cls: 'bg-blue-600 hover:bg-blue-700 text-white' },
  APPROVE: { label: 'Approve',             icon: CheckCircleIcon,   cls: 'bg-green-600 hover:bg-green-700 text-white', confirmMsg: 'Approve this BOM?' },
  REJECT:  { label: 'Reject',              icon: XMarkIcon,         cls: 'bg-red-500 hover:bg-red-600 text-white' },
  RFC:     { label: 'Request for Change',  icon: ArrowPathIcon,     cls: 'border-2 border-orange-400 text-orange-500 hover:bg-orange-50' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  DRAFT:    { label: 'Draft',           color: 'text-gray-500',   dot: 'bg-gray-400'   },
  PENDING:  { label: 'Pending Approval',color: 'text-yellow-600', dot: 'bg-yellow-400' },
  APPROVED: { label: 'Approved',        color: 'text-green-600',  dot: 'bg-green-500'  },
  REJECTED: { label: 'Rejected',        color: 'text-red-500',    dot: 'bg-red-500'    },
  RFC:      { label: 'RFC Raised',      color: 'text-orange-500', dot: 'bg-orange-400' },
}

// ─────────────────────────────────────────────────────────────────
// WorkflowPanel
// ─────────────────────────────────────────────────────────────────
export default function WorkflowPanel({ recordType, recordId, onActionComplete, onBeforeAction, hideActions, triggerRef, onAvailableActionsChange, onSelfApprovalChange, compact = false }: WorkflowPanelProps) {
  const [data,         setData]         = useState<PanelData | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [acting,       setActing]       = useState(false)
  const [showHistory,  setShowHistory]  = useState(!compact)
  const [showReject,   setShowReject]   = useState(false)
  const [rejectRemark, setRejectRemark] = useState('')

  const load = useCallback(async () => {
    if (!recordId) return
    setLoading(true)
    try {
      const r = await apiService.get(`/workflow/panel/${recordType}/${recordId}`)
      setData(r.data?.data ?? null)
    } catch { /* silent — panel may not be configured */ }
    finally { setLoading(false) }
  }, [recordType, recordId])

  useEffect(() => {
    const t = setTimeout(() => load(), 0)
    return () => clearTimeout(t)
  }, [load])

  // Keep triggerRef current so parent can always call the latest handleAction
  useEffect(() => { if (triggerRef) triggerRef.current = handleAction })

  // Notify parent whenever available actions or acting state changes
  useEffect(() => {
    onAvailableActionsChange?.(data?.available_actions ?? [], acting)
  }, [data?.available_actions, acting]) // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent when self_approval setting changes
  useEffect(() => {
    onSelfApprovalChange?.(!!(data?.config?.self_approval))
  }, [data?.config?.self_approval]) // eslint-disable-line react-hooks/exhaustive-deps

  const execute = async (action: string, remarks?: string) => {
    if (!recordId) return
    setActing(true)
    try {
      const r = await apiService.post('/workflow/action', {
        record_type: recordType,
        record_id:   recordId,
        action,
        remarks: remarks || undefined,
      })
      const result = r.data?.data ?? {}
      toast.success(`${ACTION_META[action]?.label ?? action} executed`)
      await load()
      onActionComplete?.(action, result.new_status)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? `${action} failed`)
    } finally { setActing(false) }
  }

  const handleAction = async (action: string) => {
    if (action === 'REJECT') { setShowReject(true); return }
    if (onBeforeAction) {
      const canProceed = await onBeforeAction(action)
      if (!canProceed) return
    }
    execute(action)
  }

  const confirmReject = () => {
    execute('REJECT', rejectRemark)
    setShowReject(false); setRejectRemark('')
  }

  if (!recordId) {
    return (
      <div className="card p-5">
        <p className="text-sm text-[var(--text-muted)]">Save the record first to enable workflow.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="card p-5 flex items-center gap-3 text-[var(--text-muted)]">
        <ArrowPathIcon className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading workflow…</span>
      </div>
    )
  }

  if (!data || !data.configured) {
    return (
      <div className="card p-5">
        <p className="text-sm text-[var(--text-muted)]">
          No workflow configured for <strong>{recordType}</strong>.
          Go to <em>Settings → Workflow Config</em> to set one up.
        </p>
      </div>
    )
  }

  const steps       = data.config?.steps ?? []
  const history     = data.history ?? []
  const wfStatus    = data.wf_status ?? 'DRAFT'
  const curStep     = data.current_step ?? 1
  const actions     = data.available_actions ?? []
  const selfApproval = !!(data.config?.self_approval)
  const statusCfg   = STATUS_CONFIG[wfStatus] ?? STATUS_CONFIG.DRAFT

  // Derive step state from the LATEST cycle only.
  // After RFC the request resets to step 1; we find the index of the last
  // RFC entry and only consider history after that point for "done" state.
  const lastRfcIdx = history.reduce((idx, h, i) => h.action === 'RFC' ? i : idx, -1)
  const currentCycleHistory = lastRfcIdx >= 0 ? history.slice(lastRfcIdx + 1) : history

  const getStepState = (s: WfStep) => {
    const done   = currentCycleHistory.some(h => h.step_no === s.step_no && ['SUBMIT', 'APPROVE'].includes(h.action))
    const active = s.step_no === curStep && wfStatus === 'PENDING'
    return { done, active }
  }

  return (
    <div className="card p-5 space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[var(--accent-gold)]">
              {data.config?.wf_name ?? 'Workflow'}
            </h3>
            {selfApproval && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                <BoltIcon className="w-3 h-3" /> Self Approval
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full inline-block ${statusCfg.dot}`} />
            <span className={`text-sm font-semibold ${statusCfg.color}`}>{statusCfg.label}</span>
            {curStep && wfStatus === 'PENDING' && (
              <span className="text-xs text-[var(--text-muted)]">
                — Step {curStep}: {steps.find(s => s.step_no === curStep)?.step_name}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons — hidden when parent renders them externally */}
        {!hideActions && actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map(act => {
              const m = ACTION_META[act]
              if (!m) return null
              const Icon = m.icon
              const label = (act === 'SUBMIT' && selfApproval) ? 'Submit & Auto-Approve' : m.label
              return (
                <button key={act} onClick={() => handleAction(act)} disabled={acting}
                  className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${m.cls}`}>
                  {acting ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {wfStatus === 'PENDING' && actions.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-yellow-600">
            <ClockIcon className="w-4 h-4" />
            Awaiting approval from{' '}
            <strong>{steps.find(s => s.step_no === curStep)?.role_name ?? steps.find(s => s.step_no === curStep)?.user_name ?? 'approver'}</strong>
          </p>
        )}
      </div>

      {/* Step progress bar */}
      <div className="flex items-center gap-0">
        {steps.map((s, i) => {
          const { done, active } = getStepState(s)
          const rejected = wfStatus === 'REJECTED' && s.step_no === curStep
          return (
            <React.Fragment key={s.step_no}>
              <div className="flex flex-col items-center text-center" style={{ minWidth: 80 }}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  rejected  ? 'bg-red-500 border-red-500 text-white'
                  : done    ? 'bg-[var(--accent-gold)] border-[var(--accent-gold)] text-white'
                  : active  ? 'bg-blue-400 border-blue-400 text-white'
                  : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-muted)]'
                }`}>
                  {rejected ? <XMarkIcon className="w-4 h-4" />
                   : done   ? <CheckCircleIcon className="w-4 h-4" />
                   : active ? <ClockIcon className="w-4 h-4" />
                   : s.step_no}
                </div>
                <p className={`text-xs mt-1 font-medium leading-tight max-w-[90px] ${
                  rejected ? 'text-red-500'
                  : done   ? 'text-[var(--accent-gold)]'
                  : active ? 'text-blue-500'
                  : 'text-[var(--text-muted)]'
                }`}>{s.step_name}</p>
                {(s.role_name || s.user_name) && (
                  <p className="text-[10px] text-[var(--text-muted)] max-w-[90px] leading-tight mt-0.5">
                    {s.role_name ?? s.user_name}
                  </p>
                )}
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mb-6 transition-all ${done ? 'bg-[var(--accent-gold)]' : 'bg-[var(--border-color)]'}`} />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* History toggle */}
      {history.length > 0 && (
        <div>
          <button onClick={() => setShowHistory(p => !p)}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            {showHistory ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
            {showHistory ? 'Hide' : 'Show'} History ({history.length})
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {history.map((h, idx) => {
                const isApprove = h.action === 'APPROVE'
                const isReject  = h.action === 'REJECT'
                const isRfc     = h.action === 'RFC'
                // Insert a cycle-restart marker after every RFC entry
                const showCycleDivider = isRfc && idx < history.length - 1
                return (
                  <React.Fragment key={h.id}>
                    <div className="flex gap-3 text-xs">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isApprove ? 'bg-green-100 text-green-600'
                        : isReject ? 'bg-red-100 text-red-500'
                        : isRfc    ? 'bg-orange-100 text-orange-500'
                        : 'bg-blue-100 text-blue-500'
                      }`}>
                        {isApprove ? <CheckCircleIcon className="w-3 h-3" />
                         : isReject ? <XMarkIcon className="w-3 h-3" />
                         : isRfc    ? <ArrowPathIcon className="w-3 h-3" />
                         : <PaperAirplaneIcon className="w-3 h-3" />}
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-[var(--text-primary)]">{h.action_by_name}</span>
                        <span className="text-[var(--text-muted)]"> {h.action.toLowerCase()}d</span>
                        {h.step_name && (
                          <span className="text-[var(--text-muted)]"> · {h.step_name}</span>
                        )}
                        <span className="text-[var(--text-muted)]"> · {formatDateTime(h.action_at)}</span>
                        {h.remarks && (
                          <p className="mt-0.5 text-[var(--text-muted)] italic">"{h.remarks}"</p>
                        )}
                      </div>
                    </div>
                    {showCycleDivider && (
                      <div className="flex items-center gap-2 py-1">
                        <div className="flex-1 h-px bg-orange-200" />
                        <span className="text-[10px] text-orange-400 font-semibold uppercase tracking-wide whitespace-nowrap">RFC — new cycle</span>
                        <div className="flex-1 h-px bg-orange-200" />
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Reject dialog */}
      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Reject — Add Remarks</h3>
            <p className="text-sm text-[var(--text-muted)]">Record will return to Draft. Add a reason (optional).</p>
            <textarea value={rejectRemark} onChange={e => setRejectRemark(e.target.value)} rows={3}
              placeholder="Reason for rejection…"
              className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowReject(false); setRejectRemark('') }} className="btn-secondary text-sm">Cancel</button>
              <button onClick={confirmReject} disabled={acting}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">
                {acting ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <XMarkIcon className="w-4 h-4" />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
