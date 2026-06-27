/**
 * NexVault — NFTs Redux Slice
 */

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import db from '../../core/vault/ExtensionStore.js';

export const loadNFTs = createAsyncThunk('nfts/load', async () => {
  return await db.getNFTs();
});

export const addNFT = createAsyncThunk('nfts/add', async (nft, { dispatch }) => {
  await db.addNFT(nft);
  dispatch(loadNFTs());
  return nft;
});

export const deleteNFT = createAsyncThunk('nfts/delete', async (id, { dispatch }) => {
  await db.deleteNFT(id);
  dispatch(loadNFTs());
  return id;
});

const nftsSlice = createSlice({
  name: 'nfts',
  initialState: {
    items: [],
    isLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadNFTs.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadNFTs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload || [];
      })
      .addCase(loadNFTs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });
  },
});

export const selectAllNFTs = (state) => state.nfts.items;

export const selectNFTsByOwnerAndChain = createSelector(
  [selectAllNFTs, (state, ownerAddress) => ownerAddress, (state, ownerAddress, chainId) => chainId],
  (nfts, ownerAddress, chainId) => {
    if (!ownerAddress || !chainId) return [];
    return nfts.filter(
      (n) => n.ownerAddress?.toLowerCase() === ownerAddress.toLowerCase() && n.chainId === chainId
    );
  }
);

export default nftsSlice.reducer;
