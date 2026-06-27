import { describe, it, expect, beforeEach } from 'vitest';
import cryptoEngine from '../../src/core/vault/CryptoEngine.js';

describe('CryptoEngine', () => {
  const password = 'StrongPassword123!';
  const dataToEncrypt = JSON.stringify({ mnemonic: 'test test test test test test test test test test test junk' });
  let encryptedVault;

  it('should encrypt data securely', async () => {
    encryptedVault = await cryptoEngine.encrypt(password, dataToEncrypt);
    
    expect(encryptedVault).toHaveProperty('ciphertext');
    expect(encryptedVault).toHaveProperty('salt');
    expect(encryptedVault).toHaveProperty('iv');
    expect(encryptedVault.ciphertext).not.toEqual(dataToEncrypt);
  });

  it('should decrypt data with the correct password', async () => {
    const decryptedData = await cryptoEngine.decrypt(password, encryptedVault);
    expect(decryptedData).toEqual(dataToEncrypt);
  });

  it('should throw an error when decrypting with the wrong password', async () => {
    await expect(cryptoEngine.decrypt('WrongPassword!', encryptedVault)).rejects.toThrow();
  });
});
