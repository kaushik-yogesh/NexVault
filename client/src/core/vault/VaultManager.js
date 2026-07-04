/**
 * NexVault — VaultManager
 * 
 * Manages the encrypted vault lifecycle using a Master Key Architecture:
 * - A high-entropy 'Master Key' is generated to encrypt the actual vault payload.
 * - The Master Key is then encrypted by a user's Password, and optionally by a Biometric Passkey.
 * - This allows changing the password or adding/removing biometrics without re-encrypting the entire vault.
 */

import cryptoEngine from './CryptoEngine.js';
import store from './ExtensionStore.js';
import biometricManager from './BiometricManager.js';

export const VAULT_STATE = {
  UNINITIALIZED: 'uninitialized',
  LOCKED: 'locked',
  UNLOCKED: 'unlocked',
};

class VaultManager {
  constructor() {
    this._state = VAULT_STATE.UNINITIALIZED;
    this._masterKey = null; // Unlocked Master Key (AES-256)
    this._keyring = null;
    this._autoLockTimer = null;
    this._autoLockTimeout = 5 * 60 * 1000;
    this._listeners = new Set();
  }

  get state() { return this._state; }
  get isUnlocked() { return this._state === VAULT_STATE.UNLOCKED; }
  get isInitialized() { return this._state !== VAULT_STATE.UNINITIALIZED; }
  get keyring() {
    if (!this.isUnlocked) throw new Error('Vault is locked.');
    return this._keyring;
  }

  async initialize() {
    const exists = await store.vaultExists();
    this._state = exists ? VAULT_STATE.LOCKED : VAULT_STATE.UNINITIALIZED;
    this._notifyListeners();
    return this._state;
  }

  /** Create new vault */
  async createVault(password, keyringData) {
    const exists = await store.vaultExists();
    if (exists) throw new Error('Vault already exists.');

    // 1. Generate Master Key (raw bytes)
    const masterKeyRaw = crypto.getRandomValues(new Uint8Array(32)); // 256 bits
    const masterKey = await crypto.subtle.importKey(
      'raw', masterKeyRaw, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    );

    // 2. Encrypt Keyring with Master Key
    const serializedKeyring = JSON.stringify(keyringData);
    const vaultCiphertext = await cryptoEngine.encrypt(masterKey, serializedKeyring);

    // 3. Encrypt Master Key with Password
    const passwordSalt = cryptoEngine.generateSalt();
    const passwordDerivedKey = await cryptoEngine.deriveKey(password, passwordSalt);
    // Convert MasterKey back to ArrayBuffer to encrypt it
    const exportedMasterKey = await crypto.subtle.exportKey('raw', masterKey);
    // Note: CryptoEngine.encrypt expects a string, so we'll convert the raw key to base64 first
    const masterKeyB64 = cryptoEngine._arrayBufferToBase64(exportedMasterKey);
    const passwordEncryptedMasterKey = await cryptoEngine.encrypt(passwordDerivedKey, masterKeyB64);
    const passwordHash = await cryptoEngine.hash(password + cryptoEngine._uint8ArrayToBase64(passwordSalt));

    const vaultData = {
      version: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      
      // Encrypted Vault
      vaultPayload: {
        ciphertext: cryptoEngine._arrayBufferToBase64(vaultCiphertext.ciphertext),
        iv: cryptoEngine._uint8ArrayToBase64(vaultCiphertext.iv),
      },

      // Password wrapped Master Key
      passwordWrap: {
        ciphertext: cryptoEngine._arrayBufferToBase64(passwordEncryptedMasterKey.ciphertext),
        iv: cryptoEngine._uint8ArrayToBase64(passwordEncryptedMasterKey.iv),
        salt: cryptoEngine._uint8ArrayToBase64(passwordSalt),
        passwordHash: passwordHash,
      },

      // Biometric wrapped Master Key (initially empty)
      biometricWrap: null
    };

    await store.saveVaultData(vaultData);

    this._masterKey = masterKey;
    this._keyring = keyringData;
    this._state = VAULT_STATE.UNLOCKED;
    this._startAutoLockTimer();
    this._notifyListeners();
  }

