import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Config() {
  const [config, setConfig] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('SWAP');

  const tabs = [
    { id: 'SWAP', label: 'Swap Settings' },
    { id: 'TREASURY', label: 'Treasury & Fees' },
    { id: 'API', label: 'API Settings' },
    { id: 'FEATURE_TOGGLES', label: 'Feature Toggles' }
  ];

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await axios.get('http://localhost:5000/api/admin/config', { 
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success && res.data.data) {
          setConfig(res.data.data);
        }
      } catch (err) {
        toast.error('Failed to load configuration');
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = Object.keys(config).map(key => ({
        key,
        value: config[key],
        type: typeof config[key] === 'boolean' ? 'FEATURE_FLAG' : 'GENERAL'
      }));

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
        <p className="text-slate-400 mt-1">Manage global production settings.</p>
      </div>
      
      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id 
                ? 'bg-blue-600/20 text-blue-400' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm max-w-3xl">
        <div className="space-y-6">
          
          {activeTab === 'SWAP' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Default Slippage (%)</label>
                <input 
                  type="text" 
                  value={config.SLIPPAGE_DEFAULT || ''} 
                  onChange={(e) => handleChange('SLIPPAGE_DEFAULT', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500" 
                  placeholder="1.0"
                />
                <p className="text-xs text-slate-500 mt-1">Default slippage applied to user trades.</p>
              </div>
            </>
          )}

          {activeTab === 'TREASURY' && (
            <>
              <div className="flex items-center justify-between p-4 border border-slate-800 rounded-lg bg-slate-950 mb-4">
                <div>
                  <div className="text-white font-medium">Enable Platform Swap Fee</div>
                  <div className="text-xs text-slate-500">Take a fee on user trades through KyberSwap.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={config.SWAP_FEE_ENABLED === true || config.SWAP_FEE_ENABLED === 'true'}
                    onChange={(e) => handleChange('SWAP_FEE_ENABLED', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {config.SWAP_FEE_ENABLED && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-400 mb-1">Platform Swap Fee (Basis Points)</label>
                    <input 
                      type="number" 
                      value={config.SWAP_FEE_BPS !== undefined ? config.SWAP_FEE_BPS : ''} 
                      onChange={(e) => {
                        let val = parseInt(e.target.value);
                        if (isNaN(val)) val = '';
                        if (val > 500) val = 500;
                        handleChange('SWAP_FEE_BPS', val);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500" 
                      placeholder="30"
                      min="0"
                      max="500"
                    />
                    <p className="text-xs text-slate-500 mt-1">Fee in BPS (e.g., 30 = 0.3%). Maximum allowed is 500 (5%).</p>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-400 mb-1">Charge Mode</label>
                    <select
                      value={config.SWAP_CHARGE_FEE_BY || 'currency_out'}
                      onChange={(e) => handleChange('SWAP_CHARGE_FEE_BY', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500"
                    >
                      <option value="currency_out">Fee From Output (currency_out)</option>
                      <option value="currency_in">Fee From Input (currency_in)</option>
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Treasury Wallet Address</label>
                <input 
                  type="text" 
                  value={config.TREASURY_WALLET || ''} 
                  onChange={(e) => handleChange('TREASURY_WALLET', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-mono text-sm outline-none focus:border-blue-500" 
                />
                <p className="text-xs text-slate-500 mt-1">Wallet where swap fees are routed.</p>
              </div>
            </>
          )}

          {activeTab === 'API' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">CoinMarketCap API Key</label>
                <input 
                  type="password" 
                  value={config.CMC_API_KEY || ''} 
                  onChange={(e) => handleChange('CMC_API_KEY', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500 font-mono" 
                />
              </div>
            </>
          )}

          {activeTab === 'FEATURE_TOGGLES' && (
            <>
              <div className="flex items-center justify-between p-4 border border-slate-800 rounded-lg bg-slate-950">
                <div>
                  <div className="text-white font-medium">Enable Swap Feature</div>
                  <div className="text-xs text-slate-500">Allow users to swap tokens.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={config.ENABLE_SWAP !== false} // Default true
                    onChange={(e) => handleChange('ENABLE_SWAP', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </>
          )}

        </div>

        <div className="mt-8 pt-6 border-t border-slate-800">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
