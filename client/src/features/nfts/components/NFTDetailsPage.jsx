/**
 * NexVault — NFT Details Page
 * View full NFT details and transfer it.
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { HiOutlineArrowLeft, HiOutlinePaperAirplane, HiOutlineTrash } from 'react-icons/hi2';
import Button from '../../../shared/components/ui/Button.jsx';
import { deleteNFT } from '../nftsSlice.js';
import toast from 'react-hot-toast';

export default function NFTDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { items: nfts } = useSelector((state) => state.nfts);
  const nft = nfts.find(n => n.id === Number(id));

  const [isSending, setIsSending] = useState(false);

  if (!nft) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-surface-300 font-medium mb-4">NFT not found</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm('Remove this NFT from your wallet view? (This does not delete the NFT on the blockchain)')) {
      dispatch(deleteNFT(nft.id));
      toast.success('NFT removed from view');
      navigate(-1);
    }
  };

  const handleSend = () => {
    // In a full implementation, this would navigate to a SendForm pre-filled with this NFT
    // using the contract.transferFrom(activeAddress, to, tokenId) method.
    toast.error('NFT transfer is coming in the next update!');
  };

  return (
    <div className="flex flex-col h-full bg-surface-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-surface-800/50 bg-surface-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-surface-800/50 hover:bg-surface-700/50 text-surface-300 transition-colors"
          >
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-white truncate max-w-[200px]">{nft.name}</h2>
        </div>
        <button
          onClick={handleDelete}
          className="p-2 rounded-xl text-surface-400 hover:text-danger-400 hover:bg-danger-500/10 transition-colors"
          title="Remove from Wallet"
        >
          <HiOutlineTrash className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Image */}
        <div className="w-full aspect-square bg-surface-900 border-b border-surface-800/50">
          {nft.imageUrl ? (
            <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-surface-500">
              No Image Available
            </div>
          )}
        </div>

        {/* Details Content */}
        <div className="p-5 space-y-6">
          {/* Title & Collection */}
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{nft.name}</h1>
            <p className="text-sm text-primary-400 font-medium">{nft.collectionName}</p>
          </div>

          {/* Description */}
          {nft.description && (
            <div>
              <h3 className="text-sm font-semibold text-surface-300 mb-2">Description</h3>
              <div className="p-4 rounded-xl bg-surface-900 border border-surface-800/50 text-sm text-surface-400 leading-relaxed whitespace-pre-wrap">
                {nft.description}
              </div>
            </div>
          )}

          {/* Attributes */}
          {nft.attributes && nft.attributes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-surface-300 mb-2">Properties</h3>
              <div className="grid grid-cols-2 gap-3">
                {nft.attributes.map((attr, i) => (
                  <div key={i} className="p-3 rounded-xl bg-primary-500/5 border border-primary-500/20 text-center">
                    <p className="text-xs text-primary-400/80 font-medium uppercase tracking-wider mb-1">
                      {attr.trait_type}
                    </p>
                    <p className="text-sm text-white font-semibold capitalize truncate">
                      {attr.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Details */}
          <div>
            <h3 className="text-sm font-semibold text-surface-300 mb-2">Details</h3>
            <div className="p-4 rounded-xl bg-surface-900 border border-surface-800/50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-surface-400">Contract Address</span>
                <span className="text-sm text-white font-mono">
                  {nft.contractAddress.slice(0, 6)}...{nft.contractAddress.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-surface-400">Token ID</span>
                <span className="text-sm text-white font-mono max-w-[150px] truncate">
                  {nft.tokenId}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-surface-400">Token Standard</span>
                <span className="text-sm text-white">ERC-721</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-4 border-t border-surface-800/50 bg-surface-950/80 backdrop-blur-xl">
        <Button fullWidth onClick={handleSend} className="flex items-center justify-center gap-2">
          <HiOutlinePaperAirplane className="w-5 h-5" />
          Send
        </Button>
      </div>
    </div>
  );
}
