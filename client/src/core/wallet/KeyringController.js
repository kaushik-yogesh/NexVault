/**
 * NexVault — KeyringController
 * 
 * Orchestrates the vault and wallet managers into a cohesive lifecycle:
 * - Create new wallet → generate mnemonic → encrypt in vault
 * - Import wallet → validate → encrypt in vault
 * - Unlock → decrypt vault → expose public accounts
 * - Lock → wipe memory
 * - Add/remove accounts → update vault
 * 
 * This is the primary interface that the UI layer interacts with.
 * It ensures all wallet operations go through proper encryption/decryption.
 */

import vaultManager, { VAULT_STATE } from '../vault/VaultManager.js';
import walletManager from './WalletManager.js';

class KeyringController {
  constructor() {
    /** @type {Object|null} Current keyring (available when unlocked) */
    this._keyring = null;

    /** @type {string|null} Currently active account address */
    this._activeAddress = null;

    /** @type {Set<Function>} State change listeners */
    this._listeners = new Set();

    // Forward vault state changes
    vaultManager.subscribe((state) => {
      if (state === VAULT_STATE.LOCKED || state === VAULT_STATE.UNINITIALIZED) {
        this._keyring = null;
        // Don't clear active address — it's stored in settings
      }
      this._notifyListeners();
    });
  }

  // ---- State Getters ----

  /** Whether the wallet system is fully initialized (vault exists) */
  get isInitialized() {
    return vaultManager.isInitialized;
  }

  /** Whether the keyring is unlocked and ready */
  get isUnlocked() {
    return vaultManager.isUnlocked && this._keyring !== null;
  }

  /** Current vault state */
  get state() {
    return vaultManager.state;
  }

  /** Get public accounts (no private keys exposed) */
  get accounts() {
    if (!this._keyring) return [];
    return walletManager.getPublicAccounts(this._keyring);
  }

  /** Get the currently active account address */
  get activeAddress() {
    return this._activeAddress;
  }

  /** Get the currently active account object (public data only) */
  get activeAccount() {
    if (!this._activeAddress || !this._keyring) return null;
    return this.accounts.find(
      (a) => a.address.toLowerCase() === this._activeAddress.toLowerCase()
    );
  }

  // ---- Lifecycle Methods ----

  /**
   * Boot the controller — check vault state
   * @returns {Promise<string>} Current state
   */
  async boot() {
    const state = await vaultManager.initialize();
    this._notifyListeners();
    return state;
  }

  /**
   * Create a new wallet with a fresh mnemonic
   * 
   * @param {string} password - User's password for vault encryption
   * @param {number} [wordCount=12] - 12 or 24 word mnemonic
   * @returns {Promise<{mnemonic: string, accounts: Object[]}>}
   */
  async createNewWallet(password, wordCount = 12) {
    // Generate mnemonic
    const mnemonic = walletManager.generateMnemonic(wordCount);

    // Create keyring from mnemonic
    const keyring = walletManager.createFromMnemonic(mnemonic);

    // Encrypt and store in vault
    await vaultManager.createVault(password, keyring);

    this._keyring = keyring;
    this._activeAddress = keyring.accounts[0].address;

    this._notifyListeners();

    return {
      mnemonic,
      accounts: walletManager.getPublicAccounts(keyring),
    };
  }

  /**
   * Import a wallet from a seed phrase
   * 
   * @param {string} password - Vault password
   * @param {string} mnemonic - BIP-39 seed phrase
   * @returns {Promise<{accounts: Object[]}>}
   */
  async importFromSeedPhrase(password, mnemonic) {
    const keyring = walletManager.createFromMnemonic(mnemonic, 'Imported Wallet');

    await vaultManager.createVault(password, keyring);

    this._keyring = keyring;
    this._activeAddress = keyring.accounts[0].address;
    this._notifyListeners();

    return { accounts: walletManager.getPublicAccounts(keyring) };
  }

