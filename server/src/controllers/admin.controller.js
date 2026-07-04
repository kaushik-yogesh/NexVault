import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import AppConfig from '../models/AppConfig.js';
import Admin from '../models/Admin.js';
import configService from '../services/configService.js';

/**
 * Get dashboard analytics
 * GET /api/admin/analytics
 */
export const getAnalytics = asyncHandler(async (req, res) => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const totalUsers = await User.countDocuments();
  const activeUsers24h = await User.countDocuments({
    lastLogin: { $gte: oneDayAgo }
  });

  const recentTransactions = await Transaction.countDocuments({
    timestamp: { $gte: oneDayAgo }
  });

  // Calculate actual volume from transactions
  const swapAgg = await Transaction.aggregate([
    { $match: { type: 'SWAP', status: 'CONFIRMED', timestamp: { $gte: oneDayAgo } } },
    { $group: { _id: null, totalVolume: { $sum: "$usdValue" } } }
  ]);
  
  const totalVolume24h = swapAgg.length > 0 ? swapAgg[0].totalVolume : 0;

  // Generate 7-day chart data safely
  let chartData = [];
  try {
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
      
      const dayVolumeAgg = await Transaction.aggregate([
        { $match: { type: 'SWAP', status: 'CONFIRMED', timestamp: { $gte: start, $lt: end } } },
        { $group: { _id: null, totalVolume: { $sum: "$usdValue" } } }
      ]).catch(() => []); // Ignore aggregation errors
      
      const dayVolume = dayVolumeAgg.length > 0 ? dayVolumeAgg[0].totalVolume : 0;

      const dayUsers = await User.countDocuments({
        lastLogin: { $gte: start, $lt: end }
      });

      const dayName = start.toLocaleDateString('en-US', { weekday: 'short' });
      chartData.push({
        name: dayName,
        volume: dayVolume,
        users: dayUsers
      });
    }
  } catch (err) {
    console.warn('Failed to generate 7-day chart data: ' + err.message);
  }

  res.json({
    success: true,
    data: {
      totalUsers,
      activeUsers24h,
      recentTransactions,
      totalVolume24h,
      chartData
    }
  });
});

/**
 * Get all users
 * GET /api/admin/users
 */
export const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  // Add search by address
  const filter = {};
  if (req.query.search) {
    filter.address = { $regex: req.query.search, $options: 'i' };
  }
  
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const users = await User.find(filter)
    .select('-nonce')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments(filter);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * Change user status
 * PUT /api/admin/users/:id/status
 */
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['ACTIVE', 'FROZEN', 'DISABLED', 'SOFT_DELETED'];
  if (!validStatuses.includes(status)) {
    throw ApiError.badRequest('Invalid status');
  }

  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');

  user.status = status;
  await user.save();

  res.json({ success: true, message: `User status updated to ${status}` });
});

/**
 * Get global configuration (Fees, Treasury, etc.)
 * GET /api/admin/config
 */
export const getConfig = asyncHandler(async (req, res) => {
  const configs = await AppConfig.find();
  
  const configMap = configs.reduce((acc, conf) => {
    acc[conf.key] = conf.value;
    return acc;
  }, {});

  res.json({
    success: true,
    data: configMap,
  });
});

/**
 * Update configuration values
 * PUT /api/admin/config
 */
export const updateConfig = asyncHandler(async (req, res) => {
  const { updates } = req.body;

  if (!Array.isArray(updates)) {
    throw ApiError.badRequest('Updates must be an array');
  }

  const results = [];
  for (const update of updates) {
    const conf = await AppConfig.findOneAndUpdate(
      { key: update.key },
      { 
        value: update.value, 
        type: update.type || 'GENERAL',
        category: update.category || 'GENERAL',
        description: update.description,
        updatedBy: req.admin._id 
      },
      { new: true, upsert: true }
    );
    results.push(conf);
  }

  // Invalidate in-memory cache so next request fetches fresh data
  configService.invalidateCache();

  res.json({
    success: true,
    message: 'Configuration updated successfully',
    data: results
  });
});

/**
 * Get all platform transactions
 * GET /api/admin/transactions
 */
export const getTransactions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.search) {
    filter.$or = [
      { txHash: { $regex: req.query.search, $options: 'i' } },
      { from: { $regex: req.query.search, $options: 'i' } },
      { to: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.chainId) filter.chainId = req.query.chainId;

  const transactions = await Transaction.find(filter)
    .populate('userId', 'address')
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Transaction.countDocuments(filter);

  // Calculate totals for summary cards (gas, volume)
  const totalsAgg = await Transaction.aggregate([
    { $match: filter },
    { $group: { 
        _id: null, 
        totalVolumeUSD: { $sum: "$usdValue" },
        // Summing platform fees would typically require converting string wei to a normalized number/BigInt, 
        // but for simplicity in analytics we might rely on usdValue for now.
    }}
  ]);

  res.json({
    success: true,
    data: {
      transactions,
      summary: {
        totalTransactions: total,
        totalVolumeUSD: totalsAgg.length > 0 ? totalsAgg[0].totalVolumeUSD : 0
      },
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    }
  });
});
