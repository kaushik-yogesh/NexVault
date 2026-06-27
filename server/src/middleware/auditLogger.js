import { asyncHandler } from './errorHandler.js';

/**
 * Middleware to log admin actions to the database or external service (like Sentry)
 */
export const auditLogger = asyncHandler(async (req, res, next) => {
  // We hook into the response finish event to ensure the action was successful
  res.on('finish', () => {
    if (req.admin && req.method !== 'GET') {
      const logEntry = {
        adminId: req.admin._id,
        action: `${req.method} ${req.originalUrl}`,
        status: res.statusCode,
        timestamp: new Date().toISOString(),
        ip: req.ip,
      };
      
      // In production, save to an AuditLogs collection or send to Sentry/Datadog
      console.log(`[AUDIT] Action recorded:`, logEntry);
    }
  });

  next();
});
