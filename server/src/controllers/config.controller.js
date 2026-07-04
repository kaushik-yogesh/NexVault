import { asyncHandler } from '../middleware/errorHandler.js';
import configService from '../services/configService.js';

/**
 * Get public global configuration for the frontend client
 * GET /api/config
 */
export const getPublicConfig = asyncHandler(async (req, res) => {
  const allConfigs = await configService.getAll();
  
  // Only expose non-sensitive configs to the public client
  const publicKeys = [
    'GLOBAL_SWAP_FEE',
    'SLIPPAGE_DEFAULT',
    'ENABLE_SWAP',
    'SUPPORTED_CHAINS',
    'SUPPORTED_TOKENS',
    'GAS_RESERVE_MIN',
    'GAS_RESERVE_PERCENT',
    'GAS_LIMIT_FALLBACK_SWAP'
  ];

  const publicConfig = {};
  
  for (const key of publicKeys) {
    if (allConfigs[key] !== undefined) {
      publicConfig[key] = allConfigs[key];
    }
  }

  res.json({
    success: true,
    data: publicConfig,
  });
});
