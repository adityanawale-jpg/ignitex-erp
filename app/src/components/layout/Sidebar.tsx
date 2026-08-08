import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Gem, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { toggleMenuItem, setActiveMenu, closeMobileMenu } from '@/redux/slices/menuSlice';
import { openTab } from '@/redux/slices/tabsSlice';
import type { MenuItem } from '@/redux/slices/authSlice';
import { getSidebarIcon } from '@/utils/menuIcons';
import { getFileUrl } from '@/api/apiService';
import { loadingState } from '@/api/loadingState';

const getIcon = getSidebarIcon;

interface SidebarMenuItemProps {
  item: MenuItem;
  isCollapsed: boolean;
  depth?: number;
  onHover?: (item: MenuItem, e: React.MouseEvent<HTMLDivElement>) => void;
  onHoverEnd?: () => void;
}

const SidebarMenuItem: React.FC<SidebarMenuItemProps> = ({
  item, isCollapsed, depth = 0, onHover, onHoverEnd,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { expandedItems, activeMenu } = useAppSelector((state) => state.menu);
  const isExpanded = expandedItems.includes(item.menu_code);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = activeMenu === item.menu_code;

  const handleClick = () => {
    if (hasChildren) {
      if (!isCollapsed) dispatch(toggleMenuItem(item.menu_code));
    } else if (item.menu_url) {
      if (loadingState.isLoading()) return;
      dispatch(setActiveMenu(item.menu_code));
      dispatch(closeMobileMenu());
      dispatch(openTab({ id: item.menu_code, title: item.menu_name, path: item.menu_url, icon: item.menu_icon || undefined }));
      navigate(item.menu_url);
    }
  };

  return (
    <div>
      <div
        className={`sidebar-item ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: isCollapsed ? undefined : `${12 + depth * 16}px` }}
        onClick={handleClick}
        onMouseEnter={isCollapsed && depth === 0 ? (e) => onHover?.(item, e) : undefined}
        onMouseLeave={isCollapsed && depth === 0 ? onHoverEnd : undefined}
        title={isCollapsed && !hasChildren ? item.menu_name : undefined}
      >
        <span className="flex-shrink-0">{getIcon(item.menu_icon)}</span>

        {!isCollapsed && (
          <>
            <span className="flex-1 truncate">{item.menu_name}</span>
            {hasChildren && (
              <span className="flex-shrink-0 transition-transform duration-200" style={{
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                color: 'var(--text-muted)',
              }}>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            )}
          </>
        )}
      </div>

      {/* Submenu — only in expanded sidebar */}
      {hasChildren && !isCollapsed && (
        <div
          className="overflow-hidden transition-all duration-300"
          style={{
            maxHeight: isExpanded ? `${item.children.length * 50}px` : '0',
            opacity: isExpanded ? 1 : 0,
          }}
        >
          {item.children.map((child) => (
            <SidebarMenuItem key={child.menu_code} item={child} isCollapsed={isCollapsed} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// Flyout panel shown on hover in collapsed mode
interface FlyoutProps {
  item: MenuItem;
  y: number;
  onEnter: () => void;
  onLeave: () => void;
}

const SidebarFlyout: React.FC<FlyoutProps> = ({ item, y, onEnter, onLeave }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { activeMenu } = useAppSelector((state) => state.menu);
  const hasChildren = item.children && item.children.length > 0;
  const flyoutRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(y);

  useLayoutEffect(() => {
    if (flyoutRef.current) {
      const height = flyoutRef.current.offsetHeight;
      const maxTop = window.innerHeight - height - 8;
      setTop(Math.max(8, Math.min(y, maxTop)));
    }
  }, [y, item]);

  const maxFlyoutHeight = window.innerHeight - 16;

  const navigate_to = (child: MenuItem) => {
    if (!child.menu_url || loadingState.isLoading()) return;
    dispatch(setActiveMenu(child.menu_code));
    dispatch(closeMobileMenu());
    dispatch(openTab({ id: child.menu_code, title: child.menu_name, path: child.menu_url, icon: child.menu_icon || undefined }));
    navigate(child.menu_url);
  };

  const navigate_parent = () => {
    if (!item.menu_url || hasChildren || loadingState.isLoading()) return;
    dispatch(setActiveMenu(item.menu_code));
    dispatch(closeMobileMenu());
    dispatch(openTab({ id: item.menu_code, title: item.menu_name, path: item.menu_url, icon: item.menu_icon || undefined }));
    navigate(item.menu_url);
  };

  return (
    <div
      ref={flyoutRef}
      className="fixed z-[100] animate-fade-in"
      style={{ left: '65px', top: `${top}px`, minWidth: '200px', maxHeight: `${maxFlyoutHeight}px`, display: 'flex', flexDirection: 'column' }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div
        className="rounded-lg flex flex-col"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          maxHeight: `${maxFlyoutHeight}px`,
          overflow: 'hidden',
        }}
      >
        {/* Parent label — sticky header */}
        <div
          className="px-3 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer flex-shrink-0"
          style={{
            color: hasChildren ? 'var(--text-muted)' : 'var(--sidebar-active-text)',
            background: hasChildren ? 'var(--bg-secondary)' : 'var(--sidebar-active-bg)',
            borderBottom: hasChildren ? '1px solid var(--border-color)' : 'none',
          }}
          onClick={navigate_parent}
        >
          {item.menu_name}
        </div>

        {/* Children — scrollable */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
        {hasChildren && item.children.map((child) => (
          <div
            key={child.menu_code}
            className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors"
            style={{
              color: activeMenu === child.menu_code ? 'var(--sidebar-active-text)' : 'var(--text-secondary)',
              background: activeMenu === child.menu_code ? 'var(--sidebar-active-bg)' : 'transparent',
              fontWeight: activeMenu === child.menu_code ? 600 : 400,
            }}
            onMouseEnter={(e) => {
              if (activeMenu !== child.menu_code)
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                activeMenu === child.menu_code ? 'var(--sidebar-active-bg)' : 'transparent';
            }}
            onClick={() => navigate_to(child)}
          >
            <span style={{ color: activeMenu === child.menu_code ? 'var(--sidebar-active-text)' : 'var(--text-muted)' }}>
              {getIcon(child.menu_icon)}
            </span>
            {child.menu_name}
          </div>
        ))}
        </div>
      </div>
    </div>
  );
};

const Sidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isCollapsed, isMobileOpen, activeMenu, expandedItems } = useAppSelector((state) => state.menu);
  const { menus } = useAppSelector((state) => state.auth);
  const { erpLogoUrl, erpName, erpSubtitle } = useAppSelector((state) => state.appConfig);

  const [flyout, setFlyout] = useState<{ item: MenuItem; y: number } | null>(null);
  const [logoError, setLogoError] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCollapsed = useRef(isCollapsed);

  // When expanding, auto-expand the parent of the active menu item
  useEffect(() => {
    if (prevCollapsed.current && !isCollapsed && activeMenu) {
      const findParent = (items: MenuItem[], code: string): string | null => {
        for (const item of items) {
          if (item.children?.some((c) => c.menu_code === code)) return item.menu_code;
          if (item.children?.length) {
            const found = findParent(item.children, code);
            if (found) return found;
          }
        }
        return null;
      };
      const parentCode = findParent(menus, activeMenu);
      if (parentCode && !expandedItems.includes(parentCode)) {
        dispatch(toggleMenuItem(parentCode));
      }
    }
    prevCollapsed.current = isCollapsed;
  }, [isCollapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  const openFlyout = (item: MenuItem, e: React.MouseEvent<HTMLDivElement>) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFlyout({ item, y: rect.top });
  };

  const scheduleFlyoutClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setFlyout(null), 300);
  };

  const cancelFlyoutClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  // On mobile (when the drawer is open) always behave as if expanded
  const effectiveCollapsed = isMobileOpen ? false : isCollapsed;

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => dispatch(closeMobileMenu())}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen z-50 flex flex-col
          transition-all duration-300 ease-in-out
          ${effectiveCollapsed ? 'w-16' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-color)',
          boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
        }}
        onMouseLeave={() => { if (isCollapsed) scheduleFlyoutClose(); }}
      >
        {/* Logo area */}
        <div className="sidebar-logo-area flex items-center h-10 px-3 flex-shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: '#1E293B', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
          >
            {(erpLogoUrl || !logoError) ? (
              <img
                src={getFileUrl(erpLogoUrl) || '/royal-rise-logo.png'}
                alt={erpName}
                onError={() => setLogoError(true)}
                className="w-full h-full object-contain"
              />
            ) : (
              <Gem className="w-4 h-4 text-white" />
            )}
          </div>

          {!effectiveCollapsed && (
            <div className="ml-3 overflow-hidden">
              <div className="font-bold text-base whitespace-nowrap" style={{ fontFamily: 'Playfair Display, serif', color: '#1E293B' }}>
                {erpName}
              </div>
              <div className="text-xs whitespace-nowrap" style={{ color: '#94A3B8' }}>{erpSubtitle}</div>
            </div>
          )}

          {/* Mobile close button — always visible when drawer is open */}
          <button
            className="ml-auto lg:hidden flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
            style={{ color: 'var(--sidebar-text)', background: 'rgba(0,0,0,0.06)' }}
            onClick={() => dispatch(closeMobileMenu())}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu items */}
        <nav
          className="flex-1 overflow-y-auto py-3 overflow-x-hidden"
          onScroll={() => { if (isCollapsed) setFlyout(null); }}
        >
          {menus.map((menu) => (
            <SidebarMenuItem
              key={menu.menu_code}
              item={menu}
              isCollapsed={effectiveCollapsed}
              onHover={openFlyout}
              onHoverEnd={scheduleFlyoutClose}
            />
          ))}

          {menus.length === 0 && (
            <div className="px-4 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              Loading menu...
            </div>
          )}
        </nav>

        {/* Footer */}
        {!effectiveCollapsed && (
          <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
            <div className="text-xs" style={{ color: '#94A3B8' }}>
              Royal Rise © 2026
            </div>
          </div>
        )}
      </aside>

      {/* Hover flyout for collapsed sidebar (desktop only) */}
      {flyout && effectiveCollapsed && (
        <>
          {/* Transparent bridge fills the gap between sidebar edge and flyout panel */}
          <div
            className="fixed z-[99]"
            style={{ left: '60px', top: `${flyout.y - 4}px`, width: '10px', height: '48px' }}
            onMouseEnter={cancelFlyoutClose}
            onMouseLeave={scheduleFlyoutClose}
          />
          <SidebarFlyout
            item={flyout.item}
            y={flyout.y}
            onEnter={cancelFlyoutClose}
            onLeave={scheduleFlyoutClose}
          />
        </>
      )}
    </>
  );
};

export default Sidebar;
