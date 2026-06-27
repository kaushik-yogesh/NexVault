/**
 * NexVault — Receive Screen
 */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useSearchParams } from 'react-router-dom';
import {
  HiOutlineClipboard,
  HiOutlineShare,
  HiOutlineCheck,
  HiOutlineArrowTopRightOnSquare
} from 'react-icons/hi2';
import Button from '../../../shared/components/ui/Button.jsx';
import { selectActiveChain } from '../../network/networkSlice.js';
import { selectTokensByChain } from '../../tokens/tokensSlice.js';
import toast from 'react-hot-toast';

export default function ReceiveModal() {
  const { activeAddress } = useSelector((state) => state.wallet);
  const activeChain = useSelector(selectActiveChain);
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');
  const tokens = useSelector((state) => selectTokensByChain(state, activeChain?.chainId));

  const [copied, setCopied] = useState(false);

  let targetToken = null;
  if (tokenParam) {
    if (tokenParam === 'native') {
      targetToken = {
        symbol: activeChain?.nativeCurrency?.symbol || 'ETH',
        name: activeChain?.nativeCurrency?.name || 'Ethereum',
        logo: activeChain?.icon
      };
    } else {
      const found = tokens.find(t => t.address.toLowerCase() === tokenParam.toLowerCase());
      if (found) {
        targetToken = {
          symbol: found.symbol,
          name: found.name,
          logo: found.logoURI || found.logo
        };
      }
    }
  }

  const copyAddress = async () => {
    if (activeAddress) {
      await navigator.clipboard.writeText(activeAddress);
      setCopied(true);
      toast.success('Address copied successfully.');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareAddress = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `NexVault Wallet Address (${activeChain?.name})`,
          text: activeAddress,
        });
      } catch {
        // User cancelled share
      }
    } else {
      copyAddress();
    }
  };

  const openExplorer = () => {
    if (activeChain?.blockExplorer?.url && activeAddress) {
      window.open(`${activeChain.blockExplorer.url}/address/${activeAddress}`, '_blank');
    }
  };

  if (!activeAddress) {
    return (
      <div className="page-container flex flex-col h-full items-center justify-center">
        <p className="text-surface-400">Wallet is locked or not found.</p>
      </div>
    );
  }

  return (
    <div className="page-container flex flex-col h-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col flex-1 max-w-sm mx-auto w-full pt-4 pb-12"
      >
        <h2 className="text-xl font-bold text-white text-center mb-6">Receive Assets</h2>
        
        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="relative group p-4 bg-white rounded-3xl shadow-xl ring-1 ring-black/5 transform transition-transform duration-300">
            <QRCodeSVG
              value={activeAddress || ''}
              size={220}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
              includeMargin={false}
            />
            {/* Logo Overlay */}
            {targetToken && targetToken.logo && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center p-1.5 border-4 border-white">
                 <img src={targetToken.logo} alt="Token" className="w-full h-full object-contain rounded-full" />
              </div>
            )}
            {!targetToken && activeChain?.icon && (
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center p-1.5 border-4 border-white">
                  <div className="w-full h-full rounded-lg flex items-center justify-center" style={{ backgroundColor: activeChain.color }}>
                    <img src={activeChain.icon} alt="Chain" className="w-full h-full object-contain mix-blend-screen opacity-90 p-1" />
                  </div>
               </div>
            )}
          </div>
        </div>

        {/* Address and Actions */}
        <div className="space-y-4">
          <div className="text-center mb-4">
            <p className="text-surface-300 font-medium mb-1 flex items-center justify-center gap-2">
              Your {activeChain?.name} Address
              {activeChain?.icon && (
                <img src={activeChain.icon} alt="" className="w-4 h-4 rounded-full" />
              )}
            </p>
            <p className="text-sm font-mono text-white break-all leading-relaxed bg-surface-900 rounded-xl p-3 border border-surface-700/50">
              {activeAddress}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              fullWidth
              variant={copied ? "primary" : "secondary"}
              onClick={copyAddress}
              icon={copied ? HiOutlineCheck : HiOutlineClipboard}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button
              fullWidth
              variant="secondary"
              onClick={shareAddress}
              icon={HiOutlineShare}
            >
              Share
            </Button>
          </div>
          
          <Button
            fullWidth
            variant="secondary"
            onClick={openExplorer}
            icon={HiOutlineArrowTopRightOnSquare}
            disabled={!activeChain?.blockExplorer?.url}
          >
            View on Explorer
          </Button>
          
          {/* Production Warning */}
          <div className="flex items-start gap-2 p-3 mt-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
             <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0" />
             <p className="text-xs text-primary-200/80 leading-relaxed">
               {targetToken ? (
                 <>
                   Only send <strong className="text-primary-300 font-medium">{targetToken.symbol}</strong> on <strong className="text-primary-300 font-medium">{activeChain?.name}</strong> to this address. 
                   Sending assets from an unsupported network may result in permanent loss.
                 </>
               ) : (
                 <>
                   Only send <strong className="text-primary-300 font-medium">{activeChain?.name}</strong> network assets to this address. 
                   Sending assets from an unsupported network may result in permanent loss.
                 </>
               )}
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
