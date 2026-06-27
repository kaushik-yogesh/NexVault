import { UniswapV2Provider } from './UniswapV2Provider.js';

export class CamelotProvider extends UniswapV2Provider {
  // Camelot V2 uses the exact same Router ABI as Uniswap V2 for basic swaps.
  // We can extend it if we need specific Camelot features (like supporting fees on transfer natively),
  // but for a generic DEX abstraction, inheriting V2 logic works perfectly for Arbitrum.
  constructor(name, routerAddress, wethAddress) {
    super(name, routerAddress, wethAddress);
  }
}
