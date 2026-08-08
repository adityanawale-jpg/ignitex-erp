import React, { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import PageHeader from '@/components/common/PageHeader'
import { formatCurrency } from '@/utils/helpers'

const MONTHLY = [
  { month: 'Jan', sales: 380000, orders: 42 },
  { month: 'Feb', sales: 420000, orders: 48 },
  { month: 'Mar', sales: 510000, orders: 55 },
  { month: 'Apr', sales: 475000, orders: 51 },
  { month: 'May', sales: 620000, orders: 67 },
]

const CATEGORY_DATA = [
  { name: 'Necklaces', value: 35 },
  { name: 'Rings', value: 25 },
  { name: 'Earrings', value: 18 },
  { name: 'Bangles', value: 12 },
  { name: 'Others', value: 10 },
]

const TOP_PRODUCTS = [
  { product: "Gold Mangalsutra", revenue: 284000, qty: 4 },
  { product: "Diamond Ring", revenue: 225000, qty: 5 },
  { product: "Gold Chain 22K", revenue: 232000, qty: 2 },
  { product: "Gold Earrings", revenue: 192000, qty: 4 },
  { product: "Silver Anklets", revenue: 21000, qty: 10 },
]

const COLORS = ['#c9973a', '#6366f1', '#10b981', '#f59e0b', '#ef4444']

const SalesReportPage: React.FC = () => {
  const [period, setPeriod] = useState('monthly')

  return (
    <div>
      <PageHeader
        title="Sales Report"
        subtitle="Comprehensive sales analytics and insights"
        actions={
          <div className="tab-bar">
            {['weekly', 'monthly', 'yearly'].map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`tab-item ${period === p ? 'active' : ''} capitalize`}>
                {p}
              </button>
            ))}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: formatCurrency(620000), change: '+18%', up: true },
          { label: 'Total Orders', value: '67', change: '+24%', up: true },
          { label: 'Avg Order Value', value: formatCurrency(9254), change: '+3%', up: true },
          { label: 'Cancelled', value: '3', change: '-12%', up: false },
        ].map((kpi) => (
          <div key={kpi.label} className="card p-5">
            <p className="text-xs text-[var(--text-muted)] mb-2">{kpi.label}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{kpi.value}</p>
            <p className={`text-xs mt-1 font-medium ${kpi.up ? 'text-emerald-500' : 'text-red-500'}`}>
              {kpi.change} vs last month
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Revenue Trend */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MONTHLY}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c9973a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#c9973a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Area type="monotone" dataKey="sales" stroke="#c9973a" fill="url(#grad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Sales by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={CATEGORY_DATA}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {CATEGORY_DATA.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend iconSize={10} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly Orders */}
        <div className="card p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Monthly Orders</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MONTHLY}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip />
              <Bar dataKey="orders" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="card p-5">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Top Products by Revenue</h3>
          <div className="space-y-3">
            {TOP_PRODUCTS.map((p, i) => (
              <div key={p.product} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: COLORS[i % COLORS.length] }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">{p.product}</span>
                    <span className="text-sm font-semibold text-[var(--color-gold)] ml-2">{formatCurrency(p.revenue)}</span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(p.revenue / TOP_PRODUCTS[0].revenue) * 100}%`,
                        background: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-[var(--text-muted)] w-12 text-right">{p.qty} pcs</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SalesReportPage
