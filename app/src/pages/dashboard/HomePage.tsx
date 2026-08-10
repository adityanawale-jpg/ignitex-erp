import React, { useEffect, useState } from 'react';
import {
  Gem, TrendingUp, TrendingDown, ShoppingBag, Users, Package,
  Truck, AlertTriangle, ArrowUpRight, ArrowDownRight, Clock,
  CheckCircle, XCircle, RefreshCw, Boxes, Layers,
  BarChart2, Coins, Star, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/hooks';
import apiService from '@/api/apiService';

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const fmtWt = (g: number) =>
  g >= 1000 ? `${(g / 1000).toFixed(2)} kg` : `${g.toFixed(2)} g`;

const fmtNum = (n: number) => new Intl.NumberFormat('en-IN').format(n);

const GOLD = '#C9973A';
const GOLD_LIGHT = '#E8C56A';
const SILVER_COLOR = '#94A3B8';
const PLATINUM_COLOR = '#7C3AED';
const GREEN = '#10b981';
const RED = '#ef4444';
const AMBER = '#f59e0b';
const CYAN = '#06b6d4';
const INDIGO = '#6366f1';

// ── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiProps {
  label: string;
  value: string;
  sub?: string;
  change?: number;
  icon: React.ReactNode;
  accent: string;
  loading?: boolean;
}

const KpiCard: React.FC<KpiProps> = ({ label, value, sub, change, icon, accent, loading }) => (
  <div className="card p-4 flex flex-col gap-3 hover:-translate-y-0.5 transition-transform duration-200">
    <div className="flex items-start justify-between">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}18`, color: accent }}
      >
        {icon}
      </div>
      {change !== undefined && (
        <span
          className="flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full"
          style={{
            background: change >= 0 ? '#10b98115' : '#ef444415',
            color: change >= 0 ? GREEN : RED,
          }}
        >
          {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(change)}%
        </span>
      )}
    </div>
    <div>
      {loading ? (
        <div className="h-7 w-24 rounded animate-pulse" style={{ background: 'var(--border-color)' }} />
      ) : (
        <div className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Playfair Display, serif' }}>
          {value}
        </div>
      )}
      <div className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
      {sub && <div className="text-[11px] mt-0.5" style={{ color: accent }}>{sub}</div>}
    </div>
  </div>
);

// ── Section Header ────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ title: string; badge?: string; action?: React.ReactNode }> = ({ title, badge, action }) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <h3 className="font-semibold text-sm" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)' }}>
        {title}
      </h3>
      {badge && (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${GOLD}18`, color: GOLD }}>
          {badge}
        </span>
      )}
    </div>
    {action}
  </div>
);

// ── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg: Record<string, { bg: string; color: string }> = {
    CONFIRMED:   { bg: '#10b98115', color: GREEN  },
    PENDING:     { bg: '#f59e0b15', color: AMBER  },
    DELIVERED:   { bg: '#06b6d415', color: CYAN   },
    PROCESSING:  { bg: '#6366f115', color: INDIGO },
    CANCELLED:   { bg: '#ef444415', color: RED    },
  };
  const c = cfg[status] || { bg: '#6b728015', color: '#6b7280' };
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.color }}>
      {status}
    </span>
  );
};

// ── Recharts custom tooltip ───────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, currency }: {
  active?: boolean; payload?: { name: string; value: number }[]; label?: string; currency?: boolean;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-lg"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
      <p className="font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-bold">{currency ? fmt(p.value) : fmtNum(p.value)} <span style={{ color: 'var(--text-muted)' }}>({p.name})</span></p>
      ))}
    </div>
  );
};

