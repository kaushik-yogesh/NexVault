/**
 * NexVault — NFT Fetcher
 * Fetches ERC-721 metadata using standard RPC.
 */

import { ethers } from 'ethers';
import providerManager from '../network/ProviderManager.js';

const ERC721_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)"
];

class NFTFetcher {
  /**
   * Fetch NFT metadata given a contract address and tokenId
   */
  async fetchNFTMetadata(contractAddress, tokenId, chainId) {
    try {
      const provider = providerManager.getProvider(chainId);
      const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);

      // Verify owner exists (throws if burned or doesn't exist)
      let owner;
      try {
        owner = await contract.ownerOf(tokenId);
      } catch (e) {
        throw new Error('Token does not exist or has been burned');
      }

      // Get basic info
      let collectionName = 'Unknown Collection';
      let collectionSymbol = 'NFT';
      try {
        collectionName = await contract.name();
        collectionSymbol = await contract.symbol();
      } catch (e) {
        // Not all NFTs implement name() and symbol()
      }

      // Get tokenURI
      let tokenURI;
      try {
        tokenURI = await contract.tokenURI(tokenId);
      } catch (e) {
        throw new Error('Contract does not implement tokenURI');
      }

      // Parse IPFS or HTTP
      const metadataUrl = this._resolveURI(tokenURI);
      
      // Fetch JSON metadata
      let metadata = {};
      try {
        const response = await fetch(metadataUrl);
        if (response.ok) {
          metadata = await response.json();
        }
      } catch (e) {
        console.warn('Failed to fetch JSON from tokenURI:', metadataUrl);
      }

      return {
        contractAddress,
        tokenId: tokenId.toString(),
        ownerAddress: owner.toLowerCase(),
        chainId,
        collectionName,
        collectionSymbol,
        name: metadata.name || `${collectionName} #${tokenId}`,
        description: metadata.description || '',
        imageUrl: this._resolveURI(metadata.image || metadata.image_url),
        attributes: metadata.attributes || [],
        rawMetadata: metadata
      };
    } catch (err) {
      console.error('NFT Fetch Error:', err);
      throw err;
    }
  }

  /**
   * Helper to resolve ipfs:// URIs to an HTTP gateway
   */
  _resolveURI(uri) {
    if (!uri) return '';
    if (uri.startsWith('ipfs://')) {
      return uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }
    return uri;
  }
}

const nftFetcher = new NFTFetcher();
export default nftFetcher;
