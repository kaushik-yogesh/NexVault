import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import AppConfig from '../models/AppConfig.js';
import SwapHistory from '../models/SwapHistory.js';
import axios from 'axios';
import configService from '../services/configService.js';

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

  const isSwapEnabled = await configService.get('ENABLE_SWAP', true);
  if (!isSwapEnabled) {
    throw ApiError.badRequest('Swap feature is currently disabled');
  }

  // Fetch global platform fee from cache (default 0.5% if not found)
  const platformFeePercentage = Number(await configService.get('GLOBAL_SWAP_FEE', 0.5));
  const treasuryAddress = await configService.get('TREASURY_WALLET', process.env.TREASURY_ADDRESS || '0x12cf6e426c781bd3443c166968115859ba506f4a');

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
 * Get swap transaction payload (build tx) via KyberSwap API
 * GET /api/swap/build
 */
export const buildTransaction = asyncHandler(async (req, res) => {
  const { chainId, sellToken, buyToken, sellAmount, slippage, receiverAddress, takerAddress } = req.query;

  const isSwapEnabled = await configService.get('ENABLE_SWAP', true);
  if (!isSwapEnabled) {
    throw ApiError.badRequest('Swap feature is currently disabled');
  }

  const treasuryAddress = await configService.get('TREASURY_WALLET', process.env.TREASURY_ADDRESS || '0x0000000000000000000000000000000000000000');
  const swapFeeEnabled = await configService.get('SWAP_FEE_ENABLED', true);
  const swapFeeBpsConfig = await configService.get('SWAP_FEE_BPS', 30);
  const swapFeeBps = Number(swapFeeBpsConfig) > 500 ? 500 : Number(swapFeeBpsConfig); // max 5%
  const chargeFeeBy = await configService.get('SWAP_CHARGE_FEE_BY', 'currency_out');

  // KyberSwap slippage is in basis points (1% = 100)
  const slippageBps = slippage ? Math.floor(parseFloat(slippage) * 100) : 100;

  const kyberChains = {
    '1': 'ethereum',
    '56': 'bsc',
    '137': 'polygon',
    '10': 'optimism',
    '42161': 'arbitrum',
    '8453': 'base'
  };

  const chainName = kyberChains[chainId.toString()];
  if (!chainName) {
    throw ApiError.badRequest('Unsupported chain for swaps');
  }

  try {
    const NATIVE_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const tokenIn = sellToken.toLowerCase() === 'native' || sellToken.toLowerCase() === 'eth' ? NATIVE_ADDRESS : sellToken.toLowerCase();
    const tokenOut = buyToken.toLowerCase() === 'native' || buyToken.toLowerCase() === 'eth' ? NATIVE_ADDRESS : buyToken.toLowerCase();

    if (!takerAddress) {
      throw ApiError.badRequest('Missing takerAddress');
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(takerAddress)) {
      throw ApiError.badRequest('Invalid takerAddress');
    }
    if (receiverAddress && !/^0x[a-fA-F0-9]{40}$/.test(receiverAddress)) {
      throw ApiError.badRequest('Invalid receiverAddress');
    }

    const recipientFinal = receiverAddress ? receiverAddress : takerAddress;

    // Step 1: Get Route Quote
    let routeUrl = `https://aggregator-api.kyberswap.com/${chainName}/api/v1/routes?tokenIn=${tokenIn}&tokenOut=${tokenOut}&amountIn=${sellAmount}`;

    // Add platform fee parameters if configured
    if (swapFeeEnabled && swapFeeBps > 0 && treasuryAddress) {
      routeUrl += `&chargeFeeBy=${chargeFeeBy}&feeAmount=${swapFeeBps}&feeReceiver=${treasuryAddress}&isInBps=true`;
    }

    const routeResponse = await axios.get(routeUrl);

    if (!routeResponse.data || !routeResponse.data.data || !routeResponse.data.data.routeSummary) {
      throw new Error("No route found from KyberSwap");
    }

    const routeSummary = routeResponse.data.data.routeSummary;

    // Step 2: Build Transaction
    const buildUrl = `https://aggregator-api.kyberswap.com/${chainName}/api/v1/route/build`;
    const buildBody = {
      routeSummary: routeSummary,
      sender: takerAddress,
      recipient: recipientFinal,
      slippageTolerance: slippageBps
    };

    if (swapFeeEnabled && swapFeeBps > 0 && treasuryAddress) {
      buildBody.feeAmount = swapFeeBps.toString();
      buildBody.feeReceiver = treasuryAddress;
      buildBody.chargeFeeBy = chargeFeeBy;
      buildBody.isInBps = true;
    }

    const buildResponse = await axios.post(buildUrl, buildBody);
    const buildData = buildResponse.data.data;

    if (!buildData || !buildData.data) {
      throw new Error("Failed to build transaction");
    }

    const txPayload = {
      to: buildData.routerAddress,
      data: buildData.data,
      value: tokenIn === NATIVE_ADDRESS ? sellAmount : '0', // If native, value is sellAmount, else 0
      gas: routeSummary.gas || '500000',
    };

    // Map Kyber quote to expected frontend format
    const guaranteedPriceWei = ((BigInt(routeSummary.amountOut) * BigInt(10000 - slippageBps)) / 10000n).toString();
    
    const mappedQuote = {
      buyAmount: routeSummary.amountOut,
      estimatedGas: routeSummary.gas,
      gasPrice: routeSummary.gasPrice,
      estimatedPriceImpact: routeSummary.extraFee?.feeAmount ? '0' : '0', // Kyber returns price impact deeply nested, set 0 for now
      buyTokenPercentageFee: swapFeeEnabled ? (swapFeeBps / 100).toString() : '0', // Reflect configured fee
      feeRecipient: treasuryAddress, // Inform frontend that fee is collected natively
      guaranteedPrice: guaranteedPriceWei,
      routerAddress: buildData.routerAddress // Expose router address for token approvals
    };

    res.json({
      success: true,
      data: {
        transaction: txPayload,
        treasuryAddress,
        quote: mappedQuote
      }
    });
  } catch (error) {
    console.error('KyberSwap API error:', error.response?.data || error.message);

    let errorMessage = 'Failed to fetch swap route.';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }
    throw ApiError.badRequest(errorMessage);
  }
});

