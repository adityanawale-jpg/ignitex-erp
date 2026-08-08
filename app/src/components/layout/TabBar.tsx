import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Home } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { closeTab, setActiveTab } from '@/redux/slices/tabsSlice';
import { setActiveMenu } from '@/redux/slices/menuSlice';
import { loadingState } from '@/api/loadingState';

// Reactive state only used for visual cursor change — actual click blocking
// uses loadingState.isLoading() directly so there is zero debounce delay.
const useIsLoadingVisual = () => {
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return loadingState.subscribe(() => {
      const active = loadingState.isLoading();
      if (active) {
        if (!timerRef.current) {
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            if (loadingState.isLoading()) setLoading(true);
          }, 100);
        }
      } else {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        setLoading(false);
      }
    });
  }, []);
  return loading;
};

const TabBar: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { tabs, activeTabId } = useAppSelector((state) => state.tabs);
  const isLoadingVisual = useIsLoadingVisual();

  const handleTabClick = (tabId: string, path: string) => {
    // Check directly — no debounce, blocks from the very first ms of any request
    if (loadingState.isLoading()) return;
    dispatch(setActiveTab(tabId));
    dispatch(setActiveMenu(tabId));
    navigate(path);
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    if (loadingState.isLoading()) return;
    e.stopPropagation();
    const tab = tabs.find((t) => t.id === tabId);
    const tabIndex = tabs.findIndex((t) => t.id === tabId);

    dispatch(closeTab(tabId));

    const remaining = tabs.filter((t) => t.id !== tabId);
    if (remaining.length === 0) {
      navigate('/');
    } else if (tab?.id === activeTabId) {
      const nextTab = remaining[Math.min(tabIndex, remaining.length - 1)];
      dispatch(setActiveMenu(nextTab.id));
      navigate(nextTab.path);
    }
  };

  return (
    <div
      className="tab-bar"
      onContextMenu={(e) => e.preventDefault()}
      style={isLoadingVisual ? { cursor: 'wait' } : undefined}
    >
      {/* Home button */}
      <button
        className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg transition-colors flex-shrink-0"
        style={{
          color: location.pathname === '/' ? 'var(--accent-gold, #C9973A)' : 'var(--text-muted)',
          background: location.pathname === '/' ? 'rgba(201,151,58,0.08)' : 'transparent',
        }}
        onClick={() => { if (!loadingState.isLoading()) navigate('/'); }}
        title="Home"
      >
        <Home className="w-3.5 h-3.5" />
      </button>

      {/* Dynamic tabs */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab-item ${activeTabId === tab.id ? 'active' : ''}`}
          onClick={() => handleTabClick(tab.id, tab.path)}
          style={isLoadingVisual ? { cursor: 'wait' } : undefined}
        >
          <span className="max-w-28 truncate">{tab.title}</span>
          {tab.isModified && (
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: 'var(--accent-gold)' }}
            />
          )}
          <button
            className="tab-close flex-shrink-0"
            onClick={(e) => handleCloseTab(e, tab.id)}
            disabled={isLoadingVisual}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default TabBar;
