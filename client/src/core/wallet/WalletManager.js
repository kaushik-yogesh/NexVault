/**
 * NexVault — WalletManager
 * 
 * HD Wallet operations using ethers.js v6:
 * - Generate new wallets from mnemonic (12 or 24 words)
 * - Derive accounts using BIP-44 path (m/44'/60'/0'/0/index)
 * - Import wallets from seed phrase, private key, or JSON keystore
 * - Export public data (addresses) without exposing private keys
 * 
 * SECURITY: Private keys are derived in memory and passed to VaultManager
 * for encrypted storage. They are never logged, persisted unencrypted, 
 * or transmitted over any network.
 */

import { ethers } from 'ethers';

/** BIP-44 derivation path for Ethereum */
const ETH_DERIVATION_PATH = "m/44'/60'/0'/0";

class WalletManager {
  constructor() {
    this._signerCache = new Map();
  }
  /**
   * Generate a new random mnemonic phrase
   * 
   * @param {number} wordCount - 12 or 24 word mnemonic
   * @returns {string} BIP-39 mnemonic phrase
   */
  generateMnemonic(wordCount = 12) {
    const entropyBits = wordCount === 24 ? 256 : 128;
    const entropy = ethers.randomBytes(entropyBits / 8);
    return ethers.Mnemonic.fromEntropy(entropy).phrase;
  }

