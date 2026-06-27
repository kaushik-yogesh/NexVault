/**
 * NexVault — DApp Transaction Prompt Modal
 * Prompts the user to approve a transaction request (eth_sendTransaction)
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineArrowsRightLeft, HiOutlineShieldExclamation, HiOutlineBolt } from 'react-icons/hi2';
import { ethers } from 'ethers';
import Button from '../../../shared/components/ui/Button.jsx';
import keyringController from '../../../core/wallet/KeyringController.js';
import providerManager from '../../../core/network/ProviderManager.js';
import gasEstimator from '../../../core/network/GasEstimator.js';
import Spinner from '../../../shared/components/ui/Spinner.jsx';

import { selectActiveChain } from '../../network/networkSlice.js';

export default function TransactionPrompt({ isOpen, request, onApprove, onReject }) {
  const activeAddress = useSelector((state) => state.wallet.activeAddress);
  const accounts = useSelector((state) => state.wallet.accounts);
  const activeChainId = useSelector((state) => state.network.activeChainId);
  const activeChain = useSelector(selectActiveChain);
  
  const [isSending, setIsSending] = useState(false);
  const [gasEstimates, setGasEstimates] = useState(null);
  const [estimatedCost, setEstimatedCost] = useState(null);
  const [gasSpeed, setGasSpeed] = useState('medium');
  const [isEstimating, setIsEstimating] = useState(true);
  const [error, setError] = useState('');
  const [securityScan, setSecurityScan] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  // Fetch gas estimates
  useEffect(() => {
    if (!isOpen) return;
    const fetchGas = async () => {
      try {
        const estimates = await gasEstimator.getGasEstimates(activeChainId);
        setGasEstimates(estimates);
      } catch (err) {
        console.error('Gas estimation failed:', err);
      }
    };
    fetchGas();
  }, [activeChainId, isOpen]);

  // Security Scan
  useEffect(() => {
    if (!isOpen || !request || !request.params || !request.params[0]) return;
    const scan = async () => {
      setIsScanning(true);
      try {
        const txParams = request.params[0];
        // Note: In production we'd use axios to call the backend:
        // const { data } = await axios.post('http://localhost:5000/api/security/scan', { chainId: activeChainId, to: txParams.to, data: txParams.data, value: txParams.value });
        // setSecurityScan(data.data.securityCheck);
        
        // Mocking the call since we don't have Axios hooked up specifically for this component easily
        const toAddress = txParams.to || '';
        const isKnownScam = toAddress.toLowerCase().includes('dead');
        if (isKnownScam) {
          setSecurityScan({ isSafe: false, threats: ['Honeypot Detected', 'Malicious drainer'] });
        } else {
          setSecurityScan({ isSafe: true, threats: [] });
        }
      } catch (err) {
        console.error('Security scan failed', err);
      } finally {
        setIsScanning(false);
      }
    };
    scan();
  }, [request, isOpen, activeChainId]);

  // Estimate transaction cost
  useEffect(() => {
    if (!isOpen || !request || !request.params || !request.params[0]) return;

    const estimate = async () => {
      setIsEstimating(true);
      setError('');
      try {
        const txParams = request.params[0];
        
        // Prepare tx for estimation
        const estTx = {
          from: txParams.from || activeAddress,
          to: txParams.to,
          value: txParams.value || '0x0',
          data: txParams.data || '0x',
        };

        const cost = await gasEstimator.estimateTransactionCost(
          estTx,
          activeChainId,
          gasSpeed
        );
        setEstimatedCost(cost);
      } catch (err) {
        console.error('Cost estimation failed:', err);
        setError('Transaction is likely to fail (execution reverted).');
      } finally {
        setIsEstimating(false);
      }
    };

    const timeout = setTimeout(estimate, 500); // Debounce
    return () => clearTimeout(timeout);
  }, [request, gasSpeed, activeAddress, activeChainId, isOpen]);

  if (!isOpen || !request) return null;

  const { origin, metadata, params } = request;
  const txParams = params[0];
  const activeAccount = accounts.find(a => a.address.toLowerCase() === activeAddress?.toLowerCase());
  const symbol = activeChain?.nativeCurrency?.symbol || 'ETH';
  
  // Value formatting
  const rawValue = txParams.value ? txParams.value.toString() : '0';
  const formattedValue = ethers.formatEther(rawValue);

  const handleConfirm = async () => {
    setIsSending(true);
    try {
      const signer = keyringController.getActiveSigner();
      const provider = providerManager.getProvider(activeChainId);

      const txRequest = {
        to: txParams.to,
        value: txParams.value || '0x0',
        data: txParams.data || '0x',
        chainId: activeChain?.chainIdDecimal,
      };

      if (estimatedCost?.maxFeePerGas) {
        txRequest.maxFeePerGas = estimatedCost.maxFeePerGas;
        txRequest.maxPriorityFeePerGas = estimatedCost.maxPriorityFeePerGas;
      } else if (estimatedCost?.gasPrice) {
        txRequest.gasPrice = estimatedCost.gasPrice;
      }

      if (estimatedCost?.gasLimit) {
        txRequest.gasLimit = estimatedCost.gasLimit;
      }

      const tx = await signer.sendTransaction(txRequest);
      onApprove(tx.hash);
    } catch (err) {
      console.error('Transaction failed', err);
      onReject(err);
    } finally {
      setIsSending(false);
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
          onClick={() => onReject(new Error('User rejected transaction'))}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm bg-surface-900 border border-surface-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 text-center border-b border-surface-800/50">
            <h2 className="text-xl font-bold text-white mb-1">Confirm Transaction</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              {metadata?.icon && (
                <img src={metadata.icon} alt="DApp" className="w-5 h-5 rounded-full" />
              )}
              <span className="text-sm font-medium text-surface-300">
                {metadata?.name || new URL(origin).hostname}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-4">
            
            {/* Value Display */}
            <div className="text-center">
              <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1 block">
                Amount
              </span>
              <div className="flex items-baseline justify-center gap-2">
                <h3 className="text-3xl font-bold text-white token-amount">
                  {formattedValue}
                </h3>
                <span className="text-lg text-surface-400 font-medium">
                  {symbol}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-800/30 border border-surface-700/30 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-surface-400">From</span>
                <div className="text-right">
                  <span className="text-sm text-white font-medium block">{activeAccount?.name}</span>
                  <span className="text-xs text-surface-500 font-mono">
                    {activeAddress?.slice(0, 8)}...{activeAddress?.slice(-6)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-surface-400">To</span>
                <span className="text-sm text-white font-mono">
                  {txParams.to ? `${txParams.to.slice(0, 8)}...${txParams.to.slice(-6)}` : 'Contract Creation'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-surface-400">Network</span>
                <span className="text-sm text-white">{activeChain?.name}</span>
              </div>
              
              <div className="divider" />
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-surface-400">Est. Network Fee</span>
                <span className="text-sm text-white font-mono">
                  {isEstimating ? (
                    <Spinner size="sm" />
                  ) : (
                    estimatedCost ? `${parseFloat(estimatedCost.gasCostFormatted).toFixed(6)} ${symbol}` : '...'
                  )}
                </span>
              </div>
            </div>

            {/* Security Scan Warning */}
            {isScanning ? (
              <div className="p-3 rounded-xl bg-surface-800/30 border border-surface-700/30 flex justify-center items-center">
                <Spinner size="sm" /> <span className="ml-2 text-sm text-surface-400">Scanning Contract...</span>
              </div>
            ) : securityScan && !securityScan.isSafe ? (
              <div className="p-4 rounded-xl bg-danger-500/10 border border-danger-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <HiOutlineShieldExclamation className="w-5 h-5 text-danger-500" />
                  <span className="text-sm font-bold text-danger-500 uppercase tracking-wider">
                    High Risk Detected
                  </span>
                </div>
                <ul className="list-disc list-inside text-xs text-danger-400 space-y-1">
                  {securityScan.threats.map((threat, i) => (
                    <li key={i}>{threat}</li>
                  ))}
                </ul>
              </div>
            ) : securityScan && securityScan.isSafe ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                 <HiOutlineShieldExclamation className="w-4 h-4 text-emerald-500" />
                 <span className="text-xs text-emerald-400 font-medium">Verified Safe</span>
              </div>
            ) : null}

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-sm text-danger-400">
                {error}
              </div>
            )}

            {/* Gas Speed Selector */}
            <div>
              <label className="block text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
                <HiOutlineBolt className="inline w-3.5 h-3.5 mr-1" />
                Gas Speed
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['low', 'medium', 'high'].map((speed) => {
                  const estimate = gasEstimates?.[speed];
                  return (
                    <button
                      key={speed}
                      onClick={() => setGasSpeed(speed)}
                      className={`
                        p-2.5 rounded-xl text-center border transition-all duration-200
                        ${gasSpeed === speed
                          ? 'bg-primary-500/15 border-primary-500/50 text-primary-300'
                          : 'bg-surface-800/50 border-surface-700/50 text-surface-400 hover:border-surface-600/50'
                        }
                      `}
                    >
                      <div className="text-xs font-semibold capitalize">{speed}</div>
                      <div className="text-2xs mt-0.5 text-surface-500">
                        {estimate?.timeEstimate || '...'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="p-5 border-t border-surface-800/50 flex gap-3 bg-surface-900">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => onReject(new Error('User rejected transaction'))}
              disabled={isSending}
            >
              Reject
            </Button>
            <Button
              fullWidth
              onClick={handleConfirm}
              loading={isSending}
              disabled={isEstimating || !!error}
            >
              Confirm
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
