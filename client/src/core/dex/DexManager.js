import { UniswapV2Provider } from './providers/UniswapV2Provider.js';
import { UniswapV3Provider } from './providers/UniswapV3Provider.js';
import { CamelotProvider } from './providers/CamelotProvider.js';
import { AerodromeProvider } from './providers/AerodromeProvider.js';

// Native Token wrappers (WETH, WBNB, WMATIC) per chain
const WNATIVE = {
  '0x1': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // ETH: WETH
  '0x38': '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // BSC: WBNB
  '0x89': '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // POLYGON: WMATIC
  '0xa4b1': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // ARBITRUM: WETH
  '0x2105': '0x4200000000000000000000000000000000000006'  // BASE: WETH
};

class DexManager {
  constructor() {
    this.providersByChain = {};
    this._initializeProviders();
  }

  _initializeProviders() {
    // 1. Ethereum (0x1)
    this.providersByChain['0x1'] = [
      new UniswapV2Provider("Uniswap V2", "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", WNATIVE['0x1']),
      new UniswapV3Provider("Uniswap V3", "0xE592427A0AEce92De3Edee1F18E0157C05861564", "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6", WNATIVE['0x1'])
    ];

    // 2. BNB Chain (0x38)
    this.providersByChain['0x38'] = [
      new UniswapV2Provider("PancakeSwap V2", "0x10ED43C718714eb63d5aA57B78B54704E256024E", WNATIVE['0x38']),
      new UniswapV3Provider("PancakeSwap V3", "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4", "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997", WNATIVE['0x38'])
    ];

    // 3. Polygon (0x89)
    this.providersByChain['0x89'] = [
      new UniswapV2Provider("QuickSwap", "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff", WNATIVE['0x89'])
    ];

    // 4. Arbitrum (0xa4b1)
    this.providersByChain['0xa4b1'] = [
      new CamelotProvider("Camelot", "0xc873fEcbd354f5A56E00E710B90EF4201db2448d", WNATIVE['0xa4b1']),
      new UniswapV3Provider("Uniswap V3", "0xE592427A0AEce92De3Edee1F18E0157C05861564", "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6", WNATIVE['0xa4b1'])
    ];

    // 5. Base (0x2105)
    this.providersByChain['0x2105'] = [
      new AerodromeProvider("Aerodrome", "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43", "0x420DD381b31aEf6683db6B902084cB0FFECe40Da", WNATIVE['0x2105']),
      new UniswapV3Provider("Uniswap V3", "0x2626664c2603336E57B271c5C0b26F421741e481", "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a", WNATIVE['0x2105'])
    ];
  }

  /**
   * Get all registered DEX providers for a given chain
   */
  getProvidersForChain(chainId) {
    // Return array of initialized provider classes, or empty if chain unsupported
    return this.providersByChain[chainId.toLowerCase()] || [];
  }
}

const dexManager = new DexManager();
export default dexManager;