// ── Sample data factory ───────────────────────────────────────────────────────
const buildSampleData = () => ({
  stats: {
    todays_sales: 348500,
    monthly_sales: 4280000,
    todays_orders: 14,
    pending_orders: 27,
    total_parties: 412,
    active_products: 1584,
    low_stock_count: 8,
    delivered_today: 6,
  },
  // Placeholder rates, replaced wholesale by the Daily Rate master's latest
  // sheet when one exists. rate_date staying null is what tells the strip it is
  // still showing sample numbers rather than the real thing.
  metalRates: {
    rate_date: null as string | null,
    gold_22k: 6820,
    gold_24k: 7450,
    silver_999: 89.5,
    platinum_950: 3350,
    gold_22k_change: 0.42,
    gold_24k_change: 0.38,
    silver_change: -0.15,
    platinum_change: 0.91,
  },
  monthlySales: [
    { month: 'Jan', revenue: 2850000, orders: 98 },
    { month: 'Feb', revenue: 3120000, orders: 112 },
    { month: 'Mar', revenue: 2760000, orders: 94 },
    { month: 'Apr', revenue: 3890000, orders: 138 },
    { month: 'May', revenue: 4150000, orders: 147 },
    { month: 'Jun', revenue: 4280000, orders: 152 },
  ],
  categoryMix: [
    { name: 'Necklaces',  value: 34, color: GOLD },
    { name: 'Rings',      value: 24, color: PLATINUM_COLOR },
    { name: 'Bangles',    value: 18, color: SILVER_COLOR },
    { name: 'Earrings',   value: 14, color: CYAN },
    { name: 'Pendants',   value: 10, color: INDIGO },
  ],
  metalSales: [
    { month: 'Jan', gold: 1950, silver: 420, platinum: 480 },
    { month: 'Feb', gold: 2100, silver: 510, platinum: 510 },
    { month: 'Mar', gold: 1820, silver: 480, platinum: 460 },
    { month: 'Apr', gold: 2650, silver: 590, platinum: 650 },
    { month: 'May', gold: 2900, silver: 630, platinum: 620 },
    { month: 'Jun', gold: 3050, silver: 680, platinum: 550 },
  ],
  recentOrders: [
    { order_no: 'SO-2026-0152', party_name: 'Ramesh Jewellers',     net_amount: 125400, status: 'CONFIRMED',  order_date: '2026-06-07', items: 4 },
    { order_no: 'SO-2026-0151', party_name: 'Priya Gold House',     net_amount: 68300,  status: 'PROCESSING', order_date: '2026-06-07', items: 2 },
    { order_no: 'SO-2026-0150', party_name: 'Mehta Ornaments',      net_amount: 214800, status: 'DELIVERED',  order_date: '2026-06-06', items: 7 },
    { order_no: 'SO-2026-0149', party_name: 'Soni Jewels',          net_amount: 45600,  status: 'PENDING',    order_date: '2026-06-06', items: 1 },
    { order_no: 'SO-2026-0148', party_name: 'Agarwal Gold Works',   net_amount: 389200, status: 'CONFIRMED',  order_date: '2026-06-05', items: 11 },
  ],
  lowStock: [
    { product_code: 'GN-22K-0042', product_name: 'Lakshmi Necklace 22K',  category: 'Necklace', stock: 2, reorder: 10 },
    { product_code: 'GR-18K-0018', product_name: 'Solitaire Ring 18K',     category: 'Ring',     stock: 1, reorder: 5  },
    { product_code: 'SB-925-0031', product_name: 'Silver Bangle 925',      category: 'Bangle',   stock: 3, reorder: 15 },
    { product_code: 'PE-22K-0007', product_name: 'Om Pendant 22K',         category: 'Pendant',  stock: 0, reorder: 8  },
  ],
  topProducts: [
    { name: 'Mangalsutra 22K Chain', category: 'Necklace', sales: 48, revenue: 1840000 },
    { name: 'Solitaire Ring 18K',    category: 'Ring',     sales: 36, revenue: 972000  },
    { name: 'Jhumka Earrings 22K',   category: 'Earring',  sales: 62, revenue: 744000  },
    { name: 'Gold Bangle Set 22K',   category: 'Bangle',   sales: 29, revenue: 1189000 },
  ],
});

