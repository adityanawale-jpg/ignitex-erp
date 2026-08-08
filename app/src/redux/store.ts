import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import themeReducer from './slices/themeSlice';
import menuReducer from './slices/menuSlice';
import tabsReducer from './slices/tabsSlice';
import notificationReducer from './slices/notificationSlice';
import appConfigReducer from './slices/appConfigSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    menu: menuReducer,
    tabs: tabsReducer,
    notifications: notificationReducer,
    appConfig: appConfigReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Persist tabs and menu state across page refreshes
store.subscribe(() => {
  const { tabs, menu } = store.getState();
  try {
    localStorage.setItem('erp_tabs', JSON.stringify({ tabs: tabs.tabs, activeTabId: tabs.activeTabId }));
    localStorage.setItem('erp_active_menu', menu.activeMenu);
    localStorage.setItem('erp_expanded_items', JSON.stringify(menu.expandedItems));
    localStorage.setItem('erp_sidebar_collapsed', JSON.stringify(menu.isCollapsed));
  } catch {}
});
