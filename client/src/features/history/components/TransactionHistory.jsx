/**
 * NexVault — Transaction History
 */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  HiOutlineArrowUpRight,
  HiOutlineArrowDownLeft,
  HiOutlineArrowPath,
  HiOutlineFunnel,
} from 'react-icons/hi2';
import { selectActiveChain } from '../../network/networkSlice.js';

// Mock transaction data for UI demonstration
const mockTransactions = [
  {
    id: '1',
    type: 'send',
    status: 'confirmed',
    amount: '0.5',
    symbol: 'ETH',
    to: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
    hash: '0xabc123...',
    timestamp: Date.now() - 3600000,
    gasUsed: '0.002',
  },
  {
    id: '2',
    type: 'receive',
    status: 'confirmed',
    amount: '1.2',
    symbol: 'ETH',
    from: '0x1234567890abcdef1234567890abcdef12345678',
    hash: '0xdef456...',
    timestamp: Date.now() - 86400000,
    gasUsed: '0',
  },
  {
    id: '3',
    type: 'swap',
    status: 'confirmed',
    amount: '100',
    symbol: 'USDT',
    amountOut: '0.045',
    symbolOut: 'ETH',
    hash: '0xghi789...',
    timestamp: Date.now() - 172800000,
    gasUsed: '0.008',
  },
];

export default function TransactionHistory() {
  const activeChain = useSelector(selectActiveChain);
  const [filter, setFilter] = useState('all');

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
    ? mockTransactions
    : mockTransactions.filter((tx) => tx.type === filter);

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
              >
                <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center`}>
                  <Icon className={`w-4.5 h-4.5 ${config.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-surface-200">
                      {config.label}
                    </span>
                    <span className={`text-sm font-semibold token-amount ${
                      tx.type === 'receive' ? 'text-success-400' : 'text-surface-200'
                    }`}>
                      {config.prefix}{tx.amount} {tx.symbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-surface-500">
                      {tx.type === 'send' && `To: ${truncate(tx.to)}`}
                      {tx.type === 'receive' && `From: ${truncate(tx.from)}`}
                      {tx.type === 'swap' && `→ ${tx.amountOut} ${tx.symbolOut}`}
                    </span>
                    <span className="text-xs text-surface-500">
                      {getTimeAgo(tx.timestamp)}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredTxs.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-surface-500 text-sm">No transactions yet</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
