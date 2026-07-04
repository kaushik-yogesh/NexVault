import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchAppConfig = createAsyncThunk('config/fetchAppConfig', async () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const response = await axios.get(`${apiUrl}/config`);
  if (!response.data.success) {
    throw new Error('Failed to fetch config');
  }
  return response.data.data;
});

const initialState = {
  isLoaded: false,
  error: null,
  data: {
    SWAP_FEE_ENABLED: true,
    SWAP_FEE_BPS: 30,
    SWAP_CHARGE_FEE_BY: 'currency_out',
    SLIPPAGE_DEFAULT: 1.0,
    ENABLE_SWAP: true,
    GAS_RESERVE_MIN: 0.005,
    GAS_RESERVE_PERCENT: 10,
    GAS_LIMIT_FALLBACK_SWAP: 500000,
  }
};

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppConfig.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchAppConfig.fulfilled, (state, action) => {
        state.isLoaded = true;
        // Merge fetched config over default state
        state.data = { ...state.data, ...action.payload };
      })
      .addCase(fetchAppConfig.rejected, (state, action) => {
        state.error = action.error.message;
        // Even if it fails, we mark it loaded so the app doesn't hang on splash screen forever
        // It will just use the default fallback state
        state.isLoaded = true; 
      });
  }
});

export default configSlice.reducer;
