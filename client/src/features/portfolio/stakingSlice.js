import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import axios from 'axios';

// Fetch active validators and APYs from DefiLlama Yields API
export const fetchStakingData = createAsyncThunk(
  'staking/fetchData',
  async (chainId, { rejectWithValue }) => {
    try {
      // For V1, we only query ETH staking pools as the primary options
      const res = await axios.get('https://yields.llama.fi/pools');
      
      if (!res.data || !res.data.data) {
        throw new Error('Failed to fetch from DefiLlama');
      }

      const allPools = res.data.data;
      
      // Filter for top Liquid Staking Derivatives on Ethereum
      const targetProjects = ['lido', 'rocket-pool', 'binance'];
      const targetSymbols = ['stETH', 'rETH', 'BETH', 'ETH'];

      const validators = allPools
        .filter(p => p.chain === 'Ethereum' && targetProjects.includes(p.project) && targetSymbols.some(s => p.symbol.includes(s)))
        .map((p, idx) => ({
          id: p.pool || String(idx),
          name: p.project === 'lido' ? 'Lido' : p.project === 'rocket-pool' ? 'Rocket Pool' : 'Binance Staking',
          apy: `${p.apy.toFixed(2)}%`,
          type: 'Liquid',
          status: 'Active',
          tvl: `$${(p.tvlUsd / 1e9).toFixed(2)}B`
        }));

      // Sort by TVL descending and deduplicate by name
      const uniqueValidators = [];
      const seen = new Set();
      for (const v of validators.sort((a, b) => parseFloat(b.tvl.replace('$', '').replace('B', '')) - parseFloat(a.tvl.replace('$', '').replace('B', '')))) {
        if (!seen.has(v.name)) {
          seen.add(v.name);
          uniqueValidators.push(v);
        }
      }

      return {
        totalStaked: '0.00', // Fetched from on-chain balances in a complete implementation
        rewards: '0.00',
        validators: uniqueValidators,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const stakingSlice = createSlice({
  name: 'staking',
  initialState: {
    totalStaked: '0',
    rewards: '0',
    validators: [],
    isLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStakingData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStakingData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.totalStaked = action.payload.totalStaked;
        state.rewards = action.payload.rewards;
        state.validators = action.payload.validators;
      })
      .addCase(fetchStakingData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch staking data';
      });
  },
});

export default stakingSlice.reducer;
