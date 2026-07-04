import { useEffect, useState } from 'react';
import { FiSearch, FiExternalLink, FiPieChart, FiTrendingUp, FiAlertCircle, FiBox } from 'react-icons/fi';
import api from '../services/api';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function Swaps() {
  const [list, setList] = useState([]);
  const [failures, setFailures] = useState([]);
  const [stats, setStats] = useState(null);
  const [treasury, setTreasury] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [activeTab, setActiveTab] = useState('history'); // history, failures, revenue

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch stats
        const statsRes = await api.get('/admin/swap-analytics/stats');
        setStats(statsRes.data.data);

        // Fetch treasury
        const treasuryRes = await api.get('/admin/swap-analytics/treasury');
        setTreasury(treasuryRes.data.data);

        // Fetch failures
        const failuresRes = await api.get('/admin/swap-analytics/failures');
        setFailures(failuresRes.data.data.failures);

        // Fetch history
        const query = new URLSearchParams({ 
          page: pagination.page, 
          limit: 20, 
          search: debouncedSearch
        }).toString();
        const historyRes = await api.get(`/admin/swap-analytics/history?${query}`);
        setList(historyRes.data.data.transactions);
        setPagination(historyRes.data.data.pagination);
      } catch (error) {
        console.error('Failed to fetch swap analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [debouncedSearch, pagination.page]);

  const statusColors = {
    SUCCESS: 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]',
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]',
    FAILED: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
    CANCELLED: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  };

  const formatHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };

  const pieData = stats ? [
    { name: 'Success', value: stats.successfulSwaps, color: '#22c55e' },
    { name: 'Failed', value: stats.failedSwaps, color: '#ef4444' },
    { name: 'Pending', value: stats.pendingSwaps, color: '#eab308' },
  ].filter(d => d.value > 0) : [];

  const revenueData = stats?.revenueByToken?.map(t => ({
    name: t._id || 'Native',
    fees: t.totalFee
  })) || [];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 font-sans"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Swap <span className="text-gradient">Analytics</span></h1>
          <p className="text-slate-400 mt-1 text-lg">Monitor decentralized exchange volumes and platform fee generation.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-400">Total Swaps</span>
            <FiBox className="text-blue-400 opacity-80" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.totalSwaps || 0}</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-400">Success Rate</span>
            <FiTrendingUp className="text-emerald-400 opacity-80" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.successRate || 0}%</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-400">Failed Attempts</span>
            <FiAlertCircle className="text-red-400 opacity-80" />
          </div>
          <div className="text-2xl font-bold text-white">{stats?.failedSwaps || 0}</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-400">Treasury Wallet</span>
          </div>
          <div className="text-sm font-mono font-medium text-slate-300 break-all">{treasury?.treasuryAddress || 'N/A'}</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/50 h-[300px] flex flex-col">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><FiPieChart className="text-primary-500"/> Swap Status Distribution</h3>
          <div className="flex-1 min-h-0">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">No data available</div>
            )}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800/50 h-[300px] flex flex-col">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><FiTrendingUp className="text-emerald-500"/> Revenue Collected (per Token)</h3>
          <div className="flex-1 min-h-0">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{fontSize: 12}} />
                  <YAxis stroke="#64748b" tick={{fontSize: 12}} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} cursor={{fill: '#1e293b'}} />
                  <Bar dataKey="fees" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">No revenue data</div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800/50 inline-flex">
        {['history', 'failures'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-primary-500 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* History Table */}
      {activeTab === 'history' && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/50">
          <div className="p-4 border-b border-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="text-white font-semibold">Transaction Ledger</h3>
            <div className="relative w-full sm:w-80">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by TxHash or Address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-950/50 uppercase tracking-wider text-slate-500 text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">TxHash / Date</th>
                  <th className="px-6 py-4">Wallet</th>
                  <th className="px-6 py-4">Trade</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Platform Fee</th>
                  <th className="px-6 py-4">Gas / Aggregator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {isLoading && list.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">Loading history...</td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">No swaps found.</td>
                  </tr>
                ) : (
                  list.map((tx) => (
                    <tr key={tx._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs text-primary-400 mb-1 flex items-center gap-1">
                          {formatHash(tx.txHash)}
                          {tx.txHash && <FiExternalLink className="cursor-pointer" onClick={() => window.open(`${tx.explorerUrl || `https://polygonscan.com/tx/${tx.txHash}`}`, '_blank')} />}
                        </div>
                        <div className="text-xs text-slate-500">{new Date(tx.timestamp).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {tx.walletAddress}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">
                           {tx.sellAmount} {tx.sellToken === 'native' ? 'NATIVE' : 'ERC20'} 
                           <span className="text-slate-500 font-normal mx-1">→</span> 
                           {tx.buyAmount || '?'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[tx.status] || statusColors.PENDING}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-emerald-400 font-semibold">
                        {tx.platformFeeAmount !== '0' ? tx.platformFeeAmount : 'None'}
                        {tx.platformFeePercentage > 0 && <span className="text-xs text-slate-500 ml-1">({tx.platformFeePercentage}%)</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-400">{tx.aggregator || 'Direct DEX'}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="bg-slate-950/50 px-6 py-3 flex items-center justify-between border-t border-slate-800 text-sm">
            <div className="text-slate-400">
              Showing page <span className="text-white font-medium">{pagination.page}</span> of <span className="text-white font-medium">{pagination.pages}</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setPagination(p => ({...p, page: p.page - 1}))}
                disabled={pagination.page <= 1}
                className="px-3 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
              >
                Previous
              </button>
              <button 
                onClick={() => setPagination(p => ({...p, page: p.page + 1}))}
                disabled={pagination.page >= pagination.pages}
                className="px-3 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Failures Table */}
      {activeTab === 'failures' && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/50">
          <div className="p-4 border-b border-slate-800/50">
            <h3 className="text-white font-semibold text-danger-400">Failure Diagnostics</h3>
            <p className="text-xs text-slate-400">Recent failed swap attempts to help diagnose UX or API issues.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-950/50 uppercase tracking-wider text-slate-500 text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Wallet</th>
                  <th className="px-6 py-4">Stage</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Detailed Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {isLoading && failures.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">Loading failures...</td>
                  </tr>
                ) : failures.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No failures found. Great!</td>
                  </tr>
                ) : (
                  failures.map((f, i) => (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(f.failureTimestamp || f.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {f.walletAddress}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded bg-slate-800 text-xs font-medium text-slate-300 border border-slate-700">
                          {f.failureStage || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-red-400">
                        {f.failureReason}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-normal min-w-[300px]">
                        {f.errorMessage}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </motion.div>
  );
}
