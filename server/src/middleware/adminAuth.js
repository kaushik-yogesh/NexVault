import jwt from 'jsonwebtoken';
import { ApiError, asyncHandler } from './errorHandler.js';
import Admin from '../models/Admin.js';

/**
 * Middleware to protect admin routes
 */
export const protectAdmin = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw ApiError.unauthorized('Not authorized to access this route');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    const admin = await Admin.findById(decoded.id).select('-passwordHash');

    if (!admin) {
      throw ApiError.unauthorized('Admin not found');
    }

    req.admin = admin;
    next();
  } catch (error) {
    throw ApiError.unauthorized('Token failed or expired');
  }
});

/**
 * Role-Based Access Control middleware
 * @param  {...string} roles - Allowed roles
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      throw ApiError.forbidden(`Role ${req.admin?.role} is not authorized`);
    }
    next();
  };
};
