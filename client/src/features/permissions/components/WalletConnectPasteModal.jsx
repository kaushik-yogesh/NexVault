/**
 * NexVault — WalletConnect Paste Modal
 * Allows user to paste a wc:// URI to connect.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiXMark, HiOutlineLink } from 'react-icons/hi2';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import { useWalletConnect } from '../hooks/useWalletConnect.js';

export default function WalletConnectPasteModal({ isOpen, onClose }) {
  const [uri, setUri] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const { pair } = useWalletConnect();

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!uri.startsWith('wc:')) {
      setError('Invalid WalletConnect URI');
      return;
    }
    
    setIsConnecting(true);
    setError('');
    try {
      await pair(uri);
      setUri('');
      onClose();
    } catch (err) {
      console.error('Pairing failed', err);
      setError('Failed to connect. Please check the URI.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
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
            <div className="flex items-center gap-2">
              <HiOutlineLink className="w-5 h-5 text-primary-400" />
              <h2 className="text-lg font-bold text-white">WalletConnect</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleConnect} className="p-5 space-y-4">
            <Input
              label="Paste URI"
              value={uri}
              onChange={(e) => {
                setUri(e.target.value);
                setError('');
              }}
              error={error}
              placeholder="wc:12345..."
              autoFocus
            />

            <div className="pt-2">
              <Button
                type="submit"
                fullWidth
                loading={isConnecting}
                disabled={!uri || isConnecting}
              >
                Connect
              </Button>
            </div>
          </form>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
