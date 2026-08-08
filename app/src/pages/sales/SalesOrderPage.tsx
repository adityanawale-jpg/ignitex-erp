import React, { useState } from 'react'
import toast from 'react-hot-toast'
import {
  PlusIcon, EyeIcon, PrinterIcon, CheckCircleIcon,
  XCircleIcon, ClockIcon, DocumentTextIcon
} from '@heroicons/react/24/outline'
import PageHeader from '@/components/common/PageHeader'
import DataTable from '@/components/common/DataTable'
import Badge from '@/components/common/Badge'
import Modal from '@/components/common/Modal'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/helpers'

interface OrderItem {
  id: number
  product_name: string
  gross_weight: number
  net_weight: number
  rate_per_gram: number
  making_charges: number
  stone_charges: number
  quantity: number
  amount: number
}

interface SalesOrder {
  id: number
  order_no: string
  order_date: string
  party_name: string
  party_phone: string
  items: OrderItem[]
  subtotal: number
  discount: number
  tax_amount: number
  net_amount: number
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'DELIVERED' | 'CANCELLED'
  remarks: string
  created_at: string
}

const DEMO_ORDERS: SalesOrder[] = [
  {
    id: 1, order_no: 'SO-202605-1001', order_date: '2026-05-27',
    party_name: 'Ramesh Jewellers', party_phone: '+91 98765 43210',
    items: [
      { id: 1, product_name: 'Gold Mangalsutra Classic', gross_weight: 12.5, net_weight: 11.8, rate_per_gram: 5725, making_charges: 1200, stone_charges: 0, quantity: 1, amount: 68000 }
    ],
    subtotal: 68000, discount: 0, tax_amount: 3400, net_amount: 71400,
    status: 'CONFIRMED', remarks: 'For wedding occasion', created_at: '2026-05-27T10:30:00'
  },
  {
    id: 2, order_no: 'SO-202605-1002', order_date: '2026-05-27',
    party_name: 'Sunita Sharma', party_phone: '+91 87654 32109',
    items: [
      { id: 1, product_name: 'Diamond Solitaire Ring', gross_weight: 3.2, net_weight: 2.8, rate_per_gram: 4688, making_charges: 800, stone_charges: 5000, quantity: 1, amount: 45000 },
      { id: 2, product_name: 'Gold Jhumka Earrings', gross_weight: 8.4, net_weight: 7.9, rate_per_gram: 5725, making_charges: 600, stone_charges: 0, quantity: 1, amount: 48000 },
    ],
    subtotal: 93000, discount: 3000, tax_amount: 4500, net_amount: 94500,
    status: 'PENDING', remarks: 'Anniversary gift', created_at: '2026-05-27T11:15:00'
  },
  {
    id: 3, order_no: 'SO-202605-1003', order_date: '2026-05-26',
    party_name: 'Arun Gold Palace', party_phone: '+91 76543 21098',
    items: [
      { id: 1, product_name: 'Men\'s Gold Chain 22K', gross_weight: 20.0, net_weight: 20.0, rate_per_gram: 5725, making_charges: 1500, stone_charges: 0, quantity: 2, amount: 232000 }
    ],
    subtotal: 232000, discount: 5000, tax_amount: 11350, net_amount: 238350,
    status: 'PROCESSING', remarks: 'Wholesale order', created_at: '2026-05-26T14:00:00'
  },
  {
    id: 4, order_no: 'SO-202605-1004', order_date: '2026-05-25',
    party_name: 'Meena Devi', party_phone: '+91 65432 10987',
    items: [
      { id: 1, product_name: 'Silver Anklet Pair', gross_weight: 25.0, net_weight: 24.5, rate_per_gram: 75.5, making_charges: 200, stone_charges: 0, quantity: 1, amount: 2100 }
    ],
    subtotal: 2100, discount: 0, tax_amount: 105, net_amount: 2205,
    status: 'DELIVERED', remarks: '', created_at: '2026-05-25T09:00:00'
  },
]

const statusConfig = {
  PENDING: { icon: ClockIcon, color: 'text-amber-500' },
  CONFIRMED: { icon: CheckCircleIcon, color: 'text-blue-500' },
  PROCESSING: { icon: DocumentTextIcon, color: 'text-purple-500' },
  DELIVERED: { icon: CheckCircleIcon, color: 'text-emerald-500' },
  CANCELLED: { icon: XCircleIcon, color: 'text-red-500' },
}

