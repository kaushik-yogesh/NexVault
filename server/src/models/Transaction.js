import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    txHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    chainId: {
      type: String,
      required: true,
    },
    from: {
      type: String,
      required: true,
      lowercase: true,
    },
    to: {
      type: String,
      required: true,
      lowercase: true,
    },
    value: {
      type: String, // Stored as string to handle BigInts
      required: true,
    },
    assetType: {
      type: String,
      enum: ['NATIVE', 'ERC20', 'NFT'],
      required: true,
    },
    tokenAddress: {
      type: String,
      lowercase: true,
    },
    tokenId: {
      type: String, // For NFTs
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED'],
      default: 'PENDING',
    },
    type: {
      type: String,
      enum: ['SEND', 'RECEIVE', 'SWAP', 'CONTRACT_INTERACTION', 'UNKNOWN'],
      default: 'SEND',
    },
    networkFee: {
      type: String, // Gas fee paid to the network (in wei/smallest unit)
      default: '0',
    },
    platformFee: {
      type: String, // Fee collected by the wallet treasury
      default: '0',
    },
    usdValue: {
      type: Number, // Optional tracking of USD volume for analytics
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for fast portfolio history queries
transactionSchema.index({ userId: 1, timestamp: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
