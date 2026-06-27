/**
 * NexVault — Set Password Screen (Wallet Creation Step 1)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { HiOutlineLockClosed, HiOutlineShieldCheck } from 'react-icons/hi2';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import { createWallet } from '../../wallet/walletSlice.js';

export default function SetPassword() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.wallet);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [wordCount, setWordCount] = useState(12);
  const [errors, setErrors] = useState({});

  const validatePassword = (pwd) => {
    const validationErrors = {};
    if (pwd.length < 8) validationErrors.password = 'Minimum 8 characters';
    if (!/[A-Z]/.test(pwd)) validationErrors.password = 'Must include uppercase letter';
    if (!/[0-9]/.test(pwd)) validationErrors.password = 'Must include a number';
    if (!/[^A-Za-z0-9]/.test(pwd)) validationErrors.password = 'Must include a special character';
    return validationErrors;
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    const levels = [
      { level: 1, label: 'Weak', color: 'bg-danger-500' },
      { level: 2, label: 'Fair', color: 'bg-warning-500' },
      { level: 3, label: 'Good', color: 'bg-warning-400' },
      { level: 4, label: 'Strong', color: 'bg-success-400' },
      { level: 5, label: 'Excellent', color: 'bg-success-500' },
    ];

    return levels[Math.min(score, 5) - 1] || levels[0];
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validatePassword(password);
    if (confirmPassword !== password) {
      validationErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const result = await dispatch(createWallet({ password, wordCount }));
    if (createWallet.fulfilled.match(result)) {
      navigate('/create/seed');
    }
  };

  return (
    <div className="flex flex-col h-full px-6 py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <HiOutlineLockClosed className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Create Password</h2>
            <p className="text-sm text-surface-400">Secure your wallet</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Word count toggle */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Recovery Phrase Length
            </label>
            <div className="flex gap-2">
              {[12, 24].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setWordCount(count)}
                  className={`
                    flex-1 py-2.5 rounded-xl text-sm font-semibold
                    border transition-all duration-200
                    ${wordCount === count
                      ? 'bg-primary-500/15 border-primary-500/50 text-primary-300'
                      : 'bg-surface-800/50 border-surface-700/50 text-surface-400 hover:border-surface-600/50'
                    }
                  `}
                >
                  {count} Words
                </button>
              ))}
            </div>
          </div>

          {/* Password */}
          <Input
            label="New Password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors({});
            }}
            error={errors.password}
            placeholder="Enter a strong password"
            icon={HiOutlineLockClosed}
          />

          {/* Password strength meter */}
          {password && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      i <= strength.level ? strength.color : 'bg-surface-700'
                    }`}
                  />
                ))}
              </div>
              <p className="text-2xs text-surface-400">
                Strength: <span className="font-medium text-surface-300">{strength.label}</span>
              </p>
            </div>
          )}

          {/* Confirm Password */}
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setErrors({});
            }}
            error={errors.confirmPassword}
            placeholder="Confirm your password"
            icon={HiOutlineLockClosed}
          />

          {/* Error from Redux */}
          {error && (
            <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-sm text-danger-400">
              {error}
            </div>
          )}

          {/* Security notice */}
          <div className="flex gap-2 p-3 rounded-xl bg-primary-500/5 border border-primary-500/10">
            <HiOutlineShieldCheck className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-surface-400 leading-relaxed">
              This password encrypts your wallet on this device. NexVault cannot recover your password — keep it safe.
            </p>
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={isLoading}
            disabled={!password || !confirmPassword}
          >
            Create Wallet
          </Button>
        </form>
      </motion.div>

      {/* Back link */}
      <button
        onClick={() => navigate('/welcome')}
        className="mt-4 text-sm text-surface-500 hover:text-surface-300 transition-colors text-center"
      >
        ← Back
      </button>
    </div>
  );
}
