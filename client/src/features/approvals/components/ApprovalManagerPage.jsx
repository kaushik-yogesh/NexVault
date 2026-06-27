import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { HiOutlineShieldCheck, HiOutlineExclamationTriangle, HiArrowPath } from 'react-icons/hi2';
import { ethers } from 'ethers';
import { loadApprovals } from '../approvalsSlice.js';
import RevokeButton from './RevokeButton.jsx';
import Spinner from '../../../shared/components/ui/Spinner.jsx';

export default function ApprovalManagerPage() {
  const dispatch = useDispatch();
  const { activeAddress } = useSelector((state) => state.wallet);
  const { items: approvals, isLoading, lastFetchedChainId } = useSelector((state) => state.approvals);

  useEffect(() => {
    if (activeAddress) {
      dispatch(loadApprovals(activeAddress));
    }
  }, [dispatch, activeAddress]);

  return (
    <div className="flex flex-col h-full bg-surface-950">
      <div className="px-4 py-5 shrink-0 flex items-center justify-between border-b border-surface-800">
        <div>
          <h2 className="text-lg font-bold text-white">Token Approvals</h2>
          <p className="text-xs text-surface-400 mt-0.5">Manage and revoke allowances</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-6 custom-scrollbar">
        <div className="mb-6 p-4 rounded-xl bg-primary-500/10 border border-primary-500/20 flex gap-3">
          <HiOutlineShieldCheck className="w-6 h-6 text-primary-400 shrink-0" />
          <p className="text-xs text-primary-200 leading-relaxed">
            Manage smart contract allowances. Revoke access for contracts you no longer use to protect your funds from potential exploits.
          </p>
        </div>

        {isLoading && approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" />
            <p className="mt-4 text-sm text-surface-400">Scanning blockchain for approvals...</p>
          </div>
        ) : approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mb-4">
              <HiOutlineShieldCheck className="w-8 h-8 text-surface-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">You're Safe!</h3>
            <p className="text-sm text-surface-400 max-w-[250px]">
              We didn't find any active token allowances for your address on this network.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {approvals.map((approval) => (
              <motion.div
                key={approval.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border flex flex-col gap-3 transition-colors ${
                  approval.riskLevel === 'HIGH' 
                    ? 'bg-danger-500/5 border-danger-500/20' 
                    : 'bg-surface-900 border-surface-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={approval.tokenLogo}
                      alt={approval.tokenSymbol}
                      className="w-10 h-10 rounded-full bg-surface-800 border border-surface-700"
                      onError={(e) => { e.target.src = '/icons/fallback-token.png'; }}
                    />
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {approval.tokenSymbol}
                        {approval.isInfinite && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-danger-500/20 text-danger-400 border border-danger-500/20">
                            INFINITE
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-surface-400 font-medium">
                        {approval.isInfinite ? 'Unlimited Allowance' : `${ethers.formatUnits(approval.allowance, approval.tokenDecimals)} ${approval.tokenSymbol}`}
                      </p>
                    </div>
                  </div>
                  
                  <RevokeButton approval={approval} />
                </div>

                <div className="pt-3 border-t border-surface-800 flex items-start gap-2">
                  {approval.riskLevel === 'HIGH' ? (
                    <HiOutlineExclamationTriangle className="w-4 h-4 text-danger-400 shrink-0 mt-0.5" />
                  ) : (
                    <HiArrowPath className="w-4 h-4 text-surface-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-xs font-medium text-surface-300">
                      Spender: <span className="text-white">{approval.spenderName}</span>
                    </p>
                    <p className="text-[10px] text-surface-500 font-mono mt-0.5 break-all">
                      {approval.spenderAddress}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
