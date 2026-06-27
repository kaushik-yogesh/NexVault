import { useDispatch, useSelector } from 'react-redux';
import { FiLogOut, FiUser } from 'react-icons/fi';
import { logoutAdmin } from '../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { admin } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logoutAdmin());
    navigate('/login');
  };

  return (
    <header className="h-16 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center text-sm text-slate-400">
        <span className="font-semibold text-slate-200 uppercase tracking-wider">{admin?.role || 'ADMIN'}</span>
        <span className="mx-2">•</span>
        <span>Environment: Production</span>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-sm text-slate-300">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
            <FiUser className="w-4 h-4" />
          </div>
          <span>{admin?.email || 'admin@nexvault.com'}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center text-sm text-slate-400 hover:text-red-400 transition-colors px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800"
        >
          <FiLogOut className="w-4 h-4 mr-2" />
          Logout
        </button>
      </div>
    </header>
  );
}
