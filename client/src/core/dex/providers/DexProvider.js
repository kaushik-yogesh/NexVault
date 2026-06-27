/**
 * Base DexProvider
 * 
 * Abstract class representing a single DEX on a specific network.
 * Must be extended by specific AMM types (e.g., UniswapV2Provider, UniswapV3Provider).
 */

export class DexProvider {
  constructor(name, routerAddress, quoterAddress = null, factoryAddress = null) {
    this.name = name;
    this.routerAddress = routerAddress;
    this.quoterAddress = quoterAddress; // Used mainly for V3
    this.factoryAddress = factoryAddress; // Used to check if pairs exist
  }

  /**
   * Get a quote for swapping `sellToken` to `buyToken`
   * 
   * @param {string} sellToken - Address of the token to sell
   * @param {string} buyToken - Address of the token to buy
   * @param {bigint} amountIn - Amount of sellToken in wei
   * @param {ethers.Provider} provider - Ethers provider
   * @returns {Promise<Object>} Object containing { amountOut, path, feeTier } or null if no route
   */
  async getQuote(sellToken, buyToken, amountIn, provider) {
    throw new Error("Method 'getQuote' must be implemented.");
  }

  /**
   * Generate transaction data for the swap
   * 
   * @param {string} sellToken 
   * @param {string} buyToken 
   * @param {bigint} amountIn 
   * @param {bigint} amountOutMinimum 
   * @param {string} recipient - Address receiving the swapped tokens
   * @param {Object} routeData - The path/fee returned from getQuote
   * @returns {Object} { to, data, value }
   */
  generateTxData(sellToken, buyToken, amountIn, amountOutMinimum, recipient, routeData) {
    throw new Error("Method 'generateTxData' must be implemented.");
  }

  /**
   * Helper to determine if a token is the native asset
   */
  isNative(token) {
    return token.toLowerCase() === 'native' || token.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
  }
}
