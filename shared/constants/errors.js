/**
 * NexVault — Error Codes
 * Standardized error codes used across client and server.
 */

export const ERROR_CODES = {
  // Auth errors (1xxx)
  AUTH_INVALID_NONCE: { code: 1001, message: 'Invalid or expired nonce' },
  AUTH_INVALID_SIGNATURE: { code: 1002, message: 'Invalid signature' },
  AUTH_TOKEN_EXPIRED: { code: 1003, message: 'Access token expired' },
  AUTH_REFRESH_EXPIRED: { code: 1004, message: 'Refresh token expired' },
  AUTH_REFRESH_REUSED: { code: 1005, message: 'Refresh token reuse detected — all sessions invalidated' },
  AUTH_UNAUTHORIZED: { code: 1006, message: 'Unauthorized access' },
  AUTH_FORBIDDEN: { code: 1007, message: 'Insufficient permissions' },
  AUTH_ACCOUNT_BLOCKED: { code: 1008, message: 'Account has been blocked' },

  // Vault errors (2xxx)
  VAULT_NOT_INITIALIZED: { code: 2001, message: 'Vault has not been initialized' },
  VAULT_ALREADY_EXISTS: { code: 2002, message: 'Vault already exists' },
  VAULT_WRONG_PASSWORD: { code: 2003, message: 'Incorrect password' },
  VAULT_LOCKED: { code: 2004, message: 'Vault is locked' },
  VAULT_CORRUPTED: { code: 2005, message: 'Vault data is corrupted' },
  VAULT_DECRYPT_FAILED: { code: 2006, message: 'Failed to decrypt vault' },

  // Wallet errors (3xxx)
  WALLET_INVALID_MNEMONIC: { code: 3001, message: 'Invalid seed phrase' },
  WALLET_INVALID_PRIVATE_KEY: { code: 3002, message: 'Invalid private key' },
  WALLET_INVALID_KEYSTORE: { code: 3003, message: 'Invalid JSON keystore file' },
  WALLET_ACCOUNT_NOT_FOUND: { code: 3004, message: 'Account not found' },
  WALLET_DUPLICATE_ACCOUNT: { code: 3005, message: 'Account already exists' },

  // Transaction errors (4xxx)
  TX_INSUFFICIENT_BALANCE: { code: 4001, message: 'Insufficient balance' },
  TX_INSUFFICIENT_GAS: { code: 4002, message: 'Insufficient funds for gas' },
  TX_INVALID_ADDRESS: { code: 4003, message: 'Invalid recipient address' },
  TX_INVALID_AMOUNT: { code: 4004, message: 'Invalid amount' },
  TX_REJECTED: { code: 4005, message: 'Transaction rejected by user' },
  TX_FAILED: { code: 4006, message: 'Transaction failed on-chain' },
  TX_SIMULATION_FAILED: { code: 4007, message: 'Transaction simulation failed' },

  // Network errors (5xxx)
  NETWORK_RPC_ERROR: { code: 5001, message: 'RPC connection error' },
  NETWORK_ALL_RPC_FAILED: { code: 5002, message: 'All RPC endpoints failed' },
  NETWORK_UNSUPPORTED: { code: 5003, message: 'Unsupported network' },
  NETWORK_CHAIN_MISMATCH: { code: 5004, message: 'Chain ID mismatch' },

  // Swap errors (6xxx)
  SWAP_QUOTE_FAILED: { code: 6001, message: 'Failed to get swap quote' },
  SWAP_ROUTE_NOT_FOUND: { code: 6002, message: 'No swap route found' },
  SWAP_SLIPPAGE_TOO_HIGH: { code: 6003, message: 'Price impact too high' },
  SWAP_APPROVAL_NEEDED: { code: 6004, message: 'Token approval required' },
  SWAP_EXPIRED: { code: 6005, message: 'Swap quote expired' },

  // Security errors (7xxx)
  SECURITY_PHISHING_DETECTED: { code: 7001, message: 'Phishing site detected' },
  SECURITY_SCAM_CONTRACT: { code: 7002, message: 'Known scam contract' },
  SECURITY_HONEYPOT: { code: 7003, message: 'Potential honeypot token' },
  SECURITY_RUG_PULL_RISK: { code: 7004, message: 'High rug pull risk' },
  SECURITY_SUSPICIOUS_TX: { code: 7005, message: 'Suspicious transaction detected' },

  // Server errors (9xxx)
  SERVER_INTERNAL: { code: 9001, message: 'Internal server error' },
  SERVER_RATE_LIMITED: { code: 9002, message: 'Too many requests' },
  SERVER_MAINTENANCE: { code: 9003, message: 'Service under maintenance' },
  SERVER_VALIDATION: { code: 9004, message: 'Request validation failed' },
};
