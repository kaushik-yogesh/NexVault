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

const router = Router();

// Public routes
router.use('/auth', authRoutes);
router.use('/chains', chainRoutes);
router.use('/swap', swapRoutes);
router.use('/security', securityRoutes);
router.use('/transactions', transactionRoutes);
router.use('/wallet', walletRoutes);
router.use('/pricing', pricingRoutes);
router.use('/config', configRoutes);

// Admin Public routes
router.use('/admin/auth', adminAuthRoutes);

// Protected Admin Routes
router.use('/admin', adminRoutes);
router.use('/admin/audit', auditRoutes);

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
