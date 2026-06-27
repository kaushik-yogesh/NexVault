/**
 * NexVault — DApp Connect Modal
 * Prompts the user to approve a connection from a DApp.
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineGlobeAlt, HiCheck, HiOutlineShieldExclamation } from 'react-icons/hi2';
import Button from '../../../shared/components/ui/Button.jsx';
import permissionManager from '../../../core/permissions/PermissionManager.js';
import { loadPermissions } from '../permissionsSlice.js';

export default function ConnectModal({ isOpen, request, onApprove, onReject }) {
  const dispatch = useDispatch();
  const { activeAddress, accounts } = useSelector((state) => state.wallet);
  
  // Default to the currently active account, but allow user to select others later
  const [selectedAccounts, setSelectedAccounts] = useState([activeAddress]);
  const [isApproving, setIsApproving] = useState(false);

  if (!isOpen || !request) return null;

  const { origin, metadata } = request;

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      // Grant permission for all selected accounts
      for (const address of selectedAccounts) {
        await permissionManager.grantPermission(origin, address, metadata);
      }
      dispatch(loadPermissions());
      onApprove(selectedAccounts);
    } catch (err) {
      console.error('Failed to grant permission', err);
      onReject(err);
    } finally {
      setIsApproving(false);
    }
  };

  const toggleAccount = (address) => {
    if (selectedAccounts.includes(address)) {
      if (selectedAccounts.length > 1) {
        setSelectedAccounts(selectedAccounts.filter(a => a !== address));
      }
    } else {
      setSelectedAccounts([...selectedAccounts, address]);
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
          onClick={() => onReject(new Error('User rejected'))}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm bg-surface-900 border border-surface-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 text-center border-b border-surface-800/50">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center overflow-hidden border-2 border-surface-700 shadow-xl">
                  {metadata?.icon ? (
                    <img src={metadata.icon} alt="DApp" className="w-full h-full object-cover" />
                  ) : (
                    <HiOutlineGlobeAlt className="w-8 h-8 text-surface-400" />
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-surface-900 bg-primary-500 flex items-center justify-center shadow-lg">
                  <img src="/nexvault-logo.svg" alt="NexVault" className="w-4 h-4 invert" onError={(e) => e.target.style.display = 'none'} />
                </div>
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-white mb-1">
              Connect to {metadata?.name || new URL(origin).hostname}
            </h2>
            <a href={origin} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-400 hover:underline">
              {origin}
            </a>
          </div>

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <div className="mb-5 p-3 rounded-xl bg-surface-800/30 border border-surface-700/30">
              <h3 className="text-sm font-medium text-surface-300 mb-2">This site wants to:</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-surface-200">
                  <HiCheck className="w-5 h-5 text-success-400 shrink-0" />
                  View your wallet balance and activity
                </li>
                <li className="flex items-start gap-2 text-sm text-surface-200">
                  <HiCheck className="w-5 h-5 text-success-400 shrink-0" />
                  Request approval for transactions
                </li>
              </ul>
            </div>

            <h3 className="text-sm font-semibold text-white mb-3">Select accounts to connect</h3>
            <div className="space-y-2">
              {accounts.map(acc => {
                const isSelected = selectedAccounts.includes(acc.address);
                return (
                  <div
                    key={acc.address}
                    onClick={() => toggleAccount(acc.address)}
                    className={`
                      flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all
                      ${isSelected 
                        ? 'bg-primary-500/10 border-primary-500/50' 
                        : 'bg-surface-800/30 border-surface-700/50 hover:bg-surface-800/60'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full" style={{ background: acc.avatar || 'hsl(220, 65%, 55%)' }} />
                      <div>
                        <p className="text-sm font-medium text-white">{acc.name}</p>
                        <p className="text-xs text-surface-500 font-mono">
                          {acc.address.slice(0, 6)}...{acc.address.slice(-4)}
                        </p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-primary-500 bg-primary-500' : 'border-surface-600'
                    }`}>
                      {isSelected && <HiCheck className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-warning-500/10 border border-warning-500/20">
              <HiOutlineShieldExclamation className="w-5 h-5 text-warning-400 shrink-0 mt-0.5" />
              <p className="text-xs text-warning-300 leading-relaxed">
                Only connect with sites you trust. Connecting does not give the site permission to move your funds.
              </p>
            </div>
          </div>

          <div className="p-5 border-t border-surface-800/50 flex gap-3 bg-surface-900">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => onReject(new Error('User rejected'))}
              disabled={isApproving}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              onClick={handleApprove}
              loading={isApproving}
            >
              Connect
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
