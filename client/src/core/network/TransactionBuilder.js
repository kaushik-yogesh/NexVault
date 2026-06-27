/**
 * NexVault — TransactionBuilder
 * 
 * Helper for building common transaction types safely.
 */

import { ethers } from 'ethers';
import signingEngine from '../wallet/SigningEngine.js';

class TransactionBuilder {
  /**
   * Build a standard Native Transfer (ETH, MATIC, etc.)
   */
  buildNativeTransfer(toAddress, amountStr) {
    if (!ethers.isAddress(toAddress)) {
      throw new Error('Invalid recipient address');
    }
    
    return {
      to: toAddress,
      value: ethers.parseEther(amountStr || '0'),
      data: '0x',
    };
  }

  /**
   * Build an ERC-20 Token Transfer
   */
  buildTokenTransfer(tokenAddress, toAddress, amountStr, decimals = 18) {
    if (!ethers.isAddress(tokenAddress) || !ethers.isAddress(toAddress)) {
      throw new Error('Invalid address provided');
    }
    
    return signingEngine.buildERC20Transfer(
      tokenAddress,
      toAddress,
      amountStr,
      decimals
    );
  }

  /**
   * Build an ERC-20 Token Approval
   */
  buildTokenApproval(tokenAddress, spenderAddress, amountStr, decimals = 18) {
    if (!ethers.isAddress(tokenAddress) || !ethers.isAddress(spenderAddress)) {
      throw new Error('Invalid address provided');
    }

    return signingEngine.buildERC20Approval(
      tokenAddress,
      spenderAddress,
      amountStr,
      decimals
    );
  }

  /**
   * Build an ERC-721 NFT Transfer
   */
  buildNFTTransfer(contractAddress, fromAddress, toAddress, tokenId) {
    if (!ethers.isAddress(contractAddress) || !ethers.isAddress(toAddress)) {
      throw new Error('Invalid address provided');
    }

    return signingEngine.buildERC721Transfer(
      contractAddress,
      fromAddress,
      toAddress,
      tokenId
    );
  }
}

const transactionBuilder = new TransactionBuilder();
export default transactionBuilder;
