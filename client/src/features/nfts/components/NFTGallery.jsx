/**
 * NexVault — NFT Gallery
 * Displays a grid of imported NFTs.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HiOutlinePhoto, HiOutlinePlus } from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';
import ImportNFTModal from './ImportNFTModal.jsx';

export default function NFTGallery({ nfts }) {
  const [showImport, setShowImport] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full pt-1">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-sm font-semibold text-surface-300">Your Collection</h3>
        <button
          onClick={() => setShowImport(true)}
          className="text-xs text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1"
        >
          <HiOutlinePlus className="w-3.5 h-3.5" />
          Import NFT
        </button>
      </div>

      {nfts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center px-4 mt-4">
          <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mb-4">
            <HiOutlinePhoto className="w-8 h-8 text-surface-500" />
          </div>
          <p className="text-surface-300 font-medium mb-1">No NFTs found</p>
          <p className="text-sm text-surface-500 mb-6 max-w-[250px]">
            Import your NFTs using their contract address and token ID.
          </p>
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 rounded-xl bg-primary-500/10 text-primary-400 font-medium hover:bg-primary-500/20 transition-colors text-sm"
          >
            Import NFT
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-1">
          {nfts.map((nft, idx) => (
            <motion.div
              key={nft.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-card-hover rounded-2xl overflow-hidden cursor-pointer group"
              onClick={() => navigate(`/nft/${nft.id}`)}
            >
              <div className="relative aspect-square w-full bg-surface-800 overflow-hidden">
                {nft.imageUrl ? (
                  <img
                    src={nft.imageUrl}
                    alt={nft.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><span class="text-surface-500 text-xs">Image Error</span></div>';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <HiOutlinePhoto className="w-8 h-8 text-surface-600" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <h4 className="text-sm font-bold text-white truncate" title={nft.name}>
                  {nft.name}
                </h4>
                <p className="text-2xs text-surface-400 truncate mt-0.5" title={nft.collectionName}>
                  {nft.collectionName}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ImportNFTModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
      />
    </div>
  );
}
