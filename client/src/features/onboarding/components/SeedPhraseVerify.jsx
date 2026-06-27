/**
 * NexVault — Seed Phrase Verification Screen
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import Button from '../../../shared/components/ui/Button.jsx';
import { clearMnemonic } from '../../wallet/walletSlice.js';
import { markBackedUp } from '../../settings/settingsSlice.js';
import toast from 'react-hot-toast';

export default function SeedPhraseVerify() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { mnemonic } = useSelector((state) => state.wallet);

  const words = useMemo(() => mnemonic?.split(' ') || [], [mnemonic]);

  // Pick 3 random word indices to verify
  const verifyIndices = useMemo(() => {
    const indices = [];
    const used = new Set();
    while (indices.length < 3 && indices.length < words.length) {
      const idx = Math.floor(Math.random() * words.length);
      if (!used.has(idx)) {
        used.add(idx);
        indices.push(idx);
      }
    }
    return indices.sort((a, b) => a - b);
  }, [words.length]);

  const [inputs, setInputs] = useState({});
  const [errors, setErrors] = useState({});

  const handleInputChange = (index, value) => {
    setInputs((prev) => ({ ...prev, [index]: value.trim().toLowerCase() }));
    setErrors((prev) => ({ ...prev, [index]: null }));
  };

  const handleVerify = () => {
    const newErrors = {};
    let allCorrect = true;

    verifyIndices.forEach((index) => {
      if (inputs[index] !== words[index]) {
        newErrors[index] = 'Incorrect word';
        allCorrect = false;
      }
    });

    if (!allCorrect) {
      setErrors(newErrors);
      toast.error('Some words are incorrect. Please try again.');
      return;
    }

    // Success — clear mnemonic from Redux state and mark as backed up
    dispatch(markBackedUp());
    dispatch(clearMnemonic());
    toast.success('Recovery phrase verified!');
    navigate('/dashboard');
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
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-white mb-1">Verify Your Phrase</h2>
          <p className="text-sm text-surface-400">
            Enter the following words from your recovery phrase
          </p>
        </div>

        <div className="space-y-4">
          {verifyIndices.map((index) => (
            <div key={index}>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">
                Word #{index + 1}
              </label>
              <input
                type="text"
                value={inputs[index] || ''}
                onChange={(e) => handleInputChange(index, e.target.value)}
                placeholder={`Enter word #${index + 1}`}
                className={`${errors[index] ? 'input-error' : 'input-base'} font-mono`}
                autoComplete="off"
                spellCheck="false"
              />
              {errors[index] && (
                <p className="mt-1 text-sm text-danger-400">{errors[index]}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-3">
          <Button
            fullWidth
            size="lg"
            onClick={handleVerify}
            disabled={verifyIndices.some((idx) => !inputs[idx])}
          >
            Verify & Continue
          </Button>
          <button
            onClick={() => navigate('/create/seed')}
            className="w-full text-sm text-surface-500 hover:text-surface-300 transition-colors text-center py-2"
          >
            ← Go back to see phrase
          </button>
        </div>
      </motion.div>
    </div>
  );
}
