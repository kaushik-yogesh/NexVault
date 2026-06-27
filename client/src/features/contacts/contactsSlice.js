/**
 * NexVault — Contacts Redux Slice
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import db from '../../core/vault/ExtensionStore.js';

export const loadContacts = createAsyncThunk(
  'contacts/load',
  async () => {
    return await db.getContacts();
  }
);

export const saveContact = createAsyncThunk(
  'contacts/save',
  async (contact, { dispatch }) => {
    // Generate an ID if it doesn't exist
    const newContact = {
      ...contact,
      id: contact.id || Date.now().toString(),
      updatedAt: Date.now(),
    };
    await db.addContact(newContact);
    dispatch(loadContacts());
    return newContact;
  }
);

export const deleteContact = createAsyncThunk(
  'contacts/delete',
  async (id, { dispatch }) => {
    await db.deleteContact(id);
    dispatch(loadContacts());
    return id;
  }
);

const contactsSlice = createSlice({
  name: 'contacts',
  initialState: {
    items: [],
    isLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadContacts.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadContacts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload || [];
      })
      .addCase(loadContacts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });
  },
});

export default contactsSlice.reducer;
