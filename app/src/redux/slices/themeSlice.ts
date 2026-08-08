// ============================================================
// THEME SLICE
// ============================================================
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type Theme = 'light' | 'dark';

interface ThemeState {
  mode: Theme;
}

const savedTheme = localStorage.getItem('erp_theme') as Theme | null;
const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

const themeInitialState: ThemeState = {
  mode: savedTheme || (systemDark ? 'dark' : 'light'),
};

export const themeSlice = createSlice({
  name: 'theme',
  initialState: themeInitialState,
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
      localStorage.setItem('erp_theme', state.mode);
      if (state.mode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.mode = action.payload;
      localStorage.setItem('erp_theme', action.payload);
      if (action.payload === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
