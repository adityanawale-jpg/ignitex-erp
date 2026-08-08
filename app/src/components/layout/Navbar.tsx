import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, Search, Bell, Sun, Moon, Settings, LogOut,
  User, ChevronDown, Loader2
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { toggleSidebar, toggleMobileMenu } from '@/redux/slices/menuSlice';
import { toggleTheme } from '@/redux/slices/themeSlice';
import { toggleNotificationPanel } from '@/redux/slices/notificationSlice';
import { logoutAsync } from '@/redux/slices/authSlice';
import NotificationPanel from '@/components/ui/NotificationPanel';
import ProfileDrawer from '@/components/ui/ProfileDrawer';
import toast from 'react-hot-toast';
import { clearTabsStorage, closeAllTabs } from '@/redux/slices/tabsSlice';
import { getFileUrl } from '@/api/apiService';

const Navbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { mode: themeMode } = useAppSelector((state) => state.theme);
  const { unreadCount } = useAppSelector((state) => state.notifications);
  const { isCollapsed } = useAppSelector((state) => state.menu);

  const [userMenuOpen,   setUserMenuOpen]   = useState(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    dispatch(closeAllTabs());
    await dispatch(logoutAsync());
    clearTabsStorage();
    localStorage.removeItem('erp_active_menu');
    localStorage.removeItem('erp_expanded_items');
    localStorage.removeItem('erp_sidebar_collapsed');
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  const sidebarWidth = isCollapsed ? 64 : 256;

  return (
    <>
      <header
        className="admin-navbar fixed top-0 right-0 h-10 z-30 flex items-center px-3 gap-3 transition-all duration-300"
        style={{
          left: `${sidebarWidth}px`,
          background: 'var(--bg-navbar)',
          borderBottom: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Left: Toggle + Search */}
        <div className="flex items-center gap-3 flex-1">
          {/* Sidebar toggle */}
          <button
            className="p-2 rounded-lg transition-colors hidden lg:flex"
            style={{ color: '#334155' }}
            onClick={() => dispatch(toggleSidebar())}
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Mobile menu toggle */}
          <button
            className="p-2 rounded-lg transition-colors lg:hidden"
            style={{ color: '#334155' }}
            onClick={() => dispatch(toggleMobileMenu())}
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Search */}
          <div className="relative hidden sm:block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: '#94A3B8' }}
            />
            <input
              type="text"
              placeholder="Search"
              className="pl-9 pr-4 py-1.5 rounded-lg text-sm transition-all duration-200 w-48 focus:w-64"
              style={{
                background: '#FFFFFF',
                border: `1px solid ${searchFocused ? 'var(--accent-gold)' : 'var(--border-color)'}`,
                color: 'var(--text-primary)',
                outline: 'none',
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <button
            className="p-2 rounded-lg transition-colors"
            style={{ color: '#334155' }}
            onClick={() => dispatch(toggleTheme())}
            title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          <button
            className="relative p-2 rounded-lg transition-colors"
            style={{ color: '#334155' }}
            onClick={() => dispatch(toggleNotificationPanel())}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="notif-dot" />
            )}
          </button>

          {/* Settings */}
          <button
            className="p-2 rounded-lg transition-colors hidden sm:flex"
            style={{ color: '#334155' }}
            onClick={() => navigate('/settings')}
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Divider */}
          <div className="w-px h-6 mx-1" style={{ background: 'var(--border-color)' }} />

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-primary)' }}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              {/* Avatar */}
              {user?.profile_image ? (
                <img
                  src={getFileUrl(user.profile_image) || ''}
                  alt={user.full_name || 'User'}
                  className="w-6 h-6 rounded-full object-cover flex-shrink-0 ring-1 ring-yellow-600/40"
                />
              ) : (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #A88820, #C0A030)',
                    color: '#1a1000',
                  }}
                >
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}

              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium leading-none" style={{ color: 'var(--text-primary)' }}>
                  {user?.full_name?.split(' ')[0] || 'User'}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#334155' }}>
                  {user?.role_name || 'Role'}
                </div>
              </div>

              <ChevronDown className="w-3.5 h-3.5 hidden sm:block" style={{ color: '#334155' }} />
            </button>

            {/* Dropdown menu */}
            {userMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden z-50 animate-fade-in"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                {/* User info */}
                <div className="p-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="flex items-center gap-2.5">
                    {user?.profile_image ? (
                      <img src={getFileUrl(user.profile_image) || ''} alt={user.full_name || 'User'}
                           className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0 shadow-sm"
                           style={{ background: 'linear-gradient(135deg, #A88820, #C0A030)', color: '#1a1000' }}>
                        {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {user?.full_name}
                      </div>
                      <div className="text-xs truncate" style={{ color: '#334155' }}>
                        {user?.email}
                      </div>
                      <span
                        className="badge mt-0.5 inline-block"
                        style={{
                          background: 'rgba(201, 165, 53, 0.1)',
                          color: 'var(--accent-gold)',
                          fontSize: '10px',
                          padding: '1px 6px',
                        }}
                      >
                        {user?.role_name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-1.5">
                  {[
                    { icon: <User className="w-4 h-4" />, label: 'My Profile', action: () => setProfileDrawerOpen(true) },
                    { icon: <Settings className="w-4 h-4" />, label: 'Settings', action: () => navigate('/settings') },
                  ].map((item) => (
                    <button
                      key={item.label}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => { item.action(); setUserMenuOpen(false); }}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}

                  <div className="border-t my-1" style={{ borderColor: 'var(--border-color)' }} />

                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={handleLogout}
                    disabled={loggingOut}
                  >
                    {loggingOut ? (
                      <Loader2 className="w-4 h-4 spinner" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                    {loggingOut ? 'Logging out...' : 'Logout'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Notification Panel */}
      <NotificationPanel />

      {/* Profile Drawer */}
      <ProfileDrawer open={profileDrawerOpen} onClose={() => setProfileDrawerOpen(false)} />
    </>
  );
};

export default Navbar;
