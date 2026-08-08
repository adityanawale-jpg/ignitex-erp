import React, { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, AlertCircle, Info, Calendar, Search, RefreshCw, X, ChevronDown, ChevronRight } from 'lucide-react'
import { apiService } from '@/api/apiService'
import toast from 'react-hot-toast'

interface ErrorLog {
  id: number
  severity: string
  error_type: string
  message: string
  stack_trace: string
  request_path: string
  request_method: string
  employee_id: string
  ip_address: string
  created_at: string
}

interface Stats { total: number; today: number; week: number; critical: number }

const fmt = (dt: string) =>
  dt ? new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; icon: React.FC<{ className?: string }> }> = {
  ERROR:    { bg: 'bg-red-100',    text: 'text-red-700',    icon: AlertCircle  },
  WARN:     { bg: 'bg-amber-100',  text: 'text-amber-700',  icon: AlertTriangle },
  INFO:     { bg: 'bg-blue-100',   text: 'text-blue-700',   icon: Info         },
  CRITICAL: { bg: 'bg-rose-100',   text: 'text-rose-800',   icon: AlertCircle  },
  FATAL:    { bg: 'bg-purple-100', text: 'text-purple-800', icon: AlertCircle  },
}

const SeverityBadge = ({ severity }: { severity: string }) => {
  const cfg = SEVERITY_CONFIG[severity?.toUpperCase()] ?? SEVERITY_CONFIG.ERROR
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.text}`}>
      <Icon className="w-3 h-3" />{severity || 'ERROR'}
    </span>
  )
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-blue-600', POST: 'text-green-600', PUT: 'text-amber-600',
  DELETE: 'text-red-600', PATCH: 'text-purple-600',
}

const ErrorLogsPage: React.FC = () => {
  const [logs,    setLogs]    = useState<ErrorLog[]>([])
  const [stats,   setStats]   = useState<Stats>({ total: 0, today: 0, week: 0, critical: 0 })
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const [total,   setTotal]   = useState(0)
  const [pages,   setPages]   = useState(1)
  const LIMIT = 50

  const [search,   setSearch]   = useState('')
  const [severity, setSeverity] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const fetch = useCallback(async (pg = page) => {
    setLoading(true)
    try {
      const res = await apiService.get('/logs/errors', {
        params: { page: pg, limit: LIMIT, search, severity, date_from: dateFrom, date_to: dateTo },
      })
      if (res.data.success) {
        setLogs(res.data.data ?? [])
        setStats(res.data.meta?.stats ?? { total: 0, today: 0, week: 0, critical: 0 })
        setTotal(res.data.meta?.total ?? 0)
        setPages(res.data.meta?.total_pages ?? 1)
      }
    } catch {
      toast.error('Failed to load error logs')
    } finally {
      setLoading(false)
    }
  }, [page, search, severity, dateFrom, dateTo])

  useEffect(() => { fetch(1); setPage(1) }, [search, severity, dateFrom, dateTo]) // eslint-disable-line
  useEffect(() => { fetch(page) }, [page]) // eslint-disable-line

  const clearFilters = () => { setSearch(''); setSeverity(''); setDateFrom(''); setDateTo('') }
  const hasFilters   = search || severity || dateFrom || dateTo

  return (
    <div>
      <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <span>System Admin</span><span>/</span>
        <span style={{ color: 'var(--accent-gold)' }}>Error Logs</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text-primary)' }}>Error Logs</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Application errors and warnings recorded by the system</p>
        </div>
        <button onClick={() => fetch(page)} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total Errors',  value: stats.total,    bg: 'bg-red-100',    icon: AlertCircle,   text: 'text-red-600'    },
          { label: 'Today',         value: stats.today,    bg: 'bg-amber-100',  icon: AlertTriangle, text: 'text-amber-600'  },
          { label: 'Last 7 Days',   value: stats.week,     bg: 'bg-blue-100',   icon: Calendar,      text: 'text-blue-600'   },
          { label: 'Critical Today',value: stats.critical, bg: 'bg-rose-100',   icon: AlertCircle,   text: 'text-rose-600'   },
        ].map(c => (
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
            placeholder="Search message, type, path…"
            className="form-input pl-9 w-full" />
        </div>
        <select value={severity} onChange={e => setSeverity(e.target.value)} className="form-input w-36">
          <option value="">All Levels</option>
          {['ERROR', 'WARN', 'INFO', 'CRITICAL', 'FATAL'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
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
                {['Date & Time', 'Severity', 'Type', 'Message', 'Endpoint', 'User / IP'].map(h => (
                  <th key={h} className="px-4 py-3 font-medium text-xs" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 rounded animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center" style={{ color: 'var(--text-muted)' }}>
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No error logs found</p>
                    <p className="text-xs mt-1">The system is running clean — no errors recorded</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const isOpen = expanded === log.id
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpanded(isOpen ? null : log.id)}
                        className="border-b cursor-pointer transition-colors hover:bg-[var(--bg-secondary)]"
                        style={{ borderColor: 'var(--border-color)' }}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: 'var(--text-muted)' }}>
                          {fmt(log.created_at)}
                        </td>
                        <td className="px-4 py-3"><SeverityBadge severity={log.severity} /></td>
                        <td className="px-4 py-3 text-xs font-mono max-w-[140px] truncate" style={{ color: 'var(--text-secondary)' }}>
                          {log.error_type || '—'}
                        </td>
                        <td className="px-4 py-3 max-w-[280px]">
                          <div className="flex items-center gap-1.5">
                            {isOpen ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                                    : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />}
                            <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{log.message}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {(log.request_method || log.request_path) ? (
                            <span className="font-mono text-[11px]">
                              <span className={`font-bold ${METHOD_COLORS[log.request_method] ?? 'text-gray-600'}`}>
                                {log.request_method}
                              </span>
                              {' '}<span style={{ color: 'var(--text-secondary)' }}>{log.request_path}</span>
                            </span>
                          ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {log.employee_id && <p className="font-medium">{log.employee_id}</p>}
                          {log.ip_address  && <p className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{log.ip_address}</p>}
                          {!log.employee_id && !log.ip_address && '—'}
                        </td>
                      </tr>

                      {/* Stack trace row */}
                      {isOpen && log.stack_trace && (
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                          <td colSpan={6} className="px-6 py-3">
                            <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Stack Trace</p>
                            <pre className="text-[11px] font-mono leading-relaxed overflow-x-auto p-3 rounded"
                                 style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', maxHeight: 200 }}>
                              {log.stack_trace}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
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

export default ErrorLogsPage
