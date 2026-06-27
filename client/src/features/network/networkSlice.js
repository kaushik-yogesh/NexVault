/**
 * NexVault — Network Redux Slice
 */

import { createSlice } from '@reduxjs/toolkit';
import { DEFAULT_CHAIN_ID, CHAINS } from '../../../../shared/constants/chains.js';

const networkSlice = createSlice({
  name: 'network',
  initialState: {
    activeChainId: DEFAULT_CHAIN_ID,
    customChains: {}, // User-added custom chains
    customRPCs: {}, // Custom RPC overrides per chain
    rpcHealth: {}, // { [chainId]: { status: 'healthy'|'degraded'|'down', latency: 0 } }
  },

  reducers: {
    switchNetwork(state, action) {
      state.activeChainId = action.payload;
    },

    addCustomChain(state, action) {
      const chain = action.payload;
      state.customChains[chain.chainId] = chain;
    },

    removeCustomChain(state, action) {
      const chainId = action.payload;
      delete state.customChains[chainId];
      delete state.customRPCs[chainId];
    },

    setCustomRPC(state, action) {
      const { chainId, rpcUrl } = action.payload;
      state.customRPCs[chainId] = rpcUrl;
    },

    removeCustomRPC(state, action) {
      const chainId = action.payload;
      delete state.customRPCs[chainId];
    },

    updateRPCHealth(state, action) {
      const { chainId, status, latency } = action.payload;
      state.rpcHealth[chainId] = { status, latency, checkedAt: Date.now() };
    },
  },
});

export const {
  switchNetwork,
  addCustomChain,
  removeCustomChain,
  setCustomRPC,
  removeCustomRPC,
  updateRPCHealth,
} = networkSlice.actions;

// Selectors
export const selectActiveChain = (state) => {
  const chainId = state.network.activeChainId;
  return CHAINS[chainId] || state.network.customChains[chainId] || null;
};

export const selectActiveChainId = (state) => state.network.activeChainId;

export const selectAllChains = (state) => ({
  ...CHAINS,
  ...state.network.customChains,
});

// Alias for backwards compatibility / HMR cache issues
export const setActiveChain = switchNetwork;

export default networkSlice.reducer;
