import { ethers } from 'ethers';
import { DexProvider } from './DexProvider.js';

// Standard Uniswap V2 Router ABI for getAmountsOut and swapExactTokensForTokens
const V2_ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)"
];

export class UniswapV2Provider extends DexProvider {
  constructor(name, routerAddress, wethAddress) {
    super(name, routerAddress);
    this.wethAddress = wethAddress; // Required to route Native ETH/BNB/MATIC
  }

  async getQuote(sellToken, buyToken, amountIn, provider) {
    if (!amountIn || amountIn <= 0n) return null;

    const tokenIn = this.isNative(sellToken) ? this.wethAddress : sellToken;
    const tokenOut = this.isNative(buyToken) ? this.wethAddress : buyToken;

    const router = new ethers.Contract(this.routerAddress, V2_ROUTER_ABI, provider);
    
    // Simple 1-hop path, or 2-hop via WETH if neither is WETH
    let pathsToTry = [
      [tokenIn, tokenOut]
    ];
    
    if (tokenIn.toLowerCase() !== this.wethAddress.toLowerCase() && tokenOut.toLowerCase() !== this.wethAddress.toLowerCase()) {
      pathsToTry.push([tokenIn, this.wethAddress, tokenOut]);
    }

    let bestAmountOut = 0n;
    let bestPath = null;

    for (const path of pathsToTry) {
      try {
        const amounts = await router.getAmountsOut(amountIn, path);
        const amountOut = amounts[amounts.length - 1];
        if (amountOut > bestAmountOut) {
          bestAmountOut = amountOut;
          bestPath = path;
        }
      } catch (err) {
        // Pool might not exist for this path
        continue;
      }
    }

    if (bestAmountOut > 0n) {
      return {
        amountOut: bestAmountOut,
        path: bestPath
      };
    }

    return null; // No route found
  }

  generateTxData(sellToken, buyToken, amountIn, amountOutMinimum, recipient, routeData) {
    const isSellNative = this.isNative(sellToken);
    const isBuyNative = this.isNative(buyToken);
    const path = routeData.path;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 mins

    const iface = new ethers.Interface(V2_ROUTER_ABI);
    let data;
    let value = 0n;

    if (isSellNative) {
      // ETH -> Token
      data = iface.encodeFunctionData("swapExactETHForTokens", [
        amountOutMinimum,
        path,
        recipient,
        deadline
      ]);
      value = amountIn;
    } else if (isBuyNative) {
      // Token -> ETH
      data = iface.encodeFunctionData("swapExactTokensForETH", [
        amountIn,
        amountOutMinimum,
        path,
        recipient,
        deadline
      ]);
    } else {
      // Token -> Token
      data = iface.encodeFunctionData("swapExactTokensForTokens", [
        amountIn,
        amountOutMinimum,
        path,
        recipient,
        deadline
      ]);
    }

    return {
      to: this.routerAddress,
      data,
      value
    };
  }
}
