/**
 * NexVault — Permissions Redux Slice
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import permissionManager from '../../core/permissions/PermissionManager.js';

export const loadPermissions = createAsyncThunk(
  'permissions/load',
  async () => {
    return await permissionManager.getAllPermissions();
  }
);

export const revokePermission = createAsyncThunk(
  'permissions/revoke',
  async (origin, { dispatch }) => {
    await permissionManager.revokePermission(origin);
    dispatch(loadPermissions());
    return origin;
  }
);

const permissionsSlice = createSlice({
  name: 'permissions',
  initialState: {
    items: [],
    isLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadPermissions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadPermissions.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.items = Object.entries(action.payload).map(([origin, data]) => ({
            origin,
            ...data
          }));
        } else {
          state.items = [];
        }
      })
      .addCase(loadPermissions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });
  },
});

export default permissionsSlice.reducer;
