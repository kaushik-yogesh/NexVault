import mongoose from 'mongoose';

const appConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    type: {
      type: String,
      enum: ['FEE', 'RPC', 'FEATURE_FLAG', 'TREASURY'],
      required: true,
    },
    description: {
      type: String,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

const AppConfig = mongoose.model('AppConfig', appConfigSchema);
export default AppConfig;
