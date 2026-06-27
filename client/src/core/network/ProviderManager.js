/**
 * NexVault — ProviderManager
 * 
 * Manages ethers.js providers for all supported chains.
 * Features:
 * - Multi-chain provider creation and caching
 * - Automatic RPC failover (primary → secondary → fallback)
 * - Health monitoring integration
 * - Custom RPC support
 */

import { ethers } from 'ethers';
import { CHAINS, CHAIN_IDS, DEFAULT_CHAIN_ID } from '../../../../shared/constants/chains.js';

/** Provider cache to avoid re-creating providers */
const providerCache = new Map();

/** Custom RPC overrides (loaded from settings) */
let customRPCs = {};

/** Currently active chain ID */
let activeChainId = DEFAULT_CHAIN_ID;

class ProviderManager {
  /**
   * Get a provider for a specific chain
   * Uses caching — returns existing provider if available.
   * 
   * @param {string} chainId - Hex chain ID
   * @returns {ethers.JsonRpcProvider}
   */
  getProvider(chainId = activeChainId) {
    const cacheKey = chainId;

    if (providerCache.has(cacheKey)) {
      return providerCache.get(cacheKey);
    }

    const chain = CHAINS[chainId];
    if (!chain) {
      throw new Error(`NETWORK_UNSUPPORTED: Chain ${chainId} not found`);
    }

    // Check for custom RPC override
    const rpcUrl = customRPCs[chainId] || chain.rpcUrls.primary;

    const provider = new ethers.JsonRpcProvider(rpcUrl, chain.chainIdDecimal, {
      staticNetwork: true, // Avoid unnecessary eth_chainId calls
      batchMaxCount: 10,
    });

    providerCache.set(cacheKey, provider);
    return provider;
  }

  /**
   * Get a provider with fallback support
   * Tries primary, then secondary, then fallback RPC.
   * 
   * @param {string} chainId - Hex chain ID
   * @returns {Promise<ethers.JsonRpcProvider>}
   */
  async getProviderWithFallback(chainId = activeChainId) {
    const chain = CHAINS[chainId];
    if (!chain) {
      throw new Error(`NETWORK_UNSUPPORTED: Chain ${chainId} not found`);
    }

    const rpcUrls = [
      customRPCs[chainId],
      chain.rpcUrls.primary,
      chain.rpcUrls.secondary,
      chain.rpcUrls.fallback,
    ].filter(Boolean);

    for (const rpcUrl of rpcUrls) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl, chain.chainIdDecimal, {
          staticNetwork: true,
        });
        // Quick health check
        await provider.getBlockNumber();

