import dexManager from './DexManager.js';
import providerManager from '../network/ProviderManager.js';
import { ethers } from 'ethers';

/**
 * NexVault — Quote Engine
 * 
 * Handles Liquidity Discovery and Router Selection by querying all available
 * DEX providers for a given chain and selecting the one that offers the 
 * highest output amount for the user.
 */
class QuoteEngine {
  /**
   * Find the best DEX route for a swap
   * 
   * @param {string} chainId 
   * @param {string} sellToken 
   * @param {string} buyToken 
   * @param {bigint} amountIn 
   * @returns {Promise<Object>} Best quote { provider, amountOut, routeData }
   */
  async getBestQuote(chainId, sellToken, buyToken, amountIn) {
    const providers = dexManager.getProvidersForChain(chainId);
    if (providers.length === 0) {
      throw new Error(`No DEX providers configured for chain ${chainId}`);
    }

    const rpcProvider = providerManager.getProvider(chainId);
    if (!rpcProvider) {
      throw new Error(`No RPC provider available for chain ${chainId}`);
    }

    let bestQuote = null;
    let maxAmountOut = 0n;

    // Liquidity Discovery: Query all DEXs concurrently
    const quotePromises = providers.map(async (provider) => {
      try {
        const quote = await provider.getQuote(sellToken, buyToken, amountIn, rpcProvider);
        if (quote && quote.amountOut > 0n) {
          return {
            provider,
            amountOut: quote.amountOut,
            routeData: quote
          };
        }
      } catch (err) {
        console.warn(`[QuoteEngine] Provider ${provider.name} failed to generate quote:`, err.message);
      }
      return null;
    });

    const results = await Promise.all(quotePromises);

    // Router Selection: Pick the provider with the highest output
    for (const result of results) {
      if (result && result.amountOut > maxAmountOut) {
        maxAmountOut = result.amountOut;
        bestQuote = result;
      }
    }

    if (!bestQuote) {
      throw new Error("Insufficient liquidity for this trade on all supported DEXs.");
    }

    return bestQuote;
  }
}

const quoteEngine = new QuoteEngine();
export default quoteEngine;
