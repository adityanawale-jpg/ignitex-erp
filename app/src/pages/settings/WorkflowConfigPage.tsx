import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  PlusIcon, TrashIcon, CheckCircleIcon, BoltIcon,
  ArrowPathIcon, ChevronDownIcon, ChevronUpIcon,
} from '@heroicons/react/24/outline'
import { apiService } from '@/api/apiService'
import PageBreadcrumb from '@/components/common/PageBreadcrumb'

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface WfConfig {
  id: number; wf_code: string; wf_name: string; module_code: string
  description: string | null; is_active: boolean; self_approval: boolean; step_count: number
}

interface WfStep {
  step_no: number; step_name: string
  role_id: number | null; user_id: number | null
  can_submit: boolean; can_approve: boolean; can_reject: boolean; can_rfc: boolean
  rfc_to_step: number
}

interface RoleOpt { id: number; role_code: string; role_name: string }
interface UserOpt { id: number; full_name: string; emp_email: string }

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
const emptyStep = (stepNo: number): WfStep => ({
  step_no: stepNo, step_name: '',
  role_id: null, user_id: null,
  can_submit: stepNo === 1, can_approve: stepNo > 1, can_reject: stepNo > 1, can_rfc: stepNo > 1,
  rfc_to_step: 1,
})

const inp = (label: string, node: React.ReactNode, hint?: string) => (
  <div>
    <label className="text-xs font-semibold block mb-1 text-[var(--text-secondary)]">{label}</label>
    {node}
    {hint && <p className="text-[10px] mt-0.5 text-[var(--text-muted)]">{hint}</p>}
  </div>
)

const textIn = (val: string, onChange: (v: string) => void, placeholder = '', disabled = false) => (
  <input type="text" value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    disabled={disabled}
    className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] disabled:opacity-50 border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]" />
)

