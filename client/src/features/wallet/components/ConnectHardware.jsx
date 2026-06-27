import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FaUsb } from 'react-icons/fa';
import Button from '../../../shared/components/ui/Button.jsx';
import hardwareWalletManager, { HW_TYPES } from '../../../core/vault/HardwareWalletManager.js';
import toast from 'react-hot-toast';
export default function ConnectHardware() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const handleConnect = async (type) => {
    setSelectedDevice(type);
    setIsConnecting(true);
    
    try {
      const address = await hardwareWalletManager.connect(type);
      toast.success(`Connected to ${type.toUpperCase()}! Address: ${address.slice(0, 8)}...`);
      
      // In a real flow, we would add this address to the Vault/Keyring as a hardware account
      // For now, we simulate success and return to dashboard
      navigate('/');
    } catch (error) {
      console.error(error);
      toast.error(`Failed to connect to ${type}: ${error.message}`);
    } finally {
      setIsConnecting(false);
      setSelectedDevice(null);
    }
  };

  return (
    <div className="page-container flex flex-col items-center justify-center pt-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-surface-800 border border-surface-700 p-6 rounded-3xl shadow-xl text-center"
      >
        <div className="w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaUsb className="w-8 h-8 text-primary-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Connect Hardware Wallet</h2>
        <p className="text-surface-400 text-sm mb-8">
          Use your hardware wallet for maximum security. Your private keys never leave the device.
        </p>

        <div className="space-y-4">
          <Button
            variant="secondary"
            fullWidth
            size="lg"
            className="h-16 flex items-center justify-between px-6"
            onClick={() => handleConnect(HW_TYPES.LEDGER)}
            loading={isConnecting && selectedDevice === HW_TYPES.LEDGER}
            disabled={isConnecting}
          >
            <div className="flex items-center gap-3">
              <img src="/icons/ledger-logo.svg" alt="Ledger" className="w-6 h-6" onError={(e) => e.target.style.display = 'none'} />
              <span className="font-semibold text-white">Ledger</span>
            </div>
            <span className="text-xs text-primary-400 font-medium">Connect WebHID</span>
          </Button>

          <Button
            variant="secondary"
            fullWidth
            size="lg"
            className="h-16 flex items-center justify-between px-6"
            onClick={() => handleConnect(HW_TYPES.TREZOR)}
            loading={isConnecting && selectedDevice === HW_TYPES.TREZOR}
            disabled={isConnecting}
          >
            <div className="flex items-center gap-3">
              <img src="/icons/trezor-logo.svg" alt="Trezor" className="w-6 h-6" onError={(e) => e.target.style.display = 'none'} />
              <span className="font-semibold text-white">Trezor</span>
            </div>
            <span className="text-xs text-primary-400 font-medium">Connect WebUSB</span>
          </Button>
        </div>

        <button
          onClick={() => navigate('/')}
          className="mt-6 text-sm text-surface-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  );
}
