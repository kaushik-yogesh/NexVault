/**
 * NexVault — Add Account Page
 * Full flow for creating a new derived account.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { HiOutlinePlus, HiOutlineArrowDownOnSquare } from 'react-icons/hi2';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import { addAccount, clearError } from '../walletSlice.js';

export default function AddAccountPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { accounts, isLoading, error } = useSelector((state) => state.wallet);

  const [accountName, setAccountName] = useState(`Account ${accounts?.length + 1}`);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(addAccount({ name: accountName.trim() || `Account ${accounts?.length + 1}` }));
    if (addAccount.fulfilled.match(result)) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex flex-col h-full px-4 py-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1"
      >
        <h2 className="text-lg font-bold text-white mb-1">Add Account</h2>
        <p className="text-sm text-surface-400 mb-6">
          Create a new account or import an existing one.
        </p>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-primary-500/10 border border-primary-500/30 text-primary-400"
          >
            <HiOutlinePlus className="w-6 h-6 mb-2" />
            <span className="text-xs font-semibold">Create New</span>
          </button>
          
          <button
            onClick={() => navigate('/import-account')}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-surface-800/50 border border-surface-700/50 text-surface-400 hover:text-white hover:bg-surface-800 transition-all duration-200"
          >
            <HiOutlineArrowDownOnSquare className="w-6 h-6 mb-2" />
            <span className="text-xs font-semibold">Import Account</span>
          </button>
        </div>

        <div className="h-px w-full bg-surface-800/50 mb-6" />

        <h3 className="text-sm font-semibold text-white mb-4">Create New Account</h3>

        <form onSubmit={handleCreateAccount} className="space-y-4">
          <Input
            label="Account Name"
            value={accountName}
            onChange={(e) => {
               setAccountName(e.target.value);
               if (error) dispatch(clearError());
            }}
            placeholder="e.g. Trading Wallet"
          />

          {error && (
            <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-sm text-danger-400">
              {error}
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={isLoading}
            disabled={!accountName.trim()}
          >
            Create Account
          </Button>
        </form>

      </motion.div>
    </div>
  );
}
