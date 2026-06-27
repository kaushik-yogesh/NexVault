import { ethers } from 'ethers';
import { DexProvider } from './DexProvider.js';

// Solidly/Aerodrome Router ABI
const AERODROME_ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, tuple(address from, address to, bool stable, address factory)[] memory routes) public view returns (uint[] memory amounts)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, tuple(address from, address to, bool stable, address factory)[] calldata routes, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapExactETHForTokens(uint amountOutMin, tuple(address from, address to, bool stable, address factory)[] calldata routes, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, tuple(address from, address to, bool stable, address factory)[] calldata routes, address to, uint deadline) external returns (uint[] memory amounts)"
];

export class AerodromeProvider extends DexProvider {
  constructor(name, routerAddress, factoryAddress, wethAddress) {
    super(name, routerAddress, null, factoryAddress);
    this.wethAddress = wethAddress;
  }

  async getQuote(sellToken, buyToken, amountIn, provider) {
    if (!amountIn || amountIn <= 0n) return null;

    const tokenIn = this.isNative(sellToken) ? this.wethAddress : sellToken;
    const tokenOut = this.isNative(buyToken) ? this.wethAddress : buyToken;

    const router = new ethers.Contract(this.routerAddress, AERODROME_ROUTER_ABI, provider);
    
    // Aerodrome has stable and volatile pools. We check both for a direct route.
    let routesToTry = [
      [{ from: tokenIn, to: tokenOut, stable: false, factory: this.factoryAddress }],
      [{ from: tokenIn, to: tokenOut, stable: true, factory: this.factoryAddress }]
    ];

    let bestAmountOut = 0n;
    let bestRoute = null;

    for (const route of routesToTry) {
      try {
        const amounts = await router.getAmountsOut(amountIn, route);
        const amountOut = amounts[amounts.length - 1];
        if (amountOut > bestAmountOut) {
          bestAmountOut = amountOut;
          bestRoute = route;
        }
      } catch (err) {
        continue;
      }
    }

    if (bestAmountOut > 0n) {
      return {
        amountOut: bestAmountOut,
        route: bestRoute
      };
    }

    return null;
  }

  generateTxData(sellToken, buyToken, amountIn, amountOutMinimum, recipient, routeData) {
    const isSellNative = this.isNative(sellToken);
    const isBuyNative = this.isNative(buyToken);
    const route = routeData.route;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const iface = new ethers.Interface(AERODROME_ROUTER_ABI);
    let data;
    let value = 0n;

    if (isSellNative) {
      data = iface.encodeFunctionData("swapExactETHForTokens", [
        amountOutMinimum,
        route,
        recipient,
        deadline
      ]);
      value = amountIn;
    } else if (isBuyNative) {
      data = iface.encodeFunctionData("swapExactTokensForETH", [
        amountIn,
        amountOutMinimum,
        route,
        recipient,
        deadline
      ]);
    } else {
      data = iface.encodeFunctionData("swapExactTokensForTokens", [
        amountIn,
        amountOutMinimum,
        route,
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
