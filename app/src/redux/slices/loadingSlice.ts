import { createSlice } from '@reduxjs/toolkit';

const loadingSlice = createSlice({
  name: 'loading',
  initialState: { pendingCount: 0 },
  reducers: {
    incrementPending: (state) => { state.pendingCount += 1 },
    decrementPending: (state) => { state.pendingCount = Math.max(0, state.pendingCount - 1) },
  },
});

export const { incrementPending, decrementPending } = loadingSlice.actions;
export const selectIsLoading = (state: { loading: { pendingCount: number } }) =>
  state.loading.pendingCount > 0;
export default loadingSlice.reducer;
