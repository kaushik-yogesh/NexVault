import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiShield, FiAlertTriangle, FiActivity, FiLock } from 'react-icons/fi';

export default function Security() {
  const [config, setConfig] = useState({});
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [configRes, eventsRes, statsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/config', { headers }),
        axios.get('http://localhost:5000/api/admin/security/events', { headers }),
        axios.get('http://localhost:5000/api/admin/security/stats', { headers })
      ]);

      if (configRes.data.success) setConfig(configRes.data.data);
      if (eventsRes.data) setEvents(eventsRes.data);
      if (statsRes.data) setStats(statsRes.data);

    } catch (err) {
      toast.error('Failed to load security dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (key) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLimitChange = (key, val) => {
    setConfig(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = Object.keys(config)
        .filter(key => key.startsWith('SECURITY_') || key.startsWith('RATE_LIMIT_'))
        .map(key => ({
          key,
          value: config[key],
          type: 'SECURITY'
        }));

      const token = localStorage.getItem('adminToken');
      const res = await axios.put('http://localhost:5000/api/admin/config', { updates }, { 
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success('Security settings applied successfully');
      }
    } catch (err) {
      toast.error('Failed to save security settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="text-white">Loading Security Center...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FiShield className="text-blue-500" /> Security Center
          </h1>
          <p className="text-slate-400 mt-1">Configure bot protection, WAF, and view security events.</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {isSaving ? 'Applying...' : 'Apply Security Rules'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WAF & Bot Protection */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <FiLock className="text-slate-400" /> Perimeter Defense
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div>
                <div className="text-white font-medium">Cloudflare Turnstile</div>
                <div className="text-sm text-slate-500">Protect auth and sensitive routes from bots</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={config.SECURITY_TURNSTILE_ENABLED} onChange={() => handleToggle('SECURITY_TURNSTILE_ENABLED')} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div>
                <div className="text-white font-medium">Block Bot Traffic</div>
                <div className="text-sm text-slate-500">Reject requests with low CF-Bot-Score</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={config.SECURITY_BOT_BLOCK} onChange={() => handleToggle('SECURITY_BOT_BLOCK')} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div>
                <div className="text-white font-medium">Block VPNs & Proxies</div>
                <div className="text-sm text-slate-500">Reject high CF-Threat-Score IP addresses</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={config.SECURITY_VPN_BLOCK} onChange={() => handleToggle('SECURITY_VPN_BLOCK')} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Rate Limits */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <FiActivity className="text-slate-400" /> Rate Limits (Per IP / Minute)
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Login & Auth endpoints</label>
              <input 
                type="number" 
                value={config.RATE_LIMIT_LOGIN || 5} 
                onChange={(e) => handleLimitChange('RATE_LIMIT_LOGIN', parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Swap execution endpoints</label>
              <input 
                type="number" 
                value={config.RATE_LIMIT_SWAP || 30} 
                onChange={(e) => handleLimitChange('RATE_LIMIT_SWAP', parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">General API routes</label>
              <input 
                type="number" 
                value={config.RATE_LIMIT_API || 60} 
                onChange={(e) => handleLimitChange('RATE_LIMIT_API', parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-blue-500" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Security Event Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <FiAlertTriangle className="text-yellow-500" /> Recent Security Events
          </h2>
          <div className="text-sm text-slate-400">
            Total Logged: {stats?.total || 0}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/50 text-slate-400">
              <tr>
                <th className="px-6 py-3 font-medium">Timestamp</th>
                <th className="px-6 py-3 font-medium">Event Type</th>
                <th className="px-6 py-3 font-medium">Severity</th>
                <th className="px-6 py-3 font-medium">IP Address / Ray ID</th>
                <th className="px-6 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 bg-slate-900">
              {events.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    No security events detected.
                  </td>
                </tr>
              ) : (
                events.map(event => (
                  <tr key={event._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(event.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 text-white font-medium">{event.eventType}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full border ${
                        event.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        event.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                        event.severity === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                        'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      }`}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {event.ipAddress}<br/>
                      <span className="text-slate-500">{event.rayId}</span>
                    </td>
                    <td className="px-6 py-4">{event.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
