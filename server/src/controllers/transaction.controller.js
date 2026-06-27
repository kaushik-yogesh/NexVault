import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import axios from 'axios';

/**
 * Get transaction history for an address
 * GET /api/transactions/history
 */
export const getTransactionHistory = asyncHandler(async (req, res) => {
  const { address, chainId, token } = req.query;

  if (!address || !chainId) {
    throw ApiError.badRequest('Address and chainId are required');
  }

  if (!process.env.ALCHEMY_API_KEY) {
    // If no API key, return empty to not break the UI
    return res.json({ success: true, data: [] });
  }

  // Mapping chainIds to Alchemy networks
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

    // We need to fetch both incoming and outgoing transfers
    const [incomingRes, outgoingRes] = await Promise.all([
      axios.post(url, {
        id: 1,
        jsonrpc: "2.0",
        method: "alchemy_getAssetTransfers",
        params: [{
          fromBlock: "0x0",
          toBlock: "latest",
          toAddress: address,
          contractAddresses,
          category,
          withMetadata: true,
          excludeZeroValue: true,
          maxCount: "0x64" // max 100
        }]
      }),
      axios.post(url, {
        id: 2,
        jsonrpc: "2.0",
        method: "alchemy_getAssetTransfers",
        params: [{
          fromBlock: "0x0",
          toBlock: "latest",
          fromAddress: address,
          contractAddresses,
          category,
          withMetadata: true,
          excludeZeroValue: true,
          maxCount: "0x64" // max 100
        }]
      })
    ]);

    const incoming = incomingRes.data.result?.transfers || [];
    const outgoing = outgoingRes.data.result?.transfers || [];

    const allTransfers = [...incoming, ...outgoing].sort((a, b) => {
      const timeA = new Date(a.metadata.blockTimestamp).getTime();
      const timeB = new Date(b.metadata.blockTimestamp).getTime();
      return timeB - timeA;
    });

    // Format for the frontend
    const history = allTransfers.map(tx => {
      let type = 'unknown';
      if (tx.from.toLowerCase() === address.toLowerCase()) type = 'send';
      if (tx.to?.toLowerCase() === address.toLowerCase()) type = 'receive';

      return {
        id: tx.uniqueId || tx.hash,
        type,
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        amount: tx.value ? tx.value.toFixed(4) : '0',
        symbol: tx.asset,
        timestamp: new Date(tx.metadata.blockTimestamp).getTime()
      };
    });

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Alchemy History Error:', error.message);
    // Don't crash, return empty array for frontend resilience
    res.json({ success: true, data: [] });
  }
});
