import { asyncHandler } from '../middleware/errorHandler.js';
import AuditLog from '../models/AuditLog.js';
import SecurityEvent from '../models/SecurityEvent.js';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const logs = await AuditLog.find()
    .populate('adminId', 'email role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await AuditLog.countDocuments();

  res.json({
    success: true,
    data: {
      logs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

export const getSecurityEvents = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.resolved !== undefined) {
    filter.resolved = req.query.resolved === 'true';
  }
  if (req.query.severity) {
    filter.severity = req.query.severity;
  }

  const events = await SecurityEvent.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await SecurityEvent.countDocuments(filter);

  res.json({
    success: true,
    data: {
      events,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    }
  });
});