const SalesOrderPage: React.FC = () => {
  const [orders, setOrders] = useState<SalesOrder[]>(DEMO_ORDERS)
  const [viewOrder, setViewOrder] = useState<SalesOrder | null>(null)
  const [filter, setFilter] = useState<string>('ALL')

  const filtered = filter === 'ALL' ? orders : orders.filter((o) => o.status === filter)

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'PENDING').length,
    processing: orders.filter((o) => o.status === 'PROCESSING').length,
    delivered: orders.filter((o) => o.status === 'DELIVERED').length,
    revenue: orders.filter((o) => o.status !== 'CANCELLED').reduce((a, b) => a + b.net_amount, 0),
  }

  const columns = [
    { key: 'order_no', label: 'Order No', sortable: true },
    {
      key: 'order_date',
      label: 'Date',
      sortable: true,
      render: (v: unknown) => formatDate(String(v)),
    },
    { key: 'party_name', label: 'Customer', sortable: true },
    {
      key: 'items',
      label: 'Items',
      render: (v: unknown) => <span className="font-medium">{(v as OrderItem[]).length}</span>,
    },
    {
      key: 'net_amount',
      label: 'Net Amount',
      sortable: true,
      render: (v: unknown) => <span className="font-semibold text-[var(--color-gold)]">{formatCurrency(Number(v))}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (v: unknown) => <Badge label={String(v)} />,
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (v: unknown) => <span className="text-xs text-[var(--text-muted)]">{formatDateTime(String(v))}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Sales Orders"
        subtitle="Manage customer orders and track delivery"
        actions={
          <button className="btn-primary flex items-center gap-2" onClick={() => toast.success('New order form – connect to backend API')}>
            <PlusIcon className="w-4 h-4" /> New Order
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Orders', value: stats.total, color: '#6366f1' },
          { label: 'Pending', value: stats.pending, color: '#f59e0b' },
          { label: 'Processing', value: stats.processing, color: '#8b5cf6' },
          { label: 'Delivered', value: stats.delivered, color: '#10b981' },
          { label: 'Revenue', value: formatCurrency(stats.revenue), color: 'var(--color-gold)' },
        ].map((s) => (
          <div key={s.label} className="card p-4 border-l-4" style={{ borderLeftColor: s.color }}>
            <p className="text-xs text-[var(--text-muted)]">{s.label}</p>
            <p className="text-xl font-bold mt-1 truncate" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Status Filter Tabs */}
      <div className="tab-bar mb-4">
        {['ALL', 'PENDING', 'CONFIRMED', 'PROCESSING', 'DELIVERED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`tab-item ${filter === s ? 'active' : ''}`}
          >
            {s === 'ALL' ? `All (${orders.length})` : `${s} (${orders.filter((o) => o.status === s).length})`}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns as never}
        data={filtered as never}
        searchable
        exportable
        title="Sales Orders"
        onRowClick={(row) => setViewOrder(row as unknown as SalesOrder)}
        actions={(row: unknown) => {
          const order = row as SalesOrder
          return (
            <div className="flex gap-1">
              <button onClick={() => setViewOrder(order)} className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-blue-500" title="View">
                <EyeIcon className="w-4 h-4" />
              </button>
              <button onClick={() => toast.success('Print order – connect to backend')} className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]" title="Print">
                <PrinterIcon className="w-4 h-4" />
              </button>
            </div>
          )
        }}
      />

      {/* Order Detail Modal */}
      <Modal
        isOpen={!!viewOrder}
        onClose={() => setViewOrder(null)}
        title={`Order Details — ${viewOrder?.order_no}`}
        size="2xl"
        footer={
          <button onClick={() => setViewOrder(null)} className="btn-secondary">Close</button>
        }
      >
        {viewOrder && (
          <div className="space-y-5">
            {/* Order Info */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Customer</p>
                <p className="font-semibold text-[var(--text-primary)]">{viewOrder.party_name}</p>
                <p className="text-sm text-[var(--text-muted)]">{viewOrder.party_phone}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Order Date</p>
                <p className="font-semibold">{formatDate(viewOrder.order_date)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Status</p>
                <Badge label={viewOrder.status} />
              </div>
            </div>

            {/* Items */}
            <div>
              <p className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Order Items</p>
              <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-tertiary)]">
                    <tr>
                      {['Product', 'Gross Wt', 'Net Wt', 'Rate/g', 'Making', 'Qty', 'Amount'].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-xs text-[var(--text-muted)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewOrder.items.map((item) => (
                      <tr key={item.id} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2 font-medium">{item.product_name}</td>
                        <td className="px-3 py-2">{item.gross_weight}g</td>
                        <td className="px-3 py-2">{item.net_weight}g</td>
                        <td className="px-3 py-2">{formatCurrency(item.rate_per_gram)}</td>
                        <td className="px-3 py-2">{formatCurrency(item.making_charges)}</td>
                        <td className="px-3 py-2">{item.quantity}</td>
                        <td className="px-3 py-2 font-semibold text-[var(--color-gold)]">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="ml-auto w-64 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Subtotal</span>
                <span>{formatCurrency(viewOrder.subtotal)}</span>
              </div>
              {viewOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>- {formatCurrency(viewOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Tax (GST 3%)</span>
                <span>{formatCurrency(viewOrder.tax_amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-[var(--border)] pt-1.5">
                <span>Net Amount</span>
                <span className="text-[var(--color-gold)]">{formatCurrency(viewOrder.net_amount)}</span>
              </div>
            </div>

            {viewOrder.remarks && (
              <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 text-sm">
                <span className="font-medium">Remarks: </span>{viewOrder.remarks}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default SalesOrderPage
