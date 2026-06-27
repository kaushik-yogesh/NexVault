/**
 * NexVault — VaultManager
 * 
 * Manages the encrypted vault lifecycle:
 * - Create vault (encrypt keyring with user's password)
 * - Unlock vault (derive key, decrypt keyring)
 * - Lock vault (wipe decrypted material from memory)
 * - Update vault (re-encrypt after changes)
 * 
 * The vault stores the serialized keyring (mnemonics + derived keys)
 * encrypted with AES-256-GCM via PBKDF2-derived key.
 * 
 * SECURITY INVARIANTS:
 * 1. Decrypted keyring data is ONLY held in this manager's memory
 * 2. On lock, all decrypted data is nullified
 * 3. The password is never stored — only used to derive the encryption key
 * 4. Each vault update generates a new IV (AES-GCM requirement)
 */

import cryptoEngine from './CryptoEngine.js';
import store from './ExtensionStore.js';

/** Vault states */
export const VAULT_STATE = {
  UNINITIALIZED: 'uninitialized',
  LOCKED: 'locked',
  UNLOCKED: 'unlocked',
};

class VaultManager {
  constructor() {
    /** @type {string} Current vault state */
    this._state = VAULT_STATE.UNINITIALIZED;

    /** @type {CryptoKey|null} Derived AES key (in memory only while unlocked) */
    this._derivedKey = null;

    /** @type {Object|null} Decrypted keyring data (in memory only while unlocked) */
    this._keyring = null;

    /** @type {Uint8Array|null} Salt used for key derivation */
    this._salt = null;

    /** @type {string|null} Password hash for verification */
    this._passwordHash = null;

    /** @type {number|null} Auto-lock timer ID */
    this._autoLockTimer = null;

    /** @type {number} Auto-lock timeout in milliseconds (default: 5 minutes) */
    this._autoLockTimeout = 5 * 60 * 1000;

    /** @type {Set<Function>} State change listeners */
    this._listeners = new Set();
  }

  /** Get current vault state */
  get state() {
    return this._state;
  }

  /** Check if vault is unlocked */
  get isUnlocked() {
    return this._state === VAULT_STATE.UNLOCKED;
  }

  /** Check if vault is initialized */
  get isInitialized() {
    return this._state !== VAULT_STATE.UNINITIALIZED;
  }

  /** Get decrypted keyring (only available when unlocked) */
  get keyring() {
    if (!this.isUnlocked) {
      throw new Error('Vault is locked. Unlock to access keyring.');
    }
    return this._keyring;
  }

  /**
   * Initialize the vault manager — check if a vault exists
   * Call this on app startup.
   * @returns {Promise<string>} Current vault state
   */
  async initialize() {
    const exists = await store.vaultExists();
    this._state = exists ? VAULT_STATE.LOCKED : VAULT_STATE.UNINITIALIZED;
    this._notifyListeners();
    return this._state;
  }

