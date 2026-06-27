/**
 * NexVault — DApp Sign Modal
 * Prompts the user to approve a signature request (personal_sign, eth_signTypedData, etc.)
 */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineDocumentText, HiOutlineShieldExclamation } from 'react-icons/hi2';
import Button from '../../../shared/components/ui/Button.jsx';
import keyringController from '../../../core/wallet/KeyringController.js';

export default function SignModal({ isOpen, request, onApprove, onReject }) {
  const { activeAddress, accounts } = useSelector((state) => state.wallet);
  const activeChain = useSelector((state) => state.network.activeChainId);
  const [isSigning, setIsSigning] = useState(false);

  if (!isOpen || !request) return null;

  const { origin, metadata, method, params } = request;
  
  // Format message for display depending on the method
  const getMessageDisplay = () => {
    try {
      if (method === 'personal_sign') {
        const hexMsg = params[0];
        // Convert hex to utf8 string if possible
        try {
          // If it starts with 0x and has even length
          if (hexMsg.startsWith('0x')) {
            let str = '';
            for (let i = 2; i < hexMsg.length; i += 2) {
              str += String.fromCharCode(parseInt(hexMsg.substr(i, 2), 16));
            }
            return { type: 'text', content: str };
          }
        } catch {
          // fallback to hex
        }
        return { type: 'hex', content: hexMsg };
      }
      
      if (method === 'eth_signTypedData_v4' || method === 'eth_signTypedData') {
        const typedData = typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1];
        return { type: 'json', content: JSON.stringify(typedData, null, 2) };
      }

      return { type: 'raw', content: JSON.stringify(params) };
    } catch (err) {
      return { type: 'error', content: 'Could not decode message' };
    }
  };

  const message = getMessageDisplay();
  const activeAccount = accounts.find(a => a.address.toLowerCase() === activeAddress?.toLowerCase());

  const handleSign = async () => {
    setIsSigning(true);
    try {
      // Route signing to KeyringController depending on method
      let signature;
      const signer = keyringController.getActiveSigner();
      
      if (method === 'personal_sign') {
        signature = await signer.signMessage(params[0]);
      } else if (method === 'eth_signTypedData_v4' || method === 'eth_signTypedData') {
        // Ethers v6 TypedData signing
        const typedData = typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1];
        signature = await signer.signTypedData(
          typedData.domain,
          typedData.types,
          typedData.message
        );
      } else {
        throw new Error(`Unsupported signing method: ${method}`);
      }
      
      onApprove(signature);
    } catch (err) {
      console.error('Signing failed', err);
      onReject(err);
    } finally {
      setIsSigning(false);
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
          onClick={() => onReject(new Error('User rejected signature'))}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm bg-surface-900 border border-surface-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 text-center border-b border-surface-800/50">
            <h2 className="text-xl font-bold text-white mb-1">Signature Request</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              {metadata?.icon && (
                <img src={metadata.icon} alt="DApp" className="w-5 h-5 rounded-full" />
              )}
              <span className="text-sm font-medium text-surface-300">
                {metadata?.name || new URL(origin).hostname}
              </span>
            </div>
            <a href={origin} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:underline block mt-1">
              {origin}
            </a>
          </div>

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {/* Account doing the signing */}
            <div className="mb-4">
              <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2 block">
                Signing Account
              </span>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-800/30 border border-surface-700/50">
                <div className="w-8 h-8 rounded-full" style={{ background: activeAccount?.avatar || 'hsl(220, 65%, 55%)' }} />
                <div>
                  <p className="text-sm font-medium text-white">{activeAccount?.name}</p>
                  <p className="text-xs text-surface-500 font-mono">
                    {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
                  </p>
                </div>
              </div>
            </div>

            {/* Message Content */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <HiOutlineDocumentText className="w-4 h-4 text-surface-400" />
                <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  Message
                </span>
              </div>
              
              <div className="p-3 rounded-xl bg-surface-950 border border-surface-800 font-mono text-xs text-surface-300 max-h-[200px] overflow-y-auto custom-scrollbar break-all whitespace-pre-wrap">
                {message.content}
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-warning-500/10 border border-warning-500/20">
              <HiOutlineShieldExclamation className="w-5 h-5 text-warning-400 shrink-0 mt-0.5" />
              <p className="text-xs text-warning-300 leading-relaxed">
                Signing this message is free and won't cost gas. However, only sign messages from sites you completely trust, as signatures can be used to authorize actions on your behalf.
              </p>
            </div>
          </div>

          <div className="p-5 border-t border-surface-800/50 flex gap-3 bg-surface-900">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => onReject(new Error('User rejected signature'))}
              disabled={isSigning}
            >
              Reject
            </Button>
            <Button
              fullWidth
              onClick={handleSign}
              loading={isSigning}
            >
              Sign
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
