import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStakingData } from '../stakingSlice';
import { FiTrendingUp, FiAward, FiShield } from 'react-icons/fi';
import Button from '../../../shared/components/ui/Button';

export default function StakingPage() {
  const dispatch = useDispatch();
  const { totalStaked, rewards, validators, isLoading } = useSelector((state) => state.staking);
  const activeChainId = useSelector((state) => state.network.activeChainId);
  
  const [selectedValidator, setSelectedValidator] = useState(null);
  const [stakeAmount, setStakeAmount] = useState('');

  useEffect(() => {
    dispatch(fetchStakingData(activeChainId));
  }, [dispatch, activeChainId]);

  if (isLoading) {
    return <div className="text-white text-center mt-20">Loading staking data...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <h1 className="text-3xl font-bold text-white mb-8">Staking & Rewards</h1>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-surface-800 border border-surface-700 rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-2 text-gray-400">
            <FiShield size={20} />
            <span className="font-medium">Total Staked</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalStaked} ETH</p>
        </div>
        
        <div className="bg-surface-800 border border-surface-700 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <FiAward size={120} />
          </div>
          <div className="flex items-center space-x-3 mb-2 text-primary-400">
            <FiAward size={20} />
            <span className="font-medium">Earned Rewards</span>
          </div>
          <p className="text-3xl font-bold text-primary-400">{rewards} ETH</p>
          <Button variant="primary" className="mt-4 px-6 text-sm py-2">Claim Rewards</Button>
        </div>
      </div>

      {/* Validators List */}
      <h2 className="text-xl font-bold text-white mb-4">Top Validators</h2>
      <div className="space-y-4">
        {validators.map((val) => (
          <div key={val.id} className="bg-surface-800 border border-surface-700 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between hover:border-primary-500/50 transition-colors">
            
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="w-12 h-12 rounded-full bg-surface-900 flex items-center justify-center border border-surface-700">
                <FiTrendingUp className="text-primary-400" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{val.name}</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <span className="bg-surface-900 px-2 py-0.5 rounded text-xs">{val.type}</span>
                  <span>TVL: {val.tvl}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:space-x-8">
              <div className="text-right">
                <p className="text-sm text-gray-400">Estimated APY</p>
                <p className="text-xl font-bold text-emerald-400">{val.apy}</p>
              </div>
              <Button 
                variant={selectedValidator === val.id ? "primary" : "secondary"}
                onClick={() => setSelectedValidator(val.id)}
              >
                Stake
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Stake Action Panel */}
      {selectedValidator && (
        <div className="mt-8 bg-surface-900 border border-primary-500/30 rounded-2xl p-6 shadow-2xl shadow-primary-500/5">
          <h3 className="text-lg font-bold text-white mb-4">
            Stake with {validators.find(v => v.id === selectedValidator)?.name}
          </h3>
          <div className="flex space-x-4">
            <input 
              type="number"
              placeholder="Amount to stake..."
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              className="flex-1 bg-surface-800 border border-surface-700 text-white rounded-xl px-4 outline-none focus:border-primary-500"
            />
            <Button variant="primary" className="px-8">Confirm Stake</Button>
          </div>
        </div>
      )}
    </div>
  );
}
