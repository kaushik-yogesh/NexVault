/**
 * NexVault — Backend Pricing Service
 * Features: Multi-tier caching (Redis + Memory), Request Deduplication, 
 * Exponential Backoff, Stale-While-Revalidate, 5s Timeout.
 */

import axios from 'axios';
import redisClient from '../config/redis.js';
import logger from '../utils/logger.js';
import configService from './configService.js';

const CMC_API_URL = 'https://pro-api.coinmarketcap.com';

const cmcAxios = axios.create({
  baseURL: CMC_API_URL,
  headers: {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  },
  timeout: 5000,
});

// Attach API key dynamically on every request from configService
cmcAxios.interceptors.request.use(async (config) => {
  const apiKey = await configService.get('CMC_API_KEY', process.env.CMC_API_KEY || 'b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c');
  config.headers['X-CMC_PRO_API_KEY'] = apiKey;
  return config;
});

// L1 Memory Cache Map (Local Fast Fallback)
const memoryCache = new Map();

// Deduplication Map
const inflightPromises = new Map();

// Native Slug Maps
const NATIVE_TOKEN_SLUGS = {
  '0x1': 'ethereum',
  '0x89': 'polygon-ecosystem-token',
  '0xa4b1': 'arbitrum',
  '0xa': 'optimism-ethereum',
  '0x38': 'bnb',
  '0x2105': 'base',
};

/**
 * Exponential backoff request wrapper
 */
async function fetchWithRetry(requestFn, maxRetries = 3) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await requestFn();
    } catch (error) {
      retries++;
      if (retries === maxRetries) throw error;
      await new Promise(res => setTimeout(res, Math.pow(2, retries) * 500));
    }
  }
}

/**
 * Multi-tier Cache Getter
 */
async function getCached(key) {
  try {
    // Try L2 Redis
    const redisData = await redisClient.get(key);
    if (redisData) return JSON.parse(redisData);
  } catch (err) {
    logger.warn(`Redis get failed for ${key}, falling back to memory`);
  }

  // Try L1 Memory
  const memData = memoryCache.get(key);
  if (memData && memData.expiry > Date.now()) {
    return memData.value;
  }
  return null;
}

/**
 * Multi-tier Cache Setter
 */
async function setCached(key, value, ttlSecs = 60) {
  try {
    // Set L2 Redis
    await redisClient.set(key, JSON.stringify(value), 'EX', ttlSecs);
  } catch (err) {
    logger.warn(`Redis set failed for ${key}`);
  }

  // Set L1 Memory
  memoryCache.set(key, {
    value,
    expiry: Date.now() + (ttlSecs * 1000)
  });
}

/**
 * Get Native Price (ETH, BNB, MATIC, etc)
 */
export const getNativePrice = async (chainId) => {
  const cacheKey = `price:native:${chainId}`;
  
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  const slug = NATIVE_TOKEN_SLUGS[chainId] || 'ethereum';
  const promiseKey = `promise:native:${slug}`;

  if (inflightPromises.has(promiseKey)) {
    return inflightPromises.get(promiseKey);
  }

  const fetchPromise = (async () => {
    try {
      const response = await fetchWithRetry(() => cmcAxios.get(`/v2/cryptocurrency/quotes/latest?slug=${slug}`));
      const data = response.data?.data || {};
      const firstKey = Object.keys(data)[0];
      
      let result = { price: 0, change24h: 0 };
      if (firstKey && data[firstKey]?.quote?.USD) {
        const quote = data[firstKey].quote.USD;
        result = {
          price: quote.price || 0,
          change24h: quote.percent_change_24h || 0
        };
      }
      
      await setCached(cacheKey, result, 60);
      return result;
    } catch (error) {
      logger.error(`CMC Native Price Error: ${error.message}`);
      // Stale-While-Revalidate Fallback (No Expiry Check)
      const memFallback = memoryCache.get(cacheKey);
      if (memFallback) return memFallback.value;
      return { price: 0, change24h: 0 };
    } finally {
      inflightPromises.delete(promiseKey);
    }
  })();

  inflightPromises.set(promiseKey, fetchPromise);
  return fetchPromise;
};

/**
 * Get ERC20 Token Prices
 */
