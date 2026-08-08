import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Gem, Calendar } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { openTab } from '@/redux/slices/tabsSlice';
import { setActiveMenu } from '@/redux/slices/menuSlice';
import type { MenuItem } from '@/redux/slices/authSlice';
import { getMenuIcon } from '@/utils/menuIcons';

const getIcon = getMenuIcon;

const ACCENT_COLORS = [
  '#C9973A', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#6366f1', '#0ea5e9',
  '#ec4899', '#14b8a6',
];

// ── Module tab in the navigator strip ────────────────────────
interface TabProps {
  item: MenuItem;
  isActive: boolean;
  color: string;
  onClick: () => void;
}

const ModuleTab: React.FC<TabProps> = ({ item, isActive, color, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-1.5 px-2 py-2.5 relative transition-all duration-150"
    style={{
      flex: '1 1 80px',
      minWidth: 80,
      maxWidth: 140,
      color: isActive ? color : 'var(--text-muted)',
      borderBottom: `2px solid ${isActive ? color : 'transparent'}`,
      background: isActive ? `${color}0d` : 'transparent',
    }}
  >
    <span style={{ color: isActive ? color : 'var(--text-muted)', display: 'flex' }}>
      {getIcon(item.menu_icon, 18)}
    </span>
    <span className="text-[11px] font-semibold text-center leading-tight w-full">{item.menu_name}</span>
  </button>
);

// ── Child sub-module card ─────────────────────────────────────
interface ChildCardProps {
  item: MenuItem;
  color: string;
  onClick: () => void;
}

const ChildCard: React.FC<ChildCardProps> = ({ item, color, onClick }) => (
  <button
    onClick={onClick}
    className="group flex flex-col gap-3 p-4 rounded-xl text-left transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = color; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'; }}
  >
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center"
      style={{ background: `${color}15`, color }}
    >
      {getIcon(item.menu_icon, 20)}
    </div>
    <p
      className="text-sm font-semibold leading-tight"
      style={{ color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}
    >
      {item.menu_name}
    </p>
    <div
      className="h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 mt-auto"
      style={{ background: color }}
    />
  </button>
);

const SESSION_KEY = 'erp_welcome_module';

// ── Main Component ────────────────────────────────────────────
const WelcomeHome: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, menus } = useAppSelector((s) => s.auth);
  const { erpName } = useAppSelector((s) => s.appConfig);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const modules = menus.filter(
    (m) => m.menu_code !== 'DASHBOARD' && (m.children?.length > 0 || m.menu_url)
  );

  const [selectedModule, setSelectedModule] = useState<MenuItem | null>(null);

  // Persist selected module to sessionStorage so it survives remounts
  const selectModule = (item: MenuItem | null) => {
    setSelectedModule(item);
    if (item) sessionStorage.setItem(SESSION_KEY, item.menu_code);
  };

  // On menus load: restore last selected module from sessionStorage, else pick first
  useEffect(() => {
    if (modules.length === 0) return;
    const savedCode = sessionStorage.getItem(SESSION_KEY);
    const saved = savedCode ? modules.find((m) => m.menu_code === savedCode) : null;
    setSelectedModule(saved ?? modules[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menus]);

  const handleTabClick = (item: MenuItem) => {
    // Leaf module — navigate directly
    if (!item.children?.length) {
      openChild(item);
      return;
    }
    // Toggle: clicking active module collapses it
    selectModule(selectedModule?.menu_code === item.menu_code ? null : item);
  };

  // Always opens a tab; falls back to a generated path if menu_url is null
  const openChild = (child: MenuItem) => {
    const path = child.menu_url ?? `/modules/${child.menu_code.toLowerCase().replace(/_/g, '-')}`;
    dispatch(setActiveMenu(child.menu_code));
    dispatch(openTab({
      id: child.menu_code,
      title: child.menu_name,
      path,
      icon: child.menu_icon ?? undefined,
    }));
    navigate(path);
  };

  const activeColor =
    selectedModule
      ? ACCENT_COLORS[modules.findIndex((m) => m.menu_code === selectedModule.menu_code) % ACCENT_COLORS.length]
      : ACCENT_COLORS[0];

  return (
    <div className="max-w-screen-xl mx-auto animate-fade-in flex flex-col gap-5">

      {/* ── Welcome banner ──────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden flex items-center gap-5"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderLeft: '4px solid var(--accent-gold, #C9973A)',
          padding: '22px 28px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        {/* Subtle gold wash — top-left only so it doesn't dominate */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(201,151,58,0.07) 0%, transparent 55%)',
          }}
        />

        {/* Icon box */}
        <div
          className="relative z-10 flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(201,151,58,0.18), rgba(201,151,58,0.06))',
            border: '1px solid rgba(201,151,58,0.3)',
          }}
        >
          <Gem style={{ color: 'var(--accent-gold, #C9973A)', width: 24, height: 24 }} />
        </div>

        {/* Text */}
        <div className="relative z-10 flex-1 min-w-0">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
            style={{ color: 'var(--accent-gold, #C9973A)' }}
          >
            {erpName || 'IgniteX.ai ERP'}
          </p>
          <h1
            className="text-xl font-bold leading-tight"
            style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text-primary)' }}
          >
            {greeting}, {user?.full_name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Select a module to explore
          </p>
        </div>

        {/* Right — date badge */}
        <div
          className="relative z-10 flex-shrink-0 hidden sm:flex flex-col items-end gap-1"
          style={{ color: 'var(--text-muted)' }}
        >
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--accent-gold, #C9973A)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Decorative gem watermark */}
        <Gem
          className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--accent-gold, #C9973A)', width: 88, height: 88, opacity: 0.05 }}
        />
      </div>

      {/* ── Module navigator strip ──────────────────────────────── */}
      {modules.length === 0 ? (
        /* Skeleton */
        <div className="flex gap-1 overflow-hidden rounded-xl"
             style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-24 h-16 rounded animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          {/* Tab row */}
          <div className="flex flex-wrap" style={{ borderBottom: '1px solid var(--border-color)' }}>
            {modules.map((m, i) => (
              <ModuleTab
                key={m.menu_code}
                item={m}
                isActive={selectedModule?.menu_code === m.menu_code}
                color={ACCENT_COLORS[i % ACCENT_COLORS.length]}
                onClick={() => handleTabClick(m)}
              />
            ))}
          </div>

          {/* Sub-module content */}
          {selectedModule ? (
            <div className="p-5 animate-fade-in">
              {/* Section header */}
              <div className="flex items-center gap-2 mb-4">
                <span style={{ color: activeColor, display: 'flex' }}>
                  {getIcon(selectedModule.menu_icon, 16)}
                </span>
                <span
                  className="text-sm font-bold"
                  style={{ color: 'var(--text-primary)', fontFamily: 'Playfair Display, serif' }}
                >
                  {selectedModule.menu_name}
                </span>
                <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {selectedModule.children?.length ?? 0} sub-modules
                </span>
              </div>

              {/* Child cards */}
              {selectedModule.children?.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {selectedModule.children.map((child) => (
                    <ChildCard
                      key={child.menu_code}
                      item={child}
                      color={activeColor}
                      onClick={() => openChild(child)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                  No sub-modules configured.
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Select a module above
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WelcomeHome;
