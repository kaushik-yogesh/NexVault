/**
 * NexVault — ExtensionStore
 * 
 * Abstraction layer over chrome.storage.local for persistent encrypted storage.
 * Used by VaultManager to store encrypted wallet data securely in the extension context.
 * 
 * SECURITY INVARIANTS:
 * 1. chrome.storage.local is isolated from the DOM (immune to basic XSS).
 * 2. It is not synced to Google's cloud (unlike chrome.storage.sync).
 * 3. All sensitive data (vault) MUST be encrypted via CryptoEngine BEFORE storage.
 */

class ExtensionStore {
  /**
   * Promisified wrapper for chrome.storage.local.get
   * @param {string} key - Storage key
   * @returns {Promise<any>}
   */
  async get(key) {
    return new Promise((resolve) => {
      // Fallback for development outside extension context (though not recommended for prod)
      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.warn('Extension context missing. Falling back to localStorage (NOT SECURE).');
        const data = localStorage.getItem(key);
        resolve(data ? JSON.parse(data) : undefined);
        return;
      }

      chrome.storage.local.get(key, (result) => {
        resolve(result[key]);
      });
    });
  }

  /**
   * Promisified wrapper for chrome.storage.local.set
   * @param {string} key - Storage key
   * @param {any} value - Data to store
   * @returns {Promise<void>}
   */
  async set(key, value) {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        localStorage.setItem(key, JSON.stringify(value));
        resolve();
        return;
      }

      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  }

  /**
   * Promisified wrapper for chrome.storage.local.remove
   * @param {string} key - Storage key
   * @returns {Promise<void>}
   */
  async remove(key) {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        localStorage.removeItem(key);
        resolve();
        return;
      }

      chrome.storage.local.remove(key, () => {
        resolve();
      });
    });
  }

  /**
   * Promisified wrapper for chrome.storage.local.clear
   * @returns {Promise<void>}
   */
  async clear() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        localStorage.clear();
        resolve();
        return;
      }

      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  }

  /**
   * Check if a key exists
   * @param {string} key 
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    const data = await this.get(key);
    return data !== undefined && data !== null;
  }

  // ---- Vault Operations ----

  async getVaultData() {
    return this.get('nexvault_vault');
  }

  async saveVaultData(data) {
    return this.set('nexvault_vault', data);
  }

  async deleteVaultData() {
    return this.remove('nexvault_vault');
  }

  async vaultExists() {
    return this.exists('nexvault_vault');
  }

  // ---- Settings Operations ----
  async getSetting(key) {
    return this.get(`setting_${key}`);
  }

  async setSetting(key, value) {
    return this.set(`setting_${key}`, value);
  }

  // ---- Factory Reset ----

  async destroyDatabase() {
    await this.clear();
  }

  // ---- Token Operations ----

  async getTokens() {
    const tokens = await this.get('nexvault_tokens');
    return tokens || [];
  }

  async addToken(token) {
    const tokens = await this.getTokens();
    const existingIndex = tokens.findIndex((t) => t.id === token.id);
    if (existingIndex >= 0) {
      tokens[existingIndex] = token;
    } else {
      tokens.push(token);
    }
    await this.set('nexvault_tokens', tokens);
  }

  async deleteToken(id) {
    const tokens = await this.getTokens();
    const newTokens = tokens.filter((t) => t.id !== id);
    await this.set('nexvault_tokens', newTokens);

    const deleted = await this.get('nexvault_deleted_tokens') || [];
    if (!deleted.includes(id)) {
      deleted.push(id);
      await this.set('nexvault_deleted_tokens', deleted);
    }
  }

  async getDeletedTokens() {
    const deleted = await this.get('nexvault_deleted_tokens');
    return deleted || [];
  }
}

const store = new ExtensionStore();
export default store;
