import { useEffect, useState } from 'react';
import { FiSearch, FiExternalLink } from 'react-icons/fi';
import api from '../services/api';
import { motion } from 'framer-motion';

export default function Transfers() {
  const [list, setList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchTransfers = async () => {
      setIsLoading(true);
      try {
        const query = new URLSearchParams({ 
          page: 1, 
          limit: 50, 
          search: debouncedSearch,
          type: 'SEND'
        }).toString();
        const response = await api.get(`/admin/transactions?${query}`);
        setList(response.data.data.transactions);
        setPagination(response.data.data.pagination);
      } catch (error) {
        console.error('Failed to fetch transfers:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransfers();
  }, [debouncedSearch]);

  const statusColors = {
    SUCCESS: 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]',
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]',
    FAILED: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
  };

  const formatHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 font-sans"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Transfer <span className="text-gradient">Activity</span></h1>
          <p className="text-slate-400 mt-1 text-lg">Monitor direct peer-to-peer and native asset transfers.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by TxHash or Address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-lg"
          />
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950/50 border-b border-slate-800 uppercase tracking-wider text-slate-500 text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">TxHash</th>
                <th className="px-6 py-4">Sender</th>
                <th className="px-6 py-4">Recipient</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">USD Value</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {isLoading && list.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                    Loading transfers...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                    No transfers found.
                  </td>
                </tr>
              ) : (
                list.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        {formatHash(tx.txHash)}
                        <FiExternalLink className="text-slate-500 cursor-pointer hover:text-white" onClick={() => window.open(`https://polygonscan.com/tx/${tx.txHash}`, '_blank')} />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {formatHash(tx.from)}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {formatHash(tx.to)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">
                      {tx.value} {tx.assetType}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-semibold">
                      ${parseFloat(tx.usdValue || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[tx.status] || statusColors.PENDING}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Dummy UI */}
        <div className="bg-slate-950/50 px-6 py-3 flex items-center justify-between border-t border-slate-800 text-sm">
          <div className="text-slate-400">
            Showing <span className="text-white font-medium">1</span> to <span className="text-white font-medium">{list.length}</span> of <span className="text-white font-medium">{pagination.total}</span> transfers
          </div>
          <div className="flex gap-2">
            <button disabled className="px-3 py-1 rounded bg-slate-800 text-slate-500 cursor-not-allowed">Previous</button>
            <button disabled className="px-3 py-1 rounded bg-slate-800 text-slate-500 cursor-not-allowed">Next</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
