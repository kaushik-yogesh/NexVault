import { ethers } from 'ethers';
import axios from 'axios';

/**
 * NexVault — Direct DEX Swap Service
 * Integrates with the backend 0x API proxy for real quoting and routing.
 */
class SwapService {
  /**
   * Fetch a swap quote and generate txData for direct DEX interaction.
   * 
   * @param {string} chainId Hex chain ID
   * @param {string} sellToken Address or 'native'
   * @param {string} buyToken Address or 'native'
   * @param {string} sellAmount Amount in normal units (e.g., '1.5')
   * @param {number} slippage Slippage tolerance percentage (e.g., 1.0)
   * @param {number} sellPrice USD price of sell token
   * @param {number} buyPrice USD price of buy token
   * @param {string} takerAddress User's wallet address
   * @returns {Promise<Object>} Quote details formatted for the UI
   */
  async getQuote(chainId, sellToken, buyToken, sellAmount, slippage, sellPrice = 0, buyPrice = 0, takerAddress, sellTokenDecimals = 18, buyTokenDecimals = 18) {
    if (!sellAmount || parseFloat(sellAmount) <= 0) {
      throw new Error("Invalid sell amount");
    }
    if (!takerAddress) {
      throw new Error("Missing takerAddress: Cannot build transaction without a wallet address");
    }

    const decimalChainId = BigInt(chainId).toString();
    const sellAmountWei = ethers.parseUnits(sellAmount.toString(), sellTokenDecimals).toString();

    let buildData;
    try {
      const url = `http://localhost:5000/api/swap/build?chainId=${decimalChainId}&sellToken=${sellToken}&buyToken=${buyToken}&sellAmount=${sellAmountWei}&slippage=${slippage}&takerAddress=${takerAddress}`;
      const res = await axios.get(url);
      if (res.data.success) {
        buildData = res.data.data;
      } else {
        throw new Error("Failed to fetch route");
      }
    } catch (e) {
      console.error("Swap route error:", e);
      throw new Error(e.response?.data?.message || "Failed to fetch swap route. Please try again.");
    }

    const quote = buildData.quote;
    const buyAmountFormatted = ethers.formatUnits(quote.buyAmount, buyTokenDecimals);
    const minReceived = ethers.formatUnits(quote.guaranteedPrice || quote.buyAmount, buyTokenDecimals);

    // USD estimation
    const sellValueUsd = parseFloat(sellAmount) * sellPrice;
    
    // Price Impact Calculation
    let priceImpact = parseFloat(quote.estimatedPriceImpact || '0');
    if (!priceImpact && sellPrice > 0 && buyPrice > 0) {
      const actualBuyValueUsd = parseFloat(buyAmountFormatted) * buyPrice;
      const expectedBuyAmount = (sellValueUsd / buyPrice) || 0;
      const expectedBuyValueUsd = expectedBuyAmount * buyPrice;
      if (expectedBuyValueUsd > 0) {
        priceImpact = ((expectedBuyValueUsd - actualBuyValueUsd) / expectedBuyValueUsd) * 100;
      }
    }

    const estimatedGas = quote.estimatedGas || '250000';
    const gasPriceWei = quote.gasPrice || '20000000000';
    const gasUsd = sellPrice > 0 ? (parseFloat(ethers.formatEther(BigInt(estimatedGas) * BigInt(gasPriceWei))) * sellPrice) : 0;

    return {
      sellToken,
      buyToken,
      sellAmount,
      buyAmount: parseFloat(buyAmountFormatted).toFixed(6),
      minReceived: parseFloat(minReceived).toFixed(6),
      exchangeRate: (parseFloat(buyAmountFormatted) / parseFloat(sellAmount)).toFixed(6),
      priceImpact,
      platformFeePercentage: parseFloat(quote.buyTokenPercentageFee || '0'),
      platformFeeAmount: quote.feeRecipient ? 'Included in price' : '0',
      estimatedGas,
      gasPriceWei,
      networkFeeUsd: gasUsd.toFixed(2),
      route: [
        { name: 'KyberSwap Aggregator', part: 100 }
      ],
      _internalRoute: {
        txPayload: buildData.transaction,
        routerAddress: quote.routerAddress
      }
    };
  }

  /**
   * Finalize the transaction data
   */
  buildTransaction(chainId, sellToken, buyToken, recipient, internalRoute) {
    if (!internalRoute || !internalRoute.txPayload) {
      throw new Error("Missing transaction payload from quote");
    }

    return {
      to: internalRoute.txPayload.to,
      data: internalRoute.txPayload.data,
      value: internalRoute.txPayload.value
    };
  }
}

export const swapService = new SwapService();
