/**
 * NexVault — Tokens Redux Slice
 */

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import db from '../../core/vault/ExtensionStore.js';
import tokenIndexer from '../../core/api/tokenIndexer.js';
import { getAllPopularTokens } from '../../shared/constants/tokens.js';

export const loadTokens = createAsyncThunk(
  'tokens/load',
  async () => {
    // One-time cleanup for old dummy tokens
    if (localStorage.getItem('nexvault_tokens_migrated') !== 'true') {
      // Direct removal since we have access to ExtensionStore internals here
      if (typeof chrome === 'undefined' || !chrome.storage) {
         localStorage.removeItem('nexvault_tokens');
      } else {
         chrome.storage.local.remove('nexvault_tokens');
      }
      localStorage.setItem('nexvault_tokens_migrated', 'true');
    }

    const savedTokens = await db.getTokens();
    const deletedTokens = await db.getDeletedTokens();
    
    // Inject popular tokens and merge with saved tokens (avoiding duplicates)
    const popular = getAllPopularTokens().map(t => ({
      ...t,
      id: `${t.chainId}-${t.address.toLowerCase()}`,
      address: t.address.toLowerCase()
    })).filter(t => !deletedTokens.includes(t.id));
    
    
    const merged = [...popular];
    
    savedTokens.forEach(t => {
      if (!merged.find(p => p.address === t.address && p.chainId === t.chainId)) {
        merged.push(t);
      }
    });

    return merged;
  }
);

export const saveToken = createAsyncThunk(
  'tokens/save',
  async (token, { dispatch }) => {
    const newToken = {
      ...token,
      id: token.id || `${token.chainId}-${token.address.toLowerCase()}`,
      address: token.address.toLowerCase(),
      updatedAt: Date.now(),
    };
    await db.addToken(newToken);
    dispatch(loadTokens());
    return newToken;
  }
);

export const deleteToken = createAsyncThunk(
  'tokens/delete',
  async (id, { dispatch }) => {
    await db.deleteToken(id);
    dispatch(loadTokens());
    return id;
  }
);

export const autoDiscoverTokens = createAsyncThunk(
  'tokens/autoDiscover',
  async ({ address, chainId }, { dispatch }) => {
    const discovered = await tokenIndexer.getTokens(address, chainId);
    
    // Save discovered tokens to DB
    for (const token of discovered) {
      await db.addToken({
        id: `${chainId}-${token.address.toLowerCase()}`,
        chainId,
        address: token.address.toLowerCase(),
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        logo: token.logo,
        logoURI: token.logoURI || null,
        isAutoDiscovered: true,
        updatedAt: Date.now()
      });
    }

    dispatch(loadTokens());
    return discovered;
  }
);

const tokensSlice = createSlice({
  name: 'tokens',
  initialState: {
    items: [],
    isLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadTokens.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadTokens.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload || [];
      })
      .addCase(loadTokens.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      })
      .addCase(autoDiscoverTokens.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(autoDiscoverTokens.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(autoDiscoverTokens.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });
  },
});

export const selectAllTokens = (state) => state.tokens.items;

export const selectTokensByChain = createSelector(
  [selectAllTokens, (state, chainId) => chainId],
  (tokens, chainId) => tokens.filter((t) => t.chainId === chainId)
);

export default tokensSlice.reducer;