  /**
   * Create a new vault with the given keyring data
   * 
   * @param {string} password - User's chosen password
   * @param {Object} keyringData - Keyring data to encrypt (mnemonics, accounts, etc.)
   * @returns {Promise<void>}
   * @throws {Error} If vault already exists
   */
  async createVault(password, keyringData) {
    const exists = await store.vaultExists();
    if (exists) {
      throw new Error('VAULT_ALREADY_EXISTS: A vault already exists. Reset first.');
    }

    // Generate salt and derive key
    const salt = cryptoEngine.generateSalt();
    const key = await cryptoEngine.deriveKey(password, salt);

    // Serialize and encrypt the keyring
    const serialized = JSON.stringify(keyringData);
    const { ciphertext, iv } = await cryptoEngine.encrypt(key, serialized);

    // Hash password for future verification (not the password itself)
    const passwordHash = await cryptoEngine.hash(password + cryptoEngine._uint8ArrayToBase64(salt));

    // Store encrypted vault
    await store.saveVaultData({
      ciphertext: cryptoEngine._arrayBufferToBase64(ciphertext),
      iv: cryptoEngine._uint8ArrayToBase64(iv),
      salt: cryptoEngine._uint8ArrayToBase64(salt),
      passwordHash,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Set unlocked state
    this._derivedKey = key;
    this._keyring = keyringData;
    this._salt = salt;
    this._passwordHash = passwordHash;
    this._state = VAULT_STATE.UNLOCKED;
    this._startAutoLockTimer();
    this._notifyListeners();
  }

  /**
   * Unlock the vault with the user's password
   * 
   * @param {string} password - User's password
   * @returns {Promise<Object>} Decrypted keyring data
   * @throws {Error} If password is wrong or vault is corrupted
   */
  async unlock(password) {
    if (this._state === VAULT_STATE.UNINITIALIZED) {
      throw new Error('VAULT_NOT_INITIALIZED: No vault exists.');
    }

    if (this._state === VAULT_STATE.UNLOCKED) {
      return this._keyring;
    }

    // Load encrypted vault data
    const vaultData = await store.getVaultData();
    if (!vaultData) {
      throw new Error('VAULT_CORRUPTED: Vault data not found.');
    }

    const salt = cryptoEngine._base64ToUint8Array(vaultData.salt);
    const iv = cryptoEngine._base64ToUint8Array(vaultData.iv);
    const ciphertext = cryptoEngine._base64ToArrayBuffer(vaultData.ciphertext);

    // Verify password hash first (fast check)
    const passwordHash = await cryptoEngine.hash(password + cryptoEngine._uint8ArrayToBase64(salt));
    if (passwordHash !== vaultData.passwordHash) {
      throw new Error('VAULT_WRONG_PASSWORD: Incorrect password.');
    }

    // Derive key and decrypt
    const key = await cryptoEngine.deriveKey(password, salt);
    const decrypted = await cryptoEngine.decrypt(key, ciphertext, iv);

    let keyringData;
    try {
      keyringData = JSON.parse(decrypted);
    } catch {
      throw new Error('VAULT_CORRUPTED: Decrypted data is not valid JSON.');
    }

    // Set unlocked state
    this._derivedKey = key;
    this._keyring = keyringData;
    this._salt = salt;
    this._passwordHash = passwordHash;
    this._state = VAULT_STATE.UNLOCKED;
    this._startAutoLockTimer();
    this._notifyListeners();

    return keyringData;
  }

  /**
   * Lock the vault — wipe all decrypted material from memory
   */
  lock() {
    this._derivedKey = null;
    this._keyring = null;
    this._salt = null;
    this._passwordHash = null;
    this._clearAutoLockTimer();

    if (this._state !== VAULT_STATE.UNINITIALIZED) {
      this._state = VAULT_STATE.LOCKED;
    }

    this._notifyListeners();
  }

  /**
   * Update the vault with modified keyring data
   * Re-encrypts with the same derived key (new IV generated).
   * 
   * @param {Object} keyringData - Updated keyring data
   * @returns {Promise<void>}
   * @throws {Error} If vault is locked
   */
  async updateVault(keyringData) {
    if (!this.isUnlocked || !this._derivedKey) {
      throw new Error('VAULT_LOCKED: Unlock vault before updating.');
    }

    // Serialize and re-encrypt with fresh IV
    const serialized = JSON.stringify(keyringData);
    const { ciphertext, iv } = await cryptoEngine.encrypt(this._derivedKey, serialized);

    // Update stored vault
    await store.saveVaultData({
      ciphertext: cryptoEngine._arrayBufferToBase64(ciphertext),
      iv: cryptoEngine._uint8ArrayToBase64(iv),
      salt: cryptoEngine._uint8ArrayToBase64(this._salt),
      passwordHash: this._passwordHash,
      version: 1,
      updatedAt: Date.now(),
    });

    // Update in-memory keyring
    this._keyring = keyringData;
    this._resetAutoLockTimer();
  }

  /**
   * Change the vault password
   * Re-derives a new key and re-encrypts the entire vault.
   * 
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async changePassword(currentPassword, newPassword) {
    // Verify current password
    const vaultData = await store.getVaultData();
    const currentSalt = cryptoEngine._base64ToUint8Array(vaultData.salt);
    const currentHash = await cryptoEngine.hash(
      currentPassword + cryptoEngine._uint8ArrayToBase64(currentSalt)
    );

    if (currentHash !== vaultData.passwordHash) {
      throw new Error('VAULT_WRONG_PASSWORD: Current password is incorrect.');
    }

    // Ensure vault is unlocked
    if (!this.isUnlocked) {
      await this.unlock(currentPassword);
    }

    // Generate new salt and derive new key
    const newSalt = cryptoEngine.generateSalt();
    const newKey = await cryptoEngine.deriveKey(newPassword, newSalt);

    // Re-encrypt keyring with new key
    const serialized = JSON.stringify(this._keyring);
    const { ciphertext, iv } = await cryptoEngine.encrypt(newKey, serialized);

    const newPasswordHash = await cryptoEngine.hash(
      newPassword + cryptoEngine._uint8ArrayToBase64(newSalt)
    );

    // Save re-encrypted vault
    await store.saveVaultData({
      ciphertext: cryptoEngine._arrayBufferToBase64(ciphertext),
      iv: cryptoEngine._uint8ArrayToBase64(iv),
      salt: cryptoEngine._uint8ArrayToBase64(newSalt),
      passwordHash: newPasswordHash,
      version: 1,
      updatedAt: Date.now(),
    });

    // Update internal state
    this._derivedKey = newKey;
    this._salt = newSalt;
    this._passwordHash = newPasswordHash;
  }

  /**
   * Reset the vault (factory reset)
   * DANGER: This permanently destroys all wallet data!
   * @returns {Promise<void>}
   */
  async resetVault() {
    this.lock();
    await store.deleteVaultData();
    this._state = VAULT_STATE.UNINITIALIZED;
    this._notifyListeners();
  }

  /**
   * Set the auto-lock timeout
   * @param {number} minutes - Minutes before auto-lock (0 = disabled)
   */
  setAutoLockTimeout(minutes) {
    this._autoLockTimeout = minutes > 0 ? minutes * 60 * 1000 : 0;
    if (this.isUnlocked) {
      this._resetAutoLockTimer();
    }
  }

  /**
   * Subscribe to vault state changes
   * @param {Function} listener - Callback receiving new state
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Reset activity timer (call on user interaction)
   */
  resetActivityTimer() {
    if (this.isUnlocked) {
      this._resetAutoLockTimer();
    }
  }

  // ---- Private Methods ----

  _notifyListeners() {
    const state = this._state;
    this._listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('VaultManager listener error:', err);
      }
    });
  }

  _startAutoLockTimer() {
    this._clearAutoLockTimer();
    if (this._autoLockTimeout > 0) {
      this._autoLockTimer = setTimeout(() => {
        this.lock();
      }, this._autoLockTimeout);
    }
  }

  _resetAutoLockTimer() {
    this._startAutoLockTimer();
  }

  _clearAutoLockTimer() {
    if (this._autoLockTimer) {
      clearTimeout(this._autoLockTimer);
      this._autoLockTimer = null;
    }
  }
}

// Singleton instance
const vaultManager = new VaultManager();
export default vaultManager;
