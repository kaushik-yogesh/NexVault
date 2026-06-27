/**
 * NexVault — Header Component
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiChevronDown,
  HiLockClosed,
  HiOutlineGlobeAlt,
} from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';
import { lockWallet, switchAccount, addAccount } from '../../../features/wallet/walletSlice.js';
import { switchNetwork, selectActiveChain } from '../../../features/network/networkSlice.js';
import { CHAINS } from '../../../../../shared/constants/chains.js';
import { HiOutlineLink } from 'react-icons/hi2';
import WalletConnectPasteModal from '../../../features/permissions/components/WalletConnectPasteModal.jsx';

export default function Header({ onOpenWCModal }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { accounts, activeAddress } = useSelector((state) => state.wallet);
  const activeChain = useSelector(selectActiveChain);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);

  const activeAccount = accounts?.find(
    (a) => a.address?.toLowerCase() === activeAddress?.toLowerCase()
  );

  const truncateAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="relative z-50 flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-surface-800/50 bg-surface-950/50 backdrop-blur-xl">
      {/* Network selector */}
      <button
        onClick={() => setShowNetworkMenu(!showNetworkMenu)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl
                   bg-surface-800/50 border border-surface-700/50
                   hover:bg-surface-800 hover:border-surface-600/50
                   transition-all duration-200 text-sm"
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: activeChain?.color || '#627EEA' }}
        />
        <span className="text-surface-200 font-medium max-w-[80px] truncate">
          {activeChain?.shortName || 'ETH'}
        </span>
        <HiChevronDown className="w-3.5 h-3.5 text-surface-400" />
      </button>

      {/* Account selector */}
      <button
        onClick={() => setShowAccountMenu(!showAccountMenu)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                   hover:bg-surface-800/50 transition-all duration-200"
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ background: activeAccount?.avatar || 'hsl(220, 65%, 55%)' }}
        >
          {activeAccount?.name?.charAt(0) || 'A'}
        </div>
        <div className="text-left">
          <div className="text-xs font-semibold text-surface-200 max-w-[100px] truncate">
            {activeAccount?.name || 'Account'}
          </div>
          <div className="text-2xs text-surface-500 font-mono">
            {truncateAddress(activeAddress)}
          </div>
        </div>
        <HiChevronDown className="w-3.5 h-3.5 text-surface-400" />
      </button>

      <div className="flex items-center gap-2">
        {/* WalletConnect button */}
        <button
          onClick={onOpenWCModal}
          className="btn-icon !p-2"
          title="WalletConnect"
        >
          <HiOutlineLink className="w-4 h-4" />
        </button>

        {/* Lock button */}
        <button
          onClick={() => dispatch(lockWallet())}
          className="btn-icon !p-2"
          title="Lock Wallet"
        >
          <HiLockClosed className="w-4 h-4" />
        </button>
      </div>

      {/* Network dropdown */}
      <AnimatePresence>
        {showNetworkMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowNetworkMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-14 left-4 z-50 w-52 
                         bg-surface-850 border border-surface-700/50 
                         rounded-xl shadow-glass-lg overflow-hidden"
            >
              <div className="p-2">
                <div className="px-3 py-1.5 text-2xs font-semibold text-surface-500 uppercase tracking-wider">
                  Networks
                </div>
                {Object.values(CHAINS).map((chain) => (
                  <button
                    key={chain.chainId}
                    onClick={() => {
                      dispatch(switchNetwork(chain.chainId));
                      setShowNetworkMenu(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                      transition-all duration-150
                      ${chain.chainId === activeChain?.chainId
                        ? 'bg-primary-500/10 text-primary-300'
                        : 'text-surface-300 hover:bg-surface-800'
                      }
                    `}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: chain.color }}
                    />
                    <span className="text-sm font-medium">{chain.name}</span>
                    {chain.chainId === activeChain?.chainId && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Account dropdown */}
      <AnimatePresence>
        {showAccountMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowAccountMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-14 right-4 z-50 w-56 
                         bg-surface-850 border border-surface-700/50 
                         rounded-xl shadow-glass-lg overflow-hidden"
            >
              <div className="p-2">
                <div className="px-3 py-1.5 text-2xs font-semibold text-surface-500 uppercase tracking-wider">
                  Accounts
                </div>
                {accounts?.map((account) => (
                  <button
                    key={account.address}
                    onClick={() => {
                      dispatch(switchAccount(account.address));
                      setShowAccountMenu(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                      transition-all duration-150
                      ${account.address?.toLowerCase() === activeAddress?.toLowerCase()
                        ? 'bg-primary-500/10 text-primary-300'
                        : 'text-surface-300 hover:bg-surface-800'
                      }
                    `}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: account.avatar || 'hsl(220, 65%, 55%)' }}
                    >
                      {account.name?.charAt(0) || 'A'}
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-sm font-medium truncate">{account.name}</div>
                      <div className="text-2xs text-surface-500 font-mono">
                        {truncateAddress(account.address)}
                      </div>
                    </div>
                  </button>
                ))}
                
                <div className="h-px bg-surface-700/50 my-1.5" />
                
                <button
                  onClick={() => {
                    dispatch(addAccount({ name: `Account ${accounts.length + 1}` }));
                    setShowAccountMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-surface-300 hover:text-white hover:bg-surface-800 transition-all duration-150"
                >
                  <div className="w-7 h-7 flex items-center justify-center">
                    <span className="text-lg">+</span>
                  </div>
                  Add Account
                </button>
                
                <button
                  onClick={() => {
                    navigate('/import-account');
                    setShowAccountMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-surface-300 hover:text-white hover:bg-surface-800 transition-all duration-150"
                >
                  <div className="w-7 h-7 flex items-center justify-center">
                    <span className="text-lg">↓</span>
                  </div>
                  Import Account
                </button>

                <button
                  onClick={() => {
                    navigate('/connect-hardware');
                    setShowAccountMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-surface-300 hover:text-white hover:bg-surface-800 transition-all duration-150"
                >
                  <div className="w-7 h-7 flex items-center justify-center">
                    <span className="text-lg">🔌</span>
                  </div>
                  Connect Hardware Wallet
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
