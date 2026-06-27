/**
 * NexVault — Price Impact Calculator
 * 
 * Calculates the deviation of the execution price from the spot price.
 */

class PriceImpactCalculator {
  /**
   * Calculate price impact percentage
   * 
   * @param {number} sellValueUsd - The total value of the tokens being sold in USD
   * @param {number} expectedBuyValueUsd - The total value of the tokens expected to receive in USD (before fees/impact)
   * @param {number} actualBuyValueUsd - The actual value of the tokens being received in USD (based on quote)
   * @returns {string} - Price impact percentage formatted to 2 decimals
   */
  calculateImpact(sellValueUsd, expectedBuyValueUsd, actualBuyValueUsd) {
    if (sellValueUsd <= 0 || expectedBuyValueUsd <= 0) return '0.00';

    // The impact is how much less value we are getting compared to the ideal spot price execution
    let impact = ((expectedBuyValueUsd - actualBuyValueUsd) / expectedBuyValueUsd) * 100;
    
    // Prevent negative impact (arbitrage opportunity or minor oracle desync)
    if (impact < 0) impact = 0;
    
    // Cap at 100%
    if (impact > 100) impact = 100;

    return impact.toFixed(2);
  }
}

const priceImpactCalculator = new PriceImpactCalculator();
export default priceImpactCalculator;
