import React, { useState } from 'react'
import PageHeader from '@/components/common/PageHeader'
import DataTable from '@/components/common/DataTable'
import Badge from '@/components/common/Badge'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/helpers'

interface StockEntry {
  id: number
  entry_date: string
  transaction_type: 'IN' | 'OUT' | 'ADJUSTMENT'
  product_code: string
  product_name: string
  metal_name: string
  category_name: string
  gross_weight: number
  net_weight: number
  quantity: number
  reference_no: string
  remarks: string
  created_at: string
}

const DEMO: StockEntry[] = [
  { id: 1, entry_date: '2026-05-20', transaction_type: 'IN', product_code: 'P001', product_name: 'Gold Mangalsutra Classic', metal_name: 'Gold 22K', category_name: 'Necklaces', gross_weight: 12.5, net_weight: 11.8, quantity: 5, reference_no: 'PO-202605-001', remarks: 'Opening stock', created_at: '2026-05-20T09:00:00' },
  { id: 2, entry_date: '2026-05-21', transaction_type: 'IN', product_code: 'P002', product_name: 'Diamond Solitaire Ring', metal_name: 'Gold 18K', category_name: 'Rings', gross_weight: 3.2, net_weight: 2.8, quantity: 10, reference_no: 'PO-202605-002', remarks: 'New purchase', created_at: '2026-05-21T10:00:00' },
  { id: 3, entry_date: '2026-05-22', transaction_type: 'OUT', product_code: 'P001', product_name: 'Gold Mangalsutra Classic', metal_name: 'Gold 22K', category_name: 'Necklaces', gross_weight: 12.5, net_weight: 11.8, quantity: 1, reference_no: 'SO-202605-1001', remarks: 'Sales delivery', created_at: '2026-05-22T14:00:00' },
  { id: 4, entry_date: '2026-05-23', transaction_type: 'IN', product_code: 'P003', product_name: 'Gold Jhumka Earrings', metal_name: 'Gold 22K', category_name: 'Earrings', gross_weight: 8.4, net_weight: 7.9, quantity: 8, reference_no: 'PO-202605-003', remarks: 'Stock replenishment', created_at: '2026-05-23T11:00:00' },
  { id: 5, entry_date: '2026-05-25', transaction_type: 'ADJUSTMENT', product_code: 'P002', product_name: 'Diamond Solitaire Ring', metal_name: 'Gold 18K', category_name: 'Rings', gross_weight: 3.2, net_weight: 2.8, quantity: -1, reference_no: 'ADJ-001', remarks: 'Physical count adjustment', created_at: '2026-05-25T16:00:00' },
  { id: 6, entry_date: '2026-05-26', transaction_type: 'OUT', product_code: 'P004', product_name: "Men's Gold Chain 22K", metal_name: 'Gold 22K', category_name: 'Chains', gross_weight: 20.0, net_weight: 20.0, quantity: 2, reference_no: 'SO-202605-1003', remarks: 'Wholesale order delivery', created_at: '2026-05-26T15:00:00' },
]

const StockLedgerPage: React.FC = () => {
  const [entries] = useState<StockEntry[]>(DEMO)
  const [typeFilter, setTypeFilter] = useState('ALL')

  const filtered = typeFilter === 'ALL' ? entries : entries.filter((e) => e.transaction_type === typeFilter)

  const totals = {
    totalIn: entries.filter((e) => e.transaction_type === 'IN').reduce((a, b) => a + b.quantity, 0),
    totalOut: entries.filter((e) => e.transaction_type === 'OUT').reduce((a, b) => a + b.quantity, 0),
    totalAdj: entries.filter((e) => e.transaction_type === 'ADJUSTMENT').length,
    totalWeightIn: entries.filter((e) => e.transaction_type === 'IN').reduce((a, b) => a + b.gross_weight * b.quantity, 0),
  }

  const columns = [
    {
      key: 'entry_date', label: 'Date', sortable: true,
      render: (v: unknown) => formatDate(String(v)),
    },
    {
      key: 'transaction_type', label: 'Type',
      render: (v: unknown) => (
        <Badge
          label={String(v)}
          variant={v === 'IN' ? 'success' : v === 'OUT' ? 'danger' : 'warning'}
        />
      ),
    },
    { key: 'product_code', label: 'Code' },
    { key: 'product_name', label: 'Product', sortable: true },
    { key: 'metal_name', label: 'Metal' },
    { key: 'category_name', label: 'Category' },
    {
      key: 'gross_weight', label: 'Gross Wt (g)',
      render: (v: unknown) => `${Number(v).toFixed(3)}g`,
    },
    {
      key: 'quantity', label: 'Qty',
      render: (v: unknown, row: unknown) => {
        const entry = row as StockEntry
        const qty = Number(v)
        return (
          <span className={`font-semibold ${entry.transaction_type === 'IN' ? 'text-emerald-600' : entry.transaction_type === 'OUT' ? 'text-red-600' : 'text-amber-600'}`}>
            {entry.transaction_type === 'IN' ? '+' : ''}{qty}
          </span>
        )
      },
    },
    { key: 'reference_no', label: 'Reference' },
    { key: 'remarks', label: 'Remarks' },
  ]

  return (
    <div>
      <PageHeader
        title="Stock Ledger"
        subtitle="Complete stock movement history"
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 border-l-4 border-emerald-500">
          <p className="text-xs text-[var(--text-muted)]">Total Stock In</p>
          <p className="text-2xl font-bold text-emerald-600">{totals.totalIn} pcs</p>
        </div>
        <div className="card p-4 border-l-4 border-red-500">
          <p className="text-xs text-[var(--text-muted)]">Total Stock Out</p>
          <p className="text-2xl font-bold text-red-600">{totals.totalOut} pcs</p>
        </div>
        <div className="card p-4 border-l-4 border-amber-500">
          <p className="text-xs text-[var(--text-muted)]">Adjustments</p>
          <p className="text-2xl font-bold text-amber-600">{totals.totalAdj}</p>
        </div>
        <div className="card p-4 border-l-4 border-[var(--color-gold)]">
          <p className="text-xs text-[var(--text-muted)]">Net Balance</p>
          <p className="text-2xl font-bold text-[var(--color-gold)]">{totals.totalIn - totals.totalOut} pcs</p>
        </div>
      </div>

      {/* Filter */}
      <div className="tab-bar mb-4">
        {['ALL', 'IN', 'OUT', 'ADJUSTMENT'].map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)} className={`tab-item ${typeFilter === t ? 'active' : ''}`}>
            {t}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns as never}
        data={filtered as never}
        searchable
        exportable
        title="Stock Ledger Entries"
      />
    </div>
  )
}

export default StockLedgerPage
