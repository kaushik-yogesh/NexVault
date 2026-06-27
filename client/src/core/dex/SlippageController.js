/**
 * NexVault — Slippage Controller
 * 
 * Computes minimum acceptable outputs based on user-defined slippage tolerance
 * to protect against front-running and MEV attacks.
 */

class SlippageController {
  /**
   * Calculate the minimum amount out given an expected amount out and slippage tolerance.
   * 
   * @param {bigint} amountOutExpected - The expected amount out in wei
   * @param {number} slippagePct - The slippage tolerance percentage (e.g., 1.0 for 1%)
   * @returns {bigint} - The minimum acceptable amount out in wei
   */
  calculateAmountOutMinimum(amountOutExpected, slippagePct) {
    if (!amountOutExpected || amountOutExpected === 0n) return 0n;
    if (slippagePct < 0) throw new Error("Slippage cannot be negative");

    // Convert slippage to a multiplier (e.g., 1% slippage -> 0.99 multiplier)
    // To maintain precision with bigints, we work in basis points (1 bp = 0.01%)
    const basisPoints = Math.floor(slippagePct * 100);
    const inverseBasisPoints = 10000 - basisPoints;

    return (amountOutExpected * BigInt(inverseBasisPoints)) / 10000n;
  }
}

const slippageController = new SlippageController();
export default slippageController;
