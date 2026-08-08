import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/api/apiService';

// ============================================================
// TYPES
// ============================================================
export interface User {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  emp_email: string;
  mobile_number: string;
  profile_image: string | null;
  department_id?: string;
  designation?: string;
  full_name?: string;
  email?: string;
  role_name?: string;
}

const normalizeUser = (raw: Record<string, unknown>): User => ({
  ...(raw as unknown as User),
  id: ((raw.id ?? raw.user_id) as number),
  full_name: `${raw.first_name} ${raw.last_name || ''}`.trim(),
  email: (raw.emp_email ?? raw.email) as string || '',
});

export interface MenuItem {
  id: number;
  parent_id: number | null;
  menu_code: string;
  menu_name: string;
  menu_url: string | null;
  menu_icon: string | null;
  menu_order: number;
  menu_level: number;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_print: boolean;
  can_export: boolean;
  children: MenuItem[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  menus: MenuItem[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ============================================================
// ASYNC THUNKS
// ============================================================
export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.post('/auth/login', credentials);
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message || 'Login failed');
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(axiosError.response?.data?.message || 'Login failed');
    }
  }
);

export const logoutAsync = createAsyncThunk('auth/logout', async () => {
  try {
    await apiService.post('/auth/logout', {});
  } catch (e) {
    // Ignore errors during logout
  }
  localStorage.removeItem('erp_token');
  localStorage.removeItem('erp_user');
  localStorage.removeItem('erp_tabs');
  localStorage.removeItem('erp_active_menu');
});

export const fetchProfileAsync = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get('/auth/profile');
      if (response.data.success) {
        return response.data.data;
      }
      return rejectWithValue({ authError: true });
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      // 401/403 = session truly expired → log out
      // network errors / server down → keep user logged in
      return rejectWithValue({ authError: status === 401 || status === 403 });
    }
  }
);

// ============================================================
// INITIAL STATE
// ============================================================
const storedToken = localStorage.getItem('erp_token');
const storedUser = localStorage.getItem('erp_user');

const initialState: AuthState = {
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken,
  menus: [],
  isAuthenticated: !!storedToken,
  isLoading: false,
  error: null,
};

// ============================================================
// SLICE
// ============================================================
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setMenus: (state, action: PayloadAction<MenuItem[]>) => {
      state.menus = action.payload;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('erp_user', JSON.stringify(state.user));
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = normalizeUser(action.payload.user as Record<string, unknown>);
        localStorage.setItem('erp_token', action.payload.token);
        localStorage.setItem('erp_user', JSON.stringify(state.user));
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder.addCase(logoutAsync.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.menus = [];
      state.error = null;
    });

    // Fetch Profile
    builder
      .addCase(fetchProfileAsync.fulfilled, (state, action) => {
        state.user = normalizeUser(action.payload.user as Record<string, unknown>);
        state.menus = action.payload.menus;
        localStorage.setItem('erp_user', JSON.stringify(state.user));
      })
      .addCase(fetchProfileAsync.rejected, (state, action) => {
        const payload = action.payload as { authError?: boolean } | undefined;
        if (payload?.authError) {
          // Real auth failure (401/403) — clear session
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
          localStorage.removeItem('erp_token');
          localStorage.removeItem('erp_user');
        }
        // Network errors or server down — keep existing state so user stays logged in
      });
  },
});

export const { clearError, setMenus, updateUser } = authSlice.actions;
export default authSlice.reducer;
