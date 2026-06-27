import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    nonce: {
      type: String,
      required: false,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'FROZEN', 'DISABLED', 'SOFT_DELETED'],
      default: 'ACTIVE',
    },
    connectedChains: [{ type: String }],
    preferences: {
      currency: { type: String, default: 'USD' },
      theme: { type: String, default: 'system' },
      language: { type: String, default: 'en' },
    },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
export default User;
