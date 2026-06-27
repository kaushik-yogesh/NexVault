import { NavLink } from 'react-router-dom';
import { 
  FiHome, 
  FiUsers, 
  FiRepeat, 
  FiSettings, 
  FiShield, 
  FiDatabase 
} from 'react-icons/fi';
import { motion } from 'framer-motion';

const menuItems = [
  { name: 'Dashboard', path: '/', icon: FiHome },
  { name: 'Users', path: '/users', icon: FiUsers },
  { name: 'Swaps', path: '/swaps', icon: FiRepeat },
  { name: 'Configuration', path: '/config', icon: FiSettings },
  { name: 'Security Center', path: '/security', icon: FiShield },
];

export default function Sidebar() {
  return (
    <motion.div 
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="w-64 glass-panel border-r-0 border-y-0 flex flex-col z-10"
    >
      <div className="h-20 flex items-center px-8 border-b border-slate-800/50">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 mr-3">
          <FiDatabase className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">NexVault</span>
      </div>
      <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm font-medium transition-all duration-300 rounded-xl ${
                isActive
                  ? 'bg-blue-500/15 text-blue-400 shadow-inner border border-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`
            }
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="p-6 border-t border-slate-800/50">
        <div className="glass-card rounded-xl p-4 text-xs text-slate-400 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <p className="font-semibold text-slate-300 mb-3 relative z-10 uppercase tracking-wider">System Status</p>
          <div className="flex items-center justify-between mt-2 relative z-10">
            <span>Core API</span>
            <span className="flex items-center text-green-400 font-medium">
              <span className="relative flex w-2 h-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full w-2 h-2 bg-green-500"></span>
              </span>
              Online
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 relative z-10">
            <span>Database</span>
            <span className="flex items-center text-green-400 font-medium">
              <span className="relative flex w-2 h-2 mr-2">
                <span className="relative inline-flex rounded-full w-2 h-2 bg-green-500"></span>
              </span>
              Synced
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
