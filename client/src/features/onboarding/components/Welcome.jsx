/**
 * NexVault — Welcome Screen
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlinePlusCircle,
  HiOutlineArrowDownTray,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';
import Button from '../../../shared/components/ui/Button.jsx';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8">
      {/* Logo & Brand */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center mb-8"
      >
        {/* Animated Logo */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-glow-lg animate-pulse-glow">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
            </svg>
          </div>
          {/* Glow ring */}
          <div className="absolute inset-0 w-20 h-20 rounded-2xl bg-primary-500/20 blur-xl -z-10" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">NexVault</h1>
        <p className="text-surface-400 text-center text-sm leading-relaxed max-w-xs">
          Your gateway to the decentralized world. Secure, non-custodial, multi-chain.
        </p>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="flex gap-6 mb-10"
      >
        {[
          { icon: '🔐', label: 'Non-Custodial' },
          { icon: '⛓️', label: 'Multi-Chain' },
          { icon: '🛡️', label: 'Secure' },
        ].map((feature, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span className="text-xl">{feature.icon}</span>
            <span className="text-2xs text-surface-400 font-medium">{feature.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="w-full space-y-3"
      >
        <Button
          fullWidth
          size="lg"
          onClick={() => navigate('/create')}
          icon={HiOutlinePlusCircle}
          className="!text-base"
        >
          Create New Wallet
        </Button>

        <Button
          fullWidth
          size="lg"
          variant="secondary"
          onClick={() => navigate('/import')}
          icon={HiOutlineArrowDownTray}
          className="!text-base"
        >
          Import Existing Wallet
        </Button>
      </motion.div>

      {/* Security note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 flex items-center gap-2 text-2xs text-surface-500"
      >
        <HiOutlineShieldCheck className="w-4 h-4 text-success-400" />
        <span>Your keys never leave this device</span>
      </motion.div>
    </div>
  );
}
