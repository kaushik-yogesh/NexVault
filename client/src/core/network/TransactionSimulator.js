/**
 * NexVault — TransactionSimulator
 * 
 * Simulates transactions before broadcasting to catch failures (e.g. out of gas, reverts).
 * For advanced security (Tenderly, etc.), this can be extended to use a third-party API.
 */

import { ethers } from 'ethers';
import providerManager from './ProviderManager.js';
import monitoringService from '../monitoring/MonitoringService.js';

class TransactionSimulator {
  /**
   * Main simulate method that routes to Tenderly or falls back to eth_call.
   * 
   * @param {Object} tx - The transaction object
   * @param {string} chainId - Hex chain ID
   * @returns {Promise<{ success: boolean, gasEstimate: bigint, error: string|null, simulationResult: any }>}
   */
  async simulate(tx, chainId) {
    // Attempt Tenderly first if keys exist
    if (import.meta.env.VITE_TENDERLY_ACCESS_KEY) {
      try {
        return await this._simulateViaTenderly(tx, chainId);
      } catch (err) {
        monitoringService.warn('Tenderly simulation failed, falling back to basic RPC simulation', err);
      }
    }

    // Fallback to basic eth_call
    return this._basicSimulate(tx, chainId);
  }

  /**
   * Advanced simulation via Tenderly API
   */
  async _simulateViaTenderly(tx, chainId) {
    const account = import.meta.env.VITE_TENDERLY_ACCOUNT;
    const project = import.meta.env.VITE_TENDERLY_PROJECT;
    const accessKey = import.meta.env.VITE_TENDERLY_ACCESS_KEY;
    const provider = providerManager.getProvider(chainId);

    const networkId = parseInt(chainId, 16);

    const body = {
      network_id: networkId.toString(),
      from: tx.from || await provider.getSigner().getAddress().catch(() => ethers.ZeroAddress),
      to: tx.to,
      input: tx.data || '0x',
      value: tx.value ? tx.value.toString() : '0',
      save: true,
      save_if_fails: true,
      simulation_type: 'full'
    };

    const response = await fetch(`https://api.tenderly.co/api/v1/account/${account}/project/${project}/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Key': accessKey,
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Tenderly API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const sim = data.simulation;

    if (!sim.status) {
      return {
        success: false,
        gasEstimate: 0n,
        error: sim.error_message || 'Transaction reverted',
        simulationResult: data
      };
    }

    return {
      success: true,
      gasEstimate: BigInt(sim.gas_used),
      error: null,
      simulationResult: data
    };
  }

  /**
   * Basic simulation using eth_call.
   */
  async _basicSimulate(tx, chainId) {
    const provider = providerManager.getProvider(chainId);

    try {
      // 1. Check if the call succeeds without state changes
      await provider.call(tx);
      
      // 2. Estimate the exact gas needed
      const gasEstimate = await provider.estimateGas(tx);

      return {
        success: true,
        gasEstimate,
        error: null,
      };
    } catch (error) {
      let reason = 'Transaction simulation failed';
      
      // Attempt to extract the revert reason
      if (error.reason) {
        reason = error.reason;
      } else if (error.info?.error?.message) {
        reason = error.info.error.message;
      } else if (error.data) {
        reason = `Reverted with data: ${error.data}`;
      }

      return {
        success: false,
        gasEstimate: 0n,
        error: reason,
      };
    }
  }
}

const transactionSimulator = new TransactionSimulator();
export default transactionSimulator;
