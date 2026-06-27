/**
 * NexVault — Event Types
 * Used for analytics, audit logging, and inter-component communication.
 */

export const EVENTS = {
  // Wallet events
  WALLET_CREATED: 'wallet:created',
  WALLET_IMPORTED: 'wallet:imported',
  WALLET_LOCKED: 'wallet:locked',
  WALLET_UNLOCKED: 'wallet:unlocked',
  ACCOUNT_ADDED: 'account:added',
  ACCOUNT_REMOVED: 'account:removed',
  ACCOUNT_RENAMED: 'account:renamed',
  ACCOUNT_SWITCHED: 'account:switched',

  // Network events
  NETWORK_SWITCHED: 'network:switched',
  NETWORK_ADDED: 'network:added',
  RPC_FAILOVER: 'rpc:failover',
  RPC_HEALTH_CHECK: 'rpc:healthCheck',

  // Transaction events
  TX_INITIATED: 'tx:initiated',
  TX_SIGNED: 'tx:signed',
  TX_SUBMITTED: 'tx:submitted',
  TX_CONFIRMED: 'tx:confirmed',
  TX_FAILED: 'tx:failed',
  TX_REJECTED: 'tx:rejected',
  TX_SPEED_UP: 'tx:speedUp',
  TX_CANCELLED: 'tx:cancelled',

  // Swap events
  SWAP_QUOTE_REQUESTED: 'swap:quoteRequested',
  SWAP_QUOTE_RECEIVED: 'swap:quoteReceived',
  SWAP_INITIATED: 'swap:initiated',
  SWAP_COMPLETED: 'swap:completed',
  SWAP_FAILED: 'swap:failed',

  // DApp events
  DAPP_CONNECTED: 'dapp:connected',
  DAPP_DISCONNECTED: 'dapp:disconnected',
  DAPP_PERMISSION_GRANTED: 'dapp:permissionGranted',
  DAPP_PERMISSION_REVOKED: 'dapp:permissionRevoked',
  DAPP_SIGN_REQUEST: 'dapp:signRequest',

  // Security events
  SECURITY_SCAM_DETECTED: 'security:scamDetected',
  SECURITY_PHISHING_BLOCKED: 'security:phishingBlocked',
  SECURITY_TX_SIMULATED: 'security:txSimulated',
  SECURITY_APPROVAL_WARNING: 'security:approvalWarning',

  // Auth events
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_SESSION_EXPIRED: 'auth:sessionExpired',
  AUTH_PIN_FAILED: 'auth:pinFailed',

  // Admin events
  ADMIN_LOGIN: 'admin:login',
  ADMIN_ACTION: 'admin:action',
  ADMIN_CONFIG_CHANGED: 'admin:configChanged',

  // WalletConnect events
  WC_SESSION_PROPOSED: 'wc:sessionProposed',
  WC_SESSION_APPROVED: 'wc:sessionApproved',
  WC_SESSION_REJECTED: 'wc:sessionRejected',
  WC_SESSION_DISCONNECTED: 'wc:sessionDisconnected',
  WC_REQUEST_RECEIVED: 'wc:requestReceived',
};

/** Chrome extension message types */
export const MESSAGE_TYPES = {
  // Popup → Background
  GET_STATE: 'msg:getState',
  UNLOCK_VAULT: 'msg:unlockVault',
  LOCK_VAULT: 'msg:lockVault',
  CREATE_WALLET: 'msg:createWallet',
  IMPORT_WALLET: 'msg:importWallet',
  SIGN_TRANSACTION: 'msg:signTransaction',
  SIGN_MESSAGE: 'msg:signMessage',
  SEND_TRANSACTION: 'msg:sendTransaction',
  GET_BALANCE: 'msg:getBalance',
  SWITCH_NETWORK: 'msg:switchNetwork',
  SWITCH_ACCOUNT: 'msg:switchAccount',
  ADD_ACCOUNT: 'msg:addAccount',

  // Background → Popup
  STATE_UPDATE: 'msg:stateUpdate',
  TX_STATUS_UPDATE: 'msg:txStatusUpdate',

  // Content Script → Background
  PROVIDER_REQUEST: 'msg:providerRequest',
  PROVIDER_RESPONSE: 'msg:providerResponse',

  // Background → Content Script
  ACCOUNT_CHANGED: 'msg:accountChanged',
  CHAIN_CHANGED: 'msg:chainChanged',
  CONNECT_STATUS: 'msg:connectStatus',
};
