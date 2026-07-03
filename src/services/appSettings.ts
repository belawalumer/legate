import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_LOCK_KEY = 'biometric_lock_enabled';
const NOTIFICATIONS_KEY = 'notifications_enabled';

export async function getBiometricLockEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(BIOMETRIC_LOCK_KEY);
  return value === 'true';
}

export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_LOCK_KEY, enabled ? 'true' : 'false');
}

export async function getNotificationsEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
  return value !== 'false'; // default on
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_KEY, enabled ? 'true' : 'false');
}
