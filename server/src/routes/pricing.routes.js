/**
 * NexVault — Pricing Routes
 * Protected with Redis-backed Rate Limiting
 */

import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from '../config/redis.js';
import * as pricingController from '../controllers/pricing.controller.js';

const router = Router();

// Strict Rate Limiting for Pricing Endpoints
// Allows 60 requests per minute per IP to prevent CoinMarketCap proxy abuse
const pricingLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'rl:pricing:',
  }),
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 429, message: 'Pricing API rate limit exceeded.' }
  }
});

router.use(pricingLimiter);

router.get('/native/:chainId', pricingController.getNativePrice);
router.get('/tokens/:chainId', pricingController.getTokenPrices);
router.get('/meta/:chainId', pricingController.getTokenMetadata);
router.get('/chart/:chainId', pricingController.getTokenChartData);

export default router;
