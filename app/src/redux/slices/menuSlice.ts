import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface MenuState {
  isCollapsed: boolean;
  expandedItems: string[];
  activeMenu: string;
  isMobileOpen: boolean;
}

const loadActiveMenu = (): string => {
  try { return localStorage.getItem('erp_active_menu') ?? 'DASHBOARD'; } catch {}
  return 'DASHBOARD';
};

const loadExpandedItems = (): string[] => {
  try {
    const saved = localStorage.getItem('erp_expanded_items');
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
};

const loadIsCollapsed = (): boolean => {
  try {
    const saved = localStorage.getItem('erp_sidebar_collapsed');
    if (saved !== null) return JSON.parse(saved);
  } catch {}
  return true; // default collapsed
};

const initialState: MenuState = {
  isCollapsed: loadIsCollapsed(),
  expandedItems: loadExpandedItems(),
  activeMenu: loadActiveMenu(),
  isMobileOpen: false,
};

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.isCollapsed = !state.isCollapsed;
      if (state.isCollapsed) {
        state.expandedItems = [];
      }
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isCollapsed = action.payload;
    },
    toggleMenuItem: (state, action: PayloadAction<string>) => {
      const code = action.payload;
      if (state.expandedItems.includes(code)) {
        state.expandedItems = state.expandedItems.filter((item) => item !== code);
      } else {
        state.expandedItems = [...state.expandedItems, code];
      }
    },
    setActiveMenu: (state, action: PayloadAction<string>) => {
      state.activeMenu = action.payload;
    },
    toggleMobileMenu: (state) => {
      state.isMobileOpen = !state.isMobileOpen;
    },
    closeMobileMenu: (state) => {
      state.isMobileOpen = false;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  toggleMenuItem,
  setActiveMenu,
  toggleMobileMenu,
  closeMobileMenu,
} = menuSlice.actions;
export default menuSlice.reducer;
