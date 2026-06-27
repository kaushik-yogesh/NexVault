/**
 * NexVault — Settings Redux Slice
 */

import { createSlice } from '@reduxjs/toolkit';

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    // Appearance
    theme: 'dark', // 'dark' | 'light' | 'system'
    currency: 'USD',
    language: 'en',

    // Security
    autoLockMinutes: 5,
    showBalances: true,
    confirmBeforeSend: true,

    // Notifications
    showScamWarnings: true,
    showPriceAlerts: false,

    // Advanced
    showTestnets: false,
    gasPreference: 'medium', // default gas speed

    // Backup
    hasBackedUp: false,
    lastBackupReminder: null,
  },

  reducers: {
    setTheme(state, action) {
      state.theme = action.payload;
    },
    setCurrency(state, action) {
      state.currency = action.payload;
    },
    setAutoLockMinutes(state, action) {
      state.autoLockMinutes = action.payload;
    },
    toggleShowBalances(state) {
      state.showBalances = !state.showBalances;
    },
    toggleConfirmBeforeSend(state) {
      state.confirmBeforeSend = !state.confirmBeforeSend;
    },
    toggleShowScamWarnings(state) {
      state.showScamWarnings = !state.showScamWarnings;
    },
    toggleShowTestnets(state) {
      state.showTestnets = !state.showTestnets;
    },
    setGasPreference(state, action) {
      state.gasPreference = action.payload;
    },
    markBackedUp(state) {
      state.hasBackedUp = true;
    },
    dismissBackupReminder(state) {
      state.lastBackupReminder = Date.now();
    },
    updateSettings(state, action) {
      return { ...state, ...action.payload };
    },
  },
});

export const {
  setTheme,
  setCurrency,
  setAutoLockMinutes,
  toggleShowBalances,
  toggleConfirmBeforeSend,
  toggleShowScamWarnings,
  toggleShowTestnets,
  setGasPreference,
  markBackedUp,
  dismissBackupReminder,
  updateSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
