import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import approvalIndexer from '../../core/api/approvalIndexer.js';
import providerManager from '../../core/network/ProviderManager.js';

export const loadApprovals = createAsyncThunk(
  'approvals/load',
  async (address, { rejectWithValue }) => {
    try {
      const chainId = providerManager.getActiveChainId();
      const approvals = await approvalIndexer.getActiveApprovals(address, chainId);
      return { approvals, chainId, address };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const approvalsSlice = createSlice({
  name: 'approvals',
  initialState: {
    items: [],
    isLoading: false,
    error: null,
    lastFetchedChainId: null,
    lastFetchedAddress: null,
  },
  reducers: {
    clearApprovals(state) {
      state.items = [];
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadApprovals.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadApprovals.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.approvals;
        state.lastFetchedChainId = action.payload.chainId;
        state.lastFetchedAddress = action.payload.address;
      })
      .addCase(loadApprovals.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to load approvals';
      });
  }
});

export const { clearApprovals } = approvalsSlice.actions;
export default approvalsSlice.reducer;
