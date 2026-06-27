import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { SecurityScanner } from '../utils/SecurityScanner.js';

const router = Router();

/**
 * GET /api/security/scan
 */
router.post('/scan', asyncHandler(async (req, res) => {
  const { chainId, to, data, value } = req.body;

  // 1. Scan the destination contract
  const contractThreat = await SecurityScanner.scanContract(chainId, to);

  // 2. Simulate the transaction outcome
  const simulation = await SecurityScanner.simulateTransaction({ to, data, value });

  res.json({
    success: true,
    data: {
      securityCheck: contractThreat,
      simulation,
    }
  });
}));

export default router;
