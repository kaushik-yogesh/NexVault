/**
 * NexVault — Error Handler Middleware
 */

import logger from '../utils/logger.js';

export class ApiError extends Error {
  constructor(statusCode, message, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }

  static badRequest(message = 'Bad request', code = null) {
    return new ApiError(400, message, code);
  }

  static unauthorized(message = 'Unauthorized', code = null) {
    return new ApiError(401, message, code);
  }

  static forbidden(message = 'Forbidden', code = null) {
    return new ApiError(403, message, code);
  }

  static notFound(message = 'Not found', code = null) {
    return new ApiError(404, message, code);
  }

  static tooManyRequests(message = 'Too many requests', code = null) {
    return new ApiError(429, message, code);
  }

  static internal(message = 'Internal server error', code = null) {
    return new ApiError(500, message, code);
  }
}

export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, req, res, _next) {
  // Log error
  if (!err.isOperational) {
    logger.error('Unhandled error:', err);
  } else {
    logger.warn(`API Error [${err.statusCode}]: ${err.message}`);
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || statusCode,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

/**
 * Wrap async route handlers to catch errors
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
