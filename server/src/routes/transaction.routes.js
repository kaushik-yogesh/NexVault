import { Router } from 'express';
import { getTransactionHistory, saveTransaction, updateTransactionStatus } from '../controllers/transaction.controller.js';

const router = Router();

router.get('/history', getTransactionHistory);
router.post('/', saveTransaction);
router.put('/:txHash', updateTransactionStatus);

export default router;
