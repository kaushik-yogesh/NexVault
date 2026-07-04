/**
 * NexVault — Reveal Seed Phrase Modal
 * Prompts user for wallet password and securely displays the seed phrase.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiXMark, 
  HiOutlineDocumentDuplicate,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineClipboard,
  HiOutlineExclamationTriangle
} from 'react-icons/hi2';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import keyringController from '../../../core/wallet/KeyringController.js';
import toast from 'react-hot-toast';

export default function RevealSeedModal({ isOpen, onClose }) {
  const [step, setStep] = useState(0); // 0: password, 1: reveal
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [mnemonic, setMnemonic] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(0);
        setPassword('');
        setError('');
        setMnemonic('');
        setIsRevealed(false);
        setHasCopied(false);
      }, 300);
    }
  }, [isOpen]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!password) return;

    setIsVerifying(true);
    setError('');

    try {
      const phrase = await keyringController.exportMnemonic(password);
      setMnemonic(phrase);
      setStep(1);
    } catch (err) {
      console.error(err);
      setError('Incorrect password or wallet not found.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopy = async () => {
    if (mnemonic) {
      await navigator.clipboard.writeText(mnemonic);
      setHasCopied(true);
      toast.success('Copied to clipboard');
      // Auto-clear clipboard after 60 seconds
      setTimeout(() => {
        navigator.clipboard.writeText('').catch(() => {});
        setHasCopied(false);
      }, 60000);
    }
  };

  if (!isOpen) return null;

  const words = mnemonic ? mnemonic.split(' ') : [];

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
              <HiOutlineDocumentDuplicate className="w-5 h-5 text-primary-400" />
              <h2 className="text-lg font-bold text-white">Recovery Phrase</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          </div>

          {step === 0 ? (
            <form onSubmit={handleVerify} className="p-5 space-y-4">
              <p className="text-sm text-surface-400">
                Enter your wallet password to view your Secret Recovery Phrase.
              </p>

              <Input
                type="password"
                label="Wallet Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter password"
                autoFocus
              />

              {error && (
                <p className="text-sm text-danger-400 mt-1">{error}</p>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  fullWidth
                  loading={isVerifying}
                  disabled={!password || isVerifying}
                >
                  Verify Password
                </Button>
              </div>
            </form>
          ) : (
            <div className="p-5">
              {/* Warning */}
              <div className="flex gap-2 p-3 rounded-xl bg-warning-500/10 border border-warning-500/20 mb-4">
                <HiOutlineExclamationTriangle className="w-5 h-5 text-warning-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-warning-300 leading-relaxed">
                  <strong>Never share</strong> your recovery phrase. Anyone with these words can steal your funds.
                </p>
              </div>

              {/* Seed phrase grid */}
              <div className="relative">
                <div className={`
                  grid grid-cols-3 gap-2 p-4 rounded-2xl
                  bg-surface-800/30 border border-surface-700/50
                  ${!isRevealed ? 'select-none' : ''}
                `}>
                  {words.map((word, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 px-1.5 py-2 rounded-lg bg-surface-800/50"
                    >
                      <span className="text-[10px] text-surface-500 font-mono w-4 text-right">
                        {index + 1}.
                      </span>
                      <span className={`text-xs font-medium font-mono ${
                        isRevealed ? 'text-white' : 'text-transparent'
                      }`}>
                        {isRevealed ? word : '•••••'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Blur overlay */}
                {!isRevealed && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-surface-800/80 backdrop-blur-md">
                    <button
                      onClick={() => setIsRevealed(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                                 bg-surface-700/80 border border-surface-600/50
                                 text-surface-200 hover:bg-surface-700 transition-all"
                    >
                      <HiOutlineEye className="w-5 h-5" />
                      <span className="text-sm font-medium">Click to Reveal</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 justify-between">
                <button
                  onClick={() => setIsRevealed(!isRevealed)}
                  className="btn-ghost flex items-center justify-center w-full py-2 gap-1.5 text-sm rounded-lg hover:bg-surface-800 text-surface-300"
                >
                  {isRevealed ? (
                    <>
                      <HiOutlineEyeSlash className="w-4 h-4" /> Hide
                    </>
                  ) : (
                    <>
                      <HiOutlineEye className="w-4 h-4" /> Reveal
                    </>
                  )}
                </button>
                <button
                  onClick={handleCopy}
                  className="btn-ghost flex items-center justify-center w-full py-2 gap-1.5 text-sm rounded-lg hover:bg-surface-800 text-surface-300"
                >
                  <HiOutlineClipboard className="w-4 h-4" />
                  {hasCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="mt-6">
                <Button
                  fullWidth
                  onClick={onClose}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
