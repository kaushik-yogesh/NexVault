/**
 * NexVault — CryptoEngine
 * 
 * Handles all cryptographic operations using the WebCrypto API.
 * - PBKDF2 key derivation (250,000 iterations, SHA-256)
 * - AES-256-GCM encryption/decryption
 * - All keys are non-exportable for maximum security
 * 
 * SECURITY: This module NEVER exposes raw key material.
 * Keys are derived in the WebCrypto sandbox and cannot be extracted by JS.
 */

const PBKDF2_ITERATIONS = 600000;
const SALT_LENGTH = 32;
const IV_LENGTH = 12; // 96 bits for AES-GCM
const KEY_LENGTH = 256; // AES-256

class CryptoEngine {
  /**
   * Generate a cryptographically secure random salt
   * @returns {Uint8Array} Random salt
   */
  generateSalt() {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  }

  /**
   * Generate a random initialization vector for AES-GCM
   * @returns {Uint8Array} Random IV
   */
  generateIV() {
    return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  }

  /**
   * Derive an AES-256 key from a password using PBKDF2
   * The derived key is non-exportable — it can only be used for encrypt/decrypt.
   * 
   * @param {string} password - User's password or PIN
   * @param {Uint8Array} salt - Random salt (must be stored alongside ciphertext)
   * @returns {Promise<CryptoKey>} Non-exportable AES-256-GCM key
   */
  async deriveKey(password, salt) {
    // Import password as raw key material for PBKDF2
    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive AES-256-GCM key using PBKDF2
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      baseKey,
      {
        name: 'AES-GCM',
        length: KEY_LENGTH,
      },
      false, // non-exportable — KEY SECURITY FEATURE
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt plaintext data using AES-256-GCM
   * Generates a fresh IV for each encryption operation.
   * 
   * @param {CryptoKey} key - Derived AES key
   * @param {string} plaintext - Data to encrypt
   * @returns {Promise<{ciphertext: ArrayBuffer, iv: Uint8Array}>}
   */
  async encrypt(key, plaintext) {
    const iv = this.generateIV();
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    return { ciphertext, iv };
  }

  /**
   * Decrypt ciphertext using AES-256-GCM
   * Automatically verifies the authentication tag (GCM provides integrity).
   * 
   * @param {CryptoKey} key - Derived AES key
   * @param {ArrayBuffer} ciphertext - Encrypted data
   * @param {Uint8Array} iv - Initialization vector used during encryption
   * @returns {Promise<string>} Decrypted plaintext
   * @throws {Error} If decryption fails (wrong key or tampered data)
   */
  async decrypt(key, ciphertext, iv) {
    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      throw new Error('VAULT_DECRYPT_FAILED: Incorrect password or corrupted data');
    }
  }

  /**
   * Encrypt data with password in a single call.
   * Returns a self-contained encrypted payload with all metadata needed for decryption.
   * 
   * @param {string} password - User's password
   * @param {string} plaintext - Data to encrypt
   * @returns {Promise<Object>} Encrypted payload { ciphertext, iv, salt }
   */
  async encryptWithPassword(password, plaintext) {
    const salt = this.generateSalt();
    const key = await this.deriveKey(password, salt);
    const { ciphertext, iv } = await this.encrypt(key, plaintext);

    return {
      ciphertext: this._arrayBufferToBase64(ciphertext),
      iv: this._uint8ArrayToBase64(iv),
      salt: this._uint8ArrayToBase64(salt),
      algorithm: 'AES-256-GCM',
      kdf: 'PBKDF2',
      iterations: PBKDF2_ITERATIONS,
      version: 1,
    };
  }

  /**
   * Decrypt an encrypted payload with password.
   * 
   * @param {string} password - User's password
   * @param {Object} payload - Encrypted payload from encryptWithPassword
   * @returns {Promise<string>} Decrypted plaintext
   */
  async decryptWithPassword(password, payload) {
    const salt = this._base64ToUint8Array(payload.salt);
    const iv = this._base64ToUint8Array(payload.iv);
    const ciphertext = this._base64ToArrayBuffer(payload.ciphertext);

    const key = await this.deriveKey(password, salt);
    return this.decrypt(key, ciphertext, iv);
  }

  /**
   * Hash data using SHA-256
   * @param {string} data - Data to hash
   * @returns {Promise<string>} Hex-encoded hash
   */
  async hash(data) {
    const encoded = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    return this._arrayBufferToHex(hashBuffer);
  }

  /**
   * Generate a random hex string
   * @param {number} bytes - Number of random bytes
   * @returns {string} Hex-encoded random string
   */
  generateRandomHex(bytes = 32) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(bytes));
    return this._uint8ArrayToHex(randomBytes);
  }

  // ---- Encoding Utilities ----

  _arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }

  _base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  _uint8ArrayToBase64(uint8Array) {
    let binary = '';
    uint8Array.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }

  _base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  _arrayBufferToHex(buffer) {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  _uint8ArrayToHex(uint8Array) {
    return Array.from(uint8Array).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}

// Singleton instance
const cryptoEngine = new CryptoEngine();
export default cryptoEngine;
