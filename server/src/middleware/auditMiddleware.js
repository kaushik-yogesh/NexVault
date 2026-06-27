import AuditLog from '../models/AuditLog.js';
import logger from '../utils/logger.js';

/**
 * Audit Logging Middleware
 * Automatically records an immutable audit log after successful completion 
 * of a state-changing API request (POST, PUT, DELETE).
 * 
 * Usage: Insert this middleware in routes that need auditing.
 * It hooks into res.json() and res.send() to record the log after the response is sent.
 * 
 * @param {String} resourceName - The name of the resource being modified (e.g., 'USER', 'FEE_CONFIG')
 */
export const auditAction = (resourceName) => {
  return (req, res, next) => {
    // Only audit state-changing methods
    if (['GET', 'OPTIONS', 'HEAD'].includes(req.method)) {
      return next();
    }

    const originalJson = res.json;
    const originalSend = res.send;

    // We override the response methods to capture the moment of success
    const logIfSuccess = (responseBody) => {
      // Assuming a 2xx or 3xx status code means success
      if (res.statusCode >= 200 && res.statusCode < 400 && req.admin) {
        
        let action = req.method;
        if (req.route && req.route.path) {
          action = `${req.method} ${req.route.path}`;
        }

        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];

        // We run this asynchronously so it doesn't block the response
        AuditLog.create({
          adminId: req.admin._id,
          action,
          resource: resourceName,
          resourceId: req.params.id || null,
          // Storing body might be sensitive, we filter passwords
          newValue: sanitizeBody(req.body),
          ipAddress,
          userAgent,
        }).catch(err => {
          logger.error(`Failed to create audit log for ${action}: ${err.message}`);
        });
      }
    };

    res.json = function (body) {
      logIfSuccess(body);
      return originalJson.call(this, body);
    };

    res.send = function (body) {
      logIfSuccess(body);
      return originalSend.call(this, body);
    };

    next();
  };
};

function sanitizeBody(body) {
  if (!body) return {};
  const sanitized = { ...body };
  if (sanitized.password) sanitized.password = '[REDACTED]';
  if (sanitized.token) sanitized.token = '[REDACTED]';
  if (sanitized.twoFactorToken) sanitized.twoFactorToken = '[REDACTED]';
  return sanitized;
}
