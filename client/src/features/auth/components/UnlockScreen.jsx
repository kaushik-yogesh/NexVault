/**
 * NexVault — Unlock Screen
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { HiOutlineLockClosed } from 'react-icons/hi2';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import { unlockWallet, unlockWithBiometric, checkBiometricStatus, clearError } from '../../wallet/walletSlice.js';
import { HiOutlineFingerPrint } from 'react-icons/hi2';
import { Turnstile } from '@marsidev/react-turnstile';

export default function UnlockScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isLoading, error, isUnlocked, isInitialized, hasBiometricEnabled } = useSelector((state) => state.wallet);
  const [password, setPassword] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState(null);

  useEffect(() => {
    dispatch(checkBiometricStatus());
  }, [dispatch]);

  useEffect(() => {
    if (!isInitialized) {
      navigate('/welcome');
    }
    if (isUnlocked) {
      navigate(`/dashboard${location.search}`);
    }
  }, [isInitialized, isUnlocked, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    if (!turnstileToken) {
      toast.error('Please complete the security challenge.');
      return;
    }

    const result = await dispatch(unlockWallet({ password, turnstileToken }));
    if (unlockWallet.fulfilled.match(result)) {
      navigate(`/dashboard${location.search}`);
    } else {
      setAttempts((prev) => prev + 1);
      setPassword('');
    }
  };

  const handleBiometricUnlock = async () => {
    dispatch(clearError());
    const result = await dispatch(unlockWithBiometric());
    if (unlockWithBiometric.fulfilled.match(result)) {
      navigate(`/dashboard${location.search}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        {/* Lock icon */}
        <div className="flex justify-center mb-6">
          <motion.div
            className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <HiOutlineLockClosed className="w-8 h-8 text-white" />
          </motion.div>
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-1">
          Welcome Back
        </h2>
        <p className="text-sm text-surface-400 text-center mb-6">
          Enter your password to unlock NexVault
        </p>

        <form onSubmit={handleUnlock} className="space-y-4">
          <Input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) dispatch(clearError());
            }}
            placeholder="Enter password"
            error={error?.includes('WRONG_PASSWORD') ? 'Incorrect password' : null}
            icon={HiOutlineLockClosed}
            autoFocus
          />

          {attempts >= 3 && (
            <div className="p-3 rounded-xl bg-warning-500/10 border border-warning-500/20 text-xs text-warning-300">
              Multiple failed attempts detected. If you've forgotten your password, 
              you can reset your wallet using your recovery phrase.
            </div>
          )}

          <div className="flex justify-center my-2">
            <Turnstile
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
              onSuccess={(token) => setTurnstileToken(token)}
              onError={() => toast.error('Turnstile error. Please refresh.')}
              onExpire={() => setTurnstileToken(null)}
              options={{ theme: 'dark' }}
            />
          </div>

          {hasBiometricEnabled ? (
            <div className="flex gap-3">
              <div className="flex-1">
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={isLoading}
                  disabled={!password.trim() && !isLoading}
                >
                  Unlock
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleBiometricUnlock}
                disabled={isLoading}
                className="px-4"
              >
                <HiOutlineFingerPrint className="w-6 h-6 text-primary-400" />
              </Button>
            </div>
          ) : (
            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={isLoading}
              disabled={!password.trim() && !isLoading}
            >
              Unlock
            </Button>
          )}
        </form>

        {attempts >= 5 && (
          <button
            onClick={() => navigate('/import')}
            className="mt-4 text-sm text-danger-400 hover:text-danger-300 transition-colors text-center w-full"
          >
            Reset wallet with recovery phrase
          </button>
        )}
      </motion.div>
    </div>
  );
}
