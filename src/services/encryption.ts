import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';
import base64 from 'react-native-base64';

const ENCRYPTION_KEY_STORAGE = 'encryption_key_v2';
const LEGACY_ENCRYPTION_KEY_STORAGE = 'encryption_key';
const AES_PREFIX = 'v2:';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate or retrieve the device's AES-256 key (stored in the platform keychain/keystore).
 */
export async function getOrCreateEncryptionKey(): Promise<string> {
  try {
    let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE);

    if (!key) {
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      key = bytesToHex(randomBytes); // 256-bit key, hex-encoded
      await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE, key);
    }

    return key;
  } catch (error) {
    console.error('Error getting encryption key:', error);
    throw error;
  }
}

/**
 * Retrieve the old (pre-AES) key, used only to decrypt data written before the AES migration.
 */
async function getLegacyEncryptionKey(): Promise<string | null> {
  return SecureStore.getItemAsync(LEGACY_ENCRYPTION_KEY_STORAGE);
}

/**
 * Encrypt data with AES-256-CBC. A random IV is generated per call and stored
 * alongside the ciphertext (IV does not need to be secret, only unpredictable).
 */
export async function encryptData(data: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();
    const keyWordArray = CryptoJS.enc.Hex.parse(key);
    const ivBytes = await Crypto.getRandomBytesAsync(16);
    const iv = CryptoJS.enc.Hex.parse(bytesToHex(ivBytes));

    const ciphertext = CryptoJS.AES.encrypt(data, keyWordArray, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).ciphertext.toString(CryptoJS.enc.Base64);

    return `${AES_PREFIX}${bytesToHex(ivBytes)}:${ciphertext}`;
  } catch (error) {
    console.error('Error encrypting data:', error);
    throw error;
  }
}

/**
 * Decrypt data. Supports the current AES-256-CBC format as well as the older
 * pre-AES formats (hash:base64 and plain base64) so existing vault items still open.
 */
export async function decryptData(encryptedData: string): Promise<string> {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Invalid encrypted data: data is empty or not a string');
    }

    if (encryptedData.startsWith(AES_PREFIX)) {
      const key = await getOrCreateEncryptionKey();
      const keyWordArray = CryptoJS.enc.Hex.parse(key);
      const rest = encryptedData.slice(AES_PREFIX.length);
      const [ivHex, ciphertextB64] = rest.split(':');

      if (!ivHex || !ciphertextB64) {
        throw new Error('Invalid encrypted data format: missing IV or ciphertext');
      }

      const iv = CryptoJS.enc.Hex.parse(ivHex);
      const ciphertext = CryptoJS.enc.Base64.parse(ciphertextB64);

      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext } as CryptoJS.lib.CipherParams,
        keyWordArray,
        { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
      );

      return decrypted.toString(CryptoJS.enc.Utf8);
    }

    // Legacy formats predating real AES support.
    const legacyKey = await getLegacyEncryptionKey();
    const parts = encryptedData.split(':');
    let decoded: string;

    if (parts.length === 2) {
      // Legacy format: sha256(key-data):base64(data)
      const [, encoded] = parts;

      if (!encoded) {
        throw new Error('Invalid encrypted data format: missing encoded data');
      }

      try {
        decoded = base64.decode(encoded);
      } catch (e) {
        throw new Error('Failed to decode base64 data');
      }
    } else {
      // Oldest format: plain base64
      try {
        decoded = base64.decode(encryptedData);
      } catch (e) {
        throw new Error('Failed to decode base64 data');
      }
    }

    return decoded;
  } catch (error) {
    console.error('Error decrypting data:', error);
    throw error;
  }
}

/**
 * Encrypt sensitive fields in an object
 */
export async function encryptSensitiveFields<T extends Record<string, any>>(
  data: T,
  sensitiveFields: string[]
): Promise<T> {
  const encrypted: Record<string, any> = { ...data };

  for (const field of sensitiveFields) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = await encryptData(encrypted[field]);
    }
  }

  return encrypted as T;
}

/**
 * Decrypt sensitive fields in an object
 */
export async function decryptSensitiveFields<T extends Record<string, any>>(
  data: T,
  sensitiveFields: string[]
): Promise<T> {
  const decrypted: Record<string, any> = { ...data };

  for (const field of sensitiveFields) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      try {
        decrypted[field] = await decryptData(decrypted[field]);
      } catch (error) {
        console.error(`Error decrypting field ${field}:`, error);
        // Keep encrypted value if decryption fails
      }
    }
  }

  return decrypted as T;
}
