/**
 * NexVault — JWT Auth Middleware
 */

import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Access token required');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token expired', 1003);
    }
    throw ApiError.unauthorized('Invalid access token');
  }
}

export function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Admin access token required');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    if (!decoded.isAdmin) {
      throw ApiError.forbidden('Admin access required');
    }
    req.admin = decoded;
    next();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.unauthorized('Invalid admin token');
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    const user = req.admin || req.user;
    if (!user || !roles.includes(user.role)) {
      throw ApiError.forbidden('Insufficient permissions');
    }
    next();
  };
}
