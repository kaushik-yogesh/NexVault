/**
 * NexVault — Export Keystore Modal
 * Prompts user for keystore password and downloads the JSON file.
 */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { HiXMark, HiOutlineDocumentArrowDown } from 'react-icons/hi2';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import keyringController from '../../../core/wallet/KeyringController.js';
import toast from 'react-hot-toast';

export default function ExportKeystoreModal({ isOpen, onClose }) {
  const { activeAddress } = useSelector((state) => state.wallet);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async (e) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsExporting(true);
    setError('');

    try {
      // 1. Generate encrypted keystore JSON string
      const json = await keyringController.exportKeystore(activeAddress, password);

      // 2. Trigger browser download
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `UTC--${new Date().toISOString().replace(/:/g, '-')}--${activeAddress.slice(2)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Keystore downloaded successfully');
      
      // 3. Reset and close
      setPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to export keystore. ' + err.message);
    } finally {
      setIsExporting(false);
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
            <div className="flex items-center gap-2">
              <HiOutlineDocumentArrowDown className="w-5 h-5 text-primary-400" />
              <h2 className="text-lg font-bold text-white">Export Keystore</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleExport} className="p-5 space-y-4">
            <p className="text-sm text-surface-400">
              Create a new password to encrypt your Keystore file. You will need this password to import it later.
            </p>

            <Input
              type="password"
              label="Keystore Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Min 8 characters"
              autoFocus
            />

            <Input
              type="password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError('');
              }}
              placeholder="Confirm password"
            />

            {error && (
              <p className="text-sm text-danger-400 mt-1">{error}</p>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                fullWidth
                loading={isExporting}
                disabled={!password || !confirmPassword || isExporting}
              >
                {isExporting ? 'Encrypting...' : 'Download JSON'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
