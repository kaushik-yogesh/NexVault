import { Router } from 'express';
import { getQuote, buildTransaction } from '../controllers/swap.controller.js';

const router = Router();

router.get('/quote', getQuote);
router.get('/build', buildTransaction);

export default router;
