import { Router } from 'express';
import { getQuote, buildTransaction, logSwap } from '../controllers/swap.controller.js';

const router = Router();

router.get('/quote', getQuote);
router.get('/build', buildTransaction);
router.post('/history', logSwap);

export default router;
