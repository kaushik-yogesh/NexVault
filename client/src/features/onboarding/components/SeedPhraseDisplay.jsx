/**
 * NexVault — Seed Phrase Display Screen
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import {
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineClipboard,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import Button from '../../../shared/components/ui/Button.jsx';
import toast from 'react-hot-toast';

export default function SeedPhraseDisplay() {
  const navigate = useNavigate();
  const { mnemonic } = useSelector((state) => state.wallet);
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const words = mnemonic?.split(' ') || [];

  const handleCopy = async () => {
    if (mnemonic) {
      await navigator.clipboard.writeText(mnemonic);
      setHasCopied(true);
      toast.success('Copied to clipboard');
      // Auto-clear clipboard after 60 seconds
      setTimeout(() => {
        navigator.clipboard.writeText('').catch(() => {});
      }, 60000);
    }
  };

  if (!mnemonic) {
    navigate('/welcome');
    return null;
  }

  return (
    <div className="flex flex-col h-full px-6 py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1"
      >
        {/* Header */}
        <div className="text-center mb-5">
          <h2 className="text-lg font-bold text-white mb-1">Recovery Phrase</h2>
          <p className="text-sm text-surface-400">
            Write these words down in order and store them safely
          </p>
        </div>

        {/* Warning */}
        <div className="flex gap-2 p-3 rounded-xl bg-warning-500/10 border border-warning-500/20 mb-4">
          <HiOutlineExclamationTriangle className="w-5 h-5 text-warning-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-warning-300 leading-relaxed">
            <strong>Never share</strong> your recovery phrase. Anyone with these words can steal your funds. NexVault will never ask for them.
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
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-surface-800/50"
              >
                <span className="text-2xs text-surface-500 font-mono w-5 text-right">
                  {index + 1}.
                </span>
                <span className={`text-sm font-medium font-mono ${
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
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setIsRevealed(!isRevealed)}
            className="btn-ghost flex items-center gap-1.5 text-sm"
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
            className="btn-ghost flex items-center gap-1.5 text-sm"
          >
            <HiOutlineClipboard className="w-4 h-4" />
            {hasCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <Button
            fullWidth
            size="lg"
            onClick={() => navigate('/create/verify')}
          >
            I've Saved My Phrase
          </Button>
          <Button
            fullWidth
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="!text-surface-500"
          >
            Skip for now (not recommended)
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