  /**
   * Import a wallet from a private key
   * If a vault already exists, adds the account. Otherwise creates a new vault.
   * 
   * @param {string} password - Vault password
   * @param {string} privateKey - Hex private key
   * @param {string} [name] - Account name
   * @returns {Promise<Object>} Imported account (public data)
   */
  async importFromPrivateKey(password, privateKey, name) {
    const importedAccount = walletManager.importFromPrivateKey(privateKey, name);

    if (vaultManager.state === VAULT_STATE.UNINITIALIZED) {
      // Create a new vault with just this imported account
      const keyring = {
        type: 'imported',
        mnemonic: null,
        hdPath: null,
        nextIndex: 0,
        accounts: [importedAccount],
      };
      await vaultManager.createVault(password, keyring);
      this._keyring = keyring;
    } else {
      // Ensure vault is unlocked
      if (!this.isUnlocked) {
        await this.unlock(password);
      }
      // Add to existing keyring
      this._keyring = walletManager.addImportedAccount(this._keyring, importedAccount);
      await vaultManager.updateVault(this._keyring);
    }

    this._activeAddress = importedAccount.address;
    this._notifyListeners();

    const { privateKey: _, ...publicData } = importedAccount;
    return publicData;
  }

  /**
   * Import from JSON keystore file
   * 
   * @param {string} password - Vault password
   * @param {string} keystoreJson - JSON keystore string
   * @param {string} keystorePassword - Keystore decryption password
   * @param {string} [name] - Account name
   * @returns {Promise<Object>} Imported account (public data)
   */
  async importFromKeystore(password, keystoreJson, keystorePassword, name) {
    const importedAccount = await walletManager.importFromKeystore(
      keystoreJson,
      keystorePassword,
      name
    );

    if (vaultManager.state === VAULT_STATE.UNINITIALIZED) {
      const keyring = {
        type: 'imported',
        mnemonic: null,
        hdPath: null,
        nextIndex: 0,
        accounts: [importedAccount],
      };
      await vaultManager.createVault(password, keyring);
      this._keyring = keyring;
    } else {
      if (!this.isUnlocked) {
        await this.unlock(password);
      }
      this._keyring = walletManager.addImportedAccount(this._keyring, importedAccount);
      await vaultManager.updateVault(this._keyring);
    }

    this._activeAddress = importedAccount.address;
    this._notifyListeners();

    const { privateKey: _, ...publicData } = importedAccount;
    return publicData;
  }

  /**
   * Unlock the wallet
   * @param {string} password - Vault password
   * @returns {Promise<Object[]>} Public accounts
   */
  async unlock(password) {
    const keyring = await vaultManager.unlock(password);
    this._keyring = keyring;

    // Restore active address or default to first account
    if (
      !this._activeAddress ||
      !keyring.accounts.find(
        (a) => a.address.toLowerCase() === this._activeAddress.toLowerCase()
      )
    ) {
      this._activeAddress = keyring.accounts[0]?.address || null;
    }

    this._notifyListeners();
    return walletManager.getPublicAccounts(keyring);
  }

  /**
   * Lock the wallet
   */
  lock() {
    vaultManager.lock();
    walletManager.clearSignerCache();
    this._keyring = null;
    this._notifyListeners();
  }

  // ---- Account Operations ----

  /**
   * Add a new derived account (HD wallet only)
   * @param {string} [name] - Account name
   * @returns {Promise<Object>} New account (public data)
   */
  async addAccount(name) {
    this._ensureUnlocked();

    if (this._keyring.type !== 'hd') {
      throw new Error('Cannot derive new accounts from a non-HD wallet.');
    }

    this._keyring = walletManager.deriveNextAccount(this._keyring, name);
    await vaultManager.updateVault(this._keyring);

    const newAccount = this._keyring.accounts[this._keyring.accounts.length - 1];
    this._activeAddress = newAccount.address;
    this._notifyListeners();

    const { privateKey: _, ...publicData } = newAccount;
    return publicData;
  }

  /**
   * Remove an account
   * @param {string} address - Account address to remove
   * @returns {Promise<void>}
   */
  async removeAccount(address) {
    this._ensureUnlocked();

    this._keyring = walletManager.removeAccount(this._keyring, address);
    await vaultManager.updateVault(this._keyring);

    // Switch active account if removed
    if (this._activeAddress?.toLowerCase() === address.toLowerCase()) {
      this._activeAddress = this._keyring.accounts[0]?.address || null;
    }

    this._notifyListeners();
  }

