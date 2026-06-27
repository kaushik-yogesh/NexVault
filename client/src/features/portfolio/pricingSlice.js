import { createSlice } from '@reduxjs/toolkit';

const pricingSlice = createSlice({
  name: 'pricing',
  initialState: {
    prices: {}, // { [chainId]: { [address]: { price, change24h } } }
    metadata: {}, // { [chainId]: { [address]: { marketCap, volume24h, logoURI, ... } } }
    isLoading: false,
    error: null,
  },
  reducers: {
    setPrices(state, action) {
      const { chainId, data } = action.payload;
      if (!state.prices[chainId]) {
        state.prices[chainId] = {};
      }
      state.prices[chainId] = { ...state.prices[chainId], ...data };
    },
    setMetadata(state, action) {
      const { chainId, address, data } = action.payload;
      if (!state.metadata[chainId]) {
        state.metadata[chainId] = {};
      }
      state.metadata[chainId][address.toLowerCase()] = data;
    },
    setPricingLoading(state, action) {
      state.isLoading = action.payload;
    },
    setPricingError(state, action) {
      state.error = action.payload;
    }
  }
});

export const { setPrices, setMetadata, setPricingLoading, setPricingError } = pricingSlice.actions;

export const selectPricesByChain = (state, chainId) => state.pricing.prices[chainId] || {};
export const selectPrice = (state, chainId, address) => state.pricing.prices[chainId]?.[address.toLowerCase()] || { price: 0, change24h: 0 };
export const selectMetadata = (state, chainId, address) => state.pricing.metadata[chainId]?.[address.toLowerCase()] || null;

export default pricingSlice.reducer;