/**
 * Log swap history and analytics
 * POST /api/swap/history
 */
export const logSwap = asyncHandler(async (req, res) => {
  const {
    txHash, quoteId, routeId, status,
    walletAddress, receiverAddress, chainId, networkName,
    sellToken, buyToken, sellAmount, buyAmount, minReceived, slippage, priceImpact,
    platformFeePercentage, platformFeeAmount, feeToken, treasuryWallet, treasuryTxHash,
    gasUsed, gasPrice, totalGasFee, nativeCurrency,
    aggregator, routerAddress, poolCount, routeSummary,
    blockNumber, confirmationCount, explorerUrl,
    failureReason, errorMessage, failureStage
  } = req.body;

  if (!walletAddress || !chainId) {
    throw ApiError.badRequest('Missing walletAddress or chainId');
  }

  const newLog = await SwapHistory.create({
    txHash, quoteId, routeId, status,
    walletAddress, receiverAddress, chainId, networkName,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    sellToken, buyToken, sellAmount, buyAmount, minReceived, slippage, priceImpact,
    platformFeePercentage, platformFeeAmount, feeToken, treasuryWallet, treasuryTxHash,
    gasUsed, gasPrice, totalGasFee, nativeCurrency,
    aggregator, routerAddress, poolCount, routeSummary,
    blockNumber, confirmationCount, explorerUrl,
    failureReason, errorMessage,
    failureTimestamp: failureReason ? new Date() : undefined,
    failureStage
  });

  res.status(201).json({ success: true, data: newLog });
});
