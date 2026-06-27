import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Config() {
  const [config, setConfig] = useState({ GLOBAL_SWAP_FEE: 0.5, TREASURY_WALLET: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await axios.get('http://localhost:5000/api/admin/config', { 
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success && res.data.data) {
          setConfig((prev) => ({ ...prev, ...res.data.data }));
        }
      } catch (err) {
        toast.error('Failed to load configuration');
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = [
        { key: 'GLOBAL_SWAP_FEE', value: config.GLOBAL_SWAP_FEE.toString(), type: 'number', description: 'Global Swap Fee Percentage' },
        { key: 'TREASURY_WALLET', value: config.TREASURY_WALLET, type: 'string', description: 'Global Treasury Wallet Address' }
      ];
      const token = localStorage.getItem('adminToken');
      const res = await axios.put('http://localhost:5000/api/admin/config', { updates }, { 
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success('Configuration saved successfully');
      }
    } catch (err) {
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-white p-8">Loading configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Platform Configuration</h1>
        <p className="text-slate-400 mt-1">Manage fees, treasury wallets, and global settings.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-white mb-4">Fee Structure</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Platform Fee (%)</label>
              <input 
                type="number" 
                value={config.GLOBAL_SWAP_FEE} 
                onChange={(e) => setConfig({ ...config, GLOBAL_SWAP_FEE: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Treasury Wallet</label>
              <input 
                type="text" 
                value={config.TREASURY_WALLET} 
                onChange={(e) => setConfig({ ...config, TREASURY_WALLET: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-mono text-sm outline-none focus:border-blue-500" 
              />
            </div>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
