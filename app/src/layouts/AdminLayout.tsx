import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import TabBar from '@/components/layout/TabBar';
import WelcomeHome from '@/pages/dashboard/WelcomeHome';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { fetchProfileAsync } from '@/redux/slices/authSlice';
import { setNotifications } from '@/redux/slices/notificationSlice';
import type { Notification } from '@/redux/slices/notificationSlice';
import { loadingState } from '@/api/loadingState';
import ROUTE_REGISTRY from '@/routes/routeRegistry';

// Spinner used as Suspense fallback while a lazy page chunk loads the first time
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-2 rounded-full animate-spin"
      style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent-gold, #C9973A)' }} />
  </div>
);

// Show overlay after 100ms (avoids flicker for instant requests).
// Hide it after 180ms extra so the CSS opacity transition finishes cleanly
// before pointer-events are removed — prevents a frame where the overlay
// is visually fading but still blocks clicks.
const useIsLoading = () => {
  const [loading, setLoading] = useState(false);
  const showRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return loadingState.subscribe(() => {
      const active = loadingState.isLoading();
      if (active) {
        // Cancel any pending hide
        if (hideRef.current) { clearTimeout(hideRef.current); hideRef.current = null; }
        if (!showRef.current) {
          showRef.current = setTimeout(() => {
            showRef.current = null;
            if (loadingState.isLoading()) setLoading(true);
          }, 100);
        }
      } else {
        // Cancel any pending show
        if (showRef.current) { clearTimeout(showRef.current); showRef.current = null; }
        // Delay hide by the transition duration so CSS fade-out completes first
        if (!hideRef.current) {
          hideRef.current = setTimeout(() => {
            hideRef.current = null;
            setLoading(false);
          }, 200);
        }
      }
    });
  }, []);

  return loading;
};

const AdminLayout: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const isLoading = useIsLoading();
  const { isCollapsed } = useAppSelector((state) => state.menu);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { mode } = useAppSelector((state) => state.theme);
  const { footerCompany } = useAppSelector((state) => state.appConfig);
  const { tabs } = useAppSelector((state) => state.tabs);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, [mode]);

  // If landing on a route with no open tab (stale history / browser refresh),
  // redirect to home so WelcomeHome always shows on fresh load.
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') return;
    const isSpecial = path.startsWith('/settings') || path.startsWith('/profile');
    const hasTab = tabs.some((t) => t.path === path);
    if (!isSpecial && !hasTab) navigate('/', { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAuthenticated) return;
    dispatch(fetchProfileAsync()).then((result) => {
      if (fetchProfileAsync.fulfilled.match(result)) {
        const notifs = result.payload?.notifications as Notification[];
        if (notifs) dispatch(setNotifications(notifs));
      }
    });
  }, [isAuthenticated, dispatch]);

  const sidebarWidth = isCollapsed ? 64 : 256;

  // Determine if the active path is handled by a registered tab.
  // Paths NOT in the registry (e.g. unknown routes) fall through to <Outlet />.
  const activePathHasTab = tabs.some((t) => t.path === location.pathname);
  const isHome = location.pathname === '/';

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg-primary)', overflowX: 'hidden' }}
    >
      <Sidebar />

      <div
        className="admin-content flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <Navbar />

        <div className="flex flex-col flex-1 mt-10">
          <TabBar />

          <main className="flex-1 px-6 pt-2 pb-6">
            {/* ── Home (WelcomeHome) ───────────────────────────── */}
            <div style={{ display: isHome ? undefined : 'none' }}>
              <WelcomeHome />
            </div>

            {/* ── Keep-alive tab content ───────────────────────── */}
            {/* Each tab stays mounted in the DOM so switching tabs never
                triggers a remount → no API re-fetches on tab switch.      */}
            {tabs.map((tab) => {
              const Component = ROUTE_REGISTRY[tab.path];
              if (!Component) return null;
              const isActive = location.pathname === tab.path;
              return (
                <div key={tab.id} style={{ display: isActive ? undefined : 'none' }}>
                  <Suspense fallback={<PageLoader />}>
                    <Component />
                  </Suspense>
                </div>
              );
            })}

            {/* ── Fallback for paths not in any open tab ────────── */}
            {/* Handles routes that open without a tab (profile, unknown paths) */}
            {!isHome && !activePathHasTab && <Outlet />}
          </main>

          <footer
            className="px-6 py-3 flex items-center justify-between text-xs flex-shrink-0"
            style={{
              borderTop: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              background: 'var(--bg-secondary)',
            }}
          >
            <span>© {new Date().getFullYear()} {footerCompany} — Enterprise Resource Planning for Jewellery Business</span>
            <span>v1.0.0 · Build 2026</span>
          </footer>
        </div>
      </div>

      {/* Full-screen freeze overlay — always in DOM so it fades in/out without a paint flash.
          backdropFilter intentionally omitted — GPU layer creation on mount causes the flash. */}
      <style>{`
        @keyframes erp-spin { to { transform: rotate(360deg); } }
        @keyframes erp-pulse-text { 0%,100%{opacity:.6} 50%{opacity:1} }
      `}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          cursor: 'wait',
          // Fade in/out via opacity — no mount/unmount, no GPU layer flash
          opacity: isLoading ? 1 : 0,
          pointerEvents: isLoading ? 'all' : 'none',
          transition: 'opacity 180ms ease',
        }}
      >
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%',
          border: '4px solid rgba(201,151,58,0.25)',
          borderTopColor: 'var(--accent-gold, #C9973A)',
          animation: 'erp-spin 0.75s linear infinite',
        }} />
        <span style={{
          color: '#fff', fontSize: '13px', fontFamily: 'Outfit, sans-serif',
          letterSpacing: '0.04em',
          animation: 'erp-pulse-text 1.4s ease-in-out infinite',
        }}>
          Loading, please wait…
        </span>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            fontFamily: 'Outfit, sans-serif',
            fontSize: '14px',
          },
        }}
      />
    </div>
  );
};

export default AdminLayout;
