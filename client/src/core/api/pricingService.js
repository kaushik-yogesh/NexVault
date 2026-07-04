/**
 * NexVault — Client Pricing Service
 * All pricing logic is now securely offloaded to the NexVault Backend APIs.
 * This guarantees no API keys are exposed to the client bundle.
 */

import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/pricing';

// Persistent cache using localStorage to survive extension popup closes
// This serves as an L3 Stale-While-Revalidate cache in case the backend completely fails
const apiCache = {
  store: new Map(), // memory fallback
  set(key, value, ttl = 60000) { 
    const data = { value, expiry: Date.now() + ttl };
    this.store.set(key, data);
    try {
      localStorage.setItem(`price_cache_${key}`, JSON.stringify(data));
    } catch (e) {
      // Ignore localStorage errors
    }
  },
  get(key) {
    let item = this.store.get(key);
    
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

// Cache inflight promises to deduplicate simultaneous UI renders
const inflightPromises = new Map();

/**
 * Fetch Native Price
 */
export const getNativePrice = async (chainId) => {
  const cacheKey = `native_price_${chainId}`;
  const cached = apiCache.get(cacheKey);
  if (cached) return cached;

  const promiseKey = `native_price_promise_${chainId}`;
  if (inflightPromises.has(promiseKey)) {
    return inflightPromises.get(promiseKey);
  }

  const fetchPromise = (async () => {
    try {
      const response = await axios.get(`${API_URL}/native/${chainId}`);
      if (response.data.success && response.data.data) {
        apiCache.set(cacheKey, response.data.data);
        return response.data.data;
      }
      throw new Error('Invalid backend response');
    } catch (error) {
      console.warn('Failed to fetch native price from backend:', error.message);
      
      // SWR Fallback
      let staleItem = apiCache.store.get(cacheKey);
      if (!staleItem) {
        try {
           const stored = localStorage.getItem(`price_cache_${cacheKey}`);
           if (stored) staleItem = JSON.parse(stored);
        } catch(e) {}
      }
      if (staleItem) return staleItem.value;
      
      return { price: 0, change24h: 0 };
    } finally {
      inflightPromises.delete(promiseKey);
    }
  })();

  inflightPromises.set(promiseKey, fetchPromise);
  return fetchPromise;
};

/**
 * Fetch Token Prices
 */
export const getTokenPrices = async (chainId, addresses) => {
  if (!addresses || addresses.length === 0) return {};

  const sortedAddresses = [...addresses].sort();
  const cacheKey = `token_prices_${chainId}_${sortedAddresses.join(',')}`;
  const cached = apiCache.get(cacheKey);
  if (cached) return cached;

  const promiseKey = `token_price_promise_${cacheKey}`;
  if (inflightPromises.has(promiseKey)) {
    return inflightPromises.get(promiseKey);
  }

  const fetchPromise = (async () => {
    try {
      const response = await axios.get(`${API_URL}/tokens/${chainId}?addresses=${sortedAddresses.join(',')}`);
      if (response.data.success && response.data.data) {
        apiCache.set(cacheKey, response.data.data);
        return response.data.data;
      }
      throw new Error('Invalid backend response');
    } catch (error) {
      console.warn('Failed to fetch token prices from backend:', error.message);
      // SWR fallback
      let staleItem = apiCache.store.get(cacheKey);
      if (!staleItem) {
        try {
           const stored = localStorage.getItem(`price_cache_${cacheKey}`);
           if (stored) staleItem = JSON.parse(stored);
        } catch(e) {}
      }
      if (staleItem) return staleItem.value;
      return {};
    } finally {
      inflightPromises.delete(promiseKey);
    }
  })();
  
  inflightPromises.set(promiseKey, fetchPromise);
  return fetchPromise;
};

/**
 * Fetch Token Metadata
 */
export const getTokenMetadata = async (chainId, address) => {
  const cacheKey = `meta_${chainId}_${address}`;
  const cached = apiCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${API_URL}/meta/${chainId}?address=${address}`);
    if (response.data.success && response.data.data) {
      apiCache.set(cacheKey, response.data.data, 300000); // 5 min
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.warn(`Failed to fetch metadata from backend:`, error.message);
    
    // SWR Fallback
    let staleItem = apiCache.store.get(cacheKey);
    if (!staleItem) {
      try {
         const stored = localStorage.getItem(`price_cache_${cacheKey}`);
         if (stored) staleItem = JSON.parse(stored);
      } catch(e) {}
    }
    if (staleItem) return staleItem.value;
    return null;
  }
};

/**
 * Fetch Token Chart Data
 */
export const getTokenChartData = async (chainId, address, days = 1) => {
  const cacheKey = `chart_${chainId}_${address}_${days}`;
  const cached = apiCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${API_URL}/chart/${chainId}?address=${address}&days=${days}`);
    if (response.data.success && response.data.data) {
      apiCache.set(cacheKey, response.data.data, 300000);
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.warn(`Failed to fetch chart data from backend:`, error.message);
    let staleItem = apiCache.store.get(cacheKey);
    if (!staleItem) {
      try {
         const stored = localStorage.getItem(`price_cache_${cacheKey}`);
         if (stored) staleItem = JSON.parse(stored);
      } catch(e) {}
    }
    if (staleItem) return staleItem.value;
    return [];
  }
};
