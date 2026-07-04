/**
 * NexVault — Import Account Page
 * Allows adding external accounts to an existing wallet via Private Key or JSON Keystore.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { HiOutlineKey, HiOutlineCommandLine } from 'react-icons/hi2';
import Input from '../../../shared/components/ui/Input.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import { importPrivateKey, importKeystore, importSeedPhraseAccount } from '../walletSlice.js';
import { HiOutlineDocumentText } from 'react-icons/hi2';

const TABS = [
  { id: 'seed', label: 'Seed Phrase', icon: HiOutlineDocumentText },
  { id: 'privateKey', label: 'Private Key', icon: HiOutlineKey },
  { id: 'keystore', label: 'JSON Keystore', icon: HiOutlineCommandLine },
];

export default function ImportAccountPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.wallet);

  const [activeTab, setActiveTab] = useState('seed');
  const [password, setPassword] = useState('');
  const [seedPhrase, setSeedPhrase] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [keystoreJson, setKeystoreJson] = useState('');
  const [keystorePassword, setKeystorePassword] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountIndex, setAccountIndex] = useState(0);
  const [errors, setErrors] = useState({});

  const handleImportKey = async (e) => {
    e.preventDefault();
    if (!password) {
      setErrors({ password: 'Password is required to decrypt vault' });
      return;
    }

    const name = accountName.trim() || `Imported Account`;

    const result = await dispatch(importPrivateKey({ password, privateKey, name }));
    if (importPrivateKey.fulfilled.match(result)) {
      navigate('/dashboard');
    } else {
      setErrors({ form: result.payload || 'Failed to import account' });
    }
  };

  const handleImportKeystore = async (e) => {
    e.preventDefault();
    if (!password) {
      setErrors({ password: 'Password is required to decrypt vault' });
      return;
    }
    if (!keystorePassword) {
      setErrors({ keystorePassword: 'Password is required to decrypt keystore' });
      return;
    }

    const name = accountName.trim() || `Keystore Account`;

    const result = await dispatch(importKeystore({ password, keystoreJson, keystorePassword, name }));
    if (importKeystore.fulfilled.match(result)) {
      navigate('/dashboard');
    } else {
      setErrors({ form: result.payload || 'Failed to import keystore' });
    }
  };

  const handleImportSeed = async (e) => {
    e.preventDefault();
    if (!password) {
      setErrors({ password: 'Password is required to decrypt vault' });
      return;
    }

    const name = accountName.trim() || `Imported Seed Account`;

    const result = await dispatch(importSeedPhraseAccount({ password, mnemonic: seedPhrase, accountIndex: Number(accountIndex), name }));
    if (importSeedPhraseAccount.fulfilled.match(result)) {
      navigate('/dashboard');
    } else {
      setErrors({ form: result.payload || 'Failed to import seed phrase' });
    }
  };


  return (
    <div className="flex flex-col h-full px-4 py-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1"
      >
        <h2 className="text-lg font-bold text-white mb-1">Import Account</h2>
        <p className="text-sm text-surface-400 mb-5">
          Import an external account into your wallet.
        </p>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-surface-800/50 border border-surface-700/50 mb-5">
          {TABS.map(({ id, label, icon: Icon }) => (
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

        {activeTab === 'seed' && (
          <form onSubmit={handleImportSeed} className="space-y-4">
            <Input
              label="Account Name (Optional)"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Trading Wallet"
            />
            
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
              label="Account Index"
              type="number"
              value={accountIndex}
              onChange={(e) => setAccountIndex(e.target.value)}
              hint="Which account to derive from the seed phrase (default: 0)"
            />

            <Input
              label="Vault Password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
              error={errors.password}
              placeholder="Enter your wallet password to unlock"
            />

            {errors.form && (
              <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-sm text-danger-400">
                {errors.form}
              </div>
            )}
            {error && !errors.form && (
              <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-sm text-danger-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={isLoading}
              disabled={!seedPhrase.trim() || !password}
            >
              Import Account
            </Button>
          </form>
        )}

        {activeTab === 'privateKey' && (
          <form onSubmit={handleImportKey} className="space-y-4">
            <Input
              label="Account Name (Optional)"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Airdrop Wallet"
            />
            
            <Input
              label="Private Key"
              type="password"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="Enter your private key (0x...)"
              hint="Keys are encrypted locally and never sent to our servers."
            />

            <Input
              label="Vault Password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
              error={errors.password}
              placeholder="Enter your wallet password to unlock"
            />

            {errors.form && (
              <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-sm text-danger-400">
                {errors.form}
              </div>
            )}
            {error && !errors.form && (
              <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-sm text-danger-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={isLoading}
              disabled={!privateKey.trim() || !password}
            >
              Import Account
            </Button>
          </form>
        )}

        {activeTab === 'keystore' && (
          <form onSubmit={handleImportKeystore} className="space-y-4">
            <Input
              label="Account Name (Optional)"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Cold Storage Wallet"
            />
            
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
              label="Vault Password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
              error={errors.password}
              placeholder="Enter your wallet password to unlock"
            />

            {errors.form && (
              <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-sm text-danger-400">
                {errors.form}
              </div>
            )}
            {error && !errors.form && (
              <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-sm text-danger-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={isLoading}
              disabled={!keystoreJson.trim() || !keystorePassword || !password}
            >
              Import Account
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
