import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import Badge from '@/components/common/Badge'
import PageBreadcrumb from '@/components/common/PageBreadcrumb'
import { apiService } from '@/api/apiService'
import { formatDateTime } from '@/utils/helpers'

// Reads stock_balance — the running position stock.service.ts keeps current
// every time Metal Receipt (today) or a future stock-moving module posts to
// stock_ledger. No create/edit here: a balance only ever changes because a
// transaction posted, never by hand.
interface StockBalanceRow {
  id:            number
  inv_org_code:  string | null
  sub_inv_code:  string
  item_type:     string
  sku_code:      string
  uid:           string
  purity:        string | null
  quantity:      string | number
  pure_quantity: string | number | null
  updated_at:    string
}

const n = (v: unknown): number => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}
const wt = (v: unknown) => n(v).toFixed(4)

const OnHandStockPage: React.FC = () => {
  const [rows,        setRows]        = useState<StockBalanceRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search,      setSearch]      = useState('')
  const [subInvFilter, setSubInvFilter] = useState('')
  const [total,       setTotal]       = useState(0)

  // Debounced the same way the rest of the app's grids debounce search.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiService.get('/stock/balance', {
        params: { page: 1, limit: 200, search, sub_inv_code: subInvFilter },
      })
      setRows(res.data?.data ?? [])
      setTotal(res.data?.meta?.total ?? 0)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Failed to load stock balance')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [search, subInvFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Options come from whatever positions actually exist rather than the full
  // inventory_structure master — a sub-inventory with nothing on hand is not
  // worth offering as a filter here, and pulling the master would need a
  // permission this read-only screen has no reason to require.
  const subInvOptions = useMemo(
    () => Array.from(new Set(rows.map(r => r.sub_inv_code))).sort(),
    [rows],
  )

  const summary = useMemo(() => ({
    skus:      new Set(rows.map(r => r.sku_code)).size,
    locations: new Set(rows.map(r => r.sub_inv_code)).size,
    totalQty:  rows.reduce((a, r) => a + n(r.quantity), 0),
    totalPure: rows.reduce((a, r) => a + n(r.pure_quantity), 0),
  }), [rows])

  return (
    <div>
      <PageBreadcrumb parent="Inventory Management" current="On Hand Stock" />

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div className="card p-4">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Positions</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Distinct SKUs</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{summary.skus}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sub-Inventories</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{summary.locations}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Pure Wt (g)</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--accent-gold)' }}>{summary.totalPure.toFixed(3)}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search SKU or UID…"
              className="form-input pl-9 py-1.5 text-sm w-full"
            />
          </div>
          <select
            value={subInvFilter}
            onChange={e => setSubInvFilter(e.target.value)}
            className="form-input py-1.5 text-sm w-52"
          >
            <option value="">All Sub-Inventories</option>
            {subInvOptions.map(code => <option key={code} value={code}>{code}</option>)}
          </select>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                {['Sub Inventory', 'SKU', 'UID', 'Purity', 'Quantity', 'Pure Wt', 'Type', 'Last Updated'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>No stock on hand</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="border-b hover:bg-[var(--bg-secondary)]" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="px-4 py-2.5 whitespace-nowrap">{r.sub_inv_code}</td>
                  <td className="px-4 py-2.5 font-medium whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{r.sku_code}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{r.uid || '—'}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{r.purity || '—'}</td>
                  <td className="px-4 py-2.5 font-mono whitespace-nowrap">{wt(r.quantity)}</td>
                  <td className="px-4 py-2.5 font-mono whitespace-nowrap">{r.pure_quantity != null ? wt(r.pure_quantity) : '—'}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap"><Badge label={r.item_type} variant="gold" /></td>
                  <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{formatDateTime(r.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default OnHandStockPage