  /** Unlock with Password */
  async unlock(password) {
    if (this._state === VAULT_STATE.UNINITIALIZED) throw new Error('No vault exists.');
    if (this._state === VAULT_STATE.UNLOCKED) return this._keyring;

    const vaultData = await store.getVaultData();
    if (!vaultData || !vaultData.passwordWrap) throw new Error('Vault corrupted.');

    // Handle legacy vault (v1)
    if (vaultData.version === 1) {
      throw new Error('Please login with your previous version client and migrate, or reset wallet and import phrase. Direct upgrade is not supported in this beta.');
    }

    const { ciphertext, iv, salt, passwordHash } = vaultData.passwordWrap;
    const saltBytes = cryptoEngine._base64ToUint8Array(salt);

    // Verify hash
    const inputHash = await cryptoEngine.hash(password + salt);
    if (inputHash !== passwordHash) throw new Error('VAULT_WRONG_PASSWORD: Incorrect password.');

    // Decrypt Master Key
    const passwordKey = await cryptoEngine.deriveKey(password, saltBytes);
    const masterKeyB64 = await cryptoEngine.decrypt(
      passwordKey, 
      cryptoEngine._base64ToArrayBuffer(ciphertext), 
      cryptoEngine._base64ToUint8Array(iv)
    );

    // Import Master Key
    const masterKeyRaw = cryptoEngine._base64ToArrayBuffer(masterKeyB64);
    const masterKey = await crypto.subtle.importKey(
      'raw', masterKeyRaw, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    );

    await this._decryptVaultPayload(vaultData, masterKey);
    return this._keyring;
  }

  /** Verify the vault password without unlocking (for sensitive operations) */
  async verifyPassword(password) {
    if (this._state === VAULT_STATE.UNINITIALIZED) throw new Error('No vault exists.');

    const vaultData = await store.getVaultData();
    if (!vaultData || !vaultData.passwordWrap) throw new Error('Vault corrupted.');
    if (vaultData.version === 1) throw new Error('Legacy vault not supported.');

    const { salt, passwordHash } = vaultData.passwordWrap;
    const inputHash = await cryptoEngine.hash(password + salt);
    if (inputHash !== passwordHash) throw new Error('VAULT_WRONG_PASSWORD: Incorrect password.');
    
    return true;
  }

  /** Decrypt actual vault payload */
  async _decryptVaultPayload(vaultData, masterKey) {
    const { ciphertext, iv } = vaultData.vaultPayload;
    const decryptedJson = await cryptoEngine.decrypt(
      masterKey,
      cryptoEngine._base64ToArrayBuffer(ciphertext),
      cryptoEngine._base64ToUint8Array(iv)
    );

    this._masterKey = masterKey;
    this._keyring = JSON.parse(decryptedJson);
    this._state = VAULT_STATE.UNLOCKED;
    this._startAutoLockTimer();
    this._notifyListeners();
  }

  /** Enable Biometric Unlock */
  async enableBiometric(password) {
    if (!this.isUnlocked) await this.unlock(password);

    // 1. Generate Biometric PRF Salt
    const prfSalt = crypto.getRandomValues(new Uint8Array(32));
    
    // 2. Register WebAuthn Credential
    const { credentialId, prfKey } = await biometricManager.registerCredential('NexVault', prfSalt);

    // 3. Export Master Key
    const exportedMasterKey = await crypto.subtle.exportKey('raw', this._masterKey);
    const masterKeyB64 = cryptoEngine._arrayBufferToBase64(exportedMasterKey);

    // 4. Encrypt Master Key with PRF Key
    const biometricEncrypted = await cryptoEngine.encrypt(prfKey, masterKeyB64);

    // 5. Save to Vault Data
    const vaultData = await store.getVaultData();
    vaultData.biometricWrap = {
      credentialId,
      prfSalt: cryptoEngine._uint8ArrayToBase64(prfSalt),
      ciphertext: cryptoEngine._arrayBufferToBase64(biometricEncrypted.ciphertext),
      iv: cryptoEngine._uint8ArrayToBase64(biometricEncrypted.iv),
    };
    vaultData.updatedAt = Date.now();

    await store.saveVaultData(vaultData);
  }

  /** Disable Biometric Unlock */
  async disableBiometric() {
    const vaultData = await store.getVaultData();
    if (vaultData && vaultData.biometricWrap) {
      vaultData.biometricWrap = null;
      vaultData.updatedAt = Date.now();
      await store.saveVaultData(vaultData);
    }
  }

  /** Check if biometric is enabled for this vault */
  async hasBiometric() {
    const vaultData = await store.getVaultData();
    return !!(vaultData && vaultData.biometricWrap);
  }

