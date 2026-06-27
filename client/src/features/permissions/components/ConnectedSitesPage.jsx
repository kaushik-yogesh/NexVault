/**
 * NexVault — Connected Sites Page
 * Displays DApps that have permission to connect to the wallet.
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { HiOutlineGlobeAlt, HiOutlineTrash } from 'react-icons/hi2';
import Button from '../../../shared/components/ui/Button.jsx';
import { loadPermissions, revokePermission } from '../permissionsSlice.js';

export default function ConnectedSitesPage() {
  const dispatch = useDispatch();
  const { items: permissions, isLoading } = useSelector((state) => state.permissions);
  const { accounts, activeAddress } = useSelector((state) => state.wallet);

  useEffect(() => {
    dispatch(loadPermissions());
  }, [dispatch]);

  const handleRevoke = (origin) => {
    if (window.confirm(`Are you sure you want to disconnect from ${origin}?`)) {
      dispatch(revokePermission(origin));
    }
  };

  return (
    <div className="flex flex-col h-full px-4 py-4">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-white mb-1">Connected Sites</h2>
        <p className="text-sm text-surface-400">Manage DApps with access to your accounts</p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 overflow-y-auto pr-1 custom-scrollbar"
      >
        {permissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-surface-800 flex items-center justify-center mb-3">
              <HiOutlineGlobeAlt className="w-6 h-6 text-surface-500" />
            </div>
            <p className="text-surface-300 font-medium mb-1">No sites connected</p>
            <p className="text-sm text-surface-500 max-w-[200px]">
              You haven't connected your wallet to any DApps yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {permissions.map((perm) => (
              <div
                key={perm.origin}
                className="p-4 rounded-xl bg-surface-800/30 border border-surface-700/30"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {perm.metadata?.icon ? (
                        <img src={perm.metadata.icon} alt={perm.metadata?.name || 'DApp'} className="w-full h-full object-cover" />
                      ) : (
                        <HiOutlineGlobeAlt className="w-5 h-5 text-surface-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        {perm.metadata?.name || new URL(perm.origin).hostname}
                      </h4>
                      <a
                        href={perm.origin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-400 hover:text-primary-300"
                      >
                        {perm.origin}
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(perm.origin)}
                    className="p-2 text-surface-500 hover:text-danger-400 transition-all rounded-lg hover:bg-danger-500/10"
                    title="Disconnect"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-3 border-t border-surface-700/50">
                  <p className="text-xs font-medium text-surface-400 mb-2">Permitted Accounts:</p>
                  <div className="space-y-1.5">
                    {perm.accounts.map(addr => {
                      const acc = accounts.find(a => a.address.toLowerCase() === addr.toLowerCase());
                      const isCurrent = addr.toLowerCase() === activeAddress?.toLowerCase();
                      return (
                        <div key={addr} className="flex items-center gap-2 text-xs">
                          <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-primary-500' : 'bg-surface-600'}`} />
                          <span className="text-surface-200 font-medium">
                            {acc?.name || 'Account'}
                          </span>
                          <span className="text-surface-500 font-mono">
                            ({addr.slice(0, 6)}...{addr.slice(-4)})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
