import { Router } from 'express';
import { login, logout, refreshToken } from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);

export default router;
