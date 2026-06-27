import { ethers } from 'ethers';
import { DexProvider } from './DexProvider.js';

// Quoter V2 ABI (used by Uniswap V3 and PancakeSwap V3)
const QUOTER_V2_ABI = [
  "function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
];

// SwapRouter02 ABI
const V3_ROUTER_ABI = [
  "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)"
];

export class UniswapV3Provider extends DexProvider {
  constructor(name, routerAddress, quoterAddress, wethAddress) {
    super(name, routerAddress, quoterAddress);
    this.wethAddress = wethAddress;
    this.feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
  }

  async getQuote(sellToken, buyToken, amountIn, provider) {
    if (!amountIn || amountIn <= 0n) return null;
    if (!this.quoterAddress) return null;

    const tokenIn = this.isNative(sellToken) ? this.wethAddress : sellToken;
    const tokenOut = this.isNative(buyToken) ? this.wethAddress : buyToken;

    const quoter = new ethers.Contract(this.quoterAddress, QUOTER_V2_ABI, provider);

    let bestAmountOut = 0n;
    let bestFee = null;

    // Check direct pools across different fee tiers
    for (const fee of this.feeTiers) {
      try {
        const params = {
          tokenIn,
          tokenOut,
          amountIn,
          fee,
          sqrtPriceLimitX96: 0
        };
        
        // QuoterV2 returns a struct, but ethers handles it.
        // If it's QuoterV1, the ABI and return type is different. We assume V2 for modern chains.
        const result = await quoter.quoteExactInputSingle.staticCall(params);
        
        // Handle both tuple returns (V2) and single uint returns (V1 fallback if ABI matches somehow)
        const amountOut = Array.isArray(result) ? result[0] : result;

        if (amountOut > bestAmountOut) {
          bestAmountOut = amountOut;
          bestFee = fee;
        }
      } catch (err) {
        // Pool likely doesn't exist for this fee tier
        continue;
      }
    }

    if (bestAmountOut > 0n) {
      return {
        amountOut: bestAmountOut,
        feeTier: bestFee,
        path: [tokenIn, tokenOut]
      };
    }

    // Note: Multi-hop routing in V3 is complex (ExactInputParams struct with encoded path).
    // For V1 of the Abstraction Layer, we stick to single-hop for V3. 
    return null; 
  }

  generateTxData(sellToken, buyToken, amountIn, amountOutMinimum, recipient, routeData) {
    const isSellNative = this.isNative(sellToken);
    const tokenIn = isSellNative ? this.wethAddress : sellToken;
    const tokenOut = this.isNative(buyToken) ? this.wethAddress : buyToken;
    const fee = routeData.feeTier;

    const iface = new ethers.Interface(V3_ROUTER_ABI);
    
    const params = {
      tokenIn,
      tokenOut,
      fee,
      recipient: this.isNative(buyToken) ? "0x0000000000000000000000000000000000000002" : recipient, // If buying ETH, router unwraps it
      amountIn,
      amountOutMinimum,
      sqrtPriceLimitX96: 0
    };

    const data = iface.encodeFunctionData("exactInputSingle", [params]);

    return {
      to: this.routerAddress,
      data,
      value: isSellNative ? amountIn : 0n
    };
  }
}
