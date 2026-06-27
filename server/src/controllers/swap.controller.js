import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import AppConfig from '../models/AppConfig.js';
import axios from 'axios';

// Removed fetchDexQuote mock as client uses direct DEX integration

/**
 * Get swap quote with platform fee applied
 * GET /api/swap/quote
 */
export const getQuote = asyncHandler(async (req, res) => {
  const { chainId, sellToken, buyToken, sellAmount, slippage = 1 } = req.query;

  if (!chainId || !sellToken || !buyToken || !sellAmount) {
    throw ApiError.badRequest('Missing required swap parameters');
  }

  // Fetch global platform fee from DB (default 0.5% if not found)
  let feeConfig = await AppConfig.findOne({ key: 'GLOBAL_SWAP_FEE' });
  const platformFeePercentage = feeConfig ? Number(feeConfig.value) : 0.5;

  let treasuryConfig = await AppConfig.findOne({ key: 'TREASURY_WALLET' });
  const treasuryAddress = treasuryConfig ? treasuryConfig.value : process.env.TREASURY_ADDRESS;

  // Calculate fee amount in sell token
  const feeAmount = (Number(sellAmount) * platformFeePercentage) / 100;
  const netSellAmount = Number(sellAmount) - feeAmount;

  res.json({
    success: true,
    data: {
      platformFeePercentage,
      platformFeeAmount: feeAmount.toString(),
      netSellAmount: netSellAmount.toString(),
      treasuryAddress
    }
  });
});

/**
 * Get swap transaction payload (build tx) via 0x API
 * GET /api/swap/build
 */
export const buildTransaction = asyncHandler(async (req, res) => {
  const { chainId, sellToken, buyToken, sellAmount, slippage, receiverAddress, takerAddress } = req.query;

  let treasuryConfig = await AppConfig.findOne({ key: 'TREASURY_WALLET' });
  const treasuryAddress = treasuryConfig ? treasuryConfig.value : process.env.TREASURY_ADDRESS;

  if (!treasuryAddress) {
    throw ApiError.internal('Treasury address not configured');
  }

  // Fetch global platform fee from DB (default 0.5% if not found)
  let feeConfig = await AppConfig.findOne({ key: 'GLOBAL_SWAP_FEE' });
  const platformFeePercentage = feeConfig ? Number(feeConfig.value) : 0.5;

  const slippagePercentage = slippage ? parseFloat(slippage) / 100 : 0.01;

  // 0x API endpoints by chainId
  const zeroXEndpoints = {
    '1': 'https://api.0x.org',
    '137': 'https://polygon.api.0x.org',
    '10': 'https://optimism.api.0x.org',
    '42161': 'https://arbitrum.api.0x.org',
    '8453': 'https://base.api.0x.org'
  };

  const baseUrl = zeroXEndpoints[chainId.toString()];
  if (!baseUrl) {
    throw ApiError.badRequest('Unsupported chain for swaps');
  }

  if (!process.env.ZEROX_API_KEY) {
     throw ApiError.internal('0x API Key missing');
  }

  try {
    const NATIVE_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    
    // Default taker if none provided (required for quotes)
    // 0x API permit2 rejects the zero address (must be > 0x00...00ffff), so we use 0x11...11 as fallback
    const takerFinal = takerAddress || receiverAddress || '0x1111111111111111111111111111111111111111';

    const response = await axios.get(`${baseUrl}/swap/permit2/quote`, {
      headers: {
        '0x-api-key': process.env.ZEROX_API_KEY,
        '0x-version': 'v2'
      },
      params: {
        chainId: Number(chainId),
        sellToken: sellToken.toLowerCase() === 'native' || sellToken.toLowerCase() === 'eth' ? NATIVE_ADDRESS : sellToken,
        buyToken: buyToken.toLowerCase() === 'native' || buyToken.toLowerCase() === 'eth' ? NATIVE_ADDRESS : buyToken,
        sellAmount,
        taker: takerFinal,
        feeRecipient: treasuryAddress,
        buyTokenPercentageFee: platformFeePercentage / 100,
        slippagePercentage
      }
    });

    const tx = response.data.transaction || response.data;
    const txPayload = {
      to: tx.to,
      data: tx.data,
      value: tx.value,
      gas: tx.gas || response.data.estimatedGas || tx.estimatedGas,
    };

    res.json({
      success: true,
      data: {
        transaction: txPayload,
        treasuryAddress,
        quote: response.data
      }
    });
  } catch (error) {
    console.error('0x API error:', error.response?.data || error.message);
    
    let errorMessage = 'Failed to fetch swap route.';
    if (error.response?.data) {
      if (error.response.data.message === 'no Route matched with those values') {
        errorMessage = 'Insufficient liquidity for this swap pair. Try a different token or amount.';
      } else if (error.response.data.reason) {
        errorMessage = error.response.data.reason;
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      }
    } else {
      errorMessage = error.message;
    }
    
    throw ApiError.badRequest(errorMessage);
  }
});
