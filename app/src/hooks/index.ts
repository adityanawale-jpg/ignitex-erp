import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { useState, useCallback } from 'react';
import type { RootState, AppDispatch } from '@/redux/store';
import type { MenuItem } from '@/redux/slices/authSlice';

/**
 * Typed Redux hooks
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/**
 * Generic API hook
 */
export function useApi<T>(
  apiCall: (...args: unknown[]) => Promise<{ data: { success: boolean; data: T; message: string } }>
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (...args: unknown[]) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiCall(...args);
      if (response.data.success) {
        setData(response.data.data);
        return response.data.data;
      } else {
        setError(response.data.message);
        return null;
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const message = error.response?.data?.message || error.message || 'An error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  return { data, loading, error, execute, setData };
}

/**
 * Theme hook
 */
export function useTheme() {
  const mode = useAppSelector((state) => state.theme.mode);
  return { isDark: mode === 'dark', mode };
}

/**
 * Auth hook
 */
export function useAuth() {
  const auth = useAppSelector((state) => state.auth);
  return auth;
}

/**
 * Permission hook — returns CRUD flags for a given menu_code.
 * Reads from the menus loaded after login (role_menu_mapping).
 * Returns all-true when menuCode is omitted (admin convenience).
 */
export function usePermission(menuCode?: string) {
  const { menus } = useAppSelector((state) => state.auth);

  if (!menuCode) {
    return { canView: true, canCreate: true, canUpdate: true, canDelete: true, canPrint: true, canExport: true };
  }

  const findMenu = (items: MenuItem[], code: string): MenuItem | null => {
    for (const item of items) {
      if (item.menu_code === code) return item;
      if (item.children?.length) {
        const found = findMenu(item.children, code);
        if (found) return found;
      }
    }
    return null;
  };

  const menu = findMenu(menus, menuCode);

  return {
    canView:   menu?.can_view   ?? false,
    canCreate: menu?.can_create ?? false,
    canUpdate: menu?.can_update ?? false,
    canDelete: menu?.can_delete ?? false,
    canPrint:  menu?.can_print  ?? false,
    canExport: menu?.can_export ?? false,
  };
}

/**
 * Tabs hook
 */
export function useTabs() {
  const tabs = useAppSelector((state) => state.tabs);
  const dispatch = useAppDispatch();
  return { ...tabs, dispatch };
}
