/**
 * NexVault — ApprovalScanner
 * 
 * Scans for ERC-20 token approvals and detects unlimited allowances.
 * Provides functionality to revoke them.
 */

import { ethers } from 'ethers';
import providerManager from '../network/ProviderManager.js';
import signingEngine from '../wallet/SigningEngine.js';
import transactionController from '../network/TransactionController.js';

// Standard ERC-20 ABI for allowance
const ERC20_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

class ApprovalScanner {
  /**
   * Scans a token for a specific spender's allowance
   * @param {string} tokenAddress - ERC20 token address
   * @param {string} ownerAddress - User's wallet address
   * @param {string} spenderAddress - DApp or Router address
   * @param {string} chainId - Hex chain ID
   * @returns {Promise<Object>} Allowance details
   */
  async checkAllowance(tokenAddress, ownerAddress, spenderAddress, chainId) {
    const provider = providerManager.getProvider(chainId);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

    try {
      const allowance = await contract.allowance(ownerAddress, spenderAddress);
      
      const isUnlimited = allowance >= (ethers.MaxUint256 / 2n);

      return {
        token: tokenAddress,
        spender: spenderAddress,
        allowance: allowance.toString(),
        isUnlimited,
        rawAllowance: allowance
      };
    } catch (err) {
      console.error(`[ApprovalScanner] Failed to check allowance for ${tokenAddress}:`, err);
      return null;
    }
  }

  /**
   * Scans historical logs to find all spenders the owner has approved.
   * Note: On public RPCs, this might hit block range limits.
   * @param {string} ownerAddress 
   * @param {string} chainId 
   * @returns {Promise<Object[]>}
   */
  async scanAllApprovals(ownerAddress, chainId) {
    const provider = providerManager.getProvider(chainId);
    
    // ERC-20 Approval event signature: Approval(address indexed owner, address indexed spender, uint256 value)
    const approvalTopic = ethers.id("Approval(address,address,uint256)");
    const ownerTopic = ethers.zeroPadValue(ownerAddress, 32);

    try {
      // Get current block
      const currentBlock = await provider.getBlockNumber();
      // Only scan last 10,000 blocks to avoid rate limits on free RPCs
      const fromBlock = Math.max(0, currentBlock - 10000);

      const logs = await provider.getLogs({
        fromBlock,
        toBlock: 'latest',
        topics: [approvalTopic, ownerTopic]
      });

      const spendersByToken = {}; // token -> set of spenders

      logs.forEach(log => {
        const token = log.address;
        const spender = ethers.dataSlice(log.topics[2], 12); // Extract spender address
        
        if (!spendersByToken[token]) {
          spendersByToken[token] = new Set();
        }
        spendersByToken[token].add(spender);
      });

      // Verify current allowances
      const activeApprovals = [];
      for (const token of Object.keys(spendersByToken)) {
        for (const spender of spendersByToken[token]) {
          const allowanceData = await this.checkAllowance(token, ownerAddress, spender, chainId);
          if (allowanceData && allowanceData.allowance !== "0") {
            activeApprovals.push(allowanceData);
          }
        }
      }

      return activeApprovals;

    } catch (err) {
      console.error("[ApprovalScanner] Failed to scan logs:", err);
      throw err;
    }
  }

  /**
   * Revoke an approval by setting it to 0
   * @param {ethers.Wallet} signer - Unlocked wallet signer
   * @param {string} tokenAddress - ERC20 token address
   * @param {string} spenderAddress - Address to revoke
   * @param {string} chainId - Hex chain ID
   * @returns {Promise<ethers.TransactionResponse>}
   */
  async revokeApproval(signer, tokenAddress, spenderAddress, chainId) {
    // approve(spender, 0)
    const txData = signingEngine.buildERC20Approval(tokenAddress, spenderAddress, '0', 18);
    txData.chainId = chainId;

    return await transactionController.processTransaction(signer, txData, true);
  }
}

const approvalScanner = new ApprovalScanner();
export default approvalScanner;
