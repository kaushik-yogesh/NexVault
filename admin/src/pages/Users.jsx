import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, updateUserStatus } from '../store/slices/usersSlice';
import { FiSearch, FiMoreVertical } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function Users() {
  const dispatch = useDispatch();
  const { list, isLoading, pagination } = useSelector((state) => state.users);
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    dispatch(fetchUsers({ page: 1, limit: 20, search: debouncedSearch }));
  }, [dispatch, debouncedSearch]);

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await dispatch(updateUserStatus({ id: userId, status: newStatus })).unwrap();
      toast.success('User status updated');
    } catch (err) {
      toast.error(err || 'Failed to update status');
    }
  };

  const statusColors = {
    ACTIVE: 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]',
    FROZEN: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]',
    DISABLED: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
    SOFT_DELETED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
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
          <h1 className="text-3xl font-bold text-white tracking-tight">User <span className="text-gradient">Management</span></h1>
          <p className="text-slate-400 mt-1 text-lg">Manage platform users, statuses, and connected chains.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by address..."
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
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4">Last Login</th>
                <th className="px-6 py-4">Chains</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {isLoading && list.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    Loading users...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                list.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{user.address}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[user.status] || statusColors.ACTIVE}`}>
                        {user.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex -space-x-2">
                        {user.connectedChains?.length > 0 ? (
                          user.connectedChains.slice(0,3).map(chain => (
                            <div key={chain} className="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] uppercase font-bold" title={chain}>
                              {chain.substring(0,1)}
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <select 
                        value={user.status || 'ACTIVE'}
                        onChange={(e) => handleStatusChange(user._id, e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded text-xs text-white px-2 py-1 outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="FROZEN">Frozen</option>
                        <option value="DISABLED">Disabled</option>
                        <option value="SOFT_DELETED">Soft Delete</option>
                      </select>
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
            Showing <span className="text-white font-medium">1</span> to <span className="text-white font-medium">{list.length}</span> of <span className="text-white font-medium">{pagination.total}</span> users
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
