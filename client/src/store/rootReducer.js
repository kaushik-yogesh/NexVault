/**
 * NexVault — Root Reducer
 */

import { combineReducers } from '@reduxjs/toolkit';
import walletReducer from '../features/wallet/walletSlice.js';
import networkReducer from '../features/network/networkSlice.js';
import settingsReducer from '../features/settings/settingsSlice.js';
import contactsReducer from '../features/contacts/contactsSlice.js';
import tokensReducer from '../features/tokens/tokensSlice.js';
import permissionsReducer from '../features/permissions/permissionsSlice.js';
import nftsReducer from '../features/nfts/nftsSlice.js';
import stakingReducer from '../features/portfolio/stakingSlice.js';
import approvalsReducer from '../features/approvals/approvalsSlice.js';
import pricingReducer from '../features/portfolio/pricingSlice.js';
import configReducer from '../features/config/configSlice.js';

const rootReducer = combineReducers({
  wallet: walletReducer,
  network: networkReducer,
  settings: settingsReducer,
  contacts: contactsReducer,
  tokens: tokensReducer,
  permissions: permissionsReducer,
  nfts: nftsReducer,
  staking: stakingReducer,
  approvals: approvalsReducer,
  pricing: pricingReducer,
  config: configReducer,
});

export default rootReducer;
