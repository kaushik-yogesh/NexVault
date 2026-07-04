import express from 'express';
import { getPublicConfig } from '../controllers/config.controller.js';

const router = express.Router();

// Public endpoint to get frontend configuration
router.get('/', getPublicConfig);

export default router;
