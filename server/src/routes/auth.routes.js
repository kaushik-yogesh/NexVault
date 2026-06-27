/**
 * NexVault — Auth Routes (SIWE - Sign-In With Ethereum)
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SiweMessage } from 'siwe';
import jwt from 'jsonwebtoken';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import User from '../models/User.js';

const router = Router();

// In-memory nonce store (use Redis in production)
const nonceStore = new Map();

/**
 * POST /api/auth/sync
 * Sync a locally created/unlocked wallet with the backend telemetry
 */
router.post(
  '/sync',
  asyncHandler(async (req, res) => {
    const { address } = req.body;
    if (!address) {
      throw ApiError.badRequest('Address is required');
    }

    await User.findOneAndUpdate(
      { address: address.toLowerCase() },
      { $set: { lastLogin: new Date() } },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'User synced' });
  })
);

/**
 * GET /api/auth/nonce
 * Generate a challenge nonce for SIWE
 */
router.get(
  '/nonce',
  asyncHandler(async (req, res) => {
    const nonce = uuidv4();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    nonceStore.set(nonce, { expiresAt });

    // Clean expired nonces
    for (const [key, value] of nonceStore) {
      if (value.expiresAt < Date.now()) nonceStore.delete(key);
    }

    res.json({
      success: true,
      data: { nonce },
    });
  })
);

/**
 * POST /api/auth/verify
 * Verify a signed SIWE message and issue JWT
 */
router.post(
  '/verify',
  asyncHandler(async (req, res) => {
    const { message, signature } = req.body;

    if (!message || !signature) {
      throw ApiError.badRequest('Message and signature are required');
    }

    try {
      const siweMessage = new SiweMessage(message);
      const { data: fields } = await siweMessage.verify({ signature });

      // Verify nonce
      const nonceData = nonceStore.get(fields.nonce);
      if (!nonceData || nonceData.expiresAt < Date.now()) {
        throw ApiError.unauthorized('Invalid or expired nonce');
      }

      // Remove used nonce
      nonceStore.delete(fields.nonce);

      // Generate tokens
      const accessToken = jwt.sign(
        { address: fields.address, chainId: fields.chainId },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
      );

      const refreshToken = jwt.sign(
        { address: fields.address, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
        { expiresIn: process.env.JWT_REFRESH_EXPIRY || '14d' }
      );

      // Set refresh token as HttpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
      });

      res.json({
        success: true,
        data: {
          accessToken,
          address: fields.address,
          chainId: fields.chainId,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.unauthorized('Signature verification failed');
    }
  })
);

/**
 * POST /api/auth/refresh
 * Rotate refresh token
 */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw ApiError.unauthorized('No refresh token provided');
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret'
      );

      // Issue new tokens
      const newAccessToken = jwt.sign(
        { address: decoded.address },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
      );

      const newRefreshToken = jwt.sign(
        { address: decoded.address, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
        { expiresIn: process.env.JWT_REFRESH_EXPIRY || '14d' }
      );

      // Set new refresh token cookie
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 14 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        data: { accessToken: newAccessToken },
      });
    } catch (error) {
      // Clear invalid cookie
      res.clearCookie('refreshToken');
      throw ApiError.unauthorized('Invalid refresh token');
    }
  })
);

/**
 * POST /api/auth/logout
 * Invalidate session
 */
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully' });
  })
);

export default router;
