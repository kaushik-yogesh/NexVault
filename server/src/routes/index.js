/**
 * NexVault — Route Aggregator
 */

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import chainRoutes from './chain.routes.js';
import swapRoutes from './swap.routes.js';
import adminRoutes from './admin.routes.js';
import securityRoutes from './security.routes.js';
import adminAuthRoutes from './admin-auth.routes.js';
import auditRoutes from './audit.routes.js';
import transactionRoutes from './transaction.routes.js';
import walletRoutes from './wallet.routes.js';
import pricingRoutes from './pricing.routes.js';
import configRoutes from './config.routes.js';
import { 
  loginLimiter, 
  apiLimiter, 
  swapLimiter, 
  detectBot, 
  detectVPN, 
  requestLogger 
} from '../middleware/security.js';

const router = Router();

// Apply global security headers detection and logging
router.use(requestLogger);
router.use(detectBot);
router.use(detectVPN);

// Public routes with API rate limiter
router.use('/auth', loginLimiter, authRoutes);
router.use('/chains', apiLimiter, chainRoutes);
router.use('/swap', swapLimiter, swapRoutes);
router.use('/security', apiLimiter, securityRoutes);
router.use('/transactions', apiLimiter, transactionRoutes);
router.use('/wallet', apiLimiter, walletRoutes);
router.use('/pricing', apiLimiter, pricingRoutes);
router.use('/config', apiLimiter, configRoutes);

// Admin Public routes
router.use('/admin/auth', loginLimiter, adminAuthRoutes);

// Protected Admin Routes
router.use('/admin', apiLimiter, adminRoutes);
router.use('/admin/audit', apiLimiter, auditRoutes);

// API info
router.get('/', (req, res) => {
  res.json({
    name: 'NexVault API',
    version: '1.0.0',
    status: 'active',
    documentation: '/docs',
  });
});

export default router;
