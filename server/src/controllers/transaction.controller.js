import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import axios from 'axios';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

/**
 * Save a new transaction to the database
 * POST /api/transactions
 */
export const saveTransaction = asyncHandler(async (req, res) => {
  const { 
    txHash, chainId, from, to, value, assetType, 
    tokenAddress, tokenId, type, networkFee, platformFee, usdValue 
  } = req.body;

  if (!txHash || !chainId || !from || !to || !value || !assetType) {
    throw ApiError.badRequest('Missing required transaction fields');
  }

  // Normalize chainId to decimal string
  const normalizedChainId = (typeof chainId === 'string' && chainId.startsWith('0x')) 
    ? parseInt(chainId, 16).toString() 
    : chainId.toString();

  let user = await User.findOne({ address: { $regex: new RegExp(`^${from}$`, 'i') } });
  
  if (!user) {
    // Upsert a basic user record if not found (e.g. they never logged into the backend but are using the wallet locally)
    user = await User.create({ address: from.toLowerCase() });
  }

  // Upsert the transaction (in case it was already recorded by a webhook or retried)
  const tx = await Transaction.findOneAndUpdate(
    { txHash, chainId: normalizedChainId },
    {
      userId: user._id,
      from,
      to,
      value,
      assetType,
      tokenAddress,
      tokenId,
      type: type || 'SEND',
      networkFee: networkFee || '0',
      platformFee: platformFee || '0',
      usdValue: usdValue || 0,
      status: 'PENDING'
    },
    { new: true, upsert: true }
  );

  res.status(201).json({
    success: true,
    data: tx
  });
});

/**
 * Update transaction status
 * PUT /api/transactions/:txHash
 */
export const updateTransactionStatus = asyncHandler(async (req, res) => {
  const { txHash } = req.params;
  const { status, networkFee } = req.body;

  if (!txHash || !status) {
    throw ApiError.badRequest('txHash and status are required');
  }

  const updateFields = { status };
  if (networkFee) updateFields.networkFee = networkFee;

  const tx = await Transaction.findOneAndUpdate(
    { txHash },
    updateFields,
    { new: true }
  );

  if (!tx) {
    throw ApiError.notFound('Transaction not found');
  }

  res.json({
    success: true,
    data: tx
  });
});

/**
 * Get transaction history for an address
 * GET /api/transactions/history
 */
export const getTransactionHistory = asyncHandler(async (req, res) => {
  const { address, chainId, token } = req.query;

  if (!address || !chainId) {
    throw ApiError.badRequest('Address and chainId are required');
  }

  // Normalize chainId to decimal string
  const normalizedChainId = (typeof chainId === 'string' && chainId.startsWith('0x')) 
    ? parseInt(chainId, 16).toString() 
    : chainId.toString();

  // 1. Fetch from Local Database
  const dbQuery = {
    chainId: normalizedChainId,
    $or: [
      { from: { $regex: new RegExp(`^${address}$`, 'i') } },
      { to: { $regex: new RegExp(`^${address}$`, 'i') } }
    ]
  };

  if (token && token !== 'native') {
    dbQuery.tokenAddress = { $regex: new RegExp(`^${token}$`, 'i') };
  } else if (token === 'native') {
    dbQuery.assetType = 'NATIVE';
  }

  const dbTransactions = await Transaction.find(dbQuery).sort({ timestamp: -1 }).limit(100);
  
  const historyMap = new Map();
  
  // Format DB transactions
  dbTransactions.forEach(tx => {
    let type = tx.type;
    if (type === 'UNKNOWN') {
      if (tx.from.toLowerCase() === address.toLowerCase()) type = 'send';
      if (tx.to?.toLowerCase() === address.toLowerCase()) type = 'receive';
    } else {
      type = type.toLowerCase();
    }

    historyMap.set(tx.txHash.toLowerCase(), {
      id: tx.txHash,
      type,
      hash: tx.txHash,
      from: tx.from,
      to: tx.to,
      amount: tx.value, // Assumes frontend formats it, or store as float/ethers format
      symbol: tx.assetType === 'NATIVE' ? 'Native' : 'Token',
      timestamp: tx.timestamp.getTime(),
      networkFee: tx.networkFee,
      platformFee: tx.platformFee,
      status: tx.status
    });
  });

  // 2. Fetch from Alchemy (if enabled and working)
  if (process.env.ALCHEMY_API_KEY) {
    const networkMap = {
      '1': 'eth-mainnet',
      '137': 'polygon-mainnet',
      '42161': 'arb-mainnet',
      '10': 'opt-mainnet',
      '8453': 'base-mainnet'
    };

    const network = networkMap[chainId.toString()] || 'eth-mainnet';
    const url = `https://${network}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;

    try {
      const isNative = !token || token === 'native';
      const contractAddresses = !isNative ? [token] : undefined;
      const category = isNative ? ['external', 'internal'] : ['erc20'];

      const [incomingRes, outgoingRes] = await Promise.all([
        axios.post(url, {
          id: 1, jsonrpc: "2.0", method: "alchemy_getAssetTransfers",
          params: [{ fromBlock: "0x0", toBlock: "latest", toAddress: address, contractAddresses, category, withMetadata: true, excludeZeroValue: true, maxCount: "0x64" }]
        }),
        axios.post(url, {
          id: 2, jsonrpc: "2.0", method: "alchemy_getAssetTransfers",
          params: [{ fromBlock: "0x0", toBlock: "latest", fromAddress: address, contractAddresses, category, withMetadata: true, excludeZeroValue: true, maxCount: "0x64" }]
        })
      ]);

      const incoming = incomingRes.data.result?.transfers || [];
      const outgoing = outgoingRes.data.result?.transfers || [];

      [...incoming, ...outgoing].forEach(tx => {
        const hashStr = tx.hash.toLowerCase();
        
        // Skip if already found in DB (DB has richer fee metadata)
        if (!historyMap.has(hashStr)) {
          let type = 'unknown';
          if (tx.from.toLowerCase() === address.toLowerCase()) type = 'send';
          if (tx.to?.toLowerCase() === address.toLowerCase()) type = 'receive';

          historyMap.set(hashStr, {
            id: tx.uniqueId || tx.hash,
            type,
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            amount: tx.value ? tx.value.toString() : '0',
            symbol: tx.asset,
            timestamp: new Date(tx.metadata.blockTimestamp).getTime(),
            networkFee: '0', // Alchemy getAssetTransfers doesn't give exact gas fee directly
            platformFee: '0',
            status: 'SUCCESS'
          });
        }
      });
    } catch (error) {
      console.error('Alchemy History Error:', error.message);
      // Fallback gracefully: we already have DB transactions mapped
    }
  }

  // Sort merged results
  const sortedHistory = Array.from(historyMap.values()).sort((a, b) => b.timestamp - a.timestamp);

  res.json({
    success: true,
    data: sortedHistory
  });
});
