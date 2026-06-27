import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { ethers } from 'ethers';
import { HiOutlineShieldCheck, HiOutlineShieldExclamation } from 'react-icons/hi2';
import Button from '../../../shared/components/ui/Button.jsx';
import transactionController from '../../../core/network/TransactionController.js';
import toast from 'react-hot-toast';

export default function RevokeButton({ approval }) {
  const [isRevoking, setIsRevoking] = useState(false);

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      // 1. Build the exact payload for ERC20 `approve(address,uint256)`
      // approve(spender, 0)
      const iface = new ethers.Interface(['function approve(address spender, uint256 amount) returns (bool)']);
      const data = iface.encodeFunctionData('approve', [approval.spenderAddress, 0]);

      const txPayload = {
        to: approval.tokenAddress,
        data,
        value: '0x0',
      };

      // 2. Queue transaction for user approval in the wallet popup itself!
      // (This will open the TransactionPrompt via GlobalModals)
      // Since we are the wallet, we just call the transaction controller
      await transactionController.sendTransaction(txPayload);
      
      toast.success(`Revoked allowance for ${approval.spenderName}`);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to revoke allowance');
    } finally {
      setIsRevoking(false);
    }
  };

  if (approval.allowance === '0') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-800/50 rounded-lg text-xs font-medium text-surface-400">
        <HiOutlineShieldCheck className="w-4 h-4 text-success-500" />
        Safe
      </div>
    );
  }

  return (
    <Button
      variant="danger"
      size="sm"
      className="px-3 py-1.5 text-xs font-semibold rounded-lg"
      onClick={handleRevoke}
      loading={isRevoking}
    >
      <div className="flex items-center gap-1.5">
        <HiOutlineShieldExclamation className="w-4 h-4" />
        Revoke
      </div>
    </Button>
  );
}
