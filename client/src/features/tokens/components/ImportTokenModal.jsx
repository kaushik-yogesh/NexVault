/**
 * NexVault — Import Token Modal
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { HiXMark, HiOutlineMagnifyingGlass } from 'react-icons/hi2';
import { isAddress, Contract } from 'ethers';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import { saveToken } from '../tokensSlice.js';
import providerManager from '../../../core/network/ProviderManager.js';
import networkManager from '../../../core/network/NetworkManager.js';
import { getTokenMetadata } from '../../../core/api/pricingService.js';
import { CHAINS } from '../../../../../shared/constants/chains.js';
import { POPULAR_TOKENS } from '../../../shared/constants/tokens.js';

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)"
];

export default function ImportTokenModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const globalActiveChainId = useSelector((state) => state.network.activeChainId);
  const existingTokens = useSelector((state) => state.tokens.items);
  
  const [activeTab, setActiveTab] = useState('search'); // 'search' or 'custom'
  const [selectedChainId, setSelectedChainId] = useState(globalActiveChainId);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom form state
  const [address, setAddress] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState('');
  const [name, setName] = useState('');
  const [logoURI, setLogoURI] = useState('');
  
  const [isFetching, setIsFetching] = useState(false);
  const [errors, setErrors] = useState({});
  const [foundOnOtherChain, setFoundOnOtherChain] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('search');
      setSearchQuery('');
      setAddress('');
      setSymbol('');
      setDecimals('');
      setName('');
      setLogoURI('');
      setErrors({});
      setFoundOnOtherChain(null);
    } else {
      setSelectedChainId(globalActiveChainId);
    }
  }, [isOpen, globalActiveChainId]);

  // Auto-fetch token details when address is entered in custom tab
  useEffect(() => {
    const fetchTokenDetails = async () => {
      if (!isAddress(address)) return;

      setIsFetching(true);
      setErrors({});
      setFoundOnOtherChain(null);
      
      try {
        const provider = await providerManager.getProviderWithFallback(selectedChainId);
        const contract = new Contract(address, ERC20_ABI, provider);
        
        const [tokenSymbol, tokenDecimals, tokenName, tokenMeta] = await Promise.all([
          contract.symbol().catch(() => ''),
          contract.decimals().catch(() => 18),
          contract.name().catch(() => ''),
          getTokenMetadata(selectedChainId, address).catch(() => null)
        ]);

        if (!tokenSymbol && !tokenName) {
           throw new Error("Contract not valid or missing on this network");
        }

        setSymbol(tokenSymbol || 'TKN');
        setDecimals(tokenDecimals.toString());
        setName(tokenName || 'Unknown Token');
        setLogoURI(tokenMeta?.logoURI || '');
      } catch (err) {
        setErrors({ address: `This contract was not found on ${CHAINS[selectedChainId]?.name || 'the selected network'}.` });
        
        // Smart Scan
        const altResult = await networkManager.findTokenAcrossChains(address);
        if (altResult && altResult.chainId !== selectedChainId) {
          setFoundOnOtherChain(altResult);
          setSymbol(altResult.symbol || 'TKN');
          setDecimals(altResult.decimals.toString());
          setName(altResult.name || 'Unknown Token');
          setErrors({}); // Clear error to show the suggestion banner instead
        }
      } finally {
        setIsFetching(false);
      }
    };

    if (address.length === 42 && activeTab === 'custom') {
      fetchTokenDetails();
    }
  }, [address, selectedChainId, activeTab]);

  const handleCustomImport = async (e) => {
    if (e) e.preventDefault();
    
    if (!isAddress(address)) {
      setErrors({ address: 'Invalid contract address' });
      return;
    }
    if (!symbol) {
      setErrors({ symbol: 'Symbol is required' });
      return;
    }
    if (!decimals || isNaN(decimals) || parseInt(decimals) < 0 || parseInt(decimals) > 36) {
      setErrors({ decimals: 'Invalid decimals (0-36)' });
      return;
    }

    try {
      const targetChainId = foundOnOtherChain ? foundOnOtherChain.chainId : selectedChainId;
      
      // Auto-switch network before saving if it's different from the global one
      if (targetChainId !== globalActiveChainId) {
        await networkManager.switchChain(targetChainId);
      }

      await dispatch(saveToken({
        address,
        symbol: symbol.toUpperCase(),
        decimals: parseInt(decimals),
        name: name || symbol.toUpperCase(),
        chainId: targetChainId,
        logoURI
      })).unwrap();
      
      onClose();
    } catch (err) {
      setErrors({ form: err.message });
    }
  };

  const handleSearchImport = async (token) => {
    try {
      if (token.chainId !== globalActiveChainId) {
        await networkManager.switchChain(token.chainId);
      }
      await dispatch(saveToken(token)).unwrap();
      onClose();
    } catch (err) {
      setErrors({ form: err.message });
    }
  };

  const popularTokens = POPULAR_TOKENS[selectedChainId] || [];
  const filteredTokens = popularTokens.filter(t => 
    t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isTokenImported = (token) => {
    return existingTokens.some(t => t.chainId === token.chainId && t.address.toLowerCase() === token.address.toLowerCase());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-sm bg-surface-900 border border-surface-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800/50">
          <h2 className="text-lg font-bold text-white">Import Token</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-surface-800/50">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'search' ? 'border-primary-500 text-white' : 'border-transparent text-surface-500 hover:text-surface-300'
            }`}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'custom' ? 'border-primary-500 text-white' : 'border-transparent text-surface-500 hover:text-surface-300'
            }`}
          >
            Custom Token
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
          {/* Network Selection (Always visible) */}
          <div className="mb-4">
            <label className="text-sm font-medium text-surface-300 mb-1.5 block">Select Network</label>
            <select
              value={selectedChainId}
              onChange={(e) => {
                setSelectedChainId(e.target.value);
                setErrors({});
                setFoundOnOtherChain(null);
              }}
              className="w-full bg-surface-900 border border-surface-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500/50"
            >
              {Object.values(CHAINS).map(chain => (
                <option key={chain.chainId} value={chain.chainId}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>

          {activeTab === 'search' ? (
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiOutlineMagnifyingGlass className="h-5 w-5 text-surface-500" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search popular tokens..."
                  className="w-full bg-surface-900 border border-surface-700/50 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary-500/50"
                />
              </div>

              {errors.form && (
                <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-sm text-danger-400">
                  {errors.form}
                </div>
              )}

              <div className="space-y-2 mt-2">
                {filteredTokens.length > 0 ? (
                  filteredTokens.map(token => {
                    const imported = isTokenImported(token);
                    return (
                      <div key={token.address} className="flex items-center justify-between p-3 rounded-xl bg-surface-800/30 border border-surface-700/50">
                        <div className="flex items-center gap-3">
                          <img src={token.logoURI} alt={token.symbol} className="w-8 h-8 rounded-full" />
                          <div>
                            <p className="text-sm font-semibold text-white">{token.symbol}</p>
                            <p className="text-xs text-surface-400">{token.name}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={imported ? "ghost" : "primary"}
                          disabled={imported}
                          onClick={() => !imported && handleSearchImport(token)}
                        >
                          {imported ? 'Imported' : 'Import'}
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-sm text-surface-500 py-4">No popular tokens found. Try custom import.</p>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleCustomImport} className="space-y-4">
              <Input
                label="Token Contract Address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setErrors((p) => ({ ...p, address: null }));
                  setFoundOnOtherChain(null);
                }}
                error={errors.address}
                placeholder="0x..."
                autoFocus
              />

              {/* Smart Scan Banner */}
              {foundOnOtherChain && (
                <div className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/20">
                  <p className="text-sm text-primary-300 font-medium mb-2">
                    This contract exists on {foundOnOtherChain.chainName}.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    fullWidth
                    onClick={handleCustomImport}
                    disabled={isFetching}
                  >
                    Switch Network & Import
                  </Button>
                </div>
              )}

              {logoURI && !foundOnOtherChain && (
                <div className="flex items-center gap-3 p-3 bg-surface-800/30 rounded-xl border border-surface-700/50">
                  <img src={logoURI} alt="Token Logo" className="w-8 h-8 rounded-full" />
                  <div>
                    <p className="text-sm font-semibold text-white">{name || 'Unknown'}</p>
                    <p className="text-xs text-surface-400">Icon Found</p>
                  </div>
                </div>
              )}

              {!foundOnOtherChain && (
                <>
                  <Input
                    label="Token Symbol"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    error={errors.symbol}
                    placeholder="e.g. USDT"
                    disabled={isFetching}
                  />

                  <Input
                    label="Token Decimal"
                    type="number"
                    value={decimals}
                    onChange={(e) => setDecimals(e.target.value)}
                    error={errors.decimals}
                    placeholder="18"
                    disabled={isFetching}
                  />

                  {errors.form && (
                    <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-sm text-danger-400">
                      {errors.form}
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      type="submit"
                      fullWidth
                      loading={isFetching}
                      disabled={!address || !symbol || !decimals || isFetching}
                    >
                      Import Token
                    </Button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