  /** Unlock with Biometric */
  async unlockWithBiometric() {
    if (this._state === VAULT_STATE.UNLOCKED) return this._keyring;
    
    const vaultData = await store.getVaultData();
    if (!vaultData || !vaultData.biometricWrap) {
      throw new Error('Biometric login is not enabled for this vault.');
    }

    const { credentialId, prfSalt, ciphertext, iv } = vaultData.biometricWrap;
    const saltBytes = cryptoEngine._base64ToUint8Array(prfSalt);

    // 1. Get PRF Key from WebAuthn
    const prfKey = await biometricManager.getPrfKey(credentialId, saltBytes);

    // 2. Decrypt Master Key
    const masterKeyB64 = await cryptoEngine.decrypt(
      prfKey,
      cryptoEngine._base64ToArrayBuffer(ciphertext),
      cryptoEngine._base64ToUint8Array(iv)
    );

    // 3. Import Master Key
    const masterKeyRaw = cryptoEngine._base64ToArrayBuffer(masterKeyB64);
    const masterKey = await crypto.subtle.importKey(
      'raw', masterKeyRaw, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    );

    await this._decryptVaultPayload(vaultData, masterKey);
    return this._keyring;
  }

  lock() {
    this._masterKey = null;
    this._keyring = null;
    this._clearAutoLockTimer();
    if (this._state !== VAULT_STATE.UNINITIALIZED) this._state = VAULT_STATE.LOCKED;
    this._notifyListeners();
  }

  async updateVault(keyringData) {
    if (!this.isUnlocked || !this._masterKey) throw new Error('Vault locked.');

    const serialized = JSON.stringify(keyringData);
    const vaultCiphertext = await cryptoEngine.encrypt(this._masterKey, serialized);

    const vaultData = await store.getVaultData();
    vaultData.vaultPayload = {
      ciphertext: cryptoEngine._arrayBufferToBase64(vaultCiphertext.ciphertext),
      iv: cryptoEngine._uint8ArrayToBase64(vaultCiphertext.iv),
    };
    vaultData.updatedAt = Date.now();

    await store.saveVaultData(vaultData);
    this._keyring = keyringData;
    this._resetAutoLockTimer();
  }

  async changePassword(currentPassword, newPassword) {
    if (!this.isUnlocked) await this.unlock(currentPassword);

    // Re-encrypt Master Key with new password
    const passwordSalt = cryptoEngine.generateSalt();
    const passwordDerivedKey = await cryptoEngine.deriveKey(newPassword, passwordSalt);
    const exportedMasterKey = await crypto.subtle.exportKey('raw', this._masterKey);
    const masterKeyB64 = cryptoEngine._arrayBufferToBase64(exportedMasterKey);
    const passwordEncrypted = await cryptoEngine.encrypt(passwordDerivedKey, masterKeyB64);
    const passwordHash = await cryptoEngine.hash(newPassword + cryptoEngine._uint8ArrayToBase64(passwordSalt));

    const vaultData = await store.getVaultData();
    vaultData.passwordWrap = {
      ciphertext: cryptoEngine._arrayBufferToBase64(passwordEncrypted.ciphertext),
      iv: cryptoEngine._uint8ArrayToBase64(passwordEncrypted.iv),
      salt: cryptoEngine._uint8ArrayToBase64(passwordSalt),
      passwordHash: passwordHash,
    };
    vaultData.updatedAt = Date.now();

    await store.saveVaultData(vaultData);
  }

  async resetVault() {
    this.lock();
    await store.deleteVaultData();
    this._state = VAULT_STATE.UNINITIALIZED;
    this._notifyListeners();
  }

  setAutoLockTimeout(minutes) {
    this._autoLockTimeout = minutes > 0 ? minutes * 60 * 1000 : 0;
    if (this.isUnlocked) this._resetAutoLockTimer();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  resetActivityTimer() {
    if (this.isUnlocked) this._resetAutoLockTimer();
  }

  _notifyListeners() {
    const state = this._state;
    this._listeners.forEach((listener) => {
      try { listener(state); } catch (e) {}
    });
  }

  _startAutoLockTimer() {
    this._clearAutoLockTimer();
    if (this._autoLockTimeout > 0) {
      this._autoLockTimer = setTimeout(() => this.lock(), this._autoLockTimeout);
    }
  }

  _resetAutoLockTimer() { this._startAutoLockTimer(); }
  _clearAutoLockTimer() {
    if (this._autoLockTimer) {
      clearTimeout(this._autoLockTimer);
      this._autoLockTimer = null;
    }
  }
}

const vaultManager = new VaultManager();
export default vaultManager;
