import { Router } from 'express';
import { getAuditLogs, getSecurityEvents } from '../controllers/audit.controller.js';
import { protectAdmin, requireRole } from '../middleware/adminAuth.js';

const router = Router();

// Protect all audit routes
router.use(protectAdmin);
router.use(requireRole('SUPER_ADMIN', 'ADMIN', 'MODERATOR'));

router.get('/logs', getAuditLogs);
router.get('/security-events', getSecurityEvents);

export default router;
