import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_LOCK_KEY = 'biometric_lock_enabled';
const NOTIFICATIONS_KEY = 'notifications_enabled';
const AUTO_LOCK_SECONDS_KEY = 'auto_lock_seconds';

export const AUTO_LOCK_OPTIONS = [
  { seconds: 30, label: '30 seconds', shortLabel: '30 sec' },
  { seconds: 60, label: '1 minute', shortLabel: '1 min' },
  { seconds: 120, label: '2 minutes', shortLabel: '2 min' },
  { seconds: 300, label: '5 minutes', shortLabel: '5 min' },
] as const;

export const DEFAULT_AUTO_LOCK_SECONDS = 60;

export async function getBiometricLockEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(BIOMETRIC_LOCK_KEY);
  return value === 'true';
}

export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_LOCK_KEY, enabled ? 'true' : 'false');
}

export async function getAutoLockSeconds(): Promise<number> {
  const value = await SecureStore.getItemAsync(AUTO_LOCK_SECONDS_KEY);
  if (value === null) return DEFAULT_AUTO_LOCK_SECONDS;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : DEFAULT_AUTO_LOCK_SECONDS;
}

export async function setAutoLockSeconds(seconds: number): Promise<void> {
  await SecureStore.setItemAsync(AUTO_LOCK_SECONDS_KEY, String(seconds));
}

export async function getNotificationsEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
  return value !== 'false'; // default on
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_KEY, enabled ? 'true' : 'false');
}
