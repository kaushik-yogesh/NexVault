# NexVault Architecture & Security

## System Overview
NexVault is an enterprise-grade, non-custodial multi-chain crypto wallet designed to run as a browser extension and progressive web app (PWA).

### Repositories
- `/client`: React/Vite frontend (Wallet UI and Chrome Extension scripts).
- `/server`: Node.js/Express backend (Analytics, Swap Aggregation, SIWE).
- `/admin`: React Admin panel for managing global configurations.
- `/shared`: Common utilities, chain configs, and ABIs.

## Security Model: The Non-Custodial Vault
The most critical part of NexVault is the `VaultManager` and `CryptoEngine`.

### Rule Zero
**Private keys, seed phrases, and passwords NEVER leave the user's local device.**
The backend API is entirely stateless regarding user cryptography. It acts only as an indexer, relayer, and aggregator.

### Encryption Flow
1. **Master Password**: When a user creates a wallet, they input a password.
2. **Key Derivation (PBKDF2)**: The password is run through `PBKDF2` (100,000 iterations) with a random salt to generate a 256-bit encryption key.
3. **Vault Encryption (AES-GCM)**: The user's BIP-39 mnemonic is encrypted using `AES-256-GCM` with the derived key and a random IV.
4. **Storage (IndexedDB)**: The encrypted blob, salt, and IV are stored in the browser's IndexedDB. The raw mnemonic is immediately wiped from memory.

### HD Wallet Generation
When the vault is unlocked, `WalletManager` uses `ethers.js` `HDNodeWallet` to derive accounts using standard BIP-44 paths (e.g., `m/44'/60'/0'/0/0`).

## Network Manager & RPC Failover
To ensure uptime, `ProviderManager.js` maintains a list of RPCs for each chain (Ethereum, Polygon, Arbitrum, etc.). If an RPC call fails, it automatically falls back to the next RPC in the array.

## Swap Aggregation
Swaps are handled by hitting `/api/swap/quote`. The backend interacts with DEX aggregators (like 0x or 1inch) to find the best route.
A global platform fee (configurable via the Admin Panel) is calculated dynamically before the quote is returned to the user.

## Extension Integration (Manifest V3)
NexVault injects an EIP-1193 compatible `window.ethereum` object into web pages.
- `injectProvider.js`: Lives in the webpage context. Relays requests via `postMessage`.
- `contentScript.js`: Forwards messages to the background worker.
- `background/index.js`: Intercepts `eth_sendTransaction` and uses `chrome.windows.create` to pop open the NexVault UI for user approval.
