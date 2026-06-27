import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { FiArrowDown, FiSettings, FiRefreshCcw } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Button from '../../../shared/components/ui/Button.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import toast from 'react-hot-toast';
import { swapService } from '../../../core/dex/SwapService.js';
import transactionController from '../../../core/network/TransactionController.js';
import keyringController from '../../../core/wallet/KeyringController.js';
import { selectTokensByChain } from '../../tokens/tokensSlice.js';
import { selectActiveChain } from '../../network/networkSlice.js';

export default function SwapForm() {
  const { activeAddress, balances } = useSelector((state) => state.wallet);
  const activeChainId = useSelector((state) => state.network.activeChainId);
  const activeChain = useSelector(selectActiveChain);
  const tokens = useSelector((state) => selectTokensByChain(state, activeChainId));

  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('from');

  const globalPrices = useSelector((state) => state.pricing.prices);

  const [sellToken, setSellToken] = useState(tokenParam || 'native');
  const [buyToken, setBuyToken] = useState(tokens.length > 0 ? tokens[0].address : '');
  
  const [sellAmount, setSellAmount] = useState('');
  const [quote, setQuote] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [slippage, setSlippage] = useState(1.0);
  
  // Custom token selector state
  const [tokenSelectorType, setTokenSelectorType] = useState(null); // 'sell' or 'buy'

  // Derive symbols & balances
  const getSymbol = (addr) => {
    if (addr === 'native') return activeChain?.nativeCurrency?.symbol || 'ETH';
    return tokens.find(t => t.address === addr)?.symbol || '...';
  };
  
  const getBalance = (addr) => {
    if (addr === 'native') return balances?.[activeAddress]?.[activeChainId]?.native || '0';
    return balances?.[activeAddress]?.[activeChainId]?.tokens?.[addr] || '0';
  };

  const getIcon = (addr) => {
    if (addr === 'native') return activeChain?.icon || null;
    const t = tokens.find(t => t.address === addr);
    return t ? (t.logoURI || t.logo || null) : null;
  };

  const sellSymbol = getSymbol(sellToken);
  const buySymbol = getSymbol(buyToken);
  const sellBalance = getBalance(sellToken);
  const sellIcon = getIcon(sellToken);
  const buyIcon = getIcon(buyToken);

  // Debounced quote fetch
  useEffect(() => {
    if (!sellAmount || Number(sellAmount) <= 0 || !sellToken || !buyToken) {
      setQuote(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const sPrice = sellToken === 'native' ? (globalPrices?.[activeChainId]?.native?.price || 0) : (globalPrices?.[activeChainId]?.[sellToken.toLowerCase()]?.price || 0);
        const bPrice = buyToken === 'native' ? (globalPrices?.[activeChainId]?.native?.price || 0) : (globalPrices?.[activeChainId]?.[buyToken.toLowerCase()]?.price || 0);

        const getDecimals = (addr) => {
          if (addr === 'native') return 18;
          return tokens.find(t => t.address.toLowerCase() === addr.toLowerCase())?.decimals || 18;
        };

        const sDecimals = getDecimals(sellToken);
        const bDecimals = getDecimals(buyToken);

        const result = await swapService.getQuote(
          activeChainId,
          sellToken,
          buyToken,
          sellAmount,
          slippage,
          sPrice,
          bPrice,
          '',
          sDecimals,
          bDecimals
        );
        setQuote(result);
      } catch (error) {
        console.error(error);
        toast.error('Failed to fetch quote');
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [sellAmount, sellToken, buyToken, activeChainId, slippage]);

  const handleSwap = async () => {
    if (!quote || !activeAddress || !quote._internalRoute) {
      toast.error('Invalid swap quote');
      return;
    }
    
    setIsLoading(true);
    toast.loading('Confirming transaction...', { id: 'swap' });
    
    try {
      const signer = keyringController.getActiveSigner();
      
      const txData = swapService.buildTransaction(
        activeChainId,
        sellToken,
        buyToken,
        activeAddress,
        quote._internalRoute
      );

      const txRequest = {
        to: txData.to,
        data: txData.data,
        value: txData.value,
        chainId: activeChainId,
      };

      await transactionController.processTransaction(signer, txRequest, true);
      
      toast.success('Swap submitted successfully!', { id: 'swap' });
      setSellAmount('');
      setQuote(null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Swap failed', { id: 'swap' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchTokens = () => {
    const temp = sellToken;
    setSellToken(buyToken);
    setBuyToken(temp);
    setSellAmount('');
  };

  const handleMax = () => {
    if (sellToken === 'native') {
      const max = Math.max(0, Number(sellBalance) - 0.005);
      setSellAmount(max > 0 ? max.toString() : '0');
    } else {
      setSellAmount(sellBalance.toString());
    }
  };

  const handleSelectToken = (addr) => {
    if (tokenSelectorType === 'sell') {
      if (addr === buyToken) {
        toast.error("Cannot swap the same token");
        return;
      }
      setSellToken(addr);
    }
    if (tokenSelectorType === 'buy') {
      if (addr === sellToken) {
        toast.error("Cannot swap the same token");
        return;
      }
      setBuyToken(addr);
    }
    setTokenSelectorType(null);
  };

  const TokenItem = ({ address, symbol, name, icon, balance, chainIcon, price, fiatBalance }) => (
    <div 
      onClick={() => handleSelectToken(address)}
      className="flex items-center justify-between p-3 cursor-pointer hover:bg-surface-800 transition-colors rounded-xl border border-transparent hover:border-surface-700"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center overflow-hidden border border-surface-600">
            {icon ? <img src={icon} className="w-full h-full object-cover" /> : symbol.charAt(0)}
          </div>
          {chainIcon && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-surface-900 bg-surface-800 flex items-center justify-center overflow-hidden">
              <img src={chainIcon} alt="chain" className="w-3 h-3 object-contain" />
            </div>
          )}
        </div>
        <div>
          <div className="text-sm font-bold text-white flex items-center gap-2">
            {symbol}
            {price > 0 && <span className="text-2xs font-normal text-surface-400 bg-surface-900 px-1.5 py-0.5 rounded-md border border-surface-700/50">${price.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>}
          </div>
          <div className="text-xs text-surface-400">{name}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-white">
          {parseFloat(balance).toFixed(4)}
        </div>
        {fiatBalance > 0 && (
          <div className="text-xs text-surface-400 mt-0.5">
            ${fiatBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="page-container flex flex-col h-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col h-full"
      >
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-white">Swap Tokens</h2>
          <button className="p-2 hover:bg-surface-800 rounded-full text-surface-400 hover:text-white transition-colors">
            <FiSettings size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-4">
          {/* Sell Input Card */}
          <div className="bg-surface-800/30 border border-surface-700/50 rounded-2xl p-4 transition-colors focus-within:border-primary-500/50 relative">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-surface-400">You Pay</label>
              <div className="text-xs text-surface-400 font-medium">
                Balance: {parseFloat(sellBalance).toFixed(4)}
              </div>
            </div>
            
            <div className="flex justify-between items-center gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={sellAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) setSellAmount(val);
                  }}
                  placeholder="0.0"
                  className="bg-transparent text-3xl font-bold text-white outline-none w-full placeholder-surface-600"
                />
              </div>
              
              <div className="flex flex-col gap-1 items-end shrink-0">
                <button onClick={handleMax} className="text-2xs text-primary-400 font-bold px-1 py-0.5 hover:text-primary-300 transition-colors uppercase tracking-wider">MAX</button>
                <button 
                  onClick={() => setTokenSelectorType('sell')}
                  className="bg-surface-800 border border-surface-700 hover:border-surface-600 text-white font-bold py-1.5 px-3 rounded-xl flex items-center gap-2 focus:outline-none min-w-[110px]"
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-surface-700 flex items-center justify-center border border-surface-600">
                    {sellIcon ? <img src={sellIcon} className="w-full h-full object-cover" /> : sellSymbol.charAt(0)}
                  </div>
                  <span className="flex-1 text-left">{sellSymbol}</span>
                  <FiArrowDown size={14} className="text-surface-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Switch Button */}
          <div className="relative h-2 flex justify-center items-center z-10 -my-2">
            <button 
              onClick={handleSwitchTokens}
              className="absolute bg-surface-800 border-4 border-surface-950 p-2 rounded-xl text-surface-300 hover:text-white hover:bg-surface-700 transition-colors group"
            >
              <FiArrowDown size={18} className="group-hover:rotate-180 transition-transform duration-300" />
            </button>
          </div>

          {/* Buy Input Card */}
          <div className="bg-surface-800/30 border border-surface-700/50 rounded-2xl p-4 transition-colors focus-within:border-primary-500/50">
            <label className="text-sm font-medium text-surface-400 mb-2 block">You Receive</label>
            
            <div className="flex justify-between items-center gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  readOnly
                  value={isLoading ? '...' : quote?.buyAmount || ''}
                  placeholder="0.0"
                  className="bg-transparent text-3xl font-bold text-white outline-none w-full placeholder-surface-600 cursor-not-allowed"
                />
              </div>
              
              <div className="shrink-0 pt-5">
                <button 
                  onClick={() => setTokenSelectorType('buy')}
                  className="bg-surface-800 border border-surface-700 hover:border-surface-600 text-white font-bold py-1.5 px-3 rounded-xl flex items-center gap-2 focus:outline-none min-w-[110px]"
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-surface-700 flex items-center justify-center border border-surface-600">
                    {buyIcon ? <img src={buyIcon} className="w-full h-full object-cover" /> : buySymbol.charAt(0)}
                  </div>
                  <span className="flex-1 text-left">{buySymbol}</span>
                  <FiArrowDown size={14} className="text-surface-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Quote Details */}
          {quote && !isLoading && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-surface-800/20 rounded-2xl border border-surface-700/30 p-4 space-y-3"
            >
              <div className="flex justify-between items-center text-sm">
                <span className="text-surface-400 font-medium">Rate</span>
                <span className="text-surface-200 font-semibold">1 {sellSymbol} = {quote.exchangeRate} {buySymbol}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-surface-400 font-medium">Minimum Received</span>
                <span className="text-white font-bold">{quote.minReceived} {buySymbol}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-surface-400 font-medium">Price Impact</span>
                <span className={`font-semibold ${quote.priceImpact > 5 ? 'text-danger-400' : quote.priceImpact > 1 ? 'text-warning-400' : 'text-success-400'}`}>
                  {quote.priceImpact.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-surface-400 font-medium">Platform Fee ({quote.platformFeePercentage}%)</span>
                <span className="text-surface-200 font-semibold">{quote.platformFeeAmount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-surface-400 font-medium">Est. Network Fee</span>
                <span className="text-surface-200 font-semibold">{parseFloat(quote.networkFeeUsd) > 0 ? `~$${quote.networkFeeUsd}` : '...'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-surface-400 font-medium">Route</span>
                <span className="text-primary-400 font-bold">{quote.route?.[0]?.name || 'Direct DEX'}</span>
              </div>
            </motion.div>
          )}

          <div className="mt-auto pt-6 pb-4">
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={handleSwap}
              disabled={!sellAmount || Number(sellAmount) <= 0 || isLoading || !quote}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <FiRefreshCcw className="animate-spin" /> Fetching Best Route...
                </div>
              ) : (
                'Review Swap'
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      <Modal isOpen={!!tokenSelectorType} onClose={() => setTokenSelectorType(null)} title="Select a token">
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar -mx-2 px-2">
          <TokenItem 
            address="native" 
            symbol={activeChain?.nativeCurrency?.symbol || 'ETH'} 
            name={activeChain?.nativeCurrency?.name || 'Ethereum'} 
            icon={activeChain?.icon} 
            chainIcon={activeChain?.icon}
            balance={balances?.[activeAddress]?.[activeChainId]?.native || '0'}
            price={globalPrices?.[activeChainId]?.native?.price || 0}
            fiatBalance={parseFloat(balances?.[activeAddress]?.[activeChainId]?.native || '0') * (globalPrices?.[activeChainId]?.native?.price || 0)}
          />
          {tokens.map(t => {
            const tBal = balances?.[activeAddress]?.[activeChainId]?.tokens?.[t.address] || '0';
            const tPrice = globalPrices?.[activeChainId]?.[t.address.toLowerCase()]?.price || 0;
            const tFiat = parseFloat(tBal) * tPrice;
            return (
              <TokenItem 
                key={t.address}
                address={t.address}
                symbol={t.symbol}
                name={t.name}
                icon={t.logoURI || t.logo}
                chainIcon={activeChain?.icon}
                balance={tBal}
                price={tPrice}
                fiatBalance={tFiat}
              />
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
