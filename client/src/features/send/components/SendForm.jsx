/**
 * NexVault — Send Transaction Form
 */

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlinePaperAirplane,
  HiOutlineArrowsUpDown,
  HiOutlineBolt,
} from 'react-icons/hi2';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import Spinner from '../../../shared/components/ui/Spinner.jsx';
import { selectActiveChain } from '../../network/networkSlice.js';
import keyringController from '../../../core/wallet/KeyringController.js';
import transactionController from '../../../core/network/TransactionController.js';
import gasEstimator from '../../../core/network/GasEstimator.js';
import toast from 'react-hot-toast';
import { ethers, Contract } from 'ethers';
import { selectAllTokens } from '../../tokens/tokensSlice.js';
import networkManager from '../../../core/network/NetworkManager.js';

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function estimateGas() view"
];

export default function SendForm() {
  const dispatch = useDispatch();
  const { activeAddress, balances } = useSelector((state) => state.wallet);
  const activeChain = useSelector(selectActiveChain);
  const activeChainId = useSelector((state) => state.network.activeChainId);

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [gasSpeed, setGasSpeed] = useState('medium');
  const [gasEstimates, setGasEstimates] = useState(null);
  const [estimatedCost, setEstimatedCost] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [errors, setErrors] = useState({});
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');
  const [selectedTokenAddress, setSelectedTokenAddress] = useState(tokenParam || 'native');

  const tokens = useSelector(selectAllTokens);
  
  const selectedToken = tokens.find(t => t.address === selectedTokenAddress);
  
  const isNative = selectedTokenAddress === 'native';
  const symbol = isNative ? (activeChain?.nativeCurrency?.symbol || 'ETH') : selectedToken?.symbol;
  const decimals = isNative ? 18 : selectedToken?.decimals;

  const nativeBalance = balances?.[activeAddress]?.[activeChainId]?.native || '0';
  const tokenBalance = !isNative 
    ? balances?.[activeAddress]?.[activeChainId]?.tokens?.[selectedTokenAddress] || '0'
    : '0';
  
  const currentBalance = isNative ? nativeBalance : tokenBalance;

  // Fetch gas estimates
  useEffect(() => {
    const fetchGas = async () => {
      try {
        const estimates = await gasEstimator.getGasEstimates(activeChainId);
        setGasEstimates(estimates);
      } catch (err) {
        console.error('Gas estimation failed:', err);
      }
    };
    fetchGas();
  }, [activeChainId]);

  // Estimate transaction cost when inputs change
  useEffect(() => {
    if (!recipient || !amount || !ethers.isAddress(recipient)) return;
    if (isNaN(Number(amount)) || Number(amount) <= 0) return;

    const estimate = async () => {
      setIsEstimating(true);
      try {
        let txParams = {
          from: activeAddress,
          to: recipient,
          value: ethers.parseUnits(amount, decimals),
        };

        if (!isNative && selectedTokenAddress) {
          const contract = new Contract(selectedTokenAddress, ERC20_ABI);
          const data = contract.interface.encodeFunctionData('transfer', [
            recipient,
            ethers.parseUnits(amount, decimals)
          ]);
          
          txParams = {
            from: activeAddress,
            to: selectedTokenAddress, // The token contract
            value: 0n,
            data: data
          };
        }

        const cost = await gasEstimator.estimateTransactionCost(
          txParams,
          activeChainId,
          gasSpeed
        );
        setEstimatedCost(cost);
      } catch (err) {
        console.error('Cost estimation failed:', err);
      } finally {
        setIsEstimating(false);
      }
    };

    const timeout = setTimeout(estimate, 500); // Debounce
    return () => clearTimeout(timeout);
  }, [recipient, amount, gasSpeed, activeAddress, activeChainId, isNative, selectedTokenAddress, decimals]);

  const validate = () => {
    const errs = {};
    if (!recipient) errs.recipient = 'Recipient address is required';
    else if (!ethers.isAddress(recipient)) errs.recipient = 'Invalid Ethereum address';
    else if (recipient.toLowerCase() === activeAddress?.toLowerCase())
      errs.recipient = 'Cannot send to yourself';

    if (!amount) errs.amount = 'Amount is required';
    else if (isNaN(Number(amount)) || Number(amount) <= 0) errs.amount = 'Invalid amount';
    else if (Number(amount) > Number(currentBalance)) errs.amount = 'Insufficient balance';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePreview = () => {
    if (validate()) {
      setShowPreview(true);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      const signer = keyringController.getActiveSigner();

      let txRequest = {
        to: recipient,
        value: ethers.parseUnits(amount, decimals),
        chainId: activeChain?.chainIdDecimal,
      };

      if (!isNative && selectedTokenAddress) {
        const contract = new Contract(selectedTokenAddress, ERC20_ABI);
        const data = contract.interface.encodeFunctionData('transfer', [
          recipient,
          ethers.parseUnits(amount, decimals)
        ]);
        
        txRequest = {
          to: selectedTokenAddress,
          value: 0n,
          data: data,
          chainId: activeChain?.chainIdDecimal,
        };
      }

      // Add gas parameters
      if (estimatedCost?.maxFeePerGas) {
        txRequest.maxFeePerGas = estimatedCost.maxFeePerGas;
        txRequest.maxPriorityFeePerGas = estimatedCost.maxPriorityFeePerGas;
      } else if (estimatedCost?.gasPrice) {
        txRequest.gasPrice = estimatedCost.gasPrice;
      }

      if (estimatedCost?.gasLimit) {
        txRequest.gasLimit = estimatedCost.gasLimit;
      }

      // Send via TransactionController (handles simulation, nonce, tracking)
      const tx = await transactionController.processTransaction(signer, txRequest, true);
      
      setTxHash(tx.hash);
      setShowPreview(false);
      toast.success('Transaction submitted!');

      // Reset form
      setRecipient('');
      setAmount('');
    } catch (err) {
      toast.error(err.message || 'Transaction failed');
    } finally {
      setIsSending(false);
    }
  };

  const handleMax = () => {
    // Leave some for gas if sending native currency
    if (isNative) {
      const max = Math.max(0, Number(currentBalance) - 0.005);
      setAmount(max > 0 ? max.toString() : '0');
    } else {
      setAmount(currentBalance.toString());
    }
  };

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-lg font-bold text-white mb-5">Send {symbol}</h2>

        <div className="space-y-4">
          {/* Recipient */}
          <Input
            label="Recipient Address"
            value={recipient}
            onChange={(e) => { setRecipient(e.target.value); setErrors({}); }}
            error={errors.recipient}
            placeholder="0x..."
            className="font-mono text-sm"
          />

          {/* Asset Selection */}
          <div>
            <label className="text-sm font-medium text-surface-300 mb-1.5 block">Asset</label>
            <select
              value={selectedTokenAddress}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedTokenAddress(val);
                setAmount('');
                setErrors({});
                if (val !== 'native') {
                  const tkn = tokens.find(t => t.address === val);
                  if (tkn && tkn.chainId !== activeChainId) {
                    networkManager.switchChain(tkn.chainId);
                  }
                }
              }}
              disabled={!!tokenParam}
              className={`w-full bg-surface-900 border border-surface-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500/50 ${tokenParam ? 'opacity-80 cursor-not-allowed bg-surface-800' : ''}`}
            >
              {tokenParam ? (
                selectedTokenAddress === 'native' ? (
                  <option value="native">{activeChain?.nativeCurrency?.name || 'Ether'} ({activeChain?.nativeCurrency?.symbol || 'ETH'})</option>
                ) : (
                  tokens.filter(t => t.address === tokenParam).map(t => (
                    <option key={t.address} value={t.address}>{t.name} ({t.symbol})</option>
                  ))
                )
              ) : (
                <>
                  <option value="native">{activeChain?.nativeCurrency?.name || 'Ether'} ({activeChain?.nativeCurrency?.symbol || 'ETH'})</option>
                  {tokens.map(t => (
                    <option key={t.address} value={t.address}>{t.name} ({t.symbol})</option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-surface-300">Amount</label>
              <button
                onClick={handleMax}
                className="text-xs text-primary-400 hover:text-primary-300 font-medium"
              >
                MAX
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setAmount(val);
                    setErrors({});
                  }
                }}
                placeholder="0.0"
                className={`${errors.amount ? 'input-error' : 'input-base'} pr-16 font-mono`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-surface-400 font-medium">
                {symbol}
              </span>
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm text-danger-400">{errors.amount}</p>
            )}
            <p className="mt-1 text-xs text-surface-500">
              Balance: {parseFloat(currentBalance).toFixed(4)} {symbol}
            </p>
          </div>

          {/* Gas Speed */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              <HiOutlineBolt className="inline w-4 h-4 mr-1" />
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

          {/* Estimated cost */}
          {estimatedCost && (
            <div className="p-3 rounded-xl bg-surface-800/30 border border-surface-700/30">
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Estimated Gas Fee</span>
                <span className="text-surface-200 font-mono">
                  {isEstimating ? (
                    <Spinner size="sm" />
                  ) : (
                    `${parseFloat(estimatedCost.gasCostFormatted).toFixed(6)} ${symbol}`
                  )}
                </span>
              </div>
            </div>
          )}

          {/* TX Success */}
          {txHash && (
            <div className="p-3 rounded-xl bg-success-500/10 border border-success-500/20">
              <p className="text-sm text-success-400 font-medium">Transaction Submitted!</p>
              <a
                href={`${activeChain?.blockExplorer?.url}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-400 hover:text-primary-300 font-mono break-all"
              >
                {txHash}
              </a>
            </div>
          )}

          {/* Send button */}
          <Button
            fullWidth
            size="lg"
            onClick={handlePreview}
            disabled={!recipient || !amount}
            icon={HiOutlinePaperAirplane}
          >
            Preview Transaction
          </Button>
        </div>
      </motion.div>

      {/* Transaction Preview Modal */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Confirm Transaction">
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface-800/50 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-surface-400">Sending</span>
              <span className="text-sm font-semibold text-white">
                {amount} {symbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-surface-400">To</span>
              <span className="text-sm text-surface-200 font-mono">
                {recipient?.slice(0, 10)}...{recipient?.slice(-8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-surface-400">Network</span>
              <span className="text-sm text-surface-200">{activeChain?.name}</span>
            </div>
            <div className="divider" />
            <div className="flex justify-between">
              <span className="text-sm text-surface-400">Est. Gas Fee</span>
              <span className="text-sm text-surface-200 font-mono">
                {estimatedCost
                  ? `${parseFloat(estimatedCost.gasCostFormatted).toFixed(6)} ${symbol}`
                  : '...'}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setShowPreview(false)}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              loading={isSending}
              onClick={handleSend}
            >
              Confirm & Send
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
