import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { SubscriptionPlan } from '../services/plan';

export interface UserProfile {
  fullName: string;
  email: string;
  subscriptionPlan: SubscriptionPlan;
  avatarUrl: string | null;
}

interface UserProfileContextValue {
  profile: UserProfile | null;
  /** True only while there is no cached value at all to show yet (first ever load on this device). */
  loading: boolean;
  refresh: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextValue | undefined>(undefined);

const CACHE_KEY_PREFIX = 'user_profile_cache_v1:';

function extractAvatarUrl(user: any): string | null {
  if (!user) return null;
  if (user.user_metadata?.avatar_url) return user.user_metadata.avatar_url;
  if (user.user_metadata?.picture) return user.user_metadata.picture;
  const identity = user.identities?.find(
    (i: any) => i.identity_data?.avatar_url || i.identity_data?.picture
  );
  return identity?.identity_data?.avatar_url || identity?.identity_data?.picture || null;
}

function deriveFallbackName(user: any): string {
  if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
  if (user?.email) {
    const local = user.email.split('@')[0];
    return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return 'User';
}

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedForUserId = useRef<string | null>(null);

  const cacheKeyFor = (userId: string) => `${CACHE_KEY_PREFIX}${userId}`;

  const fetchAndSet = async (userId: string) => {
    const [{ data: profileRow }, { data: { user: authUser } }] = await Promise.all([
      supabase.from('user_profiles').select('full_name, subscription_plan').eq('id', userId).single(),
      supabase.auth.getUser(),
    ]);

    const next: UserProfile = {
      fullName: profileRow?.full_name || deriveFallbackName(authUser),
      email: authUser?.email || '',
      subscriptionPlan: (profileRow?.subscription_plan as SubscriptionPlan) || 'free',
      avatarUrl: extractAvatarUrl(authUser),
    };

    setProfile(next);
    setLoading(false);
    AsyncStorage.setItem(cacheKeyFor(userId), JSON.stringify(next)).catch(() => {});
  };

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      loadedForUserId.current = null;
      return;
    }

    if (loadedForUserId.current === user.id) return;
    loadedForUserId.current = user.id;

    let cancelled = false;

    (async () => {
      // Show the last-known value for this user instantly, if we have one,
      // while a fresh copy loads in the background.
      try {
        const cached = await AsyncStorage.getItem(cacheKeyFor(user.id));
        if (cached && !cancelled) {
          setProfile(JSON.parse(cached));
          setLoading(false);
        }
      } catch {
        // ignore cache read errors, fall through to network fetch
      }

      try {
        await fetchAndSet(user.id);
      } catch (error) {
        console.error('Error loading user profile:', error);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const refresh = async () => {
    if (!user) return;
    await fetchAndSet(user.id);
  };

  return (
    <UserProfileContext.Provider value={{ profile, loading, refresh }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile(): UserProfileContextValue {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within a UserProfileProvider');
  return ctx;
}
