import { Router } from 'express';
import {
  getAnalytics,
  getUsers,
  updateUserStatus,
  getConfig,
  updateConfig,
  getTransactions,
} from '../controllers/admin.controller.js';
import {
  generateTOTPSecret,
  verifyAndEnableTOTP,
  disableTOTP,
} from '../controllers/auth.controller.js';
import { protectAdmin, requireRole } from '../middleware/adminAuth.js';
import { auditAction } from '../middleware/auditMiddleware.js';
import {
  getSwapStats,
  getSwapHistory,
  getSwapFailures,
  getTreasuryAnalytics,
} from '../controllers/admin.swap.controller.js';

const router = Router();

// Protect all admin routes
router.use(protectAdmin);

// Dashboard
router.get('/analytics', requireRole('SUPER_ADMIN', 'ADMIN', 'SUPPORT'), getAnalytics);

// Users & Transactions
router.get('/users', requireRole('SUPER_ADMIN', 'ADMIN', 'SUPPORT'), getUsers);
router.put('/users/:id/status', requireRole('SUPER_ADMIN', 'ADMIN'), auditAction('USER'), updateUserStatus);
router.get('/transactions', requireRole('SUPER_ADMIN', 'ADMIN', 'SUPPORT'), getTransactions);

// Swap Analytics
router.get('/swap-analytics/stats', requireRole('SUPER_ADMIN', 'ADMIN', 'SUPPORT'), getSwapStats);
router.get('/swap-analytics/history', requireRole('SUPER_ADMIN', 'ADMIN', 'SUPPORT'), getSwapHistory);
router.get('/swap-analytics/failures', requireRole('SUPER_ADMIN', 'ADMIN', 'SUPPORT'), getSwapFailures);
router.get('/swap-analytics/treasury', requireRole('SUPER_ADMIN', 'ADMIN'), getTreasuryAnalytics);

// Configuration (Fees, Treasury)
router.get('/config', requireRole('SUPER_ADMIN', 'ADMIN'), getConfig);
router.put('/config', requireRole('SUPER_ADMIN'), auditAction('CONFIG'), updateConfig);

// 2FA Management
router.post('/2fa/setup', generateTOTPSecret);
router.post('/2fa/enable', verifyAndEnableTOTP);
router.post('/2fa/disable', disableTOTP);

export default router;
