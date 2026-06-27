/**
 * NexVault — Pricing Service (CoinGecko)
 * Includes in-memory caching to prevent 429 Too Many Requests
 */

import axios from 'axios';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Persistent cache using localStorage to survive extension popup closes
const apiCache = {
  store: new Map(), // memory fallback
  set(key, value, ttl = 60000) { 
    const data = { value, expiry: Date.now() + ttl };
    this.store.set(key, data);
    try {
      localStorage.setItem(`price_cache_${key}`, JSON.stringify(data));
    } catch (e) {
      // Ignore localStorage errors (e.g., incognito mode quota)
    }
  },
  get(key) {
    // 1. Try memory
    let item = this.store.get(key);
    
    // 2. Try localStorage if not in memory
    if (!item) {
      try {
        const stored = localStorage.getItem(`price_cache_${key}`);
        if (stored) {
          item = JSON.parse(stored);
          this.store.set(key, item); // Sync to memory
        }
      } catch (e) {}
    }

    if (item && item.expiry > Date.now()) {
      return item.value;
    }
    
    return null;
  }
};

// Map of popular chain IDs (hex strings) to CoinGecko platform IDs
const CHAIN_TO_PLATFORM = {
  '0x1': 'ethereum',
  '0x89': 'polygon-pos',
  '0xa4b1': 'arbitrum-one',
  '0xa': 'optimistic-ethereum',
  '0x38': 'binance-smart-chain',
  '0x2105': 'base',
};

// Map of native tokens
const NATIVE_TOKEN_IDS = {
  '0x1': 'ethereum',
  '0x89': 'matic-network',
  '0xa4b1': 'ethereum', // uses ETH
  '0xa': 'ethereum',
  '0x38': 'binancecoin',
  '0x2105': 'ethereum', // base uses ETH
};

export const getNativePrice = async (chainId) => {
  const cacheKey = `native_price_${chainId}`;
  const cached = apiCache.get(cacheKey);
  if (cached) return cached;

  try {
    const coinId = NATIVE_TOKEN_IDS[chainId] || 'ethereum';
    const response = await axios.get(`${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`);
    const result = {
      price: response.data[coinId]?.usd || 0,
      change24h: response.data[coinId]?.usd_24h_change || 0
    };
    apiCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn('Failed to fetch native price:', error.message);
    return { price: 0, change24h: 0 };
  }
};

export const getTokenPrices = async (chainId, addresses) => {
  try {
    const platform = CHAIN_TO_PLATFORM[chainId];
    if (!platform || !addresses || addresses.length === 0) return {};

    // Sort addresses for consistent cache keys
    const sortedAddresses = [...addresses].sort();
    const cacheKey = `token_prices_${chainId}_${sortedAddresses.join(',')}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    const contractAddresses = sortedAddresses.join(',');
    const prices = {};
    
    // 1. Try CoinGecko first
    try {
      const response = await axios.get(`${COINGECKO_API}/simple/token_price/${platform}?contract_addresses=${contractAddresses}&vs_currencies=usd&include_24hr_change=true`);
      Object.keys(response.data).forEach(addr => {
        prices[addr.toLowerCase()] = {
          price: response.data[addr]?.usd || 0,
          change24h: response.data[addr]?.usd_24h_change || 0
        };
      });
    } catch (e) {
      console.warn('CoinGecko price fetch failed, trying fallback...', e.message);
    }

    // 2. Identify missing tokens and fallback to DexScreener
    const missingAddresses = addresses.filter(addr => !prices[addr.toLowerCase()] || prices[addr.toLowerCase()].price === 0);
    
    if (missingAddresses.length > 0) {
      try {
        const fallbackResponse = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${missingAddresses.join(',')}`);
        const pairs = fallbackResponse.data?.pairs || [];
        
        missingAddresses.forEach(addr => {
          const tokenPairs = pairs.filter(p => p.baseToken?.address?.toLowerCase() === addr.toLowerCase());
          if (tokenPairs.length > 0) {
            const bestPair = tokenPairs[0];
            prices[addr.toLowerCase()] = {
              price: parseFloat(bestPair.priceUsd) || 0,
              change24h: parseFloat(bestPair.priceChange?.h24) || 0
            };
          }
        });
      } catch (e) {
        console.warn('DexScreener price fallback failed:', e.message);
      }
    }
    
    apiCache.set(cacheKey, prices);
    return prices;
  } catch (error) {
    console.warn('Failed to fetch token prices:', error.message);
    return {};
  }
};

