import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get environment variables - Expo automatically loads .env files
// EXPO_PUBLIC_* variables are available via process.env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate URL format
const isValidUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
};

if (!supabaseUrl || supabaseUrl.trim() === '') {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL. Please check your .env file and ensure it contains: EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co'
  );
}

if (!isValidUrl(supabaseUrl)) {
  throw new Error(
    `Invalid Supabase URL: "${supabaseUrl}". Must be a valid HTTP or HTTPS URL.`
  );
}

if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_ANON_KEY. Please check your .env file.'
  );
}

export const supabase = createClient(supabaseUrl.trim(), supabaseAnonKey.trim(), {
  auth: {
    storage: require('@react-native-async-storage/async-storage').default,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
