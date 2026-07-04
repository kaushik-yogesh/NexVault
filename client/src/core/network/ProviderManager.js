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
   * Utilizes ethers.FallbackProvider for enterprise-grade failover and health checks.
   * 
   * @param {string} chainId - Hex chain ID
   * @returns {ethers.FallbackProvider}
   */
  getProvider(chainId = activeChainId) {
    const hexId = this._normalizeChainId(chainId);
    const cacheKey = hexId;

    if (providerCache.has(cacheKey)) {
      return providerCache.get(cacheKey);
    }

    const chain = CHAINS[hexId];
    if (!chain) {
      throw new Error(`NETWORK_UNSUPPORTED: Chain ${chainId} not found`);
    }

    // Determine RPC URLs
    const rpcUrls = [
      customRPCs[chainId],
      chain.rpcUrls.primary,
      chain.rpcUrls.secondary,
      chain.rpcUrls.fallback,
    ].filter(Boolean);

    // Create unique list of URLs to avoid duplicate connections
    const uniqueRpcUrls = [...new Set(rpcUrls)];

    // Create a vanilla network object to bypass ethers v6 default plugins
    // (e.g. PolygonGasStationPlugin) which are known to cause 'quorum not met' errors.
    const customNetwork = new ethers.Network(chain.name, chain.chainIdDecimal);

    // Initialize individual providers
    const providers = uniqueRpcUrls.map((url, index) => {
      const provider = new ethers.JsonRpcProvider(url, customNetwork, {
        staticNetwork: true, // Avoid unnecessary eth_chainId calls
        batchMaxCount: 10,   // Request batching
      });
      return {
        provider,
        priority: index, // 0 is highest priority
        weight: 1,
        stallTimeout: 3000, // Trigger failover if response takes >3s
      };
    });

    // Create robust FallbackProvider
    const fallbackProvider = new ethers.FallbackProvider(providers, customNetwork);

    providerCache.set(cacheKey, fallbackProvider);
    return fallbackProvider;
  }

  /**
   * Get a provider with fallback support
   * Since getProvider now returns a robust FallbackProvider, we just alias it
   * to maintain 100% backward compatibility with existing code.
   * 
   * @param {string} chainId - Hex chain ID
   * @returns {Promise<ethers.FallbackProvider>}
   */
  async getProviderWithFallback(chainId = activeChainId) {
    return this.getProvider(chainId);
  }

  /**
   * Get the active chain's provider
   * @returns {ethers.JsonRpcProvider}
   */
  getActiveProvider() {
    return this.getProvider(activeChainId);
  }

  _normalizeChainId(chainId) {
    let hexId = chainId;
    if (typeof chainId === 'number') {
      hexId = `0x${chainId.toString(16)}`;
    } else if (typeof chainId === 'string' && !chainId.startsWith('0x') && !isNaN(Number(chainId))) {
      hexId = `0x${Number(chainId).toString(16)}`;
    } else if (typeof chainId === 'string') {
      hexId = chainId.toLowerCase();
    }
    return hexId;
  }

  /**
   * Switch the active chain
   * @param {string} chainId - Hex chain ID
   * @returns {ethers.JsonRpcProvider}
   */
  switchChain(chainId) {
    const hexId = this._normalizeChainId(chainId);
    if (!CHAINS[hexId] && !customRPCs[hexId]) {
      throw new Error(`NETWORK_UNSUPPORTED: Chain ${chainId} not supported`);
    }
    activeChainId = hexId;
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
   * Get multiple ERC-20 token balances using Multicall3
   * Automatically falls back to individual calls if Multicall is unsupported.
   * 
   * @param {string} address - Wallet address
   * @param {Array<{address: string, decimals: number}>} tokens - Array of token objects
   * @param {string} chainId - Chain ID
   * @returns {Promise<string[]>} Array of formatted balances
   */
  async getMultipleTokenBalances(address, tokens, chainId = activeChainId) {
    if (!tokens || tokens.length === 0) return [];

    const provider = this.getProvider(chainId);
    const multicallAddress = '0xcA11bde05977b3631167028862bE2a173976CA11'; // Multicall3 is universal
    
    try {
      const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];
      const itf = new ethers.Interface(ERC20_ABI);
      
      const calls = tokens.map(token => ({
        target: token.address,
        callData: itf.encodeFunctionData('balanceOf', [address])
      }));

      const MULTICALL_ABI = [
        'function tryAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[] returnData)'
      ];
      
      const multicall = new ethers.Contract(multicallAddress, MULTICALL_ABI, provider);

      // Timeout wrapper to prevent hanging RPCs
      const fetchPromise = multicall.tryAggregate(false, calls);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('RPC_TIMEOUT')), 5000));
      
      const results = await Promise.race([fetchPromise, timeoutPromise]);
      
      return results.map((result, i) => {
        if (result.success && result.returnData !== '0x') {
          try {
            const balance = itf.decodeFunctionResult('balanceOf', result.returnData)[0];
            return ethers.formatUnits(balance, tokens[i].decimals);
          } catch {
            return '0';
          }
        }
        return '0';
      });
    } catch (error) {
      console.warn(`Multicall failed on chain ${chainId}, falling back to sequential...`, error.message);
      // Fallback to sequential execution if Multicall fails or times out
      return await Promise.all(
        tokens.map(async (token) => {
          try {
            return await this.getTokenBalance(address, token.address, token.decimals, chainId);
          } catch {
            return '0';
          }
        })
      );
    }
  }

  /**
   * Get current gas price info
   * @param {string} chainId - Chain ID
   * @returns {Promise<Object>} Gas price data
   */
  async getGasPrice(chainId = activeChainId) {
    const hexId = this._normalizeChainId(chainId);
    const provider = this.getProvider(hexId);
    const chain = CHAINS[hexId];

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
