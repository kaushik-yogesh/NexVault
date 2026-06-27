import { Router } from 'express';
import { getTokens, getNFTs } from '../controllers/wallet.controller.js';

const router = Router();

router.get('/tokens', getTokens);
router.get('/nfts', getNFTs);

export default router;
