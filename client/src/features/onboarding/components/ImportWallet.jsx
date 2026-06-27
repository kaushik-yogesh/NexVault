/**
 * NexVault — Import Wallet Screen
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  HiOutlineKey,
  HiOutlineDocumentText,
  HiOutlineCommandLine,
} from 'react-icons/hi2';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import { importSeedPhrase, importPrivateKey, importKeystore, resetWallet } from '../../wallet/walletSlice.js';

const IMPORT_TABS = [
  { id: 'seed', label: 'Seed Phrase', icon: HiOutlineDocumentText },
  { id: 'privateKey', label: 'Private Key', icon: HiOutlineKey },
  { id: 'keystore', label: 'JSON File', icon: HiOutlineCommandLine },
];

export default function ImportWallet() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading, error, isInitialized } = useSelector((state) => state.wallet);

  const [activeTab, setActiveTab] = useState('seed');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [seedPhrase, setSeedPhrase] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [keystoreJson, setKeystoreJson] = useState('');
  const [keystorePassword, setKeystorePassword] = useState('');
  const [errors, setErrors] = useState({});

  const performResetIfNeeded = () => {
    if (isInitialized) {
      dispatch(resetWallet());
    }
  };

  const handleImportKeystore = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrors({ confirm: 'Passwords do not match' });
      return;
    }
    if (password.length < 8) {
      setErrors({ password: 'Minimum 8 characters' });
      return;
    }
    if (!keystorePassword) {
      setErrors({ keystorePassword: 'Password is required' });
      return;
    }

    performResetIfNeeded();
    const result = await dispatch(importKeystore({ password, keystoreJson, keystorePassword }));
    if (importKeystore.fulfilled.match(result)) {
      navigate('/dashboard');
    }
  };

  const handleImportSeed = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrors({ confirm: 'Passwords do not match' });
      return;
    }
    if (password.length < 8) {
      setErrors({ password: 'Minimum 8 characters' });
      return;
    }

    performResetIfNeeded();
    const result = await dispatch(importSeedPhrase({ password, mnemonic: seedPhrase }));
    if (importSeedPhrase.fulfilled.match(result)) {
      navigate('/dashboard');
    }
  };

  const handleImportKey = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrors({ confirm: 'Passwords do not match' });
      return;
    }
    if (password.length < 8) {
      setErrors({ password: 'Minimum 8 characters' });
      return;
    }

    performResetIfNeeded();
    const result = await dispatch(importPrivateKey({ password, privateKey }));
    if (importPrivateKey.fulfilled.match(result)) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex flex-col h-full px-6 py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1"
      >
        <h2 className="text-lg font-bold text-white mb-1">Import Wallet</h2>
        <p className="text-sm text-surface-400 mb-5">
          Restore your wallet using a recovery method
        </p>

        {isInitialized && (
          <div className="p-3 mb-5 rounded-xl bg-danger-500/10 border border-danger-500/20 text-xs text-danger-300 font-medium">
            ⚠️ Warning: A wallet already exists on this device. Importing a new wallet will permanently erase the current one.
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-surface-800/50 border border-surface-700/50 mb-5">
          {IMPORT_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setErrors({}); }}
              className={`
                flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                text-xs font-semibold transition-all duration-200
                ${activeTab === id
                  ? 'bg-primary-500/15 text-primary-300 border border-primary-500/30'
                  : 'text-surface-400 hover:text-surface-200'
                }
              `}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Seed Phrase Import */}
        {activeTab === 'seed' && (
          <form onSubmit={handleImportSeed} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">
                Recovery Phrase
              </label>
              <textarea
                value={seedPhrase}
                onChange={(e) => setSeedPhrase(e.target.value)}
                placeholder="Enter your 12 or 24 word recovery phrase..."
                rows={3}
                className="input-base resize-none font-mono text-sm"
                spellCheck="false"
                autoComplete="off"
              />
            </div>

            <Input
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
              error={errors.password}
              placeholder="Min 8 characters"
            />

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setErrors({}); }}
              error={errors.confirm}
              placeholder="Re-enter password"
            />

            {error && (
              <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-sm text-danger-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={isLoading}
              disabled={!seedPhrase.trim() || !password || !confirmPassword}
            >
              Import Wallet
            </Button>
          </form>
        )}

        {/* Private Key Import */}
        {activeTab === 'privateKey' && (
          <form onSubmit={handleImportKey} className="space-y-4">
            <Input
              label="Private Key"
              type="password"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="Enter your private key (0x...)"
              hint="Your private key is encrypted and stored locally"
            />

            <Input
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
              error={errors.password}
              placeholder="Min 8 characters"
            />

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setErrors({}); }}
              error={errors.confirm}
              placeholder="Re-enter password"
            />

            {error && (
              <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-sm text-danger-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={isLoading}
              disabled={!privateKey.trim() || !password || !confirmPassword}
            >
              Import Account
            </Button>
          </form>
        )}

        {/* JSON Keystore */}
        {activeTab === 'keystore' && (
          <form onSubmit={handleImportKeystore} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">
                JSON Keystore File Content
              </label>
              <textarea
                value={keystoreJson}
                onChange={(e) => setKeystoreJson(e.target.value)}
                placeholder='{"address":"...","crypto":{...}}'
                rows={4}
                className="input-base resize-none font-mono text-sm"
                spellCheck="false"
              />
            </div>

            <Input
              label="Keystore Password"
              type="password"
              value={keystorePassword}
              onChange={(e) => { setKeystorePassword(e.target.value); setErrors({}); }}
              error={errors.keystorePassword}
              placeholder="Password used to encrypt the keystore"
            />

            <Input
              label="New Vault Password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
              error={errors.password}
              placeholder="Min 8 characters"
            />

            <Input
              label="Confirm Vault Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setErrors({}); }}
              error={errors.confirm}
              placeholder="Re-enter password"
            />

            {error && (
              <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-sm text-danger-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={isLoading}
              disabled={!keystoreJson.trim() || !keystorePassword || !password || !confirmPassword}
            >
              Import Keystore
            </Button>
          </form>
        )}
      </motion.div>

      <button
        onClick={() => navigate('/welcome')}
        className="mt-4 text-sm text-surface-500 hover:text-surface-300 transition-colors text-center"
      >
        ← Back
      </button>
    </div>
  );
}