// ─────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────
export default function WorkflowConfigPage() {
  const [configs,      setConfigs]      = useState<WfConfig[]>([])
  const [loading,      setLoading]      = useState(true)
  const [expandedId,   setExpandedId]   = useState<number | null>(null)
  const [steps,        setSteps]        = useState<WfStep[]>([])
  const [stepsLoading, setStepsLoading] = useState(false)
  const [savingSteps,  setSavingSteps]  = useState(false)
  const [roles,        setRoles]        = useState<RoleOpt[]>([])
  const [users,        setUsers]        = useState<UserOpt[]>([])

  // New config form
  const [showAddCfg,  setShowAddCfg]  = useState(false)
  const [savingCfg,   setSavingCfg]   = useState(false)
  const [cfgForm, setCfgForm] = useState({ wf_code: '', wf_name: '', module_code: '', description: '' })

  const loadConfigs = useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiService.get('/workflow/configs')
      setConfigs(r.data?.data ?? [])
    } catch { toast.error('Failed to load workflow configs') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadConfigs() }, [loadConfigs])

  useEffect(() => {
    Promise.all([
      apiService.get('/workflow/roles'),
      apiService.get('/workflow/users'),
    ]).then(([rr, ur]) => {
      setRoles(rr.data?.data ?? [])
      setUsers(ur.data?.data ?? [])
    }).catch(() => {})
  }, [])

  const toggleExpand = async (cfg: WfConfig) => {
    if (expandedId === cfg.id) { setExpandedId(null); return }
    setExpandedId(cfg.id); setStepsLoading(true)
    try {
      const r = await apiService.get(`/workflow/configs/${cfg.id}`)
      setSteps(r.data?.data?.steps ?? [])
    } catch { toast.error('Failed to load steps') }
    finally { setStepsLoading(false) }
  }

  const addStep = () => setSteps(prev => [...prev, emptyStep(prev.length + 1)])

  const removeStep = (idx: number) =>
    setSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_no: i + 1 })))

  const updateStep = (idx: number, patch: Partial<WfStep>) =>
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))

  const saveSteps = async (configId: number) => {
    if (steps.some(s => !s.step_name.trim())) { toast.error('All steps need a name'); return }
    setSavingSteps(true)
    try {
      await apiService.post(`/workflow/configs/${configId}/steps`, { steps })
      toast.success('Steps saved')
      loadConfigs()
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Failed to save steps')
    } finally { setSavingSteps(false) }
  }

  const createConfig = async () => {
    if (!cfgForm.wf_code || !cfgForm.wf_name || !cfgForm.module_code) {
      toast.error('Code, Name and Module are required'); return
    }
    setSavingCfg(true)
    try {
      await apiService.post('/workflow/configs', cfgForm)
      toast.success('Workflow created')
      setCfgForm({ wf_code: '', wf_name: '', module_code: '', description: '' })
      setShowAddCfg(false)
      loadConfigs()
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Failed to create')
    } finally { setSavingCfg(false) }
  }

  const toggleActive = async (cfg: WfConfig) => {
    try {
      await apiService.put(`/workflow/configs/${cfg.id}`, { is_active: !cfg.is_active })
      loadConfigs()
    } catch { toast.error('Failed to update') }
  }

  const toggleSelfApproval = async (cfg: WfConfig) => {
    try {
      await apiService.put(`/workflow/configs/${cfg.id}`, { self_approval: !cfg.self_approval })
      toast.success(cfg.self_approval ? 'Self Approval disabled' : 'Self Approval enabled')
      loadConfigs()
    } catch { toast.error('Failed to update') }
  }

  // ── Render step editor row ─────────────────────────────────────
  const renderStepRow = (s: WfStep, idx: number, totalSteps: number) => (
    <div key={idx} className="p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
      {/* Step header */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-[var(--accent-gold)] text-white">
          {s.step_no}
        </div>
        <div className="flex-1">{inp('Step Name *',
          textIn(s.step_name, v => updateStep(idx, { step_name: v }), 'e.g. Submit for Approval')
        )}</div>
        {totalSteps > 1 && (
          <button type="button" onClick={() => removeStep(idx)}
            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg mt-4">
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Assignee */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {inp('Assigned Role',
          <select value={s.role_id ?? ''} onChange={e => updateStep(idx, { role_id: e.target.value ? parseInt(e.target.value) : null, user_id: null })}
            className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <option value="">— Any (no restriction) —</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.role_name} ({r.role_code})</option>)}
          </select>,
          'Users with this role can act at this step'
        )}
        {inp('OR Specific User',
          <select value={s.user_id ?? ''} onChange={e => updateStep(idx, { user_id: e.target.value ? parseInt(e.target.value) : null, role_id: null })}
            className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <option value="">— Any (no restriction) —</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.emp_email})</option>)}
          </select>,
          'Overrides role if set'
        )}
      </div>

      {/* Actions */}
      <div>
        <p className="text-xs font-semibold mb-2 text-[var(--text-secondary)]">Allowed Actions at this step</p>
        <div className="flex flex-wrap gap-4">
          {([
            { key: 'can_submit',  label: 'Submit',           hint: 'Move to next step' },
            { key: 'can_approve', label: 'Approve',          hint: 'Complete workflow' },
            { key: 'can_reject',  label: 'Reject',           hint: 'Return to Draft'  },
            { key: 'can_rfc',     label: 'RFC (Req. Change)',hint: 'Back to step below'},
          ] as const).map(({ key, label, hint }) => (
            <label key={key} className="flex items-start gap-2 cursor-pointer select-none">
              <input type="checkbox"
                checked={s[key as keyof WfStep] as boolean}
                onChange={e => updateStep(idx, { [key]: e.target.checked })}
                className="mt-0.5 w-4 h-4 accent-[var(--color-primary)]" />
              <span>
                <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
                <span className="text-[10px] block text-[var(--text-muted)]">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* RFC back-to-step */}
      {s.can_rfc && totalSteps > 1 && (
        <div className="max-w-xs">{inp('RFC sends back to step',
          <select value={s.rfc_to_step}
            onChange={e => updateStep(idx, { rfc_to_step: parseInt(e.target.value) })}
            className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]">
            {Array.from({ length: s.step_no }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>Step {n}</option>
            ))}
          </select>,
          'Which step re-opens when RFC is raised'
        )}</div>
      )}
    </div>
  )

  return (
    <div className="p-4 sm:p-6">
      <PageBreadcrumb parent="Settings" current="Workflow Configuration" />

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Workflow Configuration</h1>
          <p className="text-sm mt-0.5 text-[var(--text-muted)]">Define approval workflows for each module</p>
        </div>
        <button onClick={() => setShowAddCfg(p => !p)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> New Workflow
        </button>
      </div>

      {/* Add workflow form */}
      {showAddCfg && (
        <div className="card p-5 mb-4 space-y-4">
          <h3 className="text-sm font-bold text-[var(--accent-gold)]">Create New Workflow</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {inp('Workflow Code *', textIn(cfgForm.wf_code, v => setCfgForm(p => ({ ...p, wf_code: v })), 'e.g. PO_APPROVAL'), 'Unique code, uppercase')}
            {inp('Workflow Name *', textIn(cfgForm.wf_name, v => setCfgForm(p => ({ ...p, wf_name: v })), 'e.g. Purchase Order Approval'))}
            {inp('Module Code *',  textIn(cfgForm.module_code, v => setCfgForm(p => ({ ...p, module_code: v })), 'e.g. FG_BOM'), 'Must match recordType in form')}
            {inp('Description',    textIn(cfgForm.description, v => setCfgForm(p => ({ ...p, description: v })), 'Optional description'))}
          </div>
          <div className="flex gap-3">
            <button onClick={createConfig} disabled={savingCfg}
              className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {savingCfg && <ArrowPathIcon className="w-4 h-4 animate-spin" />} Create
            </button>
            <button onClick={() => setShowAddCfg(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Configs list */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-[var(--text-muted)]">
            <ArrowPathIcon className="w-7 h-7 animate-spin" />
          </div>
        ) : configs.length === 0 ? (
          <div className="py-16 text-center text-sm text-[var(--text-muted)]">
            No workflows configured. Click <strong>New Workflow</strong> to start.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {configs.map(cfg => (
              <div key={cfg.id}>
                {/* Config row */}
                <div className="flex items-center gap-3 px-5 py-4 hover:bg-[var(--bg-secondary)] cursor-pointer"
                  onClick={() => toggleExpand(cfg)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-sm font-bold text-[var(--accent-gold)]">{cfg.wf_code}</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{cfg.wf_name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                        {cfg.module_code}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{cfg.step_count} step{Number(cfg.step_count) !== 1 ? 's' : ''}</span>
                    </div>
                    {cfg.description && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{cfg.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {/* Self Approval toggle */}
                    <button onClick={() => toggleSelfApproval(cfg)} title={cfg.self_approval ? 'Self Approval ON — click to disable' : 'Self Approval OFF — click to enable'}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        cfg.self_approval
                          ? 'bg-amber-50 border-amber-400 text-amber-700'
                          : 'bg-gray-50 border-gray-300 text-gray-400'
                      }`}>
                      <BoltIcon className="w-3.5 h-3.5" />
                      {cfg.self_approval ? 'Self Approval' : 'Self Approval'}
                    </button>
                    <button onClick={() => toggleActive(cfg)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        cfg.is_active
                          ? 'bg-green-50 border-green-300 text-green-600'
                          : 'bg-gray-50 border-gray-300 text-gray-500'
                      }`}>
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      {cfg.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => toggleExpand(cfg)}
                      className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">
                      {expandedId === cfg.id
                        ? <ChevronUpIcon className="w-4 h-4" />
                        : <ChevronDownIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded step editor */}
                {expandedId === cfg.id && (
                  <div className="px-5 pb-5 border-t border-[var(--border-color)]" style={{ background: 'var(--bg-primary)' }}>
                    <div className="pt-4 space-y-4">
                      {stepsLoading ? (
                        <div className="flex items-center gap-3 py-8 text-[var(--text-muted)]">
                          <ArrowPathIcon className="w-5 h-5 animate-spin" />
                          <span className="text-sm">Loading steps…</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                              Steps ({steps.length})
                            </p>
                            <button onClick={addStep}
                              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border-dashed border text-[var(--accent-gold)] border-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/5">
                              <PlusIcon className="w-4 h-4" /> Add Step
                            </button>
                          </div>

                          {steps.length === 0 ? (
                            <p className="text-sm text-[var(--text-muted)] py-4">No steps yet. Add at least one step.</p>
                          ) : (
                            <div className="space-y-3">
                              {steps.map((s, i) => renderStepRow(s, i, steps.length))}
                            </div>
                          )}

                          <div className="flex gap-3 pt-2">
                            <button onClick={() => saveSteps(cfg.id)} disabled={savingSteps || steps.length === 0}
                              className="btn-primary flex items-center gap-2 disabled:opacity-50">
                              {savingSteps && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                              Save Steps
                            </button>
                            <button onClick={() => setExpandedId(null)} className="btn-secondary">Close</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">How it works</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[var(--text-muted)]">
          <div>• <strong>Module Code</strong> must match the form's record type (e.g. <code>FG_BOM</code>)</div>
          <div>• <strong>Step 1</strong> is the initiator step — assign no role to allow any form user</div>
          <div>• <strong>Role</strong> assignment: anyone with that role can act at that step</div>
          <div>• <strong>User</strong> assignment overrides role — only that specific user can act</div>
          <div>• <strong>RFC</strong> raises a new draft version and sends it back to the configured step</div>
          <div>• Steps execute in order (1 → 2 → … → Approved)</div>
          <div>• <strong>Self Approval</strong> <span className="text-amber-600">(⚡)</span>: Submit immediately auto-approves — no separate approver needed</div>
        </div>
      </div>
    </div>
  )
}
