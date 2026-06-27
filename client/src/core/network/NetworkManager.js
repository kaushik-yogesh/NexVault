/**
 * NexVault — NetworkManager
 * 
 * Centralized manager for intelligent network handling:
 * - Syncs Redux state and ProviderManager
 * - Multi-chain contract detection
 * - Automatic network switching for internal navigation
 */

import { store } from '../../store/store.js';
import { switchNetwork } from '../../features/network/networkSlice.js';
import providerManager from './ProviderManager.js';
import { CHAINS } from '../../../../shared/constants/chains.js';
import { Contract } from 'ethers';

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)"
];

class NetworkManager {
  /**
   * Switch the global active network.
   * Updates Redux state, which updates the UI.
   * Also updates ProviderManager's active chain.
   */
  async switchChain(chainId) {
    const currentChainId = store.getState().network.activeChainId;
    if (currentChainId === chainId) return;

    // Update ProviderManager
    providerManager.switchChain(chainId);

    // Update Redux state
    store.dispatch(switchNetwork(chainId));
  }

  /**
   * Search for an ERC20 contract across all supported networks.
   * Returns the chainId where it was found and its metadata, or null.
   */
  async findTokenAcrossChains(contractAddress) {
    const supportedChains = Object.values(CHAINS);

    // Run parallel checks across all networks
    const checks = supportedChains.map(async (chain) => {
      try {
        const provider = await providerManager.getProviderWithFallback(chain.chainId);
        const contract = new Contract(contractAddress, ERC20_ABI, provider);
        
        // Try calling a standard ERC20 method
        const symbol = await contract.symbol();
        if (symbol) {
          // Token exists on this chain
          return {
            chainId: chain.chainId,
            chainName: chain.name,
            symbol: symbol,
            decimals: await contract.decimals().catch(() => 18),
            name: await contract.name().catch(() => ''),
          };
        }
      } catch (error) {
        // Contract doesn't exist or isn't ERC20 on this chain
        return null;
      }
    });

    const results = await Promise.all(checks);
    return results.find((res) => res !== null) || null;
  }
}

const networkManager = new NetworkManager();
export default networkManager;
