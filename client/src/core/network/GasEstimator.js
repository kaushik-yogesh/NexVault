/**
 * NexVault — GasEstimator
 * 
 * Smart gas estimation with EIP-1559 support:
 * - Low / Medium / High gas presets
 * - Custom gas settings
 * - Gas cost calculation in native currency and USD
 */

import { ethers } from 'ethers';
import providerManager from './ProviderManager.js';
import { CHAINS } from '../../../../shared/constants/chains.js';

/** Gas speed presets (multipliers for priority fee) */
const GAS_PRESETS = {
  low: { label: 'Low', priorityMultiplier: 0.8, maxFeeMultiplier: 1.0, timeEstimate: '~5 min' },
  medium: { label: 'Medium', priorityMultiplier: 1.0, maxFeeMultiplier: 1.2, timeEstimate: '~2 min' },
  high: { label: 'High', priorityMultiplier: 1.5, maxFeeMultiplier: 1.5, timeEstimate: '~30 sec' },
  urgent: { label: 'Urgent', priorityMultiplier: 2.0, maxFeeMultiplier: 2.0, timeEstimate: '~15 sec' },
};

class GasEstimator {
  /**
   * Get gas estimates for all speed presets
   * 
   * @param {string} chainId - Chain ID
   * @returns {Promise<Object>} Gas estimates for each speed
   */
  async getGasEstimates(chainId) {
    const chain = CHAINS[chainId];
    const provider = providerManager.getProvider(chainId);
    const feeData = await provider.getFeeData();

    if (chain?.supportsEIP1559 && feeData.maxFeePerGas) {
      return this._getEIP1559Estimates(feeData, chainId);
    }

    return this._getLegacyEstimates(feeData);
  }

  /**
   * Estimate total gas cost for a transaction
   * 
   * @param {Object} tx - Transaction object
   * @param {string} chainId - Chain ID
   * @param {string} speed - Gas speed preset
   * @returns {Promise<Object>} { gasLimit, gasCost, gasCostFormatted }
   */
  async estimateTransactionCost(tx, chainId, speed = 'medium') {
    const provider = providerManager.getProvider(chainId);
    const chain = CHAINS[chainId];

    // Estimate gas limit
    let gasLimit;
    try {
      gasLimit = await provider.estimateGas(tx);
      // Add 20% buffer
      gasLimit = (gasLimit * 120n) / 100n;
    } catch {
      // Default gas limits by transaction type
      gasLimit = tx.data && tx.data !== '0x' ? 100000n : 21000n;
    }

    // Get gas price
    const estimates = await this.getGasEstimates(chainId);
    const selectedEstimate = estimates[speed] || estimates.medium;

    let totalCostWei;
    if (selectedEstimate.maxFeePerGas) {
      totalCostWei = gasLimit * ethers.parseUnits(selectedEstimate.maxFeePerGas, 'gwei');
    } else {
      totalCostWei = gasLimit * ethers.parseUnits(selectedEstimate.gasPrice, 'gwei');
    }

    return {
      gasLimit: gasLimit.toString(),
      gasCostWei: totalCostWei.toString(),
      gasCostFormatted: ethers.formatEther(totalCostWei),
      symbol: chain?.nativeCurrency?.symbol || 'ETH',
      speed,
      timeEstimate: GAS_PRESETS[speed]?.timeEstimate || '~2 min',
      ...selectedEstimate,
    };
  }

  /**
   * Fast baseline gas estimation for dynamic MAX calculations
   * 
   * @param {string} chainId - Chain ID
   * @param {bigint} fallbackGasLimit - Expected gas limit for the operation
   * @returns {Promise<Object>} { gasCostWei, gasCostFormatted }
   */
  async estimateBaseGas(chainId, fallbackGasLimit = 500000n) {
    try {
      const estimates = await this.getGasEstimates(chainId);
      // Use medium speed as baseline for reservations
      const selectedEstimate = estimates.medium;

      let totalCostWei;
      if (selectedEstimate.maxFeePerGas) {
        totalCostWei = fallbackGasLimit * ethers.parseUnits(selectedEstimate.maxFeePerGas, 'gwei');
      } else {
        totalCostWei = fallbackGasLimit * ethers.parseUnits(selectedEstimate.gasPrice, 'gwei');
      }

      return {
        gasCostWei: totalCostWei.toString(),
        gasCostFormatted: ethers.formatEther(totalCostWei),
      };
    } catch (error) {
      console.warn('Base gas estimation failed, using safe default', error);
      // Absolute fallback if network is completely unreachable
      return {
        gasCostWei: ethers.parseEther('0.005').toString(), // 0.005 safe default
        gasCostFormatted: '0.005'
      };
    }
  }

  /**
   * EIP-1559 gas estimates
   * @private
   */
  _getEIP1559Estimates(feeData, chainId) {
    const baseFee = feeData.maxFeePerGas - (feeData.maxPriorityFeePerGas || 0n);
    let priorityFee = feeData.maxPriorityFeePerGas || ethers.parseUnits('1.5', 'gwei');

    const estimates = {};

    for (const [speed, preset] of Object.entries(GAS_PRESETS)) {
      let adjustedPriority = (priorityFee * BigInt(Math.round(preset.priorityMultiplier * 100))) / 100n;
      
      // Enforce Polygon minimum of 30 gwei on the final adjusted priority fee
      if (chainId === '137' || chainId === '0x89') {
        const minPolygonPriority = ethers.parseUnits('30', 'gwei');
        if (adjustedPriority < minPolygonPriority) {
          adjustedPriority = minPolygonPriority;
        }
      }

      const maxFee = (baseFee * BigInt(Math.round(preset.maxFeeMultiplier * 100))) / 100n + adjustedPriority;

      estimates[speed] = {
        label: preset.label,
        type: 'eip1559',
        maxFeePerGas: ethers.formatUnits(maxFee, 'gwei'),
        maxPriorityFeePerGas: ethers.formatUnits(adjustedPriority, 'gwei'),
        timeEstimate: preset.timeEstimate,
      };
    }

    return estimates;
  }

  /**
   * Legacy gas estimates
   * @private
   */
  _getLegacyEstimates(feeData) {
    const gasPrice = feeData.gasPrice || ethers.parseUnits('5', 'gwei');

    const estimates = {};

    for (const [speed, preset] of Object.entries(GAS_PRESETS)) {
      const adjustedPrice = (gasPrice * BigInt(Math.round(preset.maxFeeMultiplier * 100))) / 100n;

      estimates[speed] = {
        label: preset.label,
        type: 'legacy',
        gasPrice: ethers.formatUnits(adjustedPrice, 'gwei'),
        timeEstimate: preset.timeEstimate,
      };
    }

    return estimates;
  }
}

const gasEstimator = new GasEstimator();
export default gasEstimator;