export const getTokenPrices = async (chainId, addresses) => {
  if (!addresses || addresses.length === 0) return {};
  
  const sortedAddresses = [...addresses].sort();
  const cacheKey = `price:tokens:${chainId}:${Buffer.from(sortedAddresses.join(',')).toString('base64')}`;
  
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  const promiseKey = `promise:tokens:${cacheKey}`;
  if (inflightPromises.has(promiseKey)) {
    return inflightPromises.get(promiseKey);
  }

  const fetchPromise = (async () => {
    const prices = {};
    const remainingAddresses = [...addresses];

    try {
      const infoResponse = await fetchWithRetry(() => cmcAxios.get(`/v2/cryptocurrency/info?address=${remainingAddresses.join(',')}`));
      const infoData = infoResponse.data?.data || {};
      
      const cmcIds = [];
      const idToAddressMap = {};
      
      Object.values(infoData).forEach(tokenInfo => {
        cmcIds.push(tokenInfo.id);
        const addr = tokenInfo.platform?.token_address || tokenInfo.contract_address?.[0]?.contract_address;
        if (addr) idToAddressMap[tokenInfo.id] = addr.toLowerCase();
      });

      if (cmcIds.length > 0) {
        const quotesResponse = await fetchWithRetry(() => cmcAxios.get(`/v2/cryptocurrency/quotes/latest?id=${cmcIds.join(',')}`));
        const quotesData = quotesResponse.data?.data || {};
        
        Object.values(quotesData).forEach(tokenQuote => {
          const addr = idToAddressMap[tokenQuote.id];
          if (addr && tokenQuote.quote?.USD) {
            prices[addr] = {
              price: tokenQuote.quote.USD.price || 0,
              change24h: tokenQuote.quote.USD.percent_change_24h || 0
            };
          }
        });
      }
    } catch (error) {
      logger.warn(`CMC Token Fetch Error: ${error.message}, falling back to DexScreener`);
    }

    // DexScreener Fallback
    const missingAddresses = addresses.filter(addr => !prices[addr.toLowerCase()] || prices[addr.toLowerCase()].price === 0);
    if (missingAddresses.length > 0) {
      try {
        const dexRes = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${missingAddresses.join(',')}`);
        const pairs = dexRes.data?.pairs || [];
        missingAddresses.forEach(addr => {
          const tokenPairs = pairs.filter(p => 
            p.baseToken?.address?.toLowerCase() === addr.toLowerCase() || 
            p.quoteToken?.address?.toLowerCase() === addr.toLowerCase()
          );
          if (tokenPairs.length > 0) {
            const bestPair = tokenPairs[0];
            const isBase = bestPair.baseToken?.address?.toLowerCase() === addr.toLowerCase();
            
            let finalPrice = 0;
            if (isBase) {
              finalPrice = parseFloat(bestPair.priceUsd) || 0;
            } else {
              // If it's a quote token, compute its USD price from the base token's USD/Native ratio
              const basePriceUsd = parseFloat(bestPair.priceUsd) || 0;
              const priceNative = parseFloat(bestPair.priceNative) || 0;
              if (priceNative > 0) {
                finalPrice = basePriceUsd / priceNative;
              }
            }
            
            prices[addr.toLowerCase()] = {
              price: finalPrice,
              change24h: parseFloat(bestPair.priceChange?.h24) || 0
            };
          }
        });
      } catch (err) {
        logger.error(`DexScreener Fallback Error: ${err.message}`);
      }
    }

    await setCached(cacheKey, prices, 60);
    inflightPromises.delete(promiseKey);
    return prices;
  })();

  inflightPromises.set(promiseKey, fetchPromise);
  return fetchPromise;
};

/**
 * Get Token Metadata
 */
export const getTokenMetadata = async (chainId, address) => {
  const cacheKey = `meta:${chainId}:${address}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  if (!address) return null;
  let meta = null;

  try {
    if (address === 'native') {
      const slug = NATIVE_TOKEN_SLUGS[chainId] || 'ethereum';
      const response = await fetchWithRetry(() => cmcAxios.get(`/v2/cryptocurrency/quotes/latest?slug=${slug}`));
      const data = response.data?.data || {};
      const key = Object.keys(data)[0];
      if (key && data[key]) {
        const tokenData = data[key];
        meta = {
          logoURI: `https://s2.coinmarketcap.com/static/img/coins/64x64/${tokenData.id}.png`,
          marketCap: tokenData.quote?.USD?.market_cap || 0,
          volume24h: tokenData.quote?.USD?.volume_24h || 0,
          circulatingSupply: tokenData.circulating_supply || 0,
          ath: 0,
          atl: 0,
        };
      }
    } else {
      const infoResponse = await fetchWithRetry(() => cmcAxios.get(`/v2/cryptocurrency/info?address=${address}`));
      const infoData = infoResponse.data?.data || {};
      const key = Object.keys(infoData)[0];
      
      if (key && infoData[key]) {
        const tokenInfo = infoData[key];
        const quotesResponse = await fetchWithRetry(() => cmcAxios.get(`/v2/cryptocurrency/quotes/latest?id=${tokenInfo.id}`));
        const quoteData = quotesResponse.data?.data?.[tokenInfo.id]?.quote?.USD || {};
        
        meta = {
          logoURI: tokenInfo.logo || '',
          marketCap: quoteData.market_cap || 0,
          volume24h: quoteData.volume_24h || 0,
          circulatingSupply: quotesResponse.data?.data?.[tokenInfo.id]?.circulating_supply || 0,
          ath: 0,
          atl: 0,
        };
      }
    }
  } catch (e) {
    logger.warn(`CMC Meta Error for ${address}: ${e.message}`);
  }

  // Fallback to DexScreener
  if (!meta || meta.marketCap === 0) {
    try {
      const fetchAddr = address === 'native' ? '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' : address;
      const dexRes = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${fetchAddr}`);
      const pairs = dexRes.data?.pairs || [];
      const tokenPairs = pairs.filter(p => 
        p.baseToken?.address?.toLowerCase() === fetchAddr.toLowerCase() || 
        p.quoteToken?.address?.toLowerCase() === fetchAddr.toLowerCase()
      );
      
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
      logger.error(`DexScreener Meta Fallback Error: ${e.message}`);
    }
  }

  if (meta) await setCached(cacheKey, meta, 300); // 5 mins
  return meta;
};

/**
 * Get Chart Data (Mock fallback due to CMC free limits)
 */
export const getTokenChartData = async (chainId, address, days = 1) => {
  const cacheKey = `chart:${chainId}:${address}:${days}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  try {
    let currentPrice = 0;
    if (address === 'native') {
       const res = await getNativePrice(chainId);
       currentPrice = res.price;
    } else {
       const res = await getTokenPrices(chainId, [address]);
       currentPrice = res[address.toLowerCase()]?.price || 0;
    }

    if (currentPrice === 0) throw new Error("Price unavailable for chart");

    const now = Date.now();
    const interval = (days * 24 * 60 * 60 * 1000) / 60;
    const lineData = [];
    
    for(let i = 0; i <= 60; i++) {
       const variance = currentPrice * 0.01 * (Math.random() - 0.5);
       lineData.push({
         timestamp: now - ((60 - i) * interval),
         price: currentPrice + variance
       });
    }

    const ohlc = [];
    let currentBin = [];
    let currentBinEnd = lineData[0].timestamp + interval;

    for (const point of lineData) {
      while (point.timestamp > currentBinEnd) {
        if (currentBin.length > 0) {
          ohlc.push({
            timestamp: currentBinEnd - interval,
            open: currentBin[0],
            high: Math.max(...currentBin),
            low: Math.min(...currentBin),
            close: currentBin[currentBin.length - 1]
          });
          currentBin = [];
        } else if (ohlc.length > 0) {
          const lastClose = ohlc[ohlc.length - 1].close;
          ohlc.push({
            timestamp: currentBinEnd - interval,
            open: lastClose, high: lastClose, low: lastClose, close: lastClose
          });
        }
        currentBinEnd += interval;
      }
      currentBin.push(point.price);
    }
    
    if (currentBin.length > 0) {
      ohlc.push({
        timestamp: currentBinEnd - interval,
        open: currentBin[0],
        high: Math.max(...currentBin),
        low: Math.min(...currentBin),
        close: currentBin[currentBin.length - 1]
      });
    }

    await setCached(cacheKey, ohlc, 300);
    return ohlc;
  } catch (error) {
    logger.error(`Chart Generation Error: ${error.message}`);
    return [];
  }
};
