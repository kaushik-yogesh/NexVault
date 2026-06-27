import axios from 'axios';

/**
 * NexVault Security Scanner
 * Uses GoPlus Security for contract analysis and Alchemy for transaction simulation.
 */
export class SecurityScanner {
  /**
   * Scan a contract address for honeypots or malicious code using GoPlus Labs API
   * @param {string} chainId 
   * @param {string} contractAddress 
   * @returns {Object} Threat assessment
   */
  static async scanContract(chainId, contractAddress) {
    try {
      const response = await axios.get(`https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${contractAddress}`);
      
      if (response.data?.code !== 1 || !response.data?.result) {
        return { isSafe: false, riskLevel: 'UNKNOWN', threats: [], description: 'Security scan unavailable for this asset.' };
      }

      const result = response.data.result[contractAddress.toLowerCase()];
      if (!result) {
        return { isSafe: true, riskLevel: 'LOW', threats: [], description: 'No known threats detected.' };
      }

      const threats = [];
      let isSafe = true;
      let riskLevel = 'LOW';

      // Parse GoPlus flags
      if (result.is_honeypot === '1') threats.push('Honeypot Detected');
      if (result.is_blacklisted === '1') threats.push('Token is Blacklisted');
      if (result.is_proxy === '1') threats.push('Proxy Contract (Logic can change)');
      if (result.can_take_back_ownership === '1') threats.push('Owner can reclaim contract');
      if (result.is_mintable === '1') threats.push('Owner can mint more tokens');
      if (result.transfer_pausable === '1') threats.push('Transfers can be paused');
      if (result.cannot_sell_all === '1' || result.cannot_buy === '1') threats.push('Trading Disabled or Restricted');
      if (result.hidden_owner === '1') threats.push('Hidden Owner Detected');
      
      const buyTax = parseFloat(result.buy_tax || '0');
      const sellTax = parseFloat(result.sell_tax || '0');
      if (buyTax > 0.1 || sellTax > 0.1) threats.push(`High Tax (Buy: ${(buyTax*100).toFixed(1)}%, Sell: ${(sellTax*100).toFixed(1)}%)`);

      if (threats.length > 0) {
        isSafe = false;
        riskLevel = threats.some(t => t.includes('Honeypot') || t.includes('Blacklisted')) ? 'HIGH' : 'MEDIUM';
      }

      return {
        isSafe,
        riskLevel,
        threats,
        description: isSafe ? 'No significant threats detected.' : 'Potential risks detected. Proceed with caution.',
      };
    } catch (error) {
      console.error('GoPlus Security scan failed:', error.message);
      return { isSafe: false, riskLevel: 'UNKNOWN', threats: [], description: 'Security scan failed due to a network or API error.' };
    }
  }

  /**
   * Simulate a transaction to determine assets leaving and entering
   * @param {string} chainId
   * @param {Object} txPayload 
   */
  static async simulateTransaction(chainId, txPayload) {
    if (!process.env.ALCHEMY_API_KEY) {
      return {
        success: false,
        assetsLeaving: [],
        assetsEntering: [],
        error: 'Alchemy API Key missing. Simulation unavailable.'
      };
    }

    try {
      // Mapping chainIds to Alchemy networks
      const networkMap = {
        '1': 'eth-mainnet',
        '137': 'polygon-mainnet',
        '42161': 'arb-mainnet',
        '10': 'opt-mainnet',
        '8453': 'base-mainnet'
      };

      const network = networkMap[chainId.toString()] || 'eth-mainnet';
      const url = `https://${network}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;

      const response = await axios.post(url, {
        id: 1,
        jsonrpc: "2.0",
        method: "alchemy_simulateAssetChanges",
        params: [
          {
            from: txPayload.from,
            to: txPayload.to,
            value: txPayload.value ? `0x${BigInt(txPayload.value).toString(16)}` : "0x0",
            data: txPayload.data || "0x"
          }
        ]
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      const changes = response.data.result?.changes || [];
      const assetsLeaving = [];
      const assetsEntering = [];

      changes.forEach(change => {
        const item = {
          symbol: change.symbol,
          amount: change.amount,
          type: change.assetType === 'NATIVE' ? 'NATIVE' : 'ERC20',
          tokenAddress: change.contractAddress
        };
        if (change.from.toLowerCase() === txPayload.from?.toLowerCase()) {
          assetsLeaving.push(item);
        } else if (change.to.toLowerCase() === txPayload.from?.toLowerCase()) {
          assetsEntering.push(item);
        }
      });

      return {
        success: true,
        assetsLeaving,
        assetsEntering,
        error: null
      };
    } catch (error) {
      console.error('Transaction simulation failed:', error.message);
      return {
        success: false,
        assetsLeaving: [],
        assetsEntering: [],
        error: 'Simulation failed: ' + error.message
      };
    }
  }
}
