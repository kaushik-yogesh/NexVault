/**
 * NexVault — Supported Chain Definitions
 * Each chain includes all metadata needed for wallet operations.
 */

export const CHAIN_IDS = {
  ETHEREUM: '0x1',
  BSC: '0x38',
  POLYGON: '0x89',
  ARBITRUM: '0xa4b1',
  OPTIMISM: '0xa',
  BASE: '0x2105',
};

const ALCHEMY_KEY = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_ALCHEMY_API_KEY : '';

export const CHAINS = {
  [CHAIN_IDS.ETHEREUM]: {
    chainId: '0x1',
    chainIdDecimal: 1,
    name: 'Ethereum',
    shortName: 'ETH',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      primary: ALCHEMY_KEY ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}` : 'https://ethereum.publicnode.com',
      secondary: 'https://eth.llamarpc.com',
      fallback: 'https://rpc.ankr.com/eth',
    },
    blockExplorer: {
      name: 'Etherscan',
      url: 'https://etherscan.io',
      apiUrl: 'https://api.etherscan.io/api',
    },
    icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    color: '#627EEA',
    isTestnet: false,
    supportsEIP1559: true,
    avgBlockTime: 12,
  },

  [CHAIN_IDS.BSC]: {
    chainId: '0x38',
    chainIdDecimal: 56,
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: {
      primary: ALCHEMY_KEY ? `https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}` : 'https://bsc-dataseed.binance.org',
      secondary: 'https://bsc-dataseed1.defibit.io',
      fallback: 'https://bsc-dataseed2.defibit.io',
    },
    blockExplorer: {
      name: 'BscScan',
      url: 'https://bscscan.com',
      apiUrl: 'https://api.bscscan.com/api',
    },
    icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
    color: '#F0B90B',
    isTestnet: false,
    supportsEIP1559: false,
    avgBlockTime: 3,
  },

  [CHAIN_IDS.POLYGON]: {
    chainId: '0x89',
    chainIdDecimal: 137,
    name: 'Polygon',
    shortName: 'MATIC',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    rpcUrls: {
      primary: ALCHEMY_KEY ? `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}` : 'https://polygon.drpc.org',
      secondary: 'https://1rpc.io/matic',
      fallback: 'https://polygon-rpc.com',
    },
    blockExplorer: {
      name: 'Polygonscan',
      url: 'https://polygonscan.com',
      apiUrl: 'https://api.polygonscan.com/api',
    },
    icon: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
    color: '#8247E5',
    isTestnet: false,
    supportsEIP1559: true,
    avgBlockTime: 2,
  },

  [CHAIN_IDS.ARBITRUM]: {
    chainId: '0xa4b1',
    chainIdDecimal: 42161,
    name: 'Arbitrum One',
    shortName: 'ARB',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      primary: ALCHEMY_KEY ? `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}` : 'https://arb1.arbitrum.io/rpc',
      secondary: 'https://arbitrum.publicnode.com',
      fallback: 'https://1rpc.io/arb',
    },
    blockExplorer: {
      name: 'Arbiscan',
      url: 'https://arbiscan.io',
      apiUrl: 'https://api.arbiscan.io/api',
    },
    icon: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
    color: '#28A0F0',
    isTestnet: false,
    supportsEIP1559: true,
    avgBlockTime: 0.25,
  },

  [CHAIN_IDS.OPTIMISM]: {
    chainId: '0xa',
    chainIdDecimal: 10,
    name: 'Optimism',
    shortName: 'OP',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      primary: ALCHEMY_KEY ? `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}` : 'https://mainnet.optimism.io',
      secondary: 'https://optimism.publicnode.com',
      fallback: 'https://1rpc.io/op',
    },
    blockExplorer: {
      name: 'Optimistic Etherscan',
      url: 'https://optimistic.etherscan.io',
      apiUrl: 'https://api-optimistic.etherscan.io/api',
    },
    icon: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.png',
    color: '#FF0420',
    isTestnet: false,
    supportsEIP1559: true,
    avgBlockTime: 2,
  },

  [CHAIN_IDS.BASE]: {
    chainId: '0x2105',
    chainIdDecimal: 8453,
    name: 'Base',
    shortName: 'BASE',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      primary: ALCHEMY_KEY ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}` : 'https://mainnet.base.org',
      secondary: 'https://base.publicnode.com',
      fallback: 'https://1rpc.io/base',
    },
    blockExplorer: {
      name: 'BaseScan',
      url: 'https://basescan.org',
      apiUrl: 'https://api.basescan.org/api',
    },
    icon: 'https://avatars.githubusercontent.com/u/108554348?v=4',

    color: '#0052FF',
    isTestnet: false,
    supportsEIP1559: true,
    avgBlockTime: 2,
  },
};

/** Get chain config by chainId (hex or decimal) */
export function getChain(chainId) {
  const hexId = typeof chainId === 'number' ? `0x${chainId.toString(16)}` : chainId;
  return CHAINS[hexId] || null;
}

/** Get all active chains as array */
export function getAllChains() {
  return Object.values(CHAINS);
}

/** Default chain */
export const DEFAULT_CHAIN_ID = CHAIN_IDS.ETHEREUM;
