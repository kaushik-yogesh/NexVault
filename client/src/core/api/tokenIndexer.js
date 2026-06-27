/**
 * NexVault — Token Indexer API (Proxied via Backend)
 * 
 * Automatically discovers ERC-20 tokens and NFTs for a given address.
 * Standard RPC nodes (Infura) cannot do this natively. It requires an indexer
 * like Alchemy, Moralis, or Covalent.
 * 
 * This proxies the requests to the backend to protect API keys.
 */

import apiClient from './apiClient';

class TokenIndexer {
  /**
   * Fetch all non-zero ERC-20 token balances for an address
   * 
   * @param {string} address - Wallet address
   * @param {string} chainId - Hex chain ID
   * @returns {Promise<Array>} Array of token objects with balances
   */
  async getTokens(address, chainId) {
    try {
      const response = await apiClient.get('/wallet/tokens', {
        params: { address, chainId }
      });
      return response.data?.data || [];
    } catch (error) {
      console.error('[TokenIndexer] Failed to fetch tokens via backend proxy:', error);
      return [];
    }
  }

  /**
   * Fetch NFTs for an address
   */
  async getNFTs(address, chainId) {
    try {
      const response = await apiClient.get('/wallet/nfts', {
        params: { address, chainId }
      });
      return response.data?.data || [];
    } catch (error) {
      console.error('[TokenIndexer] Failed to fetch NFTs via backend proxy:', error);
      return [];
    }
  }
}

const tokenIndexer = new TokenIndexer();
export default tokenIndexer;
