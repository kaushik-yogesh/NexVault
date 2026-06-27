/**
 * NexVault — DApp Switch Network Modal
 * Prompts the user to approve a network switch request from a DApp.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineGlobeAlt, HiOutlineArrowsRightLeft } from 'react-icons/hi2';
import Button from '../../../shared/components/ui/Button.jsx';
import networkManager from '../../../core/network/NetworkManager.js';
import { CHAINS } from '../../../../../shared/constants/chains.js';

export default function SwitchNetworkModal({ isOpen, request, onApprove, onReject }) {
  const [isApproving, setIsApproving] = useState(false);

  if (!isOpen || !request || !request.params) return null;

  const { origin, metadata, params } = request;
  
  // The DApp passes chainId as a hex string
  const targetChainIdHex = params[0]?.chainId;
  const targetChainId = parseInt(targetChainIdHex, 16).toString();
  
  const targetChain = Object.values(CHAINS).find(c => c.chainId === targetChainId);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      if (targetChain) {
        await networkManager.switchChain(targetChain.chainId);
      } else {
        throw new Error("Unsupported chain requested by DApp");
      }
      onApprove(null); // Success
    } catch (err) {
      console.error('Failed to switch network', err);
      onReject(err);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-surface-950/90 backdrop-blur-sm"
          onClick={() => onReject(new Error('User rejected'))}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm bg-surface-900 border border-surface-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 text-center border-b border-surface-800/50">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center overflow-hidden border-2 border-surface-700 shadow-xl">
                  {metadata?.icon ? (
                    <img src={metadata.icon} alt="DApp" className="w-full h-full object-cover" />
                  ) : (
                    <HiOutlineGlobeAlt className="w-8 h-8 text-surface-400" />
                  )}
                </div>
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-white mb-1">
              Allow this site to switch the network?
            </h2>
            <a href={origin} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-400 hover:underline">
              {origin}
            </a>
          </div>

          <div className="p-5 custom-scrollbar">
            <div className="mb-5 p-4 rounded-xl bg-surface-800/30 border border-surface-700/30 flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-400 mb-1">Switching to</p>
                <p className="text-sm font-semibold text-white">
                  {targetChain ? targetChain.name : `Unknown Chain (${targetChainId})`}
                </p>
              </div>
              <HiOutlineArrowsRightLeft className="w-6 h-6 text-surface-500" />
            </div>

            <p className="text-sm text-surface-300 leading-relaxed text-center">
              This will switch the active network for your entire wallet.
              {targetChain ? '' : ' This network is not currently supported by NexVault.'}
            </p>
          </div>

          <div className="p-5 border-t border-surface-800/50 flex gap-3 bg-surface-900">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => onReject(new Error('User rejected network switch'))}
              disabled={isApproving}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              onClick={handleApprove}
              loading={isApproving}
              disabled={!targetChain}
            >
              Switch Network
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
