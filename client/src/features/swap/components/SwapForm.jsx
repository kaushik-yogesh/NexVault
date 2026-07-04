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
import { ethers } from 'ethers';
import providerManager from '../../../core/network/ProviderManager.js';
import gasEstimator from '../../../core/network/GasEstimator.js';

export default function SwapForm() {
  const { activeAddress, balances } = useSelector((state) => state.wallet);
  const activeChainId = useSelector((state) => state.network.activeChainId);
  const activeChain = useSelector(selectActiveChain);
  const tokens = useSelector((state) => selectTokensByChain(state, activeChainId));

  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('from');

  const globalPrices = useSelector((state) => state.pricing.prices);
  const { SLIPPAGE_DEFAULT, ENABLE_SWAP } = useSelector((state) => state.config.data);

  const [sellToken, setSellToken] = useState(tokenParam || 'native');
  const [buyToken, setBuyToken] = useState(tokens.length > 0 ? tokens[0].address : '');
  
  const [sellAmount, setSellAmount] = useState('');
  const [quote, setQuote] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [slippage, setSlippage] = useState(SLIPPAGE_DEFAULT || 1.0);
  
  // Gas Reserve States
  const [baseGasEstimate, setBaseGasEstimate] = useState('0');
  const { GAS_RESERVE_MIN, GAS_RESERVE_PERCENT, GAS_LIMIT_FALLBACK_SWAP } = useSelector((state) => state.config.data);
  
  // Custom token selector state
  const [tokenSelectorType, setTokenSelectorType] = useState(null); // 'sell' or 'buy'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const getSymbol = (addr) => {
    if (addr === 'native') return activeChain?.nativeCurrency?.symbol || 'ETH';
    return tokens.find(t => t.address === addr)?.symbol || '...';
  };

  const logSwapEvent = async (payload) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await fetch(`${apiUrl}/swap/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn("Failed to log swap event", e);
    }
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

  const fetchDecimals = async (addr) => {
    if (addr === 'native') return 18;
    const found = tokens.find(t => t.address.toLowerCase() === addr.toLowerCase());
    if (found && found.decimals !== undefined) return found.decimals;
    
    try {
      const provider = providerManager.getProvider(activeChainId);
      const contract = new ethers.Contract(addr, ["function decimals() view returns (uint8)"], provider);
      return await contract.decimals();
    } catch (err) {
      console.warn(`Failed to fetch decimals for ${addr}, defaulting to 18`, err);
      return 18;
    }
  };

  const checkAndApproveToken = async (tokenAddress, amount, routerAddress, signer) => {
    if (tokenAddress === 'native') return true; // Native token doesn't need approval

    const erc20Abi = [
      "function allowance(address owner, address spender) view returns (uint256)",
      "function approve(address spender, uint256 amount) returns (bool)"
    ];
    
    const contract = new ethers.Contract(tokenAddress, erc20Abi, signer);
    const ownerAddress = await signer.getAddress();
    
    const allowance = await contract.allowance(ownerAddress, routerAddress);
    
    const tokenDecimals = await fetchDecimals(tokenAddress);
    const requiredAmount = ethers.parseUnits(amount.toString(), tokenDecimals);

    if (allowance < requiredAmount) {
      toast.loading('Approving token for swap...', { id: 'swap_approve' });
      try {
        // Request max approval to avoid repeated prompts
        const tx = await contract.approve(routerAddress, ethers.MaxUint256);
        await tx.wait(1);
        toast.success('Token approved successfully!', { id: 'swap_approve' });
        return true;
      } catch (err) {
        console.error('Approval error:', err);
        toast.error('Token approval failed or rejected', { id: 'swap_approve' });
        return false;
      }
    }
    
    return true;
  };

  // Fetch base gas estimate for dynamic MAX calculation
  useEffect(() => {
    let isMounted = true;
    const fetchBaseGas = async () => {
      try {
        const fallbackLimit = BigInt(GAS_LIMIT_FALLBACK_SWAP || 500000);
        const estimate = await gasEstimator.estimateBaseGas(activeChainId, fallbackLimit);
        if (isMounted) setBaseGasEstimate(estimate.gasCostFormatted);
      } catch (err) {
        console.warn('Failed to fetch base gas estimate', err);
      }
    };
    fetchBaseGas();
    
    // Set up an interval to keep it somewhat fresh
    const interval = setInterval(fetchBaseGas, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeChainId, GAS_LIMIT_FALLBACK_SWAP]);

  // Debounced quote fetch
  useEffect(() => {
    if (!activeAddress || !sellAmount || Number(sellAmount) <= 0 || !sellToken || !buyToken) {
      setQuote(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const sPrice = sellToken === 'native' ? (globalPrices?.[activeChainId]?.native?.price || 0) : (globalPrices?.[activeChainId]?.[sellToken.toLowerCase()]?.price || 0);
        const bPrice = buyToken === 'native' ? (globalPrices?.[activeChainId]?.native?.price || 0) : (globalPrices?.[activeChainId]?.[buyToken.toLowerCase()]?.price || 0);

        const sDecimals = await fetchDecimals(sellToken);
        const bDecimals = await fetchDecimals(buyToken);

        const result = await swapService.getQuote(
          activeChainId,
          sellToken,
          buyToken,
          sellAmount,
          slippage,
          sPrice,
          bPrice,
          activeAddress,
          sDecimals,
          bDecimals
        );
        setQuote(result);
      } catch (error) {
        console.error(error);
        toast.error('Failed to fetch quote');
        logSwapEvent({
          status: 'FAILED',
          walletAddress: activeAddress,
          chainId: activeChainId,
          networkName: activeChain?.name,
          sellToken, buyToken, sellAmount,
          failureStage: 'QUOTE',
          failureReason: 'Quote Failed',
          errorMessage: error.message
        });
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [sellAmount, sellToken, buyToken, activeChainId, slippage]);

  const handleSwap = async () => {
    if (!activeAddress) {
      toast.error('Wallet disconnected');
      return;
    }
    if (!quote || !quote._internalRoute) {
      toast.error('Invalid swap quote');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Pre-flight Gas Reserve Validation
      if (sellToken === 'native') {
        const requiredGas = quote.estimatedGas && quote.gasPriceWei 
            ? parseFloat(ethers.formatEther(BigInt(quote.estimatedGas) * BigInt(quote.gasPriceWei))) 
            : parseFloat(baseGasEstimate);
        
        const safetyBuffer = requiredGas * ((GAS_RESERVE_PERCENT || 10) / 100);
        const minimumReserve = parseFloat(GAS_RESERVE_MIN || 0.005);
        const finalReserve = Math.max(requiredGas + safetyBuffer, minimumReserve);
        
        const requiredBalance = parseFloat(sellAmount) + finalReserve;
        const currentBalance = parseFloat(sellBalance);

        if (currentBalance < requiredBalance) {
          toast.error(
            `Insufficient ${activeChain?.nativeCurrency?.symbol || 'Native'} balance.\n\nRequired: ${requiredBalance.toFixed(4)}\nAvailable: ${currentBalance.toFixed(4)}\nGas Reserve: ${finalReserve.toFixed(4)}\n\nReduce the swap amount or add more funds.`,
            { id: 'swap_tx', duration: 6000 }
          );
          setIsLoading(false);
          return;
        }
      }

      const rawSigner = keyringController.getActiveSigner();
      const provider = providerManager.getProvider(activeChainId);
      const signer = rawSigner.connect(provider);
      
      const routerAddress = quote._internalRoute?.routerAddress;
      if (!routerAddress) throw new Error("Router address not provided by quote. Please try fetching the quote again.");
      
      const isApproved = await checkAndApproveToken(sellToken, sellAmount, routerAddress, signer);
      if (!isApproved) {
        setIsLoading(false);
        return;
      }

      toast.loading('Fetching fresh route...', { id: 'swap_tx' });
      
      const sPrice = sellToken === 'native' ? (globalPrices?.[activeChainId]?.native?.price || 0) : (globalPrices?.[activeChainId]?.[sellToken.toLowerCase()]?.price || 0);
      const bPrice = buyToken === 'native' ? (globalPrices?.[activeChainId]?.native?.price || 0) : (globalPrices?.[activeChainId]?.[buyToken.toLowerCase()]?.price || 0);
      const sDecimals = await fetchDecimals(sellToken);
      const bDecimals = await fetchDecimals(buyToken);

      // Re-fetch quote to prevent stale payload revert due to delay from token approval
      const freshQuote = await swapService.getQuote(
        activeChainId, sellToken, buyToken, sellAmount, slippage,
        sPrice, bPrice, activeAddress, sDecimals, bDecimals
      );

      toast.loading('Confirming transaction...', { id: 'swap_tx' });
      
      const txData = swapService.buildTransaction(
        activeChainId,
        sellToken,
        buyToken,
        activeAddress,
        freshQuote._internalRoute
      );

      const txRequest = {
        to: txData.to,
        data: txData.data,
        value: txData.value,
        chainId: activeChainId,
        metadata: {
          type: 'SWAP',
          assetType: sellToken === 'native' ? 'NATIVE' : 'ERC20',
          tokenAddress: sellToken !== 'native' ? sellToken : undefined,
          value: sellAmount,
          usdValue: parseFloat(sellAmount) * sPrice,
          platformFee: freshQuote.platformFeePercentage ? `${freshQuote.platformFeePercentage}%` : '0'
        }
      };

      const txResponse = await transactionController.processTransaction(signer, txRequest, true);
      
      toast.success('Swap submitted successfully!', { id: 'swap_tx' });
      
      logSwapEvent({
        txHash: txResponse.hash,
        status: 'PENDING',
        walletAddress: activeAddress,
        chainId: activeChainId,
        networkName: activeChain?.name,
        sellToken, buyToken, sellAmount,
        buyAmount: quote.buyAmount,
        minReceived: quote.minReceived,
        slippage,
        priceImpact: quote.priceImpact,
        platformFeePercentage: quote.platformFeePercentage,
        platformFeeAmount: quote.platformFeeAmount,
        feeToken: sellToken,
        aggregator: 'KyberSwap Aggregator',
        routerAddress: quote._internalRoute?.routerAddress
      });

      setSellAmount('');
      setQuote(null);
    } catch (err) {
      console.error(err);
      if (err.message.includes('INSUFFICIENT_FUNDS') || err.message.includes('insufficient funds for gas')) {
        toast.error('Insufficient funds to cover network gas fees.');
      } else {
        toast.error(err.message || 'Swap failed. Please try again.', { id: 'swap_tx' });
      }
      
      logSwapEvent({
        status: 'FAILED',
        walletAddress: activeAddress,
        chainId: activeChainId,
        networkName: activeChain?.name,
        sellToken, buyToken, sellAmount,
        buyAmount: quote?.buyAmount,
        failureStage: err.message?.includes('Router') ? 'BUILD' : 'SIGNING',
        failureReason: 'Swap Execution Failed',
        errorMessage: err.message
      });
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
      const estimatedGas = quote && quote.estimatedGas && quote.gasPriceWei 
          ? parseFloat(ethers.formatEther(BigInt(quote.estimatedGas) * BigInt(quote.gasPriceWei))) 
          : parseFloat(baseGasEstimate || 0);

      const safetyBuffer = estimatedGas * ((GAS_RESERVE_PERCENT || 10) / 100);
      const minimumReserve = parseFloat(GAS_RESERVE_MIN || 0.005);
      const finalReserve = Math.max(estimatedGas + safetyBuffer, minimumReserve);

      const max = Math.max(0, Number(sellBalance) - finalReserve);
      
      if (max <= 0 && Number(sellBalance) > 0) {
        toast.error(`Not enough ${activeChain?.nativeCurrency?.symbol || 'balance'} to cover gas reserves.`);
      }
      
      setSellAmount(max > 0 ? max.toFixed(6) : '0');
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
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-surface-800 rounded-full text-surface-400 hover:text-white transition-colors"
          >
            <FiSettings size={20} />
          </button>
        </div>

        {ENABLE_SWAP === false ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface-800/30 border border-surface-700/50 rounded-2xl">
            <div className="w-16 h-16 bg-surface-800 rounded-full flex items-center justify-center mb-4 border border-surface-700">
              <span className="text-2xl">🚧</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Swaps Disabled</h3>
            <p className="text-surface-400">The swap feature is currently disabled for maintenance. Please check back later.</p>
          </div>
        ) : (
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
                <span className="text-surface-400 font-medium">Slippage Tolerance</span>
                <span 
                  className="font-semibold text-primary-400 cursor-pointer hover:text-primary-300 underline decoration-primary-400/30 underline-offset-4"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  {slippage}%
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-surface-400 font-medium">Platform Fee</span>
                <span className="text-surface-200 font-semibold text-right">
                  {quote.platformFeePercentage > 0 
                    ? `${quote.platformFeePercentage}% (Configured by Admin)` 
                    : 'Disabled'}
                </span>
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
        )}
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

      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Swap Settings">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-surface-400 mb-2 block">Slippage Tolerance</label>
            <div className="flex items-center gap-2 mb-3">
              {[0.1, 0.5, 1.0, 3.0].map(val => (
                <button
                  key={val}
                  onClick={() => setSlippage(val)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${Number(slippage) === val ? 'bg-primary-500 text-white' : 'bg-surface-800 text-surface-300 hover:bg-surface-700'}`}
                >
                  {val}%
                </button>
              ))}
              <div className={`flex items-center bg-surface-800 rounded-xl px-3 py-1.5 border transition-colors ${![0.1, 0.5, 1.0, 3.0].includes(Number(slippage)) ? 'border-primary-500 text-white' : 'border-transparent text-surface-300 focus-within:border-surface-600'}`}>
                <input 
                  type="text" 
                  value={slippage} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) setSlippage(val);
                  }}
                  className="bg-transparent outline-none w-12 text-right text-sm"
                />
                <span className="ml-1 text-sm">%</span>
              </div>
            </div>
            {Number(slippage) > 5 && (
              <div className="text-xs text-warning-400 mt-2">High slippage! Your transaction may be frontrun.</div>
            )}
            {Number(slippage) < 0.1 && slippage !== '' && (
              <div className="text-xs text-danger-400 mt-2">Your transaction may fail due to low slippage.</div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
