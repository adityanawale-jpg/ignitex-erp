import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { apiService, getFileUrl } from '@/api/apiService'

export interface AppConfig {
  erpLogoUrl:           string | null
  erpName:              string
  erpSubtitle:          string
  faviconUrl:           string | null
  footerCompany:        string
  showDemoCredentials:  boolean
  loaded:               boolean
}

const STORAGE_KEY = 'erp_app_config'

const stored = (() => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
})()

const defaults: AppConfig = {
  erpLogoUrl:          null,
  erpName:             'IgniteX.ai',
  erpSubtitle:         'ENTERPRICES ERP',
  faviconUrl:          null,
  footerCompany:       'IgniteX.ai',
  showDemoCredentials: true,
  loaded:              false,
}

const initialState: AppConfig = stored ? { ...defaults, ...stored, loaded: false } : defaults

// ── apply favicon to DOM ──────────────────────────────────────────────────────
export const applyFavicon = (url: string | null) => {
  let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = url || '/favicon.ico'
}

// ── async thunk ───────────────────────────────────────────────────────────────
export const fetchAppConfig = createAsyncThunk(
  'appConfig/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiService.get('/settings/erp')
      if (res.data.success) return res.data.data as Record<string, string | null>
      return rejectWithValue('Failed to load config')
    } catch {
      return rejectWithValue('Network error')
    }
  },
)

// ── slice ─────────────────────────────────────────────────────────────────────
const appConfigSlice = createSlice({
  name: 'appConfig',
  initialState,
  reducers: {
    setAppConfig(state, action: PayloadAction<Partial<AppConfig>>) {
      Object.assign(state, action.payload)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchAppConfig.fulfilled, (state, action) => {
      const d = action.payload
      state.erpLogoUrl    = d.erp_logo_url    ?? null
      state.erpName       = d.erp_name        ?? 'IgniteX.ai'
      state.erpSubtitle   = d.erp_subtitle    ?? 'ENTERPRICES ERP'
      state.faviconUrl    = d.favicon_url     ?? null
      state.footerCompany = d.footer_company  ?? 'IgniteX.ai'
      state.showDemoCredentials = d.show_demo_credentials !== 'false'
      state.loaded        = true
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      applyFavicon(getFileUrl(state.faviconUrl))
    })
  },
})

export const { setAppConfig } = appConfigSlice.actions
export default appConfigSlice.reducer
