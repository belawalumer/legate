import * as LocalAuthentication from 'expo-local-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { getQueryParams } from 'expo-auth-session/build/QueryParams';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

/**
 * Check if biometric authentication is available
 */
export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

/**
 * Authenticate with biometrics
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access your vault',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    
    return result.success;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return false;
  }
}

/**
 * Sign in with email
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

/**
 * Sign up with email
 */
export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: AuthSession.makeRedirectUri({ path: 'auth/callback' }),
    },
  });

  if (error) throw error;
  
  // User profile is automatically created by database trigger
  // No need to manually insert it here
  
  return data;
}

/**
 * Accept any pending trusted-person invitations addressed to this user's email.
 * Safe to call on every login - it's a no-op if there are no pending invites.
 */
export async function acceptPendingTrustedPersonInvites(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email;
  if (!email) return;

  const { error } = await supabase
    .from('trusted_persons')
    .update({ status: 'accepted' })
    .eq('email', email)
    .eq('status', 'pending');

  if (error) {
    console.error('Error accepting trusted person invites:', error);
  }
}

/**
 * Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Send a password reset email. The link opens the app via
 * legate://auth/callback with type=recovery, which AppNavigator detects and
 * routes to the SetNewPassword screen.
 */
export async function sendPasswordResetEmail(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: AuthSession.makeRedirectUri({ path: 'auth/callback' }),
  });

  if (error) throw error;
  return data;
}

/**
 * Set a new password for the currently authenticated user (used both for the
 * forgot-password recovery flow and for changing password from Settings).
 */
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}

/**
 * Send a one-time 6-digit code to the given email, used to confirm sensitive
 * profile changes (currently: password change from Settings) without
 * requiring the user to leave the app for a link-based flow.
 */
export async function sendProfileChangeOtp(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error) throw error;
  return data;
}

/**
 * Verify a one-time code sent via sendProfileChangeOtp.
 */
export async function verifyProfileChangeOtp(email: string, code: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  });
  if (error) throw error;
  return data;
}

/**
 * Update the current user's display name. Low-risk, so it saves immediately
 * without an OTP step (unlike password changes).
 */
export async function updateFullName(fullName: string) {
  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  });
  if (authError) throw authError;

  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in');

  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({ full_name: fullName })
    .eq('id', user.id);
  if (profileError) throw profileError;
}

/**
 * True if this account was created/linked via Google - such accounts have
 * no Legate-managed password to change.
 */
export function isGoogleUser(user: { app_metadata?: { provider?: string }; identities?: { provider: string }[] } | null): boolean {
  if (!user) return false;
  if (user.app_metadata?.provider === 'google') return true;
  return !!user.identities?.some((i) => i.provider === 'google');
}

/**
 * Parse access/refresh tokens out of a Supabase auth redirect URL (used for
 * both the Google OAuth callback and password-recovery deep links) and set
 * them as the active session. Reports whether this was a recovery link so
 * the caller can route to the "set new password" screen instead of Home.
 */
export async function setSessionFromUrl(url: string): Promise<{ isRecovery: boolean } | null> {
  const { params, errorCode } = getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  const { access_token, refresh_token, type } = params;
  if (!access_token || !refresh_token) {
    return null;
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (sessionError) throw sessionError;
  return { isRecovery: type === 'recovery' };
}

/**
 * Sign in (or sign up) with Google via Supabase OAuth
 */
export async function signInWithGoogle() {
  const redirectTo = AuthSession.makeRedirectUri({ path: 'auth/callback' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('No OAuth URL returned from Supabase');

  const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (authResult.type !== 'success' || !authResult.url) {
    if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
      throw new Error('Google sign-in was cancelled');
    }
    throw new Error('Google sign-in failed');
  }

  const sessionResult = await setSessionFromUrl(authResult.url);
  if (!sessionResult) throw new Error('No session tokens returned from Google sign-in');
}