        // Cache the working provider
        providerCache.set(chainId, provider);
        return provider;
      } catch (error) {
        console.warn(`RPC failed for ${chain.name}: ${rpcUrl}`, error.message);
        continue;
      }
    }

    throw new Error(`NETWORK_ALL_RPC_FAILED: All RPCs failed for ${chain.name}`);
  }

  /**
   * Get the active chain's provider
   * @returns {ethers.JsonRpcProvider}
   */
  getActiveProvider() {
    return this.getProvider(activeChainId);
  }

  /**
   * Switch the active chain
   * @param {string} chainId - Hex chain ID
   * @returns {ethers.JsonRpcProvider}
   */
  switchChain(chainId) {
    if (!CHAINS[chainId] && !customRPCs[chainId]) {
      throw new Error(`NETWORK_UNSUPPORTED: Chain ${chainId} not supported`);
    }
    activeChainId = chainId;
    return this.getProvider(chainId);
  }

  /**
   * Get the currently active chain ID
   * @returns {string}
   */
  getActiveChainId() {
    return activeChainId;
  }

  /**
   * Set a custom RPC URL for a chain
   * @param {string} chainId - Hex chain ID
   * @param {string} rpcUrl - Custom RPC URL
   */
  setCustomRPC(chainId, rpcUrl) {
    customRPCs[chainId] = rpcUrl;
    // Clear cached provider so it uses the new RPC
    providerCache.delete(chainId);
  }

  /**
   * Remove custom RPC for a chain (revert to default)
   * @param {string} chainId - Hex chain ID
   */
  removeCustomRPC(chainId) {
    delete customRPCs[chainId];
    providerCache.delete(chainId);
  }

  /**
   * Add a completely custom chain (not in CHAINS registry)
   * @param {Object} chainConfig - Chain configuration
   */
  addCustomChain(chainConfig) {
    const { chainId, rpcUrl } = chainConfig;
    customRPCs[chainId] = rpcUrl;
    // Clear cache
    providerCache.delete(chainId);
  }

  /**
   * Load custom RPCs from settings
   * @param {Object} rpcs - Map of chainId → rpcUrl
   */
  loadCustomRPCs(rpcs) {
    customRPCs = { ...rpcs };
    // Clear all cached providers
    providerCache.clear();
  }

  /**
   * Get balance for an address on a specific chain
   * @param {string} address - Wallet address
   * @param {string} chainId - Chain ID
   * @returns {Promise<string>} Balance in ETH units
   */
  async getBalance(address, chainId = activeChainId) {
    const provider = this.getProvider(chainId);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  /**
   * Get ERC-20 token balance
   * @param {string} address - Wallet address
   * @param {string} tokenAddress - Token contract address
   * @param {number} decimals - Token decimals
   * @param {string} chainId - Chain ID
   * @returns {Promise<string>} Balance in token units
   */
  async getTokenBalance(address, tokenAddress, decimals, chainId = activeChainId) {
    const provider = this.getProvider(chainId);
    const contract = new ethers.Contract(
      tokenAddress,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );
    const balance = await contract.balanceOf(address);
    return ethers.formatUnits(balance, decimals);
  }

  /**
   * Get current gas price info
   * @param {string} chainId - Chain ID
   * @returns {Promise<Object>} Gas price data
   */
  async getGasPrice(chainId = activeChainId) {
    const provider = this.getProvider(chainId);
    const chain = CHAINS[chainId];

    if (chain?.supportsEIP1559) {
      const feeData = await provider.getFeeData();
      return {
        type: 'eip1559',
        maxFeePerGas: ethers.formatUnits(feeData.maxFeePerGas || 0n, 'gwei'),
        maxPriorityFeePerGas: ethers.formatUnits(
          feeData.maxPriorityFeePerGas || 0n,
          'gwei'
        ),
        gasPrice: ethers.formatUnits(feeData.gasPrice || 0n, 'gwei'),
      };
    } else {
      const feeData = await provider.getFeeData();
      return {
        type: 'legacy',
        gasPrice: ethers.formatUnits(feeData.gasPrice || 0n, 'gwei'),
      };
    }
  }

  /**
   * Estimate gas for a transaction
   * @param {Object} tx - Transaction object
   * @param {string} chainId - Chain ID
   * @returns {Promise<bigint>} Estimated gas limit
   */
  async estimateGas(tx, chainId = activeChainId) {
    const provider = this.getProvider(chainId);
    return provider.estimateGas(tx);
  }

  /**
   * Get transaction receipt
   * @param {string} txHash - Transaction hash
   * @param {string} chainId - Chain ID
   * @returns {Promise<ethers.TransactionReceipt|null>}
   */
  async getTransactionReceipt(txHash, chainId = activeChainId) {
    const provider = this.getProvider(chainId);
    return provider.getTransactionReceipt(txHash);
  }

  /**
   * Wait for transaction confirmation
   * @param {string} txHash - Transaction hash
   * @param {number} confirmations - Required confirmations
   * @param {string} chainId - Chain ID
   * @returns {Promise<ethers.TransactionReceipt>}
   */
  async waitForTransaction(txHash, confirmations = 1, chainId = activeChainId) {
    const provider = this.getProvider(chainId);
    return provider.waitForTransaction(txHash, confirmations, 60000);
  }

  /**
   * Get transaction history using provider logs
   * @param {string} address - Address to get history for
   * @param {number} fromBlock - Starting block
   * @param {string} chainId - Chain ID
   * @returns {Promise<Object[]>}
   */
  async getTransactionHistory(address, fromBlock = 0, chainId = activeChainId) {
    const provider = this.getProvider(chainId);
    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(fromBlock, currentBlock - 10000); // Last ~10000 blocks

    // Get sent transactions
    const sentFilter = {
      fromBlock: startBlock,
      toBlock: 'latest',
      topics: [
        ethers.id('Transfer(address,address,uint256)'),
        ethers.zeroPadValue(address, 32),
      ],
    };

    // Get received transactions
    const receivedFilter = {
      fromBlock: startBlock,
      toBlock: 'latest',
      topics: [
        ethers.id('Transfer(address,address,uint256)'),
        null,
        ethers.zeroPadValue(address, 32),
      ],
    };

    try {
      const [sentLogs, receivedLogs] = await Promise.all([
        provider.getLogs(sentFilter),
        provider.getLogs(receivedFilter),
      ]);

      return [...sentLogs, ...receivedLogs].sort(
        (a, b) => (b.blockNumber || 0) - (a.blockNumber || 0)
      );
    } catch {
      // Fallback: return empty for chains that don't support broad log queries
      return [];
    }
  }

  /**
   * Clear all cached providers
   */
  clearCache() {
    providerCache.clear();
  }

  /**
   * Destroy a specific cached provider
   * @param {string} chainId - Chain ID
   */
  removeProvider(chainId) {
    const provider = providerCache.get(chainId);
    if (provider) {
      provider.destroy?.();
      providerCache.delete(chainId);
    }
  }
}

const providerManager = new ProviderManager();
export default providerManager;
