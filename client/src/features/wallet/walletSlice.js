/**
 * NexVault — Wallet Redux Slice
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import keyringController from '../../core/wallet/KeyringController.js';
import apiClient from '../../core/api/apiClient.js';

// Helper to register the wallet with the backend so it shows up in Admin telemetry
const syncBackendUser = async (address) => {
  if (!address) return;
  try {
    await apiClient.post('/auth/sync', { address });
  } catch (error) {
    console.error('Failed to sync user telemetry', error);
  }
};

// ---- Async Thunks ----

export const bootWallet = createAsyncThunk('wallet/boot', async () => {
  const state = await keyringController.boot();
  
  if (keyringController.isUnlocked && keyringController.activeAddress) {
    await syncBackendUser(keyringController.activeAddress);
  }
  
  return {
    state,
    isInitialized: keyringController.isInitialized,
    isUnlocked: keyringController.isUnlocked,
  };
});

export const createWallet = createAsyncThunk(
  'wallet/create',
  async ({ password, wordCount = 12 }, { rejectWithValue }) => {
    try {
      const result = await keyringController.createNewWallet(password, wordCount);
      await syncBackendUser(keyringController.activeAddress);
      return {
        mnemonic: result.mnemonic,
        accounts: result.accounts,
        activeAddress: keyringController.activeAddress,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const importSeedPhrase = createAsyncThunk(
  'wallet/importSeed',
  async ({ password, mnemonic }, { rejectWithValue }) => {
    try {
      const result = await keyringController.importFromSeedPhrase(password, mnemonic);
      await syncBackendUser(keyringController.activeAddress);
      return {
        accounts: result.accounts,
        activeAddress: keyringController.activeAddress,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const importSeedPhraseAccount = createAsyncThunk(
  'wallet/importSeedAccount',
  async ({ password, mnemonic, accountIndex, name }, { rejectWithValue }) => {
    try {
      const account = await keyringController.importFromSeedPhraseAccount(password, mnemonic, accountIndex, name);
      await syncBackendUser(keyringController.activeAddress);
      return {
        account,
        accounts: keyringController.accounts,
        activeAddress: keyringController.activeAddress,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const importPrivateKey = createAsyncThunk(
  'wallet/importKey',
  async ({ password, privateKey, name }, { rejectWithValue }) => {
    try {
      const account = await keyringController.importFromPrivateKey(password, privateKey, name);
      await syncBackendUser(keyringController.activeAddress);
      return {
        account,
        accounts: keyringController.accounts,
        activeAddress: keyringController.activeAddress,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const importKeystore = createAsyncThunk(
  'wallet/importKeystore',
  async ({ password, keystoreJson, keystorePassword, name }, { rejectWithValue }) => {
    try {
      const account = await keyringController.importFromKeystore(password, keystoreJson, keystorePassword, name);
      await syncBackendUser(keyringController.activeAddress);
      return {
        account,
        accounts: keyringController.accounts,
        activeAddress: keyringController.activeAddress,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const unlockWallet = createAsyncThunk(
  'wallet/unlock',
  async ({ password }, { rejectWithValue }) => {
    try {
      const accounts = await keyringController.unlock(password);
      await syncBackendUser(keyringController.activeAddress);
      return {
        accounts,
        activeAddress: keyringController.activeAddress,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const unlockWithBiometric = createAsyncThunk(
  'wallet/unlockBiometric',
  async (_, { rejectWithValue }) => {
    try {
      const accounts = await keyringController.unlockWithBiometric();
      await syncBackendUser(keyringController.activeAddress);
      return {
        accounts,
        activeAddress: keyringController.activeAddress,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addAccount = createAsyncThunk(
  'wallet/addAccount',
  async ({ name }, { rejectWithValue }) => {
    try {
      const account = await keyringController.addAccount(name);
      return {
        account,
        accounts: keyringController.accounts,
        activeAddress: keyringController.activeAddress,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const renameAccount = createAsyncThunk(
  'wallet/renameAccount',
  async ({ address, newName }, { rejectWithValue }) => {
    try {
      await keyringController.renameAccount(address, newName);
      return { accounts: keyringController.accounts };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const checkBiometricStatus = createAsyncThunk(
  'wallet/checkBiometricStatus',
  async () => {
    return await keyringController.hasBiometric();
  }
);

export const enableBiometric = createAsyncThunk(
  'wallet/enableBiometric',
  async ({ password }, { rejectWithValue }) => {
    try {
      await keyringController.enableBiometric(password);
      return true;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const disableBiometric = createAsyncThunk(
  'wallet/disableBiometric',
  async (_, { rejectWithValue }) => {
    try {
      await keyringController.disableBiometric();
      return false;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// ---- Async Thunks (Side Effects) ----
export const performLockWallet = createAsyncThunk(
  'wallet/performLock',
  async (_, { dispatch }) => {
    keyringController.lock();
    dispatch(walletSlice.actions.lockWallet());
  }
);

export const performSwitchAccount = createAsyncThunk(
  'wallet/performSwitchAccount',
  async (address, { dispatch }) => {
    keyringController.switchAccount(address);
    dispatch(walletSlice.actions.switchAccount(address));
  }
);

// Listener setup for background lock events
export const setupWalletListeners = () => (dispatch, getState) => {
  keyringController.subscribe((state) => {
    // Wrap in setTimeout to prevent dispatching while a reducer is executing
    setTimeout(() => {
      const isReduxUnlocked = getState().wallet.isUnlocked;
      if (!state.isUnlocked && isReduxUnlocked) {
        dispatch(walletSlice.actions.lockWallet());
      }
    }, 0);
  });
};

// ---- Slice ----

const walletSlice = createSlice({
  name: 'wallet',
  initialState: {
    // State
    isBooting: true,
    isInitialized: false,
    isUnlocked: false,
    isLoading: false,
    error: null,

    // Wallet data (public only)
    accounts: [],
    activeAddress: null,

    // Onboarding
    mnemonic: null, // Temporarily held during creation, cleared after backup

    // Biometrics
    hasBiometricEnabled: false,

    // Balances (fetched separately)
    balances: {}, // { [address]: { [chainId]: { native: '0', tokens: {} } } }
  },

  reducers: {
    lockWallet(state) {
      state.isUnlocked = false;
      state.accounts = [];
      state.mnemonic = null;
      state.balances = {};
    },

    switchAccount(state, action) {
      const address = action.payload;
      state.activeAddress = address;
    },

    clearMnemonic(state) {
      state.mnemonic = null;
    },

    clearError(state) {
      state.error = null;
    },

    setBalances(state, action) {
      const { address, chainId, balances } = action.payload;
      if (!state.balances[address]) {
        state.balances[address] = {};
      }
      state.balances[address][chainId] = balances;
    },

    resetWallet(state) {
      keyringController.factoryReset();
      state.isInitialized = false;
      state.isUnlocked = false;
      state.accounts = [];
      state.activeAddress = null;
      state.mnemonic = null;
      state.balances = {};
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // Boot
      .addCase(bootWallet.pending, (state) => {
        state.isBooting = true;
      })
      .addCase(bootWallet.fulfilled, (state, action) => {
        state.isBooting = false;
        state.isInitialized = action.payload.isInitialized;
        state.isUnlocked = action.payload.isUnlocked;
      })
      .addCase(bootWallet.rejected, (state) => {
        state.isBooting = false;
      })

      // Create
      .addCase(createWallet.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createWallet.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.isUnlocked = true;
        state.accounts = action.payload.accounts;
        state.activeAddress = action.payload.activeAddress;
        state.mnemonic = action.payload.mnemonic;
      })
      .addCase(createWallet.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error.message;
      })

      // Import Seed
      .addCase(importSeedPhrase.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(importSeedPhrase.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.isUnlocked = true;
        state.accounts = action.payload.accounts;
        state.activeAddress = action.payload.activeAddress;
      })
      .addCase(importSeedPhrase.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error.message;
      })

      // Import Seed Phrase Account
      .addCase(importSeedPhraseAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(importSeedPhraseAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.isUnlocked = true;
        state.accounts = action.payload.accounts;
        state.activeAddress = action.payload.activeAddress;
      })
      .addCase(importSeedPhraseAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error.message;
      })

      // Import Private Key
      .addCase(importPrivateKey.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(importPrivateKey.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.isUnlocked = true;
        state.accounts = action.payload.accounts;
        state.activeAddress = action.payload.activeAddress;
      })
      .addCase(importPrivateKey.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error.message;
      })

      // Import Keystore
      .addCase(importKeystore.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(importKeystore.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.isUnlocked = true;
        state.accounts = action.payload.accounts;
        state.activeAddress = action.payload.activeAddress;
      })
      .addCase(importKeystore.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error.message;
      })

      // Unlock
      .addCase(unlockWallet.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(unlockWallet.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isUnlocked = true;
        state.accounts = action.payload.accounts;
        state.activeAddress = action.payload.activeAddress;
      })
      .addCase(unlockWallet.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error.message;
      })

      // Unlock Biometric
      .addCase(unlockWithBiometric.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(unlockWithBiometric.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isUnlocked = true;
        state.accounts = action.payload.accounts;
        state.activeAddress = action.payload.activeAddress;
      })
      .addCase(unlockWithBiometric.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error.message;
      })

      // Biometric Status
      .addCase(checkBiometricStatus.fulfilled, (state, action) => {
        state.hasBiometricEnabled = action.payload;
      })
      .addCase(enableBiometric.fulfilled, (state) => {
        state.hasBiometricEnabled = true;
      })
      .addCase(disableBiometric.fulfilled, (state) => {
        state.hasBiometricEnabled = false;
      })

      // Add Account
      .addCase(addAccount.fulfilled, (state, action) => {
        state.accounts = action.payload.accounts;
        state.activeAddress = action.payload.activeAddress;
      })

      // Rename Account
      .addCase(renameAccount.fulfilled, (state, action) => {
        state.accounts = action.payload.accounts;
      });
  },
});

export const {
  lockWallet,
  switchAccount,
  clearMnemonic,
  clearError,
  setBalances,
  resetWallet,
} = walletSlice.actions;

export default walletSlice.reducer;