  /**
   * Rename an account
   * @param {string} address - Account address
   * @param {string} newName - New display name
   * @returns {Promise<void>}
   */
  async renameAccount(address, newName) {
    this._ensureUnlocked();
    this._keyring = walletManager.renameAccount(this._keyring, address, newName);
    await vaultManager.updateVault(this._keyring);
    this._notifyListeners();
  }

  /**
   * Switch active account
   * @param {string} address - Account address to activate
   */
  switchAccount(address) {
    const account = this.accounts.find(
      (a) => a.address.toLowerCase() === address.toLowerCase()
    );
    if (!account) {
      throw new Error('WALLET_ACCOUNT_NOT_FOUND');
    }
    this._activeAddress = account.address;
    this._notifyListeners();
  }

  /**
   * Update account avatar
   * @param {string} address - Account address
   * @param {string} avatarData - New avatar data
   * @returns {Promise<void>}
   */
  async updateAvatar(address, avatarData) {
    this._ensureUnlocked();
    this._keyring = walletManager.updateAvatar(this._keyring, address, avatarData);
    await vaultManager.updateVault(this._keyring);
    this._notifyListeners();
  }

  // ---- Signing ----

  /**
   * Get an ethers.js Signer for the active account
   * @returns {ethers.Wallet}
   */
  getActiveSigner() {
    this._ensureUnlocked();
    return walletManager.getSigner(this._keyring, this._activeAddress);
  }

  /**
   * Get a signer for a specific account
   * @param {string} address - Account address
   * @returns {ethers.Wallet}
   */
  getSignerForAddress(address) {
    this._ensureUnlocked();
    return walletManager.getSigner(this._keyring, address);
  }

  // ---- Export ----

  /**
   * Export account to JSON keystore
   * @param {string} address - Account address to export
   * @param {string} password - Password to encrypt keystore
   * @returns {Promise<string>} Keystore JSON string
   */
  async exportKeystore(address, password) {
    this._ensureUnlocked();
    return await walletManager.exportToKeystore(this._keyring, address, password);
  }

  // ---- Security ----

  /**
   * Change vault password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async changePassword(currentPassword, newPassword) {
    await vaultManager.changePassword(currentPassword, newPassword);
  }

  /**
   * Factory reset — destroy all data
   * @returns {Promise<void>}
   */
  async factoryReset() {
    await vaultManager.resetVault();
    walletManager.clearSignerCache();
    this._keyring = null;
    this._activeAddress = null;
    this._notifyListeners();
  }

  /**
   * Get the mnemonic phrase (for backup)
   * @returns {string|null} Mnemonic or null if imported wallet
   */
  getMnemonic() {
    this._ensureUnlocked();
    return this._keyring.mnemonic || null;
  }

  /**
   * Set auto-lock timeout
   * @param {number} minutes - Minutes before auto-lock
   */
  setAutoLockTimeout(minutes) {
    vaultManager.setAutoLockTimeout(minutes);
  }

  /**
   * Reset activity timer
   */
  resetActivityTimer() {
    vaultManager.resetActivityTimer();
  }

  // ---- Subscriptions ----

  /**
   * Subscribe to state changes
   * @param {Function} listener - Callback
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  // ---- Private ----

  _ensureUnlocked() {
    if (!this.isUnlocked) {
      throw new Error('VAULT_LOCKED: Wallet is locked.');
    }
  }

  _notifyListeners() {
    const state = {
      isInitialized: this.isInitialized,
      isUnlocked: this.isUnlocked,
      state: this.state,
      accounts: this.accounts,
      activeAddress: this._activeAddress,
      activeAccount: this.activeAccount,
    };
    this._listeners.forEach((fn) => {
      try {
        fn(state);
      } catch (err) {
        console.error('KeyringController listener error:', err);
      }
    });
  }
}

const keyringController = new KeyringController();
export default keyringController;
