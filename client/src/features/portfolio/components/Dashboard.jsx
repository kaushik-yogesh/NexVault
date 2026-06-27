/**
 * NexVault — Dashboard (Portfolio Home)
 */

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlinePaperAirplane,
  HiOutlineQrCode,
  HiOutlineArrowsRightLeft,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineClipboard,
} from 'react-icons/hi2';
import { selectActiveChain } from '../../network/networkSlice.js';
import Spinner from '../../../shared/components/ui/Spinner.jsx';
import toast from 'react-hot-toast';
import ImportTokenModal from '../../tokens/components/ImportTokenModal.jsx';
import { loadTokens, selectAllTokens, autoDiscoverTokens } from '../../tokens/tokensSlice.js';
import { loadNFTs, selectNFTsByOwnerAndChain } from '../../nfts/nftsSlice.js';
import NFTGallery from '../../nfts/components/NFTGallery.jsx';
import { getAllChains, getChain } from '../../../../../shared/constants/chains.js';
import networkManager from '../../../core/network/NetworkManager.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { activeAddress, accounts, balances } = useSelector((state) => state.wallet);
  const activeChain = useSelector(selectActiveChain);
  const activeChainId = useSelector((state) => state.network.activeChainId);
  const { showBalances } = useSelector((state) => state.settings);
  
  // New Global Pricing State
  const globalPrices = useSelector((state) => state.pricing.prices);
  const isLoadingPricing = useSelector((state) => state.pricing.isLoading);

  const [showBalance, setShowBalance] = useState(showBalances);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab] = useState('tokens'); // 'tokens' or 'nfts'
  
  const tokens = useSelector(selectAllTokens);
  const allChains = getAllChains();
  const nfts = useSelector((state) => selectNFTsByOwnerAndChain(state, activeAddress, activeChainId));

  useEffect(() => {
    dispatch(loadTokens());
    dispatch(loadNFTs());
    // Auto-discovery is now handled centrally by TokenDataManager for background polling,
    // but we can keep an initial trigger here if needed.
  }, [dispatch, activeAddress, activeChainId]);

  const activeAccount = accounts?.find(
    (a) => a.address?.toLowerCase() === activeAddress?.toLowerCase()
  );

  const nativeBalance = balances?.[activeAddress]?.[activeChainId]?.native || '0';

  // Calculate total fiat balance using centralized pricing state
  let fiatNative = 0;
  allChains.forEach(chain => {
    const bal = balances?.[activeAddress]?.[chain.chainId]?.native || '0';
    const p = globalPrices?.[chain.chainId]?.native?.price || 0;
    fiatNative += parseFloat(bal) * p;
  });

  let fiatTokens = 0;
  if (tokens) {
    tokens.forEach(t => {
      const bal = balances?.[activeAddress]?.[t.chainId]?.tokens?.[t.address.toLowerCase()] || '0';
      const p = globalPrices?.[t.chainId]?.[t.address.toLowerCase()]?.price || 0;
      fiatTokens += parseFloat(bal) * p;
    });
  }
  const totalFiat = fiatNative + fiatTokens;

  const truncateAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = async () => {
    if (activeAddress) {
      await navigator.clipboard.writeText(activeAddress);
      toast.success('Address copied!');
    }
  };

  // Format balance for display
  const formatBalance = (bal) => {
    const num = parseFloat(bal);
    if (isNaN(num)) return '0';
    if (num === 0) return '0';
    if (num < 0.0001) return '< 0.0001';
    if (num < 1) return num.toFixed(6);
    if (num < 1000) return num.toFixed(4);
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const formatPrice = (p) => {
    if (typeof p !== 'number' || isNaN(p) || p === 0) return '0.00';
    if (p < 0.000001) return p.toFixed(8);
    if (p < 0.0001) return p.toFixed(6);
    if (p < 0.01) return p.toFixed(4);
    return p.toFixed(2);
  };

  return (
    <div className="flex flex-col flex-1 px-4 pt-4">
      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-5 mb-5"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/20 via-accent-600/10 to-surface-800/80 rounded-2xl" />
        <div className="absolute inset-0 backdrop-blur-xl border border-surface-700/30 rounded-2xl" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={copyAddress}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg 
                         bg-surface-800/40 hover:bg-surface-800/60 
                         transition-all duration-200"
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-2xs font-bold"
                style={{ background: activeAccount?.avatar || 'hsl(220, 65%, 55%)' }}
              >
                {activeAccount?.name?.charAt(0) || 'A'}
              </div>
              <span className="text-xs text-surface-300 font-mono">
                {truncateAddress(activeAddress)}
              </span>
              <HiOutlineClipboard className="w-3.5 h-3.5 text-surface-400" />
            </button>

            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-1.5 rounded-lg text-surface-400 hover:text-white transition-colors"
            >
              {showBalance ? (
                <HiOutlineEye className="w-4 h-4" />
              ) : (
                <HiOutlineEyeSlash className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="mb-4 flex flex-col items-center">
            <p className="text-xs text-surface-400 mb-1">Total Balance</p>
            {isLoadingPricing && totalFiat === 0 ? (
              <div className="flex items-center gap-2 my-2">
                <Spinner size="sm" />
                <span className="text-surface-400 text-sm">Syncing Data...</span>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-bold text-white token-amount">
                    ${showBalance ? totalFiat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '••••••'}
                  </h2>
                  <span className="text-sm text-surface-400 font-medium">USD</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-surface-300 font-medium">
                    {showBalance ? formatBalance(nativeBalance) : '•••'} {activeChain?.nativeCurrency?.symbol || 'ETH'}
                  </span>
                  {globalPrices?.[activeChainId]?.native?.change24h !== 0 && globalPrices?.[activeChainId]?.native?.change24h !== undefined && (
                    <span className={`text-xs font-medium flex items-center ${globalPrices[activeChainId].native.change24h > 0 ? 'text-success-400' : 'text-danger-400'}`}>
                      {globalPrices[activeChainId].native.change24h > 0 ? '+' : ''}{(globalPrices[activeChainId].native.change24h || 0).toFixed(2)}%
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            {[
              { label: 'Send', icon: HiOutlinePaperAirplane, path: '/send', color: 'from-primary-500 to-primary-600' },
              { label: 'Receive', icon: HiOutlineQrCode, path: '/receive', color: 'from-accent-500 to-accent-600' },
              { label: 'Swap', icon: HiOutlineArrowsRightLeft, path: '/swap', color: 'from-emerald-500 to-emerald-600' },
            ].map(({ label, icon: Icon, path, color }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl
                           bg-surface-800/40 hover:bg-surface-800/60 border border-surface-700/30
                           transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-2xs font-medium text-surface-300">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="flex items-center gap-4 border-b border-surface-800/50 mb-3 px-1">
        <button
          onClick={() => setActiveTab('tokens')}
          className={`pb-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
            activeTab === 'tokens'
              ? 'text-white border-primary-500'
              : 'text-surface-500 border-transparent hover:text-surface-300'
          }`}
        >
          Tokens
        </button>
        <button
          onClick={() => setActiveTab('nfts')}
          className={`pb-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
            activeTab === 'nfts'
              ? 'text-white border-primary-500'
              : 'text-surface-500 border-transparent hover:text-surface-300'
          }`}
        >
          NFTs
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-2">
        {activeTab === 'tokens' ? (
          <>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-semibold text-surface-300">Assets</h3>
              <button
                onClick={() => setShowImportModal(true)}
                className="text-xs text-primary-400 hover:text-primary-300 font-medium"
              >
                + Add Token
              </button>
            </div>

        {allChains.filter(chain => chain.chainId === activeChainId).map((chain, index) => {
          const bal = balances?.[activeAddress]?.[chain.chainId]?.native || '0';
          const priceObj = globalPrices?.[chain.chainId]?.native;
          const price = priceObj?.price || 0;
          const fiatBal = parseFloat(bal) * price;
          
          return (
            <motion.div
              key={`native-${chain.chainId}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + (index * 0.05) }}
              onClick={() => navigate('/token/native')}
              className="glass-card-hover p-4 flex items-center gap-3 cursor-pointer mb-2"
            >
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-surface-800 overflow-hidden border border-surface-700"
                  style={{ background: chain.icon ? 'transparent' : (chain.color || '#627EEA') }}
                >
                  {chain.icon ? (
                    <img src={chain.icon} alt={chain.shortName} className="w-full h-full object-cover" />
                  ) : (
                    chain.nativeCurrency?.symbol?.charAt(0) || 'E'
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">
                    {chain.nativeCurrency?.name || 'Ether'} <span className="text-xs text-surface-400 font-normal">({chain.name})</span>
                  </h4>
                  <span className="text-sm font-semibold text-white token-amount">
                    {showBalance ? formatBalance(bal) : '••••'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-surface-400">
                    {price > 0 ? `$${formatPrice(price)}` : (priceObj ? 'Market data unavailable' : 'Loading...')}
                  </span>
                  <span className="text-xs text-surface-400 text-right">
                    {showBalance ? `$${formatPrice(fiatBal)}` : '••••'}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}

        {tokens.filter(t => t.chainId === activeChainId).length > 0 && (
          tokens.filter(t => t.chainId === activeChainId).map((token, index) => {
            const tokenBalance = balances?.[activeAddress]?.[token.chainId]?.tokens?.[token.address.toLowerCase()] || '0';
            const priceObj = globalPrices?.[token.chainId]?.[token.address.toLowerCase()];
            const price = priceObj?.price || 0;
            const fiatBal = parseFloat(tokenBalance) * price;
            const tokenChain = getChain(token.chainId);
            
            return (
              <motion.div
                key={token.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + (allChains.length + index + 1) * 0.05 }}
                className="mt-2 glass-card-hover p-4 flex items-center gap-3 cursor-pointer"
                onClick={async () => {
                  if (token.chainId !== activeChainId) {
                    await networkManager.switchChain(token.chainId);
                  }
                  navigate(`/token/${token.address}`);
                }}
              >
                <div className="relative">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-surface-800 overflow-hidden border border-surface-700"
                  >
                    {token.logoURI || token.logo ? (
                      <img src={token.logoURI || token.logo} alt={token.symbol} className="w-full h-full object-cover" />
                    ) : (
                      token.symbol.charAt(0)
                    )}
                  </div>
                  {tokenChain && tokenChain.icon && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-surface-900 bg-surface-800 flex items-center justify-center overflow-hidden">
                      <img src={tokenChain.icon} alt={tokenChain.shortName} className="w-3 h-3 object-contain" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white truncate max-w-[160px]">
                      {token.name} <span className="text-xs text-surface-400 font-normal">({tokenChain?.shortName})</span>
                    </h4>
                    <span className="text-sm font-semibold text-white token-amount">
                      {showBalance ? formatBalance(tokenBalance) : '••••'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-surface-400">
                      {price > 0 ? `$${formatPrice(price)}` : (priceObj ? 'Market data unavailable' : 'Loading...')}
                    </span>
                    <span className="text-xs text-surface-400 text-right">
                      {showBalance ? `$${formatPrice(fiatBal)}` : '••••'}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        {tokens.filter(t => t.chainId === activeChainId).length === 0 && (
          <div className="mt-3 py-6 text-center">
            <p className="text-sm text-surface-500">
              No custom tokens found on this network
            </p>
          </div>
        )}
          </>
        ) : (
          <NFTGallery nfts={nfts} />
        )}
      </div>

      {!useSelector((state) => state.settings.hasBackedUp) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-auto p-3 rounded-xl bg-warning-500/10 border border-warning-500/20 
                     flex items-center gap-3"
        >
          <span className="text-lg">⚠️</span>
          <div className="flex-1">
            <p className="text-xs font-medium text-warning-300">Back up your wallet</p>
            <p className="text-2xs text-surface-400">
              Save your recovery phrase to avoid losing funds
            </p>
          </div>
          <button
            onClick={() => navigate('/create/seed')}
            className="text-xs font-semibold text-warning-400 hover:text-warning-300"
          >
            Backup
          </button>
        </motion.div>
      )}

      <ImportTokenModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
}
