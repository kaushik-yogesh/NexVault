import mongoose from 'mongoose';

const securityEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        'CAPTCHA_FAILED',
        'BOT_DETECTED',
        'VPN_DETECTED',
        'PROXY_DETECTED',
        'RATE_LIMITED',
        'BLOCKED_REQUEST',
        'SUSPICIOUS_LOGIN',
        'FAILED_LOGIN_SPIKE',
        'RATE_LIMIT_HIT',
        'RPC_FAILURE',
        'SUSPICIOUS_TRANSFER',
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        'SYSTEM_ERROR'
      ],
      index: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    ipAddress: {
      type: String,
    },
    country: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    rayId: {
      type: String,
    },
    threatScore: {
      type: Number,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    details: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    resolvedAt: {
      type: Date,
    },
    resolutionNotes: {
      type: String,
    }
  },
  { timestamps: true }
);

const SecurityEvent = mongoose.model('SecurityEvent', securityEventSchema);
export default SecurityEvent;
