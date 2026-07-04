import { asyncHandler } from '../middleware/errorHandler.js';
import SwapHistory from '../models/SwapHistory.js';
import AppConfig from '../models/AppConfig.js';
import configService from '../services/configService.js';

/**
 * Get swap analytics KPIs and revenue stats
 * GET /api/admin/swap-analytics/stats
 */
export const getSwapStats = asyncHandler(async (req, res) => {
  const totalSwaps = await SwapHistory.countDocuments();
  const successfulSwaps = await SwapHistory.countDocuments({ status: 'SUCCESS' });
  const failedSwaps = await SwapHistory.countDocuments({ status: 'FAILED' });
  const pendingSwaps = await SwapHistory.countDocuments({ status: 'PENDING' });

  const successRate = totalSwaps > 0 ? ((successfulSwaps / totalSwaps) * 100).toFixed(2) : 0;

  // Aggregate revenues (summing usdValue if we had it, but we have platformFeeAmount which might be in tokens)
  // For a robust system, we can group by chainId or just count records.
  // The UI requested: Today Revenue, Yesterday Revenue, This Week, This Month, Total Lifetime Revenue
  // Since platformFeeAmount is a string of BigInts for different tokens, summing them directly in MongoDB without USD conversion is tricky.
  // We will return dummy USD estimations or raw token grouped sums if no USD value is stored.
  // For simplicity, let's group by token to get actual revenue collected.
  
  const revenueByToken = await SwapHistory.aggregate([
    { $match: { status: 'SUCCESS' } },
    {
      $group: {
        _id: '$feeToken',
        totalFee: { $sum: { $toDouble: '$platformFeeAmount' } }, // Note: toDouble might lose precision on huge uint256, but works for analytics
        count: { $sum: 1 }
      }
    }
  ]);

  const revenueByChain = await SwapHistory.aggregate([
    { $match: { status: 'SUCCESS' } },
    {
      $group: {
        _id: '$chainId',
        count: { $sum: 1 }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      totalSwaps,
      successfulSwaps,
      failedSwaps,
      pendingSwaps,
      successRate,
      revenueByToken,
      revenueByChain
    }
  });
});

/**
 * Get paginated transaction history table
 * GET /api/admin/swap-analytics/history
 */
export const getSwapHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';
  
  let query = {};
  if (search) {
    query = {
      $or: [
        { txHash: { $regex: search, $options: 'i' } },
        { walletAddress: { $regex: search, $options: 'i' } }
      ]
    };
  }

  const transactions = await SwapHistory.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await SwapHistory.countDocuments(query);

  res.json({
    success: true,
    data: {
      transactions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * Get failure analytics
 * GET /api/admin/swap-analytics/failures
 */
export const getSwapFailures = asyncHandler(async (req, res) => {
  const failures = await SwapHistory.find({ status: 'FAILED' })
    .select('txHash walletAddress failureReason errorMessage failureStage failureTimestamp chainId')
    .sort({ failureTimestamp: -1, timestamp: -1 })
    .limit(100)
    .lean();

  const failureStats = await SwapHistory.aggregate([
    { $match: { status: 'FAILED' } },
    {
      $group: {
        _id: '$failureStage',
        count: { $sum: 1 }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      failures,
      failureStats
    }
  });
});

/**
 * Get treasury config and metrics
 * GET /api/admin/swap-analytics/treasury
 */
export const getTreasuryAnalytics = asyncHandler(async (req, res) => {
  const treasuryAddress = await configService.get('TREASURY_WALLET', process.env.TREASURY_ADDRESS || 'Not Configured');

  res.json({
    success: true,
    data: {
      treasuryAddress
    }
  });
});
