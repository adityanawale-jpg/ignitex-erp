import React, { useState, useEffect, useCallback } from 'react'
import { LogIn, CheckCircle, XCircle, Calendar, Search, RefreshCw, X, Monitor, Shield } from 'lucide-react'
import { apiService } from '@/api/apiService'
import toast from 'react-hot-toast'
import PageBreadcrumb from '@/components/common/PageBreadcrumb'

interface LoginLog {
  id: number
  employee_id: string
  full_name: string
  status: string
  ip_address: string
  user_agent: string
  remarks: string
  login_time: string
}

interface Stats { total: number; success: number; failed: number; today: number }

const fmt = (dt: string) =>
  dt ? new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

const StatusBadge = ({ status }: { status: string }) => {
  const ok = status === 'success'
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
      ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {ok ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {ok ? 'Success' : 'Failed'}
    </span>
  )
}

const LoginLogsPage: React.FC = () => {
  const [logs,     setLogs]     = useState<LoginLog[]>([])
  const [stats,    setStats]    = useState<Stats>({ total: 0, success: 0, failed: 0, today: 0 })
  const [loading,  setLoading]  = useState(true)
  const [page,     setPage]     = useState(1)
  const [total,    setTotal]    = useState(0)
  const [pages,    setPages]    = useState(1)
  const LIMIT = 50

  const [search,    setSearch]    = useState('')
  const [status,    setStatus]    = useState('')
  const [dateFrom,  setDateFrom]  = useState('')
  const [dateTo,    setDateTo]    = useState('')
  const [expanded,  setExpanded]  = useState<number | null>(null)

  const fetch = useCallback(async (pg = page) => {
    setLoading(true)
    try {
      const res = await apiService.get('/logs/login', {
        params: { page: pg, limit: LIMIT, search, status, date_from: dateFrom, date_to: dateTo },
      })
      if (res.data.success) {
        setLogs(res.data.data ?? [])
        setStats(res.data.meta?.stats ?? { total: 0, success: 0, failed: 0, today: 0 })
        setTotal(res.data.meta?.total ?? 0)
        setPages(res.data.meta?.total_pages ?? 1)
      }
    } catch {
      toast.error('Failed to load login logs')
    } finally {
      setLoading(false)
    }
  }, [page, search, status, dateFrom, dateTo])

  useEffect(() => { fetch(1); setPage(1) }, [search, status, dateFrom, dateTo]) // eslint-disable-line
  useEffect(() => { fetch(page) }, [page]) // eslint-disable-line

  const clearFilters = () => { setSearch(''); setStatus(''); setDateFrom(''); setDateTo('') }
  const hasFilters   = search || status || dateFrom || dateTo

  const STAT_CARDS = [
    { label: 'Total Logins',  value: stats.total,   icon: LogIn,        color: 'bg-blue-100 text-blue-600'   },
    { label: 'Successful',    value: stats.success,  icon: CheckCircle,  color: 'bg-green-100 text-green-600' },
    { label: 'Failed',        value: stats.failed,   icon: XCircle,      color: 'bg-red-100 text-red-600'     },
    { label: 'Today',         value: stats.today,    icon: Calendar,     color: 'bg-amber-100 text-amber-600' },
  ]

  return (
    <div>
      <PageBreadcrumb parent="System Admin" current="User Login Logs" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text-primary)' }}>User Login Logs</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Track all login attempts and sessions</p>
        </div>
        <button onClick={() => fetch(page)} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {STAT_CARDS.map(c => (
          <div key={c.label} className="card p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.color}`}>
              <c.icon className="w-5 h-5" />
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
            placeholder="Search by employee, IP…"
            className="form-input pl-9 w-full" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="form-input w-36">
          <option value="">All Status</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
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
                <th className="px-4 py-3 font-medium text-xs" style={{ color: 'var(--text-secondary)' }}>Date & Time</th>
                <th className="px-4 py-3 font-medium text-xs" style={{ color: 'var(--text-secondary)' }}>Employee</th>
                <th className="px-4 py-3 font-medium text-xs" style={{ color: 'var(--text-secondary)' }}>Status</th>
                <th className="px-4 py-3 font-medium text-xs" style={{ color: 'var(--text-secondary)' }}>IP Address</th>
                <th className="px-4 py-3 font-medium text-xs" style={{ color: 'var(--text-secondary)' }}>Remarks</th>
                <th className="px-4 py-3 font-medium text-xs" style={{ color: 'var(--text-secondary)' }}>Browser</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 rounded animate-pulse" style={{ background: 'var(--bg-tertiary)', width: j === 1 ? '60%' : '80%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center" style={{ color: 'var(--text-muted)' }}>
                    <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No login logs found</p>
                    <p className="text-xs mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const ua    = log.user_agent || ''
                  const short = ua.length > 60 ? ua.substring(0, 60) + '…' : ua
                  return (
                    <tr key={log.id} className="border-b transition-colors hover:bg-[var(--bg-secondary)]"
                        style={{ borderColor: 'var(--border-color)' }}>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        {fmt(log.login_time)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{log.employee_id}</p>
                        {log.full_name?.trim() && (
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{log.full_name.trim()}</p>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {log.ip_address || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {log.remarks || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {ua ? (
                          <button onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                            className="flex items-center gap-1 text-xs hover:underline"
                            style={{ color: 'var(--text-muted)' }}>
                            <Monitor className="w-3 h-3" />
                            {expanded === log.id ? 'Hide' : short}
                          </button>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        {expanded === log.id && (
                          <div className="mt-1 p-2 rounded text-[10px] break-all leading-relaxed"
                               style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                            {ua}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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

export default LoginLogsPage
