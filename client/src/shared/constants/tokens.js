import { CHAIN_IDS } from '../../../../shared/constants/chains.js';

export const POPULAR_TOKENS = {
  [CHAIN_IDS.ETHEREUM]: [
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6, name: 'Tether USD', logoURI: 'https://cryptologos.cc/logos/tether-usdt-logo.png', chainId: CHAIN_IDS.ETHEREUM, isAutoDiscovered: true },
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6, name: 'USD Coin', logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', chainId: CHAIN_IDS.ETHEREUM, isAutoDiscovered: true },
    { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', decimals: 8, name: 'Wrapped BTC', logoURI: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png', chainId: CHAIN_IDS.ETHEREUM, isAutoDiscovered: true },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', decimals: 18, name: 'Dai Stablecoin', logoURI: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png', chainId: CHAIN_IDS.ETHEREUM, isAutoDiscovered: true },
    { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK', decimals: 18, name: 'Chainlink', logoURI: 'https://cryptologos.cc/logos/chainlink-link-logo.png', chainId: CHAIN_IDS.ETHEREUM, isAutoDiscovered: true },
    { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', decimals: 18, name: 'Uniswap', logoURI: 'https://cryptologos.cc/logos/uniswap-uni-logo.png', chainId: CHAIN_IDS.ETHEREUM, isAutoDiscovered: true },
    { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', symbol: 'AAVE', decimals: 18, name: 'Aave', logoURI: 'https://cryptologos.cc/logos/aave-aave-logo.png', chainId: CHAIN_IDS.ETHEREUM, isAutoDiscovered: true }
  ],
  [CHAIN_IDS.BSC]: [
    { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', decimals: 18, name: 'Tether USD', logoURI: 'https://cryptologos.cc/logos/tether-usdt-logo.png', chainId: CHAIN_IDS.BSC, isAutoDiscovered: true },
    { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', decimals: 18, name: 'USD Coin', logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', chainId: CHAIN_IDS.BSC, isAutoDiscovered: true },
    { address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', symbol: 'CAKE', decimals: 18, name: 'PancakeSwap', logoURI: 'https://cryptologos.cc/logos/pancakeswap-cake-logo.png', chainId: CHAIN_IDS.BSC, isAutoDiscovered: true },
    { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', symbol: 'ETH', decimals: 18, name: 'Ethereum', logoURI: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', chainId: CHAIN_IDS.BSC, isAutoDiscovered: true },
    { address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', symbol: 'BTCB', decimals: 18, name: 'Bitcoin BEP2', logoURI: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', chainId: CHAIN_IDS.BSC, isAutoDiscovered: true },
    { address: '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE', symbol: 'XRP', decimals: 18, name: 'XRP', logoURI: 'https://cryptologos.cc/logos/xrp-xrp-logo.png', chainId: CHAIN_IDS.BSC, isAutoDiscovered: true },
    { address: '0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409', symbol: 'FDUSD', decimals: 18, name: 'First Digital USD', logoURI: 'https://cryptologos.cc/logos/first-digital-usd-fdusd-logo.png', chainId: CHAIN_IDS.BSC, isAutoDiscovered: true }
  ],
  [CHAIN_IDS.POLYGON]: [
    { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6, name: 'Tether USD', logoURI: 'https://cryptologos.cc/logos/tether-usdt-logo.png', chainId: CHAIN_IDS.POLYGON, isAutoDiscovered: true },
    { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC', decimals: 6, name: 'USD Coin', logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', chainId: CHAIN_IDS.POLYGON, isAutoDiscovered: true },
    { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', symbol: 'WETH', decimals: 18, name: 'Wrapped Ether', logoURI: 'https://cryptologos.cc/logos/weth-weth-logo.png', chainId: CHAIN_IDS.POLYGON, isAutoDiscovered: true },
    { address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', symbol: 'WBTC', decimals: 8, name: 'Wrapped BTC', logoURI: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png', chainId: CHAIN_IDS.POLYGON, isAutoDiscovered: true },
    { address: '0xb0897686c545045aFc77CF20eC7A532E3120E0F1', symbol: 'LINK', decimals: 18, name: 'Chainlink', logoURI: 'https://cryptologos.cc/logos/chainlink-link-logo.png', chainId: CHAIN_IDS.POLYGON, isAutoDiscovered: true },
    { address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B', symbol: 'AAVE', decimals: 18, name: 'Aave', logoURI: 'https://cryptologos.cc/logos/aave-aave-logo.png', chainId: CHAIN_IDS.POLYGON, isAutoDiscovered: true },
    { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', symbol: 'DAI', decimals: 18, name: 'Dai Stablecoin', logoURI: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png', chainId: CHAIN_IDS.POLYGON, isAutoDiscovered: true }
  ],
  [CHAIN_IDS.ARBITRUM]: [
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', decimals: 6, name: 'Tether USD', logoURI: 'https://cryptologos.cc/logos/tether-usdt-logo.png', chainId: CHAIN_IDS.ARBITRUM, isAutoDiscovered: true },
    { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', decimals: 6, name: 'USD Coin', logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', chainId: CHAIN_IDS.ARBITRUM, isAutoDiscovered: true },
    { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', symbol: 'ARB', decimals: 18, name: 'Arbitrum', logoURI: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png', chainId: CHAIN_IDS.ARBITRUM, isAutoDiscovered: true },
    { address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', symbol: 'WBTC', decimals: 8, name: 'Wrapped BTC', logoURI: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png', chainId: CHAIN_IDS.ARBITRUM, isAutoDiscovered: true },
    { address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', symbol: 'LINK', decimals: 18, name: 'Chainlink', logoURI: 'https://cryptologos.cc/logos/chainlink-link-logo.png', chainId: CHAIN_IDS.ARBITRUM, isAutoDiscovered: true },
    { address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0', symbol: 'UNI', decimals: 18, name: 'Uniswap', logoURI: 'https://cryptologos.cc/logos/uniswap-uni-logo.png', chainId: CHAIN_IDS.ARBITRUM, isAutoDiscovered: true },
    { address: '0xfc5A1A6AD04352D042C04B1440C0100C4D024Bcb', symbol: 'GMX', decimals: 18, name: 'GMX', logoURI: 'https://cryptologos.cc/logos/gmx-gmx-logo.png', chainId: CHAIN_IDS.ARBITRUM, isAutoDiscovered: true }
  ],
  [CHAIN_IDS.OPTIMISM]: [
    { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', decimals: 6, name: 'Tether USD', logoURI: 'https://cryptologos.cc/logos/tether-usdt-logo.png', chainId: CHAIN_IDS.OPTIMISM, isAutoDiscovered: true },
    { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', decimals: 6, name: 'USD Coin', logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', chainId: CHAIN_IDS.OPTIMISM, isAutoDiscovered: true },
    { address: '0x4200000000000000000000000000000000000042', symbol: 'OP', decimals: 18, name: 'Optimism', logoURI: 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.png', chainId: CHAIN_IDS.OPTIMISM, isAutoDiscovered: true },
    { address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095', symbol: 'WBTC', decimals: 8, name: 'Wrapped BTC', logoURI: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png', chainId: CHAIN_IDS.OPTIMISM, isAutoDiscovered: true },
    { address: '0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db', symbol: 'VELO', decimals: 18, name: 'Velodrome Finance', logoURI: 'https://cryptologos.cc/logos/velodrome-finance-velo-logo.png', chainId: CHAIN_IDS.OPTIMISM, isAutoDiscovered: true },
    { address: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4', symbol: 'SNX', decimals: 18, name: 'Synthetix Network Token', logoURI: 'https://cryptologos.cc/logos/synthetix-network-token-snx-logo.png', chainId: CHAIN_IDS.OPTIMISM, isAutoDiscovered: true },
    { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI', decimals: 18, name: 'Dai Stablecoin', logoURI: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png', chainId: CHAIN_IDS.OPTIMISM, isAutoDiscovered: true }
  ],
  [CHAIN_IDS.BASE]: [
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6, name: 'USD Coin', logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', chainId: CHAIN_IDS.BASE, isAutoDiscovered: true },
    { address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', symbol: 'cbBTC', decimals: 8, name: 'Coinbase Wrapped BTC', logoURI: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png', chainId: CHAIN_IDS.BASE, isAutoDiscovered: true },
    { address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', symbol: 'AERO', decimals: 18, name: 'Aerodrome Finance', logoURI: 'https://cryptologos.cc/logos/aerodrome-finance-aero-logo.png', chainId: CHAIN_IDS.BASE, isAutoDiscovered: true },
    { address: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed', symbol: 'DEGEN', decimals: 18, name: 'Degen', logoURI: 'https://cryptologos.cc/logos/degen-degen-logo.png', chainId: CHAIN_IDS.BASE, isAutoDiscovered: true },
    { address: '0x532f27101965dd16442E59d40670FfF342323D42', symbol: 'BRETT', decimals: 18, name: 'Brett', logoURI: 'https://cryptologos.cc/logos/brett-brett-logo.png', chainId: CHAIN_IDS.BASE, isAutoDiscovered: true },
    { address: '0xA88594D404727625A9437C3f886C7643872296AE', symbol: 'WELL', decimals: 18, name: 'Moonwell', logoURI: 'https://cryptologos.cc/logos/moonwell-well-logo.png', chainId: CHAIN_IDS.BASE, isAutoDiscovered: true },
    { address: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42', symbol: 'EURC', decimals: 6, name: 'EURC', logoURI: 'https://cryptologos.cc/logos/euro-coin-eurc-logo.png', chainId: CHAIN_IDS.BASE, isAutoDiscovered: true }
  ]
};

export const getAllPopularTokens = () => {
  return Object.values(POPULAR_TOKENS).flat();
};
