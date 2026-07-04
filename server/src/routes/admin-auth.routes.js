import { Router } from 'express';
import { login, logout, refreshToken } from '../controllers/auth.controller.js';
import { verifyTurnstile } from '../middleware/security.js';

const router = Router();

router.post('/login', verifyTurnstile, login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);

export default router;
