/**
 * NexVault — Chain Routes
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { CHAINS } from '../../../shared/constants/chains.js';

const router = Router();

/**
 * GET /api/chains
 * List all supported chains
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const chains = Object.values(CHAINS).map((chain) => ({
      chainId: chain.chainId,
      chainIdDecimal: chain.chainIdDecimal,
      name: chain.name,
      shortName: chain.shortName,
      nativeCurrency: chain.nativeCurrency,
      blockExplorer: chain.blockExplorer,
      color: chain.color,
      isTestnet: chain.isTestnet,
      supportsEIP1559: chain.supportsEIP1559,
    }));

    res.json({
      success: true,
      data: chains,
      count: chains.length,
    });
  })
);

/**
 * GET /api/chains/:chainId
 * Get chain details by chainId (hex)
 */
router.get(
  '/:chainId',
  asyncHandler(async (req, res) => {
    const chain = CHAINS[req.params.chainId];

    if (!chain) {
      return res.status(404).json({
        success: false,
        error: { message: 'Chain not found' },
      });
    }

    res.json({
      success: true,
      data: chain,
    });
  })
);

export default router;
