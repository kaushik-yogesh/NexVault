# NexVault

Enterprise-Grade Non-Custodial Multi-Chain Web3 Wallet.

## Features
- **True Non-Custodial**: Seed phrases encrypted locally via WebCrypto (AES-GCM).
- **Multi-Chain**: ETH, BNB, Polygon, Arbitrum, Optimism, Base.
- **Injected Provider**: Compatible with DApps via `window.ethereum`.
- **DEX Aggregator**: Native swaps with optimal routing.
- **Staking**: Liquid and Native staking integrations.
- **Security Scanner**: Anti-honeypot transaction simulation.

## Prerequisites
- Node.js 20+
- MongoDB (for backend analytics)
- Redis (for backend caching/rate-limiting)

## Quick Start (Local Development)

### 1. Install Dependencies
```bash
# Install root dependencies
npm install

# Install workspace dependencies
npm run install:all
```

### 2. Start the Stack
```bash
# Run the Client, Server, and Admin Panel concurrently
npm run dev
```

- Wallet App: `http://localhost:5173`
- Admin Panel: `http://localhost:5174`
- API Server: `http://localhost:5000`

### 3. Build Chrome Extension
```bash
cd client
npm run build
```
Load the `client/dist` directory into Chrome via `chrome://extensions/` (Developer Mode -> Load Unpacked).

## Docker
To run the backend infrastructure locally using Docker:
```bash
docker-compose up -d
```
