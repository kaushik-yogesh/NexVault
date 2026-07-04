import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { ethers } from 'ethers';

const getAlchemyEndpoint = (chainId) => {
  const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
  if (!ALCHEMY_API_KEY) {
    throw new Error('Alchemy API key is not configured');
  }

  const ALCHEMY_ENDPOINTS = {
    '0x1': `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    '0x89': `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    '0xa4b1': `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    '0xa': `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  };

  return ALCHEMY_ENDPOINTS[chainId];
};

const getTokenMetadata = async (contractAddress, endpoint) => {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'alchemy_getTokenMetadata',
        params: [contractAddress],
        id: 43,
      }),
    });

    const data = await response.json();
    return data.result;
  } catch {
    return null;
  }
};

/**
 * Get token balances for a wallet address
 * GET /api/wallet/tokens?address=0x...&chainId=0x...
 */
export const getTokens = asyncHandler(async (req, res) => {
  const { address, chainId } = req.query;

  if (!address || !chainId) {
    throw ApiError.badRequest('Address and chainId are required');
  }

  const endpoint = getAlchemyEndpoint(chainId);
  if (!endpoint) {
    return res.json({ success: true, data: [] });
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'alchemy_getTokenBalances',
        params: [address, 'erc20'],
        id: 42,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const balances = data.result.tokenBalances.filter(
      (t) => t.tokenBalance !== '0' && t.tokenBalance !== '0x0'
    );

    const tokensWithMetadata = await Promise.all(
      balances.map(async (token) => {
        const metadata = await getTokenMetadata(token.contractAddress, endpoint);
        
        let formattedBalance = '0';
        if (metadata && metadata.decimals) {
          formattedBalance = ethers.utils.formatUnits(token.tokenBalance, metadata.decimals);
        }

        return {
          address: token.contractAddress,
          balanceRaw: token.tokenBalance,
          balance: formattedBalance,
          name: metadata?.name || 'Unknown Token',
          symbol: metadata?.symbol || '???',
          decimals: metadata?.decimals || 18,
          logo: metadata?.logo || null,
        };
      })
    );

    res.json({
      success: true,
      data: tokensWithMetadata,
    });
  } catch (error) {
    if (error.message && error.message.includes('tenant disabled')) {
      // Gracefully handle disabled Alchemy keys by returning empty arrays
      // so the client doesn't break.
      return res.json({ success: true, data: [] });
    }
    throw ApiError.internal('Failed to fetch tokens: ' + error.message);
  }
});

/**
 * Get NFT balances for a wallet address
 * GET /api/wallet/nfts?address=0x...&chainId=0x...
 */
export const getNFTs = asyncHandler(async (req, res) => {
  const { address, chainId } = req.query;

  if (!address || !chainId) {
    throw ApiError.badRequest('Address and chainId are required');
  }

  const endpoint = getAlchemyEndpoint(chainId);
  if (!endpoint) {
    return res.json({ success: true, data: [] });
  }

  try {
    const response = await fetch(`${endpoint}/getNFTs?owner=${address}`);
    const data = await response.json();
    
    res.json({
      success: true,
      data: data.ownedNfts || [],
    });
  } catch (error) {
    // Gracefully handle disabled Alchemy keys by returning empty arrays
    // so the client doesn't break.
    if (error.message && error.message.includes('tenant disabled')) {
      return res.json({ success: true, data: [] });
    }
    throw ApiError.internal('Failed to fetch NFTs: ' + error.message);
  }
});
