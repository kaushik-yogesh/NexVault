import rateLimit from 'express-rate-limit';
import axios from 'axios';
import configService from '../services/configService.js';
import SecurityEvent from '../models/SecurityEvent.js';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Middleware: Verify Cloudflare Turnstile Token
 * Checks the req.body['cf-turnstile-response'] against Cloudflare API
 */
export const verifyTurnstile = async (req, res, next) => {
  try {
    const isEnabled = await configService.get('SECURITY_TURNSTILE_ENABLED', process.env.ENABLE_TURNSTILE === 'true');
    if (!isEnabled) return next();

    const token = req.body['cf-turnstile-response'] || req.headers['x-turnstile-token'];
    
    if (!token) {
      await logSecurityEvent('CAPTCHA_FAILED', req, 'Missing Turnstile token', 'HIGH');
      return res.status(403).json({ error: 'Turnstile token is required. Are you a bot?' });
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    const ip = req.headers['cf-connecting-ip'] || req.ip;

    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    formData.append('remoteip', ip);

    const response = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = response.data;

    if (!data.success) {
      logger.warn('Turnstile verification failed:', data['error-codes']);
      await logSecurityEvent('CAPTCHA_FAILED', req, `Turnstile failed: ${data['error-codes']?.join(',')}`, 'HIGH');
      return res.status(403).json({ error: 'Turnstile verification failed. Please try again.' });
    }

    // Pass
    next();
  } catch (error) {
    logger.error('Error during Turnstile verification', error);
    return res.status(500).json({ error: 'Internal server error during security verification.' });
  }
};

/**
 * Middleware: Rate Limiter Factory
 */
export const createRateLimiter = (limitKey, defaultLimit, windowMs = 60000) => {
  return rateLimit({
    windowMs,
    limit: async (req, res) => {
      // Fetch dynamic limit from config service
      const limit = await configService.get(limitKey, defaultLimit);
      return parseInt(limit, 10);
    },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Prefer Cloudflare IP over standard req.ip
      return req.headers['cf-connecting-ip'] || req.ip;
    },
    handler: async (req, res, next, options) => {
      await logSecurityEvent('RATE_LIMITED', req, `Exceeded limit of ${options.limit} per window`, 'MEDIUM');
      res.status(429).json({ error: 'Too many requests, please try again later.' });
    }
  });
};

/**
 * Standard limiters mapped to env defaults
 */
export const loginLimiter = createRateLimiter('RATE_LIMIT_LOGIN', parseInt(process.env.RATE_LIMIT_LOGIN || 5));
export const swapLimiter = createRateLimiter('RATE_LIMIT_SWAP', parseInt(process.env.RATE_LIMIT_SWAP || 30));
export const apiLimiter = createRateLimiter('RATE_LIMIT_API', parseInt(process.env.RATE_LIMIT_API || 60));


/**
 * Middleware: Cloudflare VPN / Proxy / Datacenter Detection
 */
export const detectVPN = async (req, res, next) => {
  try {
    const isEnabled = await configService.get('SECURITY_VPN_BLOCK', process.env.ENABLE_VPN_CHALLENGE === 'true');
    if (!isEnabled) return next();

    // In Cloudflare Enterprise/Pro, CF-Threat-Score might indicate VPN or Proxy
    const threatScore = parseInt(req.headers['cf-threat-score'] || '0', 10);
    
    if (threatScore > 50) {
      await logSecurityEvent('VPN_DETECTED', req, `High threat score: ${threatScore}`, 'HIGH');
      // If we are strictly blocking VPNs:
      // return res.status(403).json({ error: 'Access denied. VPNs and Proxies are not allowed.' });
    }

    next();
  } catch (error) {
    next();
  }
};

/**
 * Middleware: Detect Bots
 */
export const detectBot = async (req, res, next) => {
  try {
    const isEnabled = await configService.get('SECURITY_BOT_BLOCK', process.env.ENABLE_BOT_PROTECTION === 'true');
    if (!isEnabled) return next();

    // CF-Bot-Score is 1 (automated) to 99 (human)
    const botScore = req.headers['cf-bot-score'];
    
    if (botScore && parseInt(botScore, 10) < 30) {
      await logSecurityEvent('BOT_DETECTED', req, `Low bot score: ${botScore}`, 'CRITICAL');
      return res.status(403).json({ error: 'Automated requests are not permitted.' });
    }

    next();
  } catch (error) {
    next();
  }
};

/**
 * Helper to log to SecurityEvent collection
 */
const logSecurityEvent = async (eventType, req, details, severity = 'MEDIUM') => {
  try {
    const ipAddress = req.headers['cf-connecting-ip'] || req.ip;
    const country = req.headers['cf-ipcountry'] || 'UNKNOWN';
    const rayId = req.headers['cf-ray'] || 'LOCAL';
    const userAgent = req.headers['user-agent'] || 'UNKNOWN';
    const threatScore = req.headers['cf-threat-score'] ? parseInt(req.headers['cf-threat-score'], 10) : 0;

    await SecurityEvent.create({
      eventType,
      severity,
      ipAddress,
      country,
      userAgent,
      rayId,
      threatScore,
      details,
      metadata: {
        path: req.originalUrl,
        method: req.method,
        query: req.query,
      }
    });
  } catch (error) {
    logger.error('Failed to log security event:', error);
  }
};

/**
 * Global Request Security Logger (logs every request headers if needed, mostly for analytics)
 */
export const requestLogger = async (req, res, next) => {
  // Can be extended to log country distribution, etc.
  next();
};
