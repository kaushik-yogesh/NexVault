/**
 * NexVault — Settings Page
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
  HiOutlineGlobeAlt,
  HiOutlineBell,
  HiOutlineTrash,
  HiOutlineDocumentDuplicate,
  HiOutlineChevronRight,
  HiOutlineClock,
  HiOutlineUserGroup,
} from 'react-icons/hi2';
import {
  setTheme,
  setAutoLockMinutes,
  toggleShowBalances,
  toggleShowScamWarnings,
} from '../settingsSlice.js';
import { lockWallet, resetWallet } from '../../wallet/walletSlice.js';
import { switchNetwork, selectActiveChain } from '../../network/networkSlice.js';

import ExportKeystoreModal from './ExportKeystoreModal.jsx';

export default function SettingsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);
  const [showKeystoreModal, setShowKeystoreModal] = useState(false);
  const settings = useSelector((state) => state.settings);

  const SettingRow = ({ icon: Icon, label, description, children, onClick, danger }) => (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
        transition-all duration-200
        ${danger
          ? 'hover:bg-danger-500/10'
          : 'hover:bg-surface-800/50'
        }
      `}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
        danger ? 'bg-danger-500/10' : 'bg-surface-800/50'
      }`}>
        <Icon className={`w-5 h-5 ${danger ? 'text-danger-400' : 'text-surface-300'}`} />
      </div>
      <div className="flex-1 text-left">
        <p className={`text-sm font-medium ${danger ? 'text-danger-400' : 'text-surface-200'}`}>
          {label}
        </p>
        {description && (
          <p className="text-xs text-surface-500 mt-0.5">{description}</p>
        )}
      </div>
      {children || (
        <HiOutlineChevronRight className="w-4 h-4 text-surface-500" />
      )}
    </button>
  );

  const Toggle = ({ checked, onChange }) => (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`
        relative w-10 h-5.5 rounded-full transition-all duration-200
        ${checked ? 'bg-primary-500' : 'bg-surface-600'}
      `}
    >
      <div className={`
        absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm
        transition-all duration-200
        ${checked ? 'left-5' : 'left-0.5'}
      `} />
    </button>
  );

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-lg font-bold text-white mb-5">Settings</h2>

        {/* Appearance */}
        <div className="mb-5">
          <h3 className="section-header">Appearance</h3>
          <div className="glass-card overflow-hidden">
            <SettingRow
              icon={settings.theme === 'dark' ? HiOutlineMoon : HiOutlineSun}
              label="Theme"
              description={settings.theme === 'dark' ? 'Dark mode' : 'Light mode'}
              onClick={() => dispatch(setTheme(settings.theme === 'dark' ? 'light' : 'dark'))}
            >
              <span className="text-xs text-surface-400 capitalize">{settings.theme}</span>
            </SettingRow>
          </div>
        </div>

        {/* Security */}
        <div className="mb-5">
          <h3 className="section-header">Security</h3>
          <div className="glass-card overflow-hidden divide-y divide-surface-700/30">
            <SettingRow
              icon={HiOutlineClock}
              label="Auto-Lock Timer"
              description={`Lock after ${settings.autoLockMinutes} minutes of inactivity`}
              onClick={() => {
                const next = { 1: 5, 5: 15, 15: 30, 30: 0, 0: 1 };
                dispatch(setAutoLockMinutes(next[settings.autoLockMinutes] || 5));
              }}
            >
              <span className="text-xs text-surface-400">
                {settings.autoLockMinutes === 0 ? 'Never' : `${settings.autoLockMinutes}m`}
              </span>
            </SettingRow>

            <SettingRow
              icon={HiOutlineShieldCheck}
              label="Scam Warnings"
              description="Show warnings for suspicious transactions"
              onClick={() => dispatch(toggleShowScamWarnings())}
            >
              <div className={`w-9 h-5 rounded-full transition-colors ${
                settings.showScamWarnings ? 'bg-primary-500' : 'bg-surface-600'
              } relative`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${
                  settings.showScamWarnings ? 'left-4.5' : 'left-0.5'
                }`} />
              </div>
            </SettingRow>

            <SettingRow
              icon={HiOutlineShieldCheck}
              label="Token Approvals (Revoke)"
              description="Manage and revoke smart contract allowances"
              onClick={() => navigate('/approvals')}
            />

            <SettingRow
              icon={HiOutlineLockClosed}
              label="Lock Wallet"
              description="Lock wallet now"
              onClick={() => dispatch(lockWallet())}
            />
          </div>
        </div>

        {/* Wallet */}
        <div className="mb-5">
          <h3 className="section-header">Wallet</h3>
          <div className="glass-card overflow-hidden divide-y divide-surface-700/30">
            <SettingRow
              icon={HiOutlineDocumentDuplicate}
              label="Show Recovery Phrase"
              description="View your wallet backup phrase"
              onClick={() => navigate('/create/seed')}
            />

            <SettingRow
              icon={HiOutlineGlobeAlt}
              label="Connected Sites"
              description="Manage DApp connections"
              onClick={() => navigate('/connected-sites')}
            />

            <SettingRow
              icon={HiOutlineUserGroup}
              label="Address Book"
              description="Manage saved contacts"
              onClick={() => navigate('/contacts')}
            />

            <SettingRow
              icon={HiOutlineDocumentDuplicate}
              label="Export Keystore"
              description="Download your private key as an encrypted JSON file"
              onClick={() => setShowKeystoreModal(true)}
            />

            <SettingRow
              icon={HiOutlineBell}
              label="Notifications"
              description="Configure alerts and updates"
              onClick={() => {}}
            />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mb-5">
          <h3 className="section-header text-danger-400">Danger Zone</h3>
          <div className="glass-card overflow-hidden border-danger-500/20">
            <SettingRow
              icon={HiOutlineTrash}
              label="Reset Wallet"
              description="Delete all data and start fresh"
              onClick={() => {
                if (window.confirm('This will permanently delete all wallet data. Are you sure?')) {
                  dispatch(resetWallet());
                  navigate('/welcome');
                }
              }}
              danger
            />
          </div>
        </div>

        {/* App info */}
        <div className="text-center py-4">
          <p className="text-2xs text-surface-600">NexVault v1.0.0</p>
          <p className="text-2xs text-surface-600 mt-0.5">Non-custodial • Open source</p>
        </div>
      </motion.div>

      <ExportKeystoreModal
        isOpen={showKeystoreModal}
        onClose={() => setShowKeystoreModal(false)}
      />
    </div>
  );
}