  /**
   * Validate a mnemonic phrase
   * 
   * @param {string} phrase - Mnemonic to validate
   * @returns {boolean} Whether the phrase is valid BIP-39
   */
  validateMnemonic(phrase) {
    try {
      const normalized = phrase.trim().toLowerCase().replace(/\s+/g, ' ');
      ethers.Mnemonic.fromPhrase(normalized);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a wallet from a mnemonic phrase.
   * Returns a keyring object with the mnemonic and first derived account.
   * 
   * @param {string} mnemonic - BIP-39 mnemonic phrase
   * @param {string} [name='Account 1'] - Name for the first account
   * @returns {Object} Keyring data { mnemonic, accounts: [...], hdPath }
   */
  createFromMnemonic(mnemonic, name = 'Account 1') {
    const normalized = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');

    if (!this.validateMnemonic(normalized)) {
      throw new Error('WALLET_INVALID_MNEMONIC: Invalid seed phrase.');
    }

    // Derive the first account
    const hdNode = ethers.HDNodeWallet.fromPhrase(normalized, undefined, ETH_DERIVATION_PATH);
    const firstAccount = hdNode.deriveChild(0);

    return {
      type: 'hd',
      mnemonic: normalized,
      hdPath: ETH_DERIVATION_PATH,
      nextIndex: 1,
      accounts: [
        {
          index: 0,
          name,
          address: firstAccount.address,
          privateKey: firstAccount.privateKey,
          derivationPath: `${ETH_DERIVATION_PATH}/0`,
          type: 'hd',
          avatar: this._generateAvatar(firstAccount.address),
          createdAt: Date.now(),
        },
      ],
    };
  }

  /**
   * Derive a new account from the existing HD wallet
   * 
   * @param {Object} keyring - Existing keyring data with mnemonic
   * @param {string} [name] - Name for the new account
   * @returns {Object} Updated keyring with new account added
   */
  deriveNextAccount(keyring, name) {
    if (keyring.type !== 'hd' || !keyring.mnemonic) {
      throw new Error('Cannot derive accounts from a non-HD keyring.');
    }

    const index = keyring.nextIndex;
    const accountName = name || `Account ${index + 1}`;

    const hdNode = ethers.HDNodeWallet.fromPhrase(
      keyring.mnemonic,
      undefined,
      ETH_DERIVATION_PATH
    );
    const derived = hdNode.deriveChild(index);

    const newAccount = {
      index,
      name: accountName,
      address: derived.address,
      privateKey: derived.privateKey,
      derivationPath: `${ETH_DERIVATION_PATH}/${index}`,
      type: 'hd',
      avatar: this._generateAvatar(derived.address),
      createdAt: Date.now(),
    };

    return {
      ...keyring,
      nextIndex: index + 1,
      accounts: [...keyring.accounts, newAccount],
    };
  }

  /**
   * Import a wallet from a private key
   * Creates a keyring with a single imported account (non-HD).
   * 
   * @param {string} privateKey - Hex private key (with or without 0x prefix)
   * @param {string} [name='Imported Account'] - Account name
   * @returns {Object} Account data for the imported key
   */
  importFromPrivateKey(privateKey, name = 'Imported Account') {
    try {
      const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
      const wallet = new ethers.Wallet(key);

      return {
        index: -1, // Not HD-derived
        name,
        address: wallet.address,
        privateKey: wallet.privateKey,
        derivationPath: null,
        type: 'imported',
        avatar: this._generateAvatar(wallet.address),
        createdAt: Date.now(),
      };
    } catch {
      throw new Error('WALLET_INVALID_PRIVATE_KEY: The private key is not valid.');
    }
  }

  /**
   * Import a wallet from an encrypted JSON keystore
   * 
   * @param {string} json - JSON keystore string
   * @param {string} keystorePassword - Password to decrypt the keystore
   * @param {string} [name='Keystore Account'] - Account name
   * @returns {Promise<Object>} Account data
   */
  async importFromKeystore(json, keystorePassword, name = 'Keystore Account') {
    try {
      const wallet = await ethers.Wallet.fromEncryptedJson(json, keystorePassword);

      return {
        index: -1,
        name,
        address: wallet.address,
        privateKey: wallet.privateKey,
        derivationPath: null,
        type: 'keystore',
        avatar: this._generateAvatar(wallet.address),
        createdAt: Date.now(),
      };
    } catch (error) {
      if (error.message.includes('incorrect password')) {
        throw new Error('WALLET_INVALID_KEYSTORE: Incorrect keystore password.');
      }
      throw new Error('WALLET_INVALID_KEYSTORE: Invalid JSON keystore file.');
    }
  }

  /**
   * Import an account from a mnemonic phrase (without replacing the entire HD wallet)
   * Derives a specific account index (default 0) and imports it as a standalone account.
   * 
   * @param {string} mnemonic - BIP-39 mnemonic phrase
   * @param {number} [accountIndex=0] - Which account to derive
   * @param {string} [name='Imported Seed Account'] - Account name
   * @returns {Object} Account data for the imported key
   */
  importFromMnemonicAccount(mnemonic, accountIndex = 0, name = 'Imported Seed Account') {
    const normalized = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');

    if (!this.validateMnemonic(normalized)) {
      throw new Error('WALLET_INVALID_MNEMONIC: Invalid seed phrase.');
    }

    const hdNode = ethers.HDNodeWallet.fromPhrase(normalized, undefined, ETH_DERIVATION_PATH);
    const derived = hdNode.deriveChild(accountIndex);

    return {
      index: -1, // Not HD-derived relative to current vault
      name,
      address: derived.address,
      privateKey: derived.privateKey,
      derivationPath: null,
      type: 'imported_seed',
      avatar: this._generateAvatar(derived.address),
      createdAt: Date.now(),
    };
  }

  /**
   * Export an account as an encrypted JSON keystore
   * 
   * @param {Object} keyring - Existing keyring data
   * @param {string} address - Account address to export
   * @param {string} password - Keystore encryption password
   * @returns {Promise<string>} JSON keystore string
   */
  async exportToKeystore(keyring, address, password) {
    const signer = this.getSigner(keyring, address);
    return await signer.encrypt(password);
  }

  /**
   * Add an imported account to an existing HD keyring
   * 
   * @param {Object} keyring - Existing keyring data
   * @param {Object} importedAccount - Account from importFromPrivateKey or importFromKeystore
   * @returns {Object} Updated keyring
   */
  addImportedAccount(keyring, importedAccount) {
    // Check for duplicate
    const exists = keyring.accounts.some(
      (a) => a.address.toLowerCase() === importedAccount.address.toLowerCase()
    );
    if (exists) {
      throw new Error('WALLET_DUPLICATE_ACCOUNT: This account already exists.');
    }

    return {
      ...keyring,
      accounts: [...keyring.accounts, importedAccount],
    };
  }

  /**
   * Remove an account from the keyring
   * Cannot remove the last account or the primary HD account at index 0.
   * 
   * @param {Object} keyring - Existing keyring data
   * @param {string} address - Address of account to remove
   * @returns {Object} Updated keyring
   */
  removeAccount(keyring, address) {
    const normalizedAddress = address.toLowerCase();
    const account = keyring.accounts.find(
      (a) => a.address.toLowerCase() === normalizedAddress
    );

    if (!account) {
      throw new Error('WALLET_ACCOUNT_NOT_FOUND');
    }

    // Can't remove the primary HD account
    if (account.type === 'hd' && account.index === 0) {
      throw new Error('Cannot remove the primary account. Reset wallet instead.');
    }

    if (keyring.accounts.length <= 1) {
      throw new Error('Cannot remove the last account.');
    }

    return {
      ...keyring,
      accounts: keyring.accounts.filter(
        (a) => a.address.toLowerCase() !== normalizedAddress
      ),
    };
  }

  /**
   * Rename an account
   * 
   * @param {Object} keyring - Existing keyring data
   * @param {string} address - Account address
   * @param {string} newName - New display name
   * @returns {Object} Updated keyring
   */
  renameAccount(keyring, address, newName) {
    const normalizedAddress = address.toLowerCase();
    return {
      ...keyring,
      accounts: keyring.accounts.map((account) =>
        account.address.toLowerCase() === normalizedAddress
          ? { ...account, name: newName.trim() }
          : account
      ),
    };
  }

  /**
   * Update account avatar
   * 
   * @param {Object} keyring - Existing keyring data
   * @param {string} address - Account address
   * @param {string} avatarData - Avatar identifier or data URL
   * @returns {Object} Updated keyring
   */
  updateAvatar(keyring, address, avatarData) {
    const normalizedAddress = address.toLowerCase();
    return {
      ...keyring,
      accounts: keyring.accounts.map((account) =>
        account.address.toLowerCase() === normalizedAddress
          ? { ...account, avatar: avatarData }
          : account
      ),
    };
  }

  /**
   * Get an ethers.js Wallet (Signer) for an account
   * Used for signing transactions and messages.
   * 
   * @param {Object} keyring - Keyring data
   * @param {string} address - Account address
   * @returns {ethers.Wallet} Ethers Wallet instance
   */
  getSigner(keyring, address) {
    const normalizedAddress = address.toLowerCase();
    
    if (this._signerCache.has(normalizedAddress)) {
      return this._signerCache.get(normalizedAddress);
    }

    const account = keyring.accounts.find(
      (a) => a.address.toLowerCase() === normalizedAddress
    );

    if (!account) {
      throw new Error('WALLET_ACCOUNT_NOT_FOUND');
    }

    const signer = new ethers.Wallet(account.privateKey);
    this._signerCache.set(normalizedAddress, signer);
    return signer;
  }

  /**
   * Clear the signer cache to encourage garbage collection of private keys
   */
  clearSignerCache() {
    this._signerCache.clear();
  }

  /**
   * Get public account data (safe to display, no private keys)
   * 
   * @param {Object} keyring - Keyring data
   * @returns {Object[]} Array of public account data
   */
  getPublicAccounts(keyring) {
    return keyring.accounts.map(({ privateKey, ...publicData }) => publicData);
  }

  /**
   * Generate a deterministic avatar color based on address
   * @param {string} address - Ethereum address
   * @returns {string} Avatar configuration
   * @private
   */
  _generateAvatar(address) {
    // Generate a hue based on the address for a consistent color
    const hash = parseInt(address.slice(2, 10), 16);
    const hue = hash % 360;
    return `hsl(${hue}, 65%, 55%)`;
  }
}

const walletManager = new WalletManager();
export default walletManager;
