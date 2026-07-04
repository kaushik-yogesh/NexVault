/**
 * NexVault — SigningEngine
 * 
 * Handles all cryptographic signing operations:
 * - Transaction signing (EIP-1559 and legacy)
 * - Personal message signing (EIP-191)
 * - Typed data signing (EIP-712)
 * 
 * All operations require the vault to be unlocked.
 * The signer is obtained from KeyringController and connected to a provider.
 */

import { ethers } from 'ethers';

class SigningEngine {
  /**
   * Sign and send a transaction
   * 
   * @param {ethers.Wallet} signer - Ethers Wallet (from KeyringController)
   * @param {ethers.Provider} provider - Connected provider
   * @param {Object} txRequest - Transaction parameters
   * @returns {Promise<ethers.TransactionResponse>}
   */
  async signAndSendTransaction(signer, provider, txRequest) {
    // Connect signer to provider
    const connectedSigner = signer.connect(provider);

    // Build the full transaction
    const tx = {
      to: txRequest.to,
      value: txRequest.value ? BigInt(txRequest.value) : 0n,
      data: txRequest.data || '0x',
      chainId: txRequest.chainId,
    };

    // Set gas parameters
    if (txRequest.maxFeePerGas && txRequest.maxPriorityFeePerGas) {
      // EIP-1559
      tx.maxFeePerGas = ethers.parseUnits(txRequest.maxFeePerGas.toString(), 'gwei');
      tx.maxPriorityFeePerGas = ethers.parseUnits(
        txRequest.maxPriorityFeePerGas.toString(),
        'gwei'
      );
      tx.type = 2;
    } else if (txRequest.gasPrice) {
      // Legacy
      tx.gasPrice = ethers.parseUnits(txRequest.gasPrice.toString(), 'gwei');
      tx.type = 0;
    }

    // Set gas limit
    if (txRequest.gasLimit) {
      tx.gasLimit = BigInt(txRequest.gasLimit);
    } else {
      // Estimate gas
      tx.gasLimit = await connectedSigner.estimateGas(tx);
      // Add 20% buffer
      tx.gasLimit = (tx.gasLimit * 120n) / 100n;
    }

    // Set nonce
    if (txRequest.nonce !== undefined) {
      tx.nonce = txRequest.nonce;
    }

    // Sign and send
    return connectedSigner.sendTransaction(tx);
  }

  /**
   * Sign a transaction without broadcasting
   * 
   * @param {ethers.Wallet} signer - Ethers Wallet
   * @param {Object} txRequest - Transaction parameters
   * @returns {Promise<string>} Signed transaction hex
   */
  async signTransaction(signer, txRequest) {
    const tx = {
      to: txRequest.to,
      value: txRequest.value ? BigInt(txRequest.value) : 0n,
      data: txRequest.data || '0x',
      chainId: txRequest.chainId,
      nonce: txRequest.nonce,
      gasLimit: txRequest.gasLimit ? BigInt(txRequest.gasLimit) : undefined,
    };

    if (txRequest.maxFeePerGas) {
      tx.maxFeePerGas = ethers.parseUnits(txRequest.maxFeePerGas.toString(), 'gwei');
      tx.maxPriorityFeePerGas = ethers.parseUnits(
        (txRequest.maxPriorityFeePerGas || '1.5').toString(),
        'gwei'
      );
      tx.type = 2;
    } else if (txRequest.gasPrice) {
      tx.gasPrice = ethers.parseUnits(txRequest.gasPrice.toString(), 'gwei');
      tx.type = 0;
    }

    return signer.signTransaction(tx);
  }

  /**
   * Sign a personal message (EIP-191)
   * 
   * @param {ethers.Wallet} signer - Ethers Wallet
   * @param {string} message - Message to sign
   * @returns {Promise<string>} Signature hex
   */
  async signPersonalMessage(signer, message) {
    return signer.signMessage(message);
  }

  /**
   * Sign typed data (EIP-712)
   * 
   * @param {ethers.Wallet} signer - Ethers Wallet
   * @param {Object} domain - EIP-712 domain
   * @param {Object} types - EIP-712 types
   * @param {Object} value - Data to sign
   * @returns {Promise<string>} Signature hex
   */
  async signTypedData(signer, domain, types, value) {
    return signer.signTypedData(domain, types, value);
  }

  /**
   * Verify a personal message signature
   * 
   * @param {string} message - Original message
   * @param {string} signature - Signature hex
   * @returns {string} Recovered address
   */
  verifyPersonalMessage(message, signature) {
    return ethers.verifyMessage(message, signature);
  }

  /**
   * Build ERC-20 transfer data
   * 
   * @param {string} tokenAddress - Token contract address
   * @param {string} toAddress - Recipient address
   * @param {string} amount - Amount in token units (not wei)
   * @param {number} decimals - Token decimals
   * @returns {Object} Transaction data { to, data, value: 0 }
   */
  buildERC20Transfer(tokenAddress, toAddress, amount, decimals) {
    const iface = new ethers.Interface([
      'function transfer(address to, uint256 amount) returns (bool)',
    ]);

    const data = iface.encodeFunctionData('transfer', [
      toAddress,
      ethers.parseUnits(amount.toString(), decimals),
    ]);

    return {
      to: tokenAddress,
      data,
      value: '0',
    };
  }

  /**
   * Build ERC-721 (NFT) transfer data
   * 
   * @param {string} contractAddress - NFT contract address
   * @param {string} fromAddress - Sender address
   * @param {string} toAddress - Recipient address
   * @param {string} tokenId - Token ID
   * @returns {Object} Transaction data
   */
  buildERC721Transfer(contractAddress, fromAddress, toAddress, tokenId) {
    const iface = new ethers.Interface([
      'function safeTransferFrom(address from, address to, uint256 tokenId)',
    ]);

    const data = iface.encodeFunctionData('safeTransferFrom', [
      fromAddress,
      toAddress,
      tokenId,
    ]);

    return {
      to: contractAddress,
      data,
      value: '0',
    };
  }

  /**
   * Build ERC-20 approval data
   * 
   * @param {string} tokenAddress - Token contract
   * @param {string} spenderAddress - Spender to approve
   * @param {string} amount - Amount to approve (use ethers.MaxUint256 for unlimited)
   * @param {number} decimals - Token decimals
   * @returns {Object} Transaction data
   */
  buildERC20Approval(tokenAddress, spenderAddress, amount, decimals) {
    const iface = new ethers.Interface([
      'function approve(address spender, uint256 amount) returns (bool)',
    ]);

    const parsedAmount =
      amount === 'unlimited'
        ? ethers.MaxUint256
        : ethers.parseUnits(amount.toString(), decimals);

    const data = iface.encodeFunctionData('approve', [spenderAddress, parsedAmount]);

    return {
      to: tokenAddress,
      data,
      value: '0',
    };
  }
}

const signingEngine = new SigningEngine();
export default signingEngine;
