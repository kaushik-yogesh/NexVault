/**
 * NexVault — TransactionController
 * 
 * Orchestrates the full lifecycle of a transaction:
 * - Nonce management (handling pending nonces)
 * - Simulation before broadcasting
 * - Signing via SigningEngine
 * - Broadcasting via ProviderManager
 * - Tracking via TransactionTracker
 */

import { ethers } from 'ethers';
import providerManager from './ProviderManager.js';
import transactionSimulator from './TransactionSimulator.js';
import transactionTracker from './TransactionTracker.js';
import signingEngine from '../wallet/SigningEngine.js';

class TransactionController {
  constructor() {
    // Keep track of the highest nonce used per address per chain
    // format: `${chainId}-${address}` -> number
    this._nonceCache = new Map();
  }

  /**
   * Process, sign, broadcast, and track a transaction
   * 
   * @param {ethers.Wallet} signer - The unlocked wallet instance
   * @param {Object} txRequest - The transaction request
   * @param {boolean} simulateFirst - Whether to run simulation first
   * @returns {Promise<ethers.TransactionResponse>}
   */
  async processTransaction(signer, txRequest, simulateFirst = true) {
    const chainId = txRequest.chainId || providerManager.getActiveChainId();
    const provider = providerManager.getProvider(chainId);
    const address = await signer.getAddress();

    // 1. Simulate if requested
    if (simulateFirst) {
      const simResult = await transactionSimulator.simulate(txRequest, chainId);
      if (!simResult.success) {
        throw new Error(`Transaction simulation failed: ${simResult.error}`);
      }
      
      // Use simulated gas limit if not provided
      if (!txRequest.gasLimit) {
        // Add 20% buffer to simulation estimate
        txRequest.gasLimit = (simResult.gasEstimate * 120n) / 100n;
      }
    }

    // 2. Nonce Management
    if (txRequest.nonce === undefined) {
      txRequest.nonce = await this._getNextNonce(address, chainId, provider);
    }

    // 3. Sign and Broadcast
    const txResponse = await signingEngine.signAndSendTransaction(signer, provider, txRequest);

    // 4. Update Nonce Cache
    this._updateNonceCache(address, chainId, txRequest.nonce);

    // 5. Track Transaction
    transactionTracker.track(txResponse.hash, chainId, {
      from: address,
      to: txRequest.to,
      value: txRequest.value?.toString() || '0',
      nonce: txRequest.nonce
    });

    return txResponse;
  }

  /**
   * Replace an existing pending transaction (Speed up or Cancel)
   * 
   * @param {ethers.Wallet} signer 
   * @param {Object} originalTx - The original pending transaction object
   * @param {Object} newGasParams - New gas pricing (must be at least 10% higher)
   * @param {boolean} isCancel - If true, sends 0 value to self
   */
  async replaceTransaction(signer, originalTx, newGasParams, isCancel = false) {
    const chainId = originalTx.chainId;
    const provider = providerManager.getProvider(chainId);
    const address = await signer.getAddress();

    const txRequest = {
      chainId,
      nonce: originalTx.nonce,
      to: isCancel ? address : originalTx.to,
      value: isCancel ? 0n : originalTx.value,
      data: isCancel ? '0x' : originalTx.data,
      gasLimit: originalTx.gasLimit,
      ...newGasParams
    };

    // Sign and broadcast the replacement
    const txResponse = await signingEngine.signAndSendTransaction(signer, provider, txRequest);

    // Untrack old and track new
    transactionTracker.untrack(originalTx.hash);
    transactionTracker.track(txResponse.hash, chainId, {
      from: address,
      to: txRequest.to,
      value: txRequest.value?.toString() || '0',
      nonce: txRequest.nonce,
      replaced: originalTx.hash,
      type: isCancel ? 'cancel' : 'speed_up'
    });

    return txResponse;
  }

  /**
   * Get the next correct nonce for an address, factoring in pending transactions.
   */
  async _getNextNonce(address, chainId, provider) {
    const cacheKey = `${chainId}-${address.toLowerCase()}`;
    
    // Get network nonce (confirmed + pending in mempool)
    const networkNonce = await provider.getTransactionCount(address, 'pending');
    
    // Get our cached nonce (transactions we've broadcasted but might not be in mempool yet)
    const cachedNonce = this._nonceCache.get(cacheKey) || 0;

    // Use whichever is higher
    const nextNonce = Math.max(networkNonce, cachedNonce + 1);
    
    return nextNonce;
  }

  /**
   * Update the highest used nonce for an address
   */
  _updateNonceCache(address, chainId, usedNonce) {
    const cacheKey = `${chainId}-${address.toLowerCase()}`;
    const currentMax = this._nonceCache.get(cacheKey) || -1;
    
    if (usedNonce > currentMax) {
      this._nonceCache.set(cacheKey, usedNonce);
    }
  }

  /**
   * Clear nonce cache (useful when resetting account or changing network)
   */
  clearNonceCache() {
    this._nonceCache.clear();
  }
}

const transactionController = new TransactionController();
export default transactionController;
