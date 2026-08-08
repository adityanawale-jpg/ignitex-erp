import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TabItem {
  id: string;
  title: string;
  path: string;
  icon?: string;
  isModified?: boolean;
}

interface TabsState {
  tabs: TabItem[];
  activeTabId: string | null;
}

const STORAGE_KEY = 'erp_tabs';

const loadFromStorage = (): TabsState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { tabs: [], activeTabId: null };
};

export const clearTabsStorage = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
};

const initialState: TabsState = loadFromStorage();

const tabsSlice = createSlice({
  name: 'tabs',
  initialState,
  reducers: {
    openTab: (state, action: PayloadAction<TabItem>) => {
      const existing = state.tabs.find((t) => t.path === action.payload.path);
      if (existing) {
        // Focus existing tab
        state.activeTabId = existing.id;
      } else {
        // Open new tab
        state.tabs.push(action.payload);
        state.activeTabId = action.payload.id;
      }
    },
    closeTab: (state, action: PayloadAction<string>) => {
      const index = state.tabs.findIndex((t) => t.id === action.payload);
      if (index === -1) return;

      state.tabs.splice(index, 1);

      // If closing active tab, switch to adjacent tab
      if (state.activeTabId === action.payload) {
        if (state.tabs.length === 0) {
          state.activeTabId = null;
        } else {
          const newIndex = Math.min(index, state.tabs.length - 1);
          state.activeTabId = state.tabs[newIndex].id;
        }
      }
    },
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTabId = action.payload;
    },
    closeAllTabs: (state) => {
      state.tabs = [];
      state.activeTabId = null;
    },
    updateTabTitle: (
      state,
      action: PayloadAction<{ id: string; title: string }>
    ) => {
      const tab = state.tabs.find((t) => t.id === action.payload.id);
      if (tab) {
        tab.title = action.payload.title;
      }
    },
    markTabModified: (
      state,
      action: PayloadAction<{ id: string; isModified: boolean }>
    ) => {
      const tab = state.tabs.find((t) => t.id === action.payload.id);
      if (tab) {
        tab.isModified = action.payload.isModified;
      }
    },
  },
});

export const {
  openTab,
  closeTab,
  setActiveTab,
  closeAllTabs,
  updateTabTitle,
  markTabModified,
} = tabsSlice.actions;
export default tabsSlice.reducer;
