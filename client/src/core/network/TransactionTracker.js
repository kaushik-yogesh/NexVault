/**
 * NexVault — TransactionTracker
 * 
 * Tracks pending transactions and listens for their inclusion in blocks.
 */

import providerManager from './ProviderManager.js';

class TransactionTracker {
  constructor() {
    this._tracking = new Map();
    this._listeners = new Set();
  }

  /**
   * Track a new transaction
   * @param {string} txHash - The transaction hash to track
   * @param {string} chainId - The chain ID where the tx was broadcast
   * @param {Object} metadata - Custom metadata (e.g., to, from, amount)
   */
  track(txHash, chainId, metadata = {}) {
    const entry = {
      hash: txHash,
      chainId,
      status: 'pending',
      metadata,
      addedAt: Date.now(),
    };

    this._tracking.set(txHash, entry);
    this._notifyListeners();

    this._waitForConfirmation(txHash, chainId);
  }

  /**
   * Stop tracking a transaction
   * @param {string} txHash 
   */
  untrack(txHash) {
    this._tracking.delete(txHash);
    this._notifyListeners();
  }

  /**
   * Get all tracked transactions
   */
  getPendingTransactions() {
    return Array.from(this._tracking.values()).filter(t => t.status === 'pending');
  }

  /**
   * Subscribe to tracking updates
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  async _waitForConfirmation(txHash, chainId) {
    try {
      const provider = providerManager.getProvider(chainId);
      // Wait for 1 confirmation
      const receipt = await provider.waitForTransaction(txHash, 1, 300000); // 5 minutes timeout

      if (this._tracking.has(txHash)) {
        const entry = this._tracking.get(txHash);
        entry.status = receipt.status === 1 ? 'confirmed' : 'failed';
        entry.receipt = receipt;
        this._tracking.set(txHash, entry);
        this._notifyListeners();
        
        // Auto-remove confirmed/failed tx after some time to avoid memory leaks
        setTimeout(() => this.untrack(txHash), 60000);
      }
    } catch (error) {
      if (this._tracking.has(txHash)) {
        const entry = this._tracking.get(txHash);
        entry.status = 'error';
        entry.error = error.message;
        this._tracking.set(txHash, entry);
        this._notifyListeners();
      }
    }
  }

  _notifyListeners() {
    const data = Array.from(this._tracking.values());
    this._listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.error('Tracker listener error:', err);
      }
    });
  }
}

const transactionTracker = new TransactionTracker();
export default transactionTracker;
