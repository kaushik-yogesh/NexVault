import AppConfig from '../models/AppConfig.js';
import logger from '../utils/logger.js';

class ConfigService {
  constructor() {
    this.cache = new Map();
    this.lastFetch = 0;
    this.TTL = 60 * 1000; // 1 minute cache TTL
    this.isFetching = false;
  }

  /**
   * Refreshes the entire config cache from the DB
   */
  async refreshCache(force = false) {
    const now = Date.now();
    if (!force && now - this.lastFetch < this.TTL) {
      return; // Cache is still fresh
    }

    if (this.isFetching) return;
    this.isFetching = true;

    try {
      const configs = await AppConfig.find({});
      const newCache = new Map();
      
      configs.forEach(config => {
        newCache.set(config.key, config.value);
      });

      this.cache = newCache;
      this.lastFetch = Date.now();
      logger.info('Config cache refreshed from database.');
    } catch (err) {
      logger.error('Failed to refresh config cache:', err);
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Get a config value by key. Uses cache if available.
   * @param {string} key - The config key (e.g. 'CMC_API_KEY')
   * @param {*} defaultValue - Fallback if not found
   * @returns {*} Config value
   */
  async get(key, defaultValue = null) {
    await this.refreshCache();
    
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    // If not in cache, fallback to immediate DB query just in case it was just added
    try {
      const doc = await AppConfig.findOne({ key });
      if (doc) {
        this.cache.set(key, doc.value);
        return doc.value;
      }
    } catch (err) {
      logger.error(`Error fetching config ${key}:`, err);
    }

    return defaultValue;
  }

  /**
   * Gets multiple configs at once
   */
  async getAll() {
    await this.refreshCache();
    return Object.fromEntries(this.cache);
  }

  /**
   * Clears the cache, forcing the next get to fetch from DB
   */
  invalidateCache() {
    this.lastFetch = 0;
  }
}

export const configService = new ConfigService();
export default configService;