export const getTokenMetadata = async (chainId, address) => {
  const cacheKey = `meta_${chainId}_${address}`;
  const cached = apiCache.get(cacheKey);
  if (cached) return cached; // Metadata can be cached much longer, but default 60s is fine

  try {
    const platform = CHAIN_TO_PLATFORM[chainId];
    if (!platform || !address) return null;

    let meta = null;

    // 1. Try CoinGecko
    try {
      let response;
      if (address === 'native') {
        const coinId = NATIVE_TOKEN_IDS[chainId] || 'ethereum';
        response = await axios.get(`${COINGECKO_API}/coins/${coinId}`);
      } else {
        response = await axios.get(`${COINGECKO_API}/coins/${platform}/contract/${address}`);
      }
      meta = {
        logoURI: response.data?.image?.large || response.data?.image?.small || '',
        marketCap: response.data?.market_data?.market_cap?.usd || 0,
        volume24h: response.data?.market_data?.total_volume?.usd || 0,
        circulatingSupply: response.data?.market_data?.circulating_supply || 0,
        ath: response.data?.market_data?.ath?.usd || 0,
        atl: response.data?.market_data?.atl?.usd || 0,
      };
    } catch (e) {
      console.warn(`CoinGecko meta fetch failed for ${address}, trying DexScreener...`);
    }

    // 2. Fallback to DexScreener for MarketCap & Volume if not found or 0
    if (!meta || meta.marketCap === 0) {
      try {
        const fallbackResponse = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
        const pairs = fallbackResponse.data?.pairs || [];
        const tokenPairs = pairs.filter(p => p.baseToken?.address?.toLowerCase() === address.toLowerCase());
        
        if (tokenPairs.length > 0) {
          const bestPair = tokenPairs[0];
          meta = {
            logoURI: meta?.logoURI || bestPair.info?.imageUrl || '',
            marketCap: parseFloat(bestPair.fdv) || 0,
            volume24h: parseFloat(bestPair.volume?.h24) || 0,
            circulatingSupply: 0,
            ath: meta?.ath || 0,
            atl: meta?.atl || 0,
          };
        }
      } catch (e) {
        console.warn('DexScreener meta fallback failed:', e.message);
      }
    }

    if (meta) {
      apiCache.set(cacheKey, meta, 300000); // Cache metadata for 5 minutes
    }
    return meta;
  } catch (error) {
    console.warn(`Failed to fetch metadata for ${address}:`, error.message);
    return null;
  }
};

export const getTokenChartData = async (chainId, address, days = 1) => {
  const cacheKey = `chart_${chainId}_${address}_${days}`;
  const cached = apiCache.get(cacheKey);
  if (cached) return cached;

  try {
    let url;
    if (address === 'native') {
      const coinId = NATIVE_TOKEN_IDS[chainId] || 'ethereum';
      url = `${COINGECKO_API}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
    } else {
      const platform = CHAIN_TO_PLATFORM[chainId];
      if (!platform) return [];
      url = `${COINGECKO_API}/coins/${platform}/contract/${address}/market_chart/?vs_currency=usd&days=${days}`;
    }

    const response = await axios.get(url);
    const lineData = (response.data?.prices || []).map(p => ({
      timestamp: p[0],
      price: p[1]
    }));

    if (lineData.length === 0) {
      throw new Error("No chart data from CoinGecko");
    }

    const result = generateOHLCFromLineData(lineData);
    apiCache.set(cacheKey, result, 300000); // Cache charts for 5 minutes
    return result;
  } catch (error) {
    console.warn(`Failed to fetch chart data for ${address}:`, error.message);
    return [];
  }
};

/**
 * Helper to convert simple line data (timestamp, price) into OHLC candles
 */
function generateOHLCFromLineData(lineData, numCandles = 60) {
  if (!lineData || lineData.length === 0) return [];
  
  const sortedData = [...lineData].sort((a, b) => a.timestamp - b.timestamp);
  const startTime = sortedData[0].timestamp;
  const endTime = sortedData[sortedData.length - 1].timestamp;
  
  if (startTime === endTime) {
    const p = sortedData[0].price;
    return [{ timestamp: startTime, open: p, high: p, low: p, close: p }];
  }

  const interval = Math.max(1, (endTime - startTime) / numCandles);
  
  const ohlc = [];
  let currentBin = [];
  let currentBinEnd = startTime + interval;

  for (const point of sortedData) {
    while (point.timestamp > currentBinEnd) {
      if (currentBin.length > 0) {
        ohlc.push(createCandle(currentBin, currentBinEnd - interval));
        currentBin = [];
      } else if (ohlc.length > 0) {
        const lastClose = ohlc[ohlc.length - 1].close;
        ohlc.push({
          timestamp: currentBinEnd - interval,
          open: lastClose,
          high: lastClose,
          low: lastClose,
          close: lastClose
        });
      }
      currentBinEnd += interval;
    }
    currentBin.push(point.price);
  }
  
  if (currentBin.length > 0) {
    ohlc.push(createCandle(currentBin, currentBinEnd - interval));
  }
  
  return ohlc;
}

function createCandle(prices, timestamp) {
  return {
    timestamp: timestamp,
    open: prices[0],
    high: Math.max(...prices),
    low: Math.min(...prices),
    close: prices[prices.length - 1]
  };
}
