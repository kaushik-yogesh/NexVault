/**
 * NexVault — Token Details Page
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import {
  HiOutlineArrowLeft,
  HiOutlineTrash,
  HiOutlinePaperAirplane,
  HiOutlineQrCode,
  HiOutlineArrowsRightLeft,
  HiOutlineArrowUpRight,
  HiOutlineArrowDownLeft,
  HiOutlineArrowPath
} from 'react-icons/hi2';
import CandlestickChart from '../../../shared/components/ui/CandlestickChart.jsx';
import { selectTokensByChain, deleteToken } from '../tokensSlice.js';
import { selectActiveChain } from '../../network/networkSlice.js';
import { getNativePrice, getTokenPrices, getTokenChartData, getTokenMetadata } from '../../../core/api/pricingService.js';
import toast from 'react-hot-toast';
import Button from '../../../shared/components/ui/Button.jsx';
import Spinner from '../../../shared/components/ui/Spinner.jsx';

import axios from 'axios';

export default function TokenDetailsPage() {
  const { address } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const activeChainId = useSelector((state) => state.network.activeChainId);
  const activeChain = useSelector(selectActiveChain);
  const tokens = useSelector((state) => selectTokensByChain(state, activeChainId));
  const { activeAddress, balances } = useSelector((state) => state.wallet);

  const globalPrices = useSelector((state) => state.pricing.prices);
  const [chartData, setChartData] = useState([]);
  const [chartType, setChartType] = useState('line');
  const [timeframe, setTimeframe] = useState(1); // days
  const [meta, setMeta] = useState(null);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [tokenHistory, setTokenHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // Is it the native token?
  const isNative = address === 'native';

  const token = isNative 
    ? { 
        name: activeChain?.nativeCurrency?.name || 'Ethereum', 
        symbol: activeChain?.nativeCurrency?.symbol || 'ETH',
        address: 'native',
        decimals: activeChain?.nativeCurrency?.decimals || 18,
      } 
    : tokens.find(t => t.address.toLowerCase() === address?.toLowerCase());

  const tokenBalance = isNative 
    ? balances?.[activeAddress]?.[activeChainId]?.native || '0'
    : balances?.[activeAddress]?.[activeChainId]?.tokens?.[token?.address] || '0';

  useEffect(() => {
    if (!token || !activeChainId) return;

    // Prices are now managed globally by TokenDataManager
    // We only need to fetch chart and metadata on demand

    // Load Chart, Meta, and History
    const loadData = async () => {
      setIsChartLoading(true);
      setIsHistoryLoading(true);
      try {
        const [cData, mData, historyRes] = await Promise.all([
          getTokenChartData(activeChainId, isNative ? 'native' : token.address, timeframe),
          getTokenMetadata(activeChainId, isNative ? 'native' : token.address),
          axios.get(`http://localhost:5000/api/transactions/history?address=${activeAddress}&chainId=${activeChainId}&token=${isNative ? 'native' : token.address}`)
        ]);
        setChartData(cData);
        if (mData) setMeta(mData);
        if (historyRes.data?.success) {
          setTokenHistory(historyRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load advanced token data', err);
      } finally {
        setIsChartLoading(false);
        setIsHistoryLoading(false);
      }
    };
    
    loadData();
  }, [isNative, token, activeChainId, timeframe, activeAddress]);

  if (!token) {
    return (
      <div className="p-6 text-center text-white">
        <h2>Token not found</h2>
        <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const priceObj = isNative ? globalPrices?.[activeChainId]?.native : globalPrices?.[activeChainId]?.[token.address.toLowerCase()];
  const price = priceObj?.price || 0;
  const change24h = priceObj?.change24h || 0;
  
  const fiatBalance = parseFloat(tokenBalance) * price;
  const isPositive = change24h >= 0;

  const handleDelete = () => {
    if (isNative) {
      toast.error("Cannot delete native token");
      return;
    }
    if (window.confirm(`Are you sure you want to remove ${token.symbol}?`)) {
      dispatch(deleteToken(token.id));
      toast.success(`${token.symbol} removed`);
      navigate('/dashboard');
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '---';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  // History is now dynamically loaded

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
      case 'send': return { icon: HiOutlineArrowUpRight, color: 'text-danger-400', bg: 'bg-danger-500/10', label: 'Sent', prefix: '-' };
      case 'receive': return { icon: HiOutlineArrowDownLeft, color: 'text-success-400', bg: 'bg-success-500/10', label: 'Received', prefix: '+' };
      case 'swap': return { icon: HiOutlineArrowPath, color: 'text-primary-400', bg: 'bg-primary-500/10', label: 'Swapped', prefix: '' };
      default: return { icon: HiOutlineArrowPath, color: 'text-surface-400', bg: 'bg-surface-800', label: 'Unknown', prefix: '' };
    }
  };

  const truncate = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  return (
    <div className="flex flex-col h-full bg-surface-950">
      {/* Header */}
      <div className="px-4 py-4 shrink-0 flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-surface-400 hover:text-white transition-colors">
          <HiOutlineArrowLeft size={24} />
        </button>
        <div className="flex gap-2">
          {!isNative && (
            <button onClick={handleDelete} className="p-2 text-surface-400 hover:text-danger-400 transition-colors">
              <HiOutlineTrash size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 custom-scrollbar">
        {/* Top Info (Price & Chart Header) */}
        <div className="mb-6 flex flex-col items-start px-1">
          <div className="flex items-center gap-2 mb-2">
             <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-800 flex items-center justify-center border border-surface-700">
               {(isNative && activeChain?.icon) || token.logoURI || token.logo || meta?.logoURI ? (
                  <img src={(isNative && activeChain?.icon) || token.logoURI || token.logo || meta?.logoURI} alt={token.symbol} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-white">{token.symbol.charAt(0)}</span>
                )}
             </div>
             <h2 className="text-lg text-surface-200 font-bold tracking-tight">{token.name} <span className="text-surface-500 font-medium ml-1">{token.symbol}</span></h2>
          </div>
          <h1 className="text-[2.75rem] font-black text-white mb-3 tracking-tight leading-none">
            ${price > 0 ? price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '0.00'}
          </h1>
          <div className="flex items-center gap-3 text-sm font-bold">
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${isPositive ? 'bg-success-500/10 text-success-400' : 'bg-danger-500/10 text-danger-400'}`}>
              <span>{isPositive ? '+' : ''}{change24h.toFixed(2)}%</span>
            </div>
            <span className="text-surface-400 font-medium">
              {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Action Buttons (MetaMask Style) */}
        <div className="flex justify-center gap-8 mb-8 mt-2">
          <button onClick={() => navigate(`/send?token=${token.address}`)} className="flex flex-col items-center gap-2 group">
            <div className="w-12 h-12 rounded-full bg-primary-500 text-white flex items-center justify-center group-hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/20">
              <HiOutlinePaperAirplane size={22} className="ml-1 mt-0.5" />
            </div>
            <span className="text-sm font-semibold text-primary-500">Send</span>
          </button>
          
          <button onClick={() => navigate(`/receive?token=${token.address}`)} className="flex flex-col items-center gap-2 group">
            <div className="w-12 h-12 rounded-full bg-primary-500 text-white flex items-center justify-center group-hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/20">
              <HiOutlineQrCode size={22} />
            </div>
            <span className="text-sm font-semibold text-primary-500">Receive</span>
          </button>
          
          <button onClick={() => navigate(`/swap?from=${token.address}`)} className="flex flex-col items-center gap-2 group">
            <div className="w-12 h-12 rounded-full bg-primary-500 text-white flex items-center justify-center group-hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/20">
              <HiOutlineArrowsRightLeft size={22} />
            </div>
            <span className="text-sm font-semibold text-primary-500">Swap</span>
          </button>
        </div>

        {/* Chart */}
        <div className="bg-surface-800/30 rounded-2xl border border-surface-700/50 p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            {/* Chart Type Toggle */}
            <div className="flex gap-1 bg-surface-900 rounded-lg p-1">
               <button onClick={() => setChartType('line')} className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${chartType === 'line' ? 'bg-surface-700 text-white shadow-sm' : 'text-surface-400 hover:text-white'}`}>Line</button>
               <button onClick={() => setChartType('candle')} className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${chartType === 'candle' ? 'bg-surface-700 text-white shadow-sm' : 'text-surface-400 hover:text-white'}`}>Candle</button>
            </div>
            <div className="flex gap-1 bg-surface-900 rounded-lg p-1">
              {[
                { label: '1D', val: 1 },
                { label: '1W', val: 7 },
                { label: '1M', val: 30 },
              ].map(t => (
                <button
                  key={t.label}
                  onClick={() => setTimeframe(t.val)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    timeframe === t.val ? 'bg-primary-500 text-white shadow-sm' : 'text-surface-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="relative w-full h-40">
            {isChartLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner size="md" />
              </div>
            ) : chartData.length > 0 ? (
              <div className="w-full h-full pb-2">
                <CandlestickChart data={chartData} type={chartType} />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-surface-500">
                Chart data unavailable
              </div>
            )}
          </div>
        </div>


        {/* Your balance */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-3">Your balance</h3>
          <div className="bg-surface-800/30 rounded-2xl border border-surface-700/50 p-4 flex items-center gap-4">
             <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl text-white font-bold bg-surface-800 border border-surface-700 overflow-hidden shrink-0">
              {(isNative && activeChain?.icon) || token.logoURI || token.logo || meta?.logoURI ? (
                <img src={(isNative && activeChain?.icon) || token.logoURI || token.logo || meta?.logoURI} alt={token.symbol} className="w-full h-full object-cover" />
              ) : (
                token.symbol.charAt(0)
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-base font-bold text-white">{token.symbol}</span>
                <span className="text-base font-bold text-white">${fiatBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-surface-400">{activeChain?.name || 'Network'}</span>
                <div className="flex items-center gap-2">
                  {price > 0 && (
                    <span className={`text-xs font-medium ${isPositive ? 'text-success-400' : 'text-danger-400'}`}>
                      {isPositive ? '+' : ''}{change24h.toFixed(2)}%
                    </span>
                  )}
                  <span className="text-sm text-surface-400">
                    {parseFloat(tokenBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })} {token.symbol}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Token details */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-3">Token details</h3>
          <div className="bg-surface-800/30 rounded-2xl border border-surface-700/50 p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-surface-300">Network</span>
              <span className="text-sm font-semibold text-white">{activeChain?.name || 'Unknown'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-surface-300">Spending caps</span>
              <button className="text-sm font-semibold text-primary-400 hover:text-primary-300 transition-colors">Edit in Portfolio</button>
            </div>
          </div>
        </div>

        {/* Market details */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-3">Market details</h3>
          <div className="bg-surface-800/30 rounded-2xl border border-surface-700/50 p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-surface-300">Market cap</span>
              <span className="text-sm font-semibold text-white">{formatCurrency(meta?.marketCap)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-surface-300">Total volume</span>
              <span className="text-sm font-semibold text-white">{formatCurrency(meta?.volume24h)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-surface-300">Circulating supply</span>
              <span className="text-sm font-semibold text-white">{meta?.circulatingSupply ? formatCurrency(meta.circulatingSupply).replace('$', '') : '---'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-surface-300">All-time high</span>
              <span className="text-sm font-semibold text-white">{meta?.ath ? `$${meta.ath.toLocaleString()}` : '---'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-surface-300">All-time low</span>
              <span className="text-sm font-semibold text-white">{meta?.atl ? `$${meta.atl.toLocaleString()}` : '---'}</span>
            </div>
          </div>
        </div>

        {/* Your activity */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white mb-3">Your activity</h3>
          <div className="bg-surface-800/30 rounded-2xl border border-surface-700/50 p-4">
             {isHistoryLoading ? (
               <div className="flex justify-center py-6">
                 <Spinner size="md" />
               </div>
             ) : tokenHistory.length > 0 ? (
               <div className="space-y-2">
                 {tokenHistory.map((tx, index) => {
                  const config = getTypeConfig(tx.type);
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="glass-card-hover p-3 flex items-center gap-3 cursor-pointer rounded-xl"
                    >
                      <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center`}>
                        <Icon className={`w-4.5 h-4.5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-surface-200">{config.label}</span>
                          <span className={`text-sm font-semibold token-amount ${tx.type === 'receive' ? 'text-success-400' : 'text-surface-200'}`}>
                            {config.prefix}{tx.amount} {tx.symbol}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-xs text-surface-500">
                            {tx.type === 'send' && `To: ${truncate(tx.to)}`}
                            {tx.type === 'receive' && `From: ${truncate(tx.from)}`}
                            {tx.type === 'swap' && `→ ${tx.amountOut || tx.amount} ${tx.symbolOut || tx.symbol}`}
                          </span>
                          <span className="text-xs text-surface-500">{getTimeAgo(tx.timestamp)}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center py-6">
                 <p className="text-sm font-semibold text-white mb-1">Activity</p>
                 <p className="text-sm text-surface-400">No recent transactions found.</p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