// ── Main Component ────────────────────────────────────────────────────────────
const HomePage: React.FC = () => {
  const { user } = useAppSelector((s) => s.auth);
  const { erpName } = useAppSelector((s) => s.appConfig);
  const navigate = useNavigate();

  const [data, setData] = useState(buildSampleData());
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiService.get('/common/dashboard-stats');
      if (res.data.success) {
        // Merge API response over sample data so any missing fields fall back to defaults
        setData(prev => ({ ...prev, ...res.data.data }));
      }
    } catch {
      // API not reachable — keep sample data already in state
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => { fetchData(); }, []);

  const { stats, metalRates, monthlySales, categoryMix, metalSales, recentOrders, lowStock, topProducts } = data;

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto animate-fade-in">

      {/* ── Hero Banner ─────────────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderLeft: '4px solid var(--accent-gold, #C9973A)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          minHeight: 100,
        }}
      >
        {/* Subtle gold wash — top-left only */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, rgba(201,151,58,0.07) 0%, transparent 50%)' }} />

        {/* Decorative watermark gems */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-3 pointer-events-none">
          <Gem style={{ color: 'var(--accent-gold, #C9973A)', width: 72, height: 72, opacity: 0.05 }} />
          <Gem style={{ color: 'var(--accent-gold, #C9973A)', width: 96, height: 96, opacity: 0.035, marginTop: -16 }} />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5">
          {/* Left — greeting */}
          <div className="flex items-center gap-4">
            <div
              className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(201,151,58,0.18), rgba(201,151,58,0.06))',
                border: '1px solid rgba(201,151,58,0.3)',
              }}
            >
              <Gem style={{ color: 'var(--accent-gold, #C9973A)', width: 24, height: 24 }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--accent-gold, #C9973A)' }}>
                  {erpName || 'IgniteX.ai ERP'} · Executive Dashboard
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight"
                style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)' }}>
                {greeting}, {user?.full_name?.split(' ')[0] || 'User'}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{dateStr}</p>
            </div>
          </div>

          {/* Right — metal tickers + refresh */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex flex-col gap-1.5">
              {/* Gold ticker */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(201,151,58,0.08)', border: '1px solid rgba(201,151,58,0.2)' }}>
                <Coins className="w-3.5 h-3.5" style={{ color: GOLD }} />
                <span className="text-xs font-bold" style={{ color: GOLD }}>Gold 22K</span>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>₹{fmtNum(metalRates.gold_22k)}/g</span>
                <span className="text-[10px] font-semibold" style={{ color: metalRates.gold_22k_change >= 0 ? GREEN : RED }}>
                  {metalRates.gold_22k_change >= 0 ? '▲' : '▼'} {Math.abs(metalRates.gold_22k_change)}%
                </span>
              </div>
              {/* Silver ticker */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid var(--border-color)' }}>
                <Coins className="w-3.5 h-3.5" style={{ color: SILVER_COLOR }} />
                <span className="text-xs font-bold" style={{ color: SILVER_COLOR }}>Silver 999</span>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>₹{metalRates.silver_999}/g</span>
                <span className="text-[10px] font-semibold" style={{ color: metalRates.silver_change >= 0 ? GREEN : RED }}>
                  {metalRates.silver_change >= 0 ? '▲' : '▼'} {Math.abs(metalRates.silver_change)}%
                </span>
              </div>
            </div>

            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: 'rgba(201,151,58,0.1)', color: 'var(--accent-gold, #C9973A)', border: '1px solid rgba(201,151,58,0.25)' }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Bottom refresh stamp */}
        <div className="absolute bottom-2 right-5">
          <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <Clock className="w-3 h-3" style={{ color: 'var(--accent-gold, #C9973A)' }} />
            Updated {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* ── KPI Cards Row 1 — Operational ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        <KpiCard label="Today's Sales"     value={fmt(stats.todays_sales)}   change={8.4}   icon={<TrendingUp className="w-5 h-5" />}  accent={GOLD}           loading={loading} />
        <KpiCard label="Monthly Sales"     value={fmt(stats.monthly_sales)}  change={12.1}  icon={<BarChart2 className="w-5 h-5" />}   accent={GREEN}          loading={loading} />
        <KpiCard label="Orders Today"      value={String(stats.todays_orders)} change={3.2}  icon={<ShoppingBag className="w-5 h-5" />} accent={CYAN}           loading={loading} />
        <KpiCard label="Pending Orders"    value={String(stats.pending_orders)} sub="Awaiting confirmation" icon={<Clock className="w-5 h-5" />} accent={AMBER} loading={loading} />
        <KpiCard label="Delivered Today"   value={String(stats.delivered_today)} change={2.1} icon={<CheckCircle className="w-5 h-5" />} accent={GREEN}        loading={loading} />
        <KpiCard label="Active Customers"  value={fmtNum(stats.total_parties)} change={5.6}  icon={<Users className="w-5 h-5" />}       accent={INDIGO}         loading={loading} />
        <KpiCard label="Total Products"    value={fmtNum(stats.active_products)} change={1.4} icon={<Boxes className="w-5 h-5" />}     accent={PLATINUM_COLOR} loading={loading} />
        <KpiCard label="Low Stock Alerts"  value={String(stats.low_stock_count)} sub="Items need reorder" icon={<AlertTriangle className="w-5 h-5" />} accent={RED} loading={loading} />
      </div>

      {/* ── Metal Rate Strip ──────────────────────────────────────── */}
      {/* Fed by Master Management → Daily Rate. Until a rate sheet exists the
          strip shows placeholder numbers and says so, rather than quietly
          passing sample rates off as today's. */}
      <div>
        <SectionHeader
          title="Metal Rates"
          badge={metalRates.rate_date
            ? new Date(`${metalRates.rate_date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Sample data'}
          action={
            <button
              onClick={() => navigate('/master-mgmt/daily-rate')}
              className="text-xs font-semibold hover:underline"
              style={{ color: GOLD }}
            >
              {metalRates.rate_date ? 'Manage rates →' : 'Set up Daily Rate →'}
            </button>
          }
        />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Gold 24K (999)', rate: metalRates.gold_24k, change: metalRates.gold_24k_change, unit: '/g', color: GOLD },
          { label: 'Gold 22K (916)', rate: metalRates.gold_22k, change: metalRates.gold_22k_change, unit: '/g', color: GOLD_LIGHT },
          { label: 'Silver 999',     rate: metalRates.silver_999,   change: metalRates.silver_change,   unit: '/g', color: SILVER_COLOR },
          { label: 'Platinum 950',   rate: metalRates.platinum_950, change: metalRates.platinum_change, unit: '/g', color: PLATINUM_COLOR },
        ].map((m) => (
          <div key={m.label} className="card px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{m.label}</div>
              <div className="text-lg font-bold mt-0.5" style={{ color: 'var(--text-primary)', fontFamily: 'Playfair Display, serif' }}>
                ₹{fmtNum(m.rate)}<span className="text-xs font-medium ml-0.5" style={{ color: 'var(--text-muted)' }}>{m.unit}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div
                className="flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: m.change >= 0 ? '#10b98115' : '#ef444415', color: m.change >= 0 ? GREEN : RED }}
              >
                {m.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(m.change)}%
              </div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${m.color}12` }}>
                <Gem className="w-4 h-4" style={{ color: m.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>

      {/* ── Charts Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Revenue Trend */}
        <div className="card p-5 xl:col-span-2">
          <SectionHeader title="Revenue Trend" badge="Last 6 Months" />
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={monthlySales} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GOLD} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip content={<ChartTooltip currency />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke={GOLD} strokeWidth={2.5}
                fill="url(#revGrad)" dot={{ r: 3, fill: GOLD, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: GOLD }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Mix Donut */}
        <div className="card p-5">
          <SectionHeader title="Sales by Category" badge="This Month" />
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={175}>
              <PieChart>
                <Pie data={categoryMix} cx="50%" cy="50%" innerRadius={52} outerRadius={78}
                  dataKey="value" paddingAngle={3}>
                  {categoryMix.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="text-xs px-2.5 py-1.5 rounded-lg shadow-lg"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                        <b>{d.name}</b> — {d.value}%
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full grid grid-cols-1 gap-1 mt-1">
              {categoryMix.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
                  </div>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{c.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Metal Sales Chart ─────────────────────────────────────── */}
      <div className="card p-5">
        <SectionHeader title="Metal-wise Sales Volume (grams)" badge="Last 6 Months" />
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={metalSales} barCategoryGap="30%" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `${v}g`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend iconSize={10} iconType="circle"
              wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 8 }} />
            <Bar dataKey="gold"     name="Gold"     fill={GOLD}            radius={[3, 3, 0, 0]} />
            <Bar dataKey="silver"   name="Silver"   fill={SILVER_COLOR}    radius={[3, 3, 0, 0]} />
            <Bar dataKey="platinum" name="Platinum" fill={PLATINUM_COLOR}  radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Tables Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Recent Orders */}
        <div className="card overflow-hidden xl:col-span-3">
          <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" style={{ color: GOLD }} />
              <span className="font-semibold text-sm" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)' }}>
                Recent Sales Orders
              </span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${GOLD}18`, color: GOLD }}>Latest 5</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                  {['Order No', 'Customer', 'Items', 'Amount', 'Status', 'Date'].map((h) => (
                    <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-2.5"
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o, i) => (
                  <tr key={o.order_no} style={{
                    borderBottom: i < recentOrders.length - 1 ? '1px solid var(--border-color)' : 'none',
                  }}
                    className="hover:opacity-80 transition-opacity">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-bold" style={{ color: GOLD }}>{o.order_no}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{o.party_name}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>{o.items} items</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(o.net_amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {new Date(o.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products + Low Stock stacked */}
        <div className="xl:col-span-2 flex flex-col gap-4">

          {/* Top Selling */}
          <div className="card overflow-hidden flex-1">
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <Star className="w-4 h-4" style={{ color: GOLD }} />
              <span className="font-semibold text-sm" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)' }}>
                Top Selling
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: `${GOLD}18`, color: GOLD }}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.category} · {p.sales} sold</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      {(p.revenue / 100000).toFixed(1)}L
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <AlertTriangle className="w-4 h-4" style={{ color: RED }} />
              <span className="font-semibold text-sm" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)' }}>
                Low Stock
              </span>
              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: '#ef444415', color: RED }}>
                {lowStock.length} items
              </span>
            </div>
            <div>
              {lowStock.map((item, i) => (
                <div key={item.product_code} className="flex items-center gap-3 px-4 py-2.5"
                  style={{ borderBottom: i < lowStock.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: item.stock === 0 ? '#ef444415' : '#f59e0b15' }}>
                    {item.stock === 0
                      ? <XCircle className="w-4 h-4" style={{ color: RED }} />
                      : <AlertTriangle className="w-4 h-4" style={{ color: AMBER }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.product_name}</p>
                    <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{item.product_code}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: item.stock === 0 ? RED : AMBER }}>{item.stock}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>/{item.reorder} min</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4" style={{ color: GOLD }} />
          <span className="font-semibold text-sm" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)' }}>
            Quick Actions
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'New Sales Order',    icon: <ShoppingBag className="w-5 h-5" />,  color: GREEN },
            { label: 'Purchase Order',     icon: <Truck className="w-5 h-5" />,        color: AMBER },
            { label: 'Stock Entry',        icon: <Package className="w-5 h-5" />,      color: CYAN },
            { label: 'Add Customer',       icon: <Users className="w-5 h-5" />,        color: INDIGO },
            { label: 'Metal Rates',        icon: <Coins className="w-5 h-5" />,        color: GOLD },
            { label: 'Product Master',     icon: <Gem className="w-5 h-5" />,          color: PLATINUM_COLOR },
            { label: 'Stock Report',       icon: <Layers className="w-5 h-5" />,       color: RED },
            { label: 'Sales Report',       icon: <BarChart2 className="w-5 h-5" />,    color: SILVER_COLOR },
          ].map((a) => (
            <button
              key={a.label}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
              style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${a.color}12`, color: a.color }}>
                {a.icon}
              </div>
              <span className="text-[11px] font-medium text-center leading-tight" style={{ color: 'var(--text-secondary)' }}>
                {a.label}
              </span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default HomePage;
