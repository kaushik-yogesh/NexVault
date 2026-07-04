/**
 * NexVault — Transaction History
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  HiOutlineArrowUpRight,
  HiOutlineArrowDownLeft,
  HiOutlineArrowPath,
  HiOutlineFunnel,
} from 'react-icons/hi2';
import { selectActiveChain } from '../../network/networkSlice.js';
import { ethers } from 'ethers';

export default function TransactionHistory() {
  const activeChain = useSelector(selectActiveChain);
  const activeChainId = useSelector((state) => state.network.activeChainId);
  const activeAddress = useSelector((state) => state.wallet.activeAddress);
  
  const [filter, setFilter] = useState('all');
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchHistory = async () => {
      if (!activeAddress || !activeChainId) return;
      setIsLoading(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiUrl}/transactions/history?address=${activeAddress}&chainId=${activeChainId}`);
        const data = await res.json();
        
        if (data.success && isMounted) {
          setTransactions(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    fetchHistory();
    return () => { isMounted = false; };
  }, [activeAddress, activeChainId]);

  const truncate = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  const getTimeAgo = (timestamp) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getTypeConfig = (type) => {
    switch (type) {
      case 'send':
        return {
          icon: HiOutlineArrowUpRight,
          color: 'text-danger-400',
          bg: 'bg-danger-500/10',
          label: 'Sent',
          prefix: '-',
        };
      case 'receive':
        return {
          icon: HiOutlineArrowDownLeft,
          color: 'text-success-400',
          bg: 'bg-success-500/10',
          label: 'Received',
          prefix: '+',
        };
      case 'swap':
        return {
          icon: HiOutlineArrowPath,
          color: 'text-primary-400',
          bg: 'bg-primary-500/10',
          label: 'Swapped',
          prefix: '',
        };
      default:
        return {
          icon: HiOutlineArrowPath,
          color: 'text-surface-400',
          bg: 'bg-surface-800',
          label: 'Unknown',
          prefix: '',
        };
    }
  };

  const filteredTxs = filter === 'all'
    ? transactions
    : transactions.filter((tx) => tx.type === filter);

  const formatWei = (weiStr) => {
    if (!weiStr || weiStr === '0') return '0';
    try {
      return parseFloat(ethers.formatEther(weiStr)).toFixed(6);
    } catch {
      return '0';
    }
  };

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Activity</h2>
          <button className="btn-icon !p-2">
            <HiOutlineFunnel className="w-4 h-4" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {['all', 'send', 'receive', 'swap'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold capitalize
                transition-all duration-200
                ${filter === f
                  ? 'bg-primary-500/15 text-primary-300 border border-primary-500/30'
                  : 'text-surface-400 hover:text-surface-200 border border-transparent'
                }
              `}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Transaction list */}
        {isLoading ? (
          <div className="py-12 text-center text-surface-500 text-sm">Loading history...</div>
        ) : (
          <div className="space-y-2">
            {filteredTxs.map((tx, index) => {
              const config = getTypeConfig(tx.type);
              const Icon = config.icon;

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card-hover p-3.5 flex items-center gap-3 cursor-pointer"
                  onClick={() => window.open(`${activeChain?.blockExplorer?.url}/tx/${tx.hash}`, '_blank')}
                >
                  <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center`}>
                    <Icon className={`w-4.5 h-4.5 ${config.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-surface-200 capitalize">
                        {config.label}
                      </span>
                      <span className={`text-sm font-semibold token-amount ${
                        tx.type === 'receive' ? 'text-success-400' : 'text-surface-200'
                      }`}>
                        {config.prefix}{parseFloat(tx.amount).toFixed(4)} {tx.symbol}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {tx.status && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            tx.status === 'SUCCESS' ? 'bg-success-500/20 text-success-400' :
                            tx.status === 'FAILED' ? 'bg-danger-500/20 text-danger-400' :
                            'bg-warning-500/20 text-warning-400'
                          }`}>
                            {tx.status}
                          </span>
                        )}
                        <span className="text-xs text-surface-500 truncate">
                          {tx.type === 'send' && `To: ${truncate(tx.to)}`}
                          {tx.type === 'receive' && `From: ${truncate(tx.from)}`}
                          {tx.type === 'swap' && `Swapped`}
                        </span>
                      </div>
                      <span className="text-xs text-surface-500 whitespace-nowrap pl-2">
                        {getTimeAgo(tx.timestamp)}
                      </span>
                    </div>
                    {/* Fee display line */}
                    {(tx.networkFee && tx.networkFee !== '0' || tx.platformFee && tx.platformFee !== '0') && (
                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-surface-700/30">
                        <span className="text-[10px] text-surface-500">
                          Net Fee: {formatWei(tx.networkFee)} {activeChain?.nativeCurrency?.symbol}
                        </span>
                        {tx.platformFee !== '0' && (
                          <span className="text-[10px] text-primary-400/80">
                            App Fee: {tx.platformFee}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {!isLoading && filteredTxs.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-surface-500 text-sm">No transactions yet</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
