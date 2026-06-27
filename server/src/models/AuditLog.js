import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resource: {
      type: String,
      required: true,
    },
    resourceId: {
      type: String,
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { 
    timestamps: true,
    // Audit logs should be immutable
    capped: false 
  }
);

// Prevent updates to audit logs to ensure immutability
auditLogSchema.pre('updateOne', function (next) {
  next(new Error('Audit logs are immutable and cannot be updated.'));
});

auditLogSchema.pre('findOneAndUpdate', function (next) {
  next(new Error('Audit logs are immutable and cannot be updated.'));
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
