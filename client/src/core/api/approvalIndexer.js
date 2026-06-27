/**
 * NexVault — Approval Indexer API
 * 
 * In a true production environment, this would call Alchemy's Token API
 * or an Etherscan API to get all `Approval` events for the user's address.
 * 
 * For this implementation, we will simulate the API response.
 */

import { ethers } from 'ethers';

class ApprovalIndexer {
  /**
   * Fetch active token allowances for the given address and chainId.
   */
  async getActiveApprovals(address, chainId) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Mock response representing typical DeFi approvals
    // In reality, this data comes from scanning ERC20 Transfer/Approval logs
    const mockApprovals = [
      {
        id: '1',
        tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC Mainnet
        tokenSymbol: 'USDC',
        tokenName: 'USD Coin',
        tokenDecimals: 6,
        tokenLogo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
        spenderAddress: '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45', // Uniswap V3 Router
        spenderName: 'Uniswap V3 Router',
        allowance: ethers.MaxUint256.toString(),
        isInfinite: true,
      },
      {
        id: '2',
        tokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT Mainnet
        tokenSymbol: 'USDT',
        tokenName: 'Tether USD',
        tokenDecimals: 6,
        tokenLogo: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
        spenderAddress: '0x1111111254fb6c44bac0bed2854e76f90643097d', // 1inch Router
        spenderName: '1inch Router',
        allowance: ethers.parseUnits('1000', 6).toString(),
        isInfinite: false,
      },
      {
        id: '3',
        tokenAddress: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // UNI Mainnet
        tokenSymbol: 'UNI',
        tokenName: 'Uniswap',
        tokenDecimals: 18,
        tokenLogo: 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
        spenderAddress: '0x0000000000000000000000000000000000000000', // Unknown contract
        spenderName: 'Unknown Contract (0x...8a4f)',
        allowance: ethers.MaxUint256.toString(),
        isInfinite: true,
        riskLevel: 'HIGH', // Flagged due to unknown spender
      }
    ];

    // Only return mock data if on Ethereum Mainnet (0x1) to simulate accuracy
    if (chainId === '0x1') {
      return mockApprovals;
    }

    return [];
  }
}

const approvalIndexer = new ApprovalIndexer();
export default approvalIndexer;
