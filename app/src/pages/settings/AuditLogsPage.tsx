import React, { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Plus, Edit2, Trash2, Users, Calendar, Search, RefreshCw, X, Shield, LogIn } from 'lucide-react'
import { apiService } from '@/api/apiService'
import toast from 'react-hot-toast'
import PageBreadcrumb from '@/components/common/PageBreadcrumb'

interface AuditLog {
  id: number
  employee_id: string
  full_name: string
  action: string
  module: string
  record_id: string
  description: string
  ip_address: string
  created_at: string
}

interface Stats { total: number; today: number; creates: number; updates: number; deletes: number }

const fmt = (dt: string) =>
  dt ? new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

const ACTION_CONFIG: Record<string, { bg: string; text: string; icon: React.FC<{ className?: string }> }> = {
  CREATE:     { bg: 'bg-green-100',  text: 'text-green-700',  icon: Plus      },
  UPDATE:     { bg: 'bg-amber-100',  text: 'text-amber-700',  icon: Edit2     },
  DELETE:     { bg: 'bg-red-100',    text: 'text-red-700',    icon: Trash2    },
  ACTIVATE:   { bg: 'bg-blue-100',   text: 'text-blue-700',   icon: Users     },
  DEACTIVATE: { bg: 'bg-slate-100',  text: 'text-slate-600',  icon: Users     },
  ASSIGN:     { bg: 'bg-violet-100', text: 'text-violet-700', icon: Shield    },
  REVOKE:     { bg: 'bg-orange-100', text: 'text-orange-700', icon: Shield    },
  LOGIN:      { bg: 'bg-teal-100',   text: 'text-teal-700',   icon: LogIn     },
  CONFIG:     { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: ClipboardList },
}

const ActionBadge = ({ action }: { action: string }) => {
  const cfg  = ACTION_CONFIG[action?.toUpperCase()] ?? { bg: 'bg-gray-100', text: 'text-gray-600', icon: ClipboardList }
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.text}`}>
      <Icon className="w-3 h-3" />{action}
    </span>
  )
}

const AuditLogsPage: React.FC = () => {
  const [logs,     setLogs]     = useState<AuditLog[]>([])
  const [stats,    setStats]    = useState<Stats>({ total: 0, today: 0, creates: 0, updates: 0, deletes: 0 })
  const [modules,  setModules]  = useState<string[]>([])
  const [loading,  setLoading]  = useState(true)
  const [page,     setPage]     = useState(1)
  const [total,    setTotal]    = useState(0)
  const [pages,    setPages]    = useState(1)
  const LIMIT = 50

  const [search,   setSearch]   = useState('')
  const [action,   setAction]   = useState('')
  const [module,   setModule]   = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')

  const fetch = useCallback(async (pg = page) => {
    setLoading(true)
    try {
      const res = await apiService.get('/logs/audit', {
        params: { page: pg, limit: LIMIT, search, action, module, date_from: dateFrom, date_to: dateTo },
      })
      if (res.data.success) {
        setLogs(res.data.data ?? [])
        setStats(res.data.meta?.stats ?? { total: 0, today: 0, creates: 0, updates: 0, deletes: 0 })
        setModules(res.data.meta?.modules ?? [])
        setTotal(res.data.meta?.total ?? 0)
        setPages(res.data.meta?.total_pages ?? 1)
      }
    } catch {
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [page, search, action, module, dateFrom, dateTo])

  useEffect(() => { fetch(1); setPage(1) }, [search, action, module, dateFrom, dateTo]) // eslint-disable-line
  useEffect(() => { fetch(page) }, [page]) // eslint-disable-line

  const clearFilters = () => { setSearch(''); setAction(''); setModule(''); setDateFrom(''); setDateTo('') }
  const hasFilters   = search || action || module || dateFrom || dateTo

  const STAT_CARDS = [
    { label: 'Total Actions', value: stats.total,   bg: 'bg-blue-100',  icon: ClipboardList, text: 'text-blue-600'  },
    { label: 'Today',         value: stats.today,   bg: 'bg-indigo-100',icon: Calendar,      text: 'text-indigo-600'},
    { label: 'Creates',       value: stats.creates, bg: 'bg-green-100', icon: Plus,          text: 'text-green-600' },
    { label: 'Updates',       value: stats.updates, bg: 'bg-amber-100', icon: Edit2,         text: 'text-amber-600' },
  ]

  return (
    <div>
      <PageBreadcrumb parent="System Admin" current="Audit Logs" />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text-primary)' }}>Audit Logs</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Complete trail of all user actions across the system</p>
        </div>
        <button onClick={() => fetch(page)} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {STAT_CARDS.map(c => (
          <div key={c.label} className="card p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
              <c.icon className={`w-5 h-5 ${c.text}`} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{c.value.toLocaleString()}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by user, description…"
            className="form-input pl-9 w-full" />
        </div>
        <select value={action} onChange={e => setAction(e.target.value)} className="form-input w-36">
          <option value="">All Actions</option>
          {Object.keys(ACTION_CONFIG).map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {modules.length > 0 && (
          <select value={module} onChange={e => setModule(e.target.value)} className="form-input w-44">
            <option value="">All Modules</option>
            {modules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-input w-36" />
          <span style={{ color: 'var(--text-muted)' }}>to</span>
          <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="form-input w-36" />
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600">
            <X className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)' }}>
                {['Date & Time', 'User', 'Action', 'Module', 'Description', 'Record', 'IP'].map(h => (
                  <th key={h} className="px-4 py-3 font-medium text-xs" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 rounded animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center" style={{ color: 'var(--text-muted)' }}>
                    <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No audit records found</p>
                    <p className="text-xs mt-1">Actions will appear here as users operate the system</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b transition-colors hover:bg-[var(--bg-secondary)]"
                      style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: 'var(--text-muted)' }}>
                      {fmt(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {log.employee_id && <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{log.employee_id}</p>}
                      {log.full_name?.trim() && (
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{log.full_name.trim()}</p>
                      )}
                    </td>
                    <td className="px-4 py-3"><ActionBadge action={log.action} /></td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded font-medium"
                            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                        {log.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[260px]" style={{ color: 'var(--text-secondary)' }}>
                      {log.description || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {log.record_id || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {log.ip_address || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total.toLocaleString()} records
            </p>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1}    onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">Prev</button>
              <span className="text-xs px-2" style={{ color: 'var(--text-muted)' }}>{page} / {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs px-3 py-1 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuditLogsPage
