import mongoose from 'mongoose';

const swapHistorySchema = new mongoose.Schema(
  {
    // Basic
    txHash: {
      type: String,
      index: true,
      sparse: true,
    },
    quoteId: { type: String },
    routeId: { type: String },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },

    // User
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    receiverAddress: {
      type: String,
      lowercase: true,
    },
    chainId: {
      type: String,
      required: true,
      index: true,
    },
    networkName: { type: String },
    ip: { type: String },
    userAgent: { type: String },

    // Swap
    sellToken: { type: String, lowercase: true },
    buyToken: { type: String, lowercase: true },
    sellAmount: { type: String }, // string for bigints/decimals
    buyAmount: { type: String },
    minReceived: { type: String },
    slippage: { type: Number },
    priceImpact: { type: Number },

    // Fee
    platformFeePercentage: { type: Number, default: 0 },
    platformFeeAmount: { type: String, default: '0' },
    feeToken: { type: String, lowercase: true },
    treasuryWallet: { type: String, lowercase: true },
    treasuryTxHash: { type: String },

    // Gas
    gasUsed: { type: String },
    gasPrice: { type: String },
    totalGasFee: { type: String },
    nativeCurrency: { type: String },

    // Route
    aggregator: {
      type: String,
      index: true,
    },
    routerAddress: { type: String, lowercase: true },
    poolCount: { type: Number },
    routeSummary: { type: mongoose.Schema.Types.Mixed },

    // Blockchain
    blockNumber: { type: Number },
    confirmationCount: { type: Number },
    explorerUrl: { type: String },

    // Failure Analytics
    failureReason: { type: String },
    errorMessage: { type: String },
    failureTimestamp: { type: Date },
    failureStage: {
      type: String,
      enum: ['QUOTE', 'BUILD', 'SIGNING', 'BROADCAST', 'ON-CHAIN', 'UNKNOWN'],
    },
  },
  { timestamps: true }
);

// Indexes
swapHistorySchema.index({ walletAddress: 1, timestamp: -1 });
swapHistorySchema.index({ chainId: 1, status: 1 });
swapHistorySchema.index({ timestamp: -1, status: 1 });

const SwapHistory = mongoose.model('SwapHistory', swapHistorySchema);
export default SwapHistory;
