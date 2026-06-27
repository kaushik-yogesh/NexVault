/**
 * NexVault — Import NFT Modal
 */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { HiXMark } from 'react-icons/hi2';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import { addNFT } from '../nftsSlice.js';
import nftFetcher from '../../../core/nfts/NFTFetcher.js';
import toast from 'react-hot-toast';

export default function ImportNFTModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const { activeAddress } = useSelector((state) => state.wallet);
  const activeChainId = useSelector((state) => state.network.activeChainId);

  const [contractAddress, setContractAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async (e) => {
    e.preventDefault();
    if (!contractAddress || !tokenId) return;

    setIsImporting(true);
    setError('');

    try {
      // 1. Fetch metadata using the core utility
      const nftData = await nftFetcher.fetchNFTMetadata(
        contractAddress,
        tokenId,
        activeChainId
      );

      // 2. Ensure the active account actually owns it
      if (nftData.ownerAddress.toLowerCase() !== activeAddress.toLowerCase()) {
        setError(`You do not own this NFT. Owned by: ${nftData.ownerAddress.slice(0,6)}...${nftData.ownerAddress.slice(-4)}`);
        setIsImporting(false);
        return;
      }

      // 3. Save to Redux / IndexedDB
      await dispatch(addNFT(nftData)).unwrap();

      toast.success('NFT Imported Successfully');
      setContractAddress('');
      setTokenId('');
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to import NFT. Check address and network.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-sm bg-surface-900 border border-surface-700/50 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800/50">
            <h2 className="text-lg font-bold text-white">Import NFT</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleImport} className="p-5 space-y-4">
            <Input
              label="Contract Address"
              value={contractAddress}
              onChange={(e) => {
                setContractAddress(e.target.value);
                setError('');
              }}
              placeholder="0x..."
              autoFocus
            />

            <Input
              label="Token ID"
              value={tokenId}
              onChange={(e) => {
                setTokenId(e.target.value);
                setError('');
              }}
              placeholder="e.g. 42"
            />

            {error && (
              <p className="text-sm text-danger-400 mt-1">{error}</p>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                fullWidth
                loading={isImporting}
                disabled={!contractAddress || !tokenId || isImporting}
              >
                Import
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
