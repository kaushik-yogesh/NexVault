/**
 * NexVault — AppLayout with Bottom Navigation
 */

import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import {
  HiOutlineHome,
  HiOutlineGlobeAlt,
  HiOutlineArrowsRightLeft,
  HiOutlineClock,
  HiOutlineCog6Tooth,
} from 'react-icons/hi2';
import Header from './Header.jsx';
import GlobalModals from '../../../features/permissions/GlobalModals.jsx';
import WalletConnectPasteModal from '../../../features/permissions/components/WalletConnectPasteModal.jsx';

const navItems = [
  { path: '/dashboard', icon: HiOutlineHome, label: 'Home' },
  { path: '/explore', icon: HiOutlineGlobeAlt, label: 'Explore' },
  { path: '/swap', icon: HiOutlineArrowsRightLeft, label: 'Swap' },
  { path: '/history', icon: HiOutlineClock, label: 'History' },
  { path: '/settings', icon: HiOutlineCog6Tooth, label: 'Settings' },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showWCModal, setShowWCModal] = useState(false);

  const isDashboard = location.pathname === '/dashboard';

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      {isDashboard && (
        <Header onOpenWCModal={() => setShowWCModal(true)} />
      )}

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar relative">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="min-h-full flex flex-col pb-4"
        >
          <Outlet />
        </motion.div>
      </main>

      <nav className="flex-shrink-0 border-t border-surface-800/50 bg-surface-950/80 backdrop-blur-xl safe-bottom">
        <div className="flex items-center justify-around px-2 py-1.5">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`
                  flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl
                  transition-all duration-200
                  ${isActive
                    ? 'text-primary-400'
                    : 'text-surface-500 hover:text-surface-300'
                  }
                `}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-400"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </div>
                <span className="text-2xs font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <GlobalModals />

      <WalletConnectPasteModal
        isOpen={showWCModal}
        onClose={() => setShowWCModal(false)}
      />
    </div>
  );
}
