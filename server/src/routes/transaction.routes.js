import { Router } from 'express';
import { getTransactionHistory } from '../controllers/transaction.controller.js';

const router = Router();

router.get('/history', getTransactionHistory);

export default router;
