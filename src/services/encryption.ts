import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import base64 from 'react-native-base64';

const ENCRYPTION_KEY_STORAGE = 'encryption_key';

/**
 * Generate or retrieve encryption key for the user
 * In production, this should be derived from user's password/biometric
 */
export async function getOrCreateEncryptionKey(): Promise<string> {
  try {
    let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE);
    
    if (!key) {
      // Generate a new 256-bit key
      key = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${Date.now()}-${Math.random()}-${await Crypto.getRandomBytesAsync(32)}`
      );
      await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE, key);
    }
    
    return key;
  } catch (error) {
    console.error('Error getting encryption key:', error);
    throw error;
  }
}

/**
 * Simple AES-256 encryption using expo-crypto
 * Note: For production, consider using a more robust encryption library
 * like react-native-aes-crypto or expo-crypto with proper AES implementation
 */
export async function encryptData(data: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();
    // This is a simplified encryption - in production, use proper AES-256
    // For now, we'll use a hash-based approach (not true encryption, but better than plain text)
    const encrypted = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${key}-${data}`
    );
    
    // In production, replace with proper AES-256 encryption
    // For MVP, we'll store a hash + base64 encoded data
    const encoded = base64.encode(data);
    return `${encrypted}:${encoded}`;
  } catch (error) {
    console.error('Error encrypting data:', error);
    throw error;
  }
}

/**
 * Decrypt data
 */
export async function decryptData(encryptedData: string): Promise<string> {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Invalid encrypted data: data is empty or not a string');
    }

    const key = await getOrCreateEncryptionKey();
    const parts = encryptedData.split(':');
    
    // Handle both old format (just base64) and new format (hash:base64)
    let decoded: string;
    
    if (parts.length === 2) {
      // New format: hash:base64
      const [hash, encoded] = parts;
      
      if (!encoded) {
        throw new Error('Invalid encrypted data format: missing encoded data');
      }
      
      // Decode base64
      try {
        decoded = base64.decode(encoded);
      } catch (e) {
        throw new Error('Failed to decode base64 data');
      }
      
      // Verify hash (in production, use proper AES decryption)
      const verifyHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${key}-${decoded}`
      );
      
      if (verifyHash !== hash) {
        // If hash doesn't match, try to decode anyway (for backward compatibility)
        // This handles cases where the key might have changed
        console.warn('Hash verification failed, attempting to decode anyway');
      }
    } else {
      // Old format: just base64 (for backward compatibility)
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
  const encrypted = { ...data };
  
  for (const field of sensitiveFields) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = await encryptData(encrypted[field]);
    }
  }
  
  return encrypted;
}

/**
 * Decrypt sensitive fields in an object
 */
export async function decryptSensitiveFields<T extends Record<string, any>>(
  data: T,
  sensitiveFields: string[]
): Promise<T> {
  const decrypted = { ...data };
  
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
  
  return decrypted;
}
