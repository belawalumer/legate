import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Switch, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { signOut, getCurrentUser, isBiometricAvailable } from '../../services/auth';
import { supabase } from '../../services/supabase';
import { colors, borderRadius } from '../../constants/theme';
import { PLAN_LABELS, SubscriptionPlan } from '../../services/plan';
import {
  getBiometricLockEnabled,
  setBiometricLockEnabled,
  getNotificationsEnabled,
  setNotificationsEnabled,
} from '../../services/appSettings';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);

  useEffect(() => {
    loadUserProfile();
    getBiometricLockEnabled().then(setBiometricEnabledState);
    getNotificationsEnabled().then(setNotificationsEnabledState);
  }, []);

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      const available = await isBiometricAvailable();
      if (!available) {
        Alert.alert(
          'Biometrics Not Available',
          'Set up Face ID, Touch ID, or a device PIN in your phone settings to enable this.'
        );
        return;
      }
    }
    setBiometricEnabledState(value);
    await setBiometricLockEnabled(value);
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabledState(value);
    await setNotificationsEnabled(value);
  };

  const loadUserProfile = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setUserProfile({
          ...data,
          email: user.email || data.email,
        });
      } else {
        // Fallback to auth user data
        setUserProfile({
          full_name: user.user_metadata?.full_name || 'User',
          email: user.email || '',
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Fallback to auth user
      const user = await getCurrentUser();
      if (user) {
        setUserProfile({
          full_name: user.user_metadata?.full_name || 'User',
          email: user.email || '',
        });
      }
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 1);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with User Profile */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userProfile?.full_name ? getInitials(userProfile.full_name) : 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {userProfile?.full_name || 'User'}
            </Text>
            <Text style={styles.profileEmail}>
              {userProfile?.email || ''}
            </Text>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>
                {PLAN_LABELS[(userProfile?.subscription_plan as SubscriptionPlan) || 'free']} Plan
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* Security Settings */}
        <View style={styles.settingsGroup}>
          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Text style={styles.settingIcon}>🔒</Text>
              <View>
                <Text style={styles.settingRowLabel}>Biometric Lock</Text>
                <Text style={styles.settingRowHint}>Require Face ID / Touch ID to open the app</Text>
              </View>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              trackColor={{ false: colors.border, true: colors.navy }}
              thumbColor={biometricEnabled ? colors.gold : colors.textMuted}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Text style={styles.settingIcon}>🔔</Text>
              <View>
                <Text style={styles.settingRowLabel}>Notifications</Text>
                <Text style={styles.settingRowHint}>Vault and estate activity alerts</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.border, true: colors.navy }}
              thumbColor={notificationsEnabled ? colors.gold : colors.textMuted}
            />
          </View>
        </View>

        {/* Estate Settings */}
        <View style={styles.settingsGroup}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('DeathVerification')}
          >
            <View style={styles.settingRowLeft}>
              <Text style={styles.settingIcon}>🔓</Text>
              <Text style={styles.settingRowLabel}>Vault Unlock Requests</Text>
            </View>
            <Text style={styles.settingRowValue}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('Checklist')}
          >
            <View style={styles.settingRowLeft}>
              <Text style={styles.settingIcon}>✅</Text>
              <Text style={styles.settingRowLabel}>Estate Checklist</Text>
            </View>
            <Text style={styles.settingRowValue}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('Subscriptions')}
          >
            <View style={styles.settingRowLeft}>
              <Text style={styles.settingIcon}>📺</Text>
              <Text style={styles.settingRowLabel}>Subscriptions</Text>
            </View>
            <Text style={styles.settingRowValue}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Account Settings */}
        <View style={styles.settingsGroup}>
          <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('Paywall')}>
            <View style={styles.settingRowLeft}>
              <Text style={styles.settingIcon}>💎</Text>
              <Text style={styles.settingRowLabel}>Upgrade Plan</Text>
            </View>
            <Text style={styles.settingRowValue}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Text style={styles.settingIcon}>📋</Text>
              <Text style={styles.settingRowLabel}>Privacy Policy</Text>
            </View>
            <Text style={styles.settingRowValue}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Text style={styles.settingIcon}>📄</Text>
              <Text style={styles.settingRowLabel}>Terms of Service</Text>
            </View>
            <Text style={styles.settingRowValue}>›</Text>
          </TouchableOpacity>

          {/* Developer Option - Reset Onboarding */}
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={async () => {
              Alert.alert(
                'Reset Onboarding',
                'This will show the onboarding screen again on next app launch. Continue?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    onPress: async () => {
                      await AsyncStorage.removeItem('hasSeenOnboarding');
                      Alert.alert('Success', 'Onboarding will show on next app restart');
                    },
                  },
                ]
              );
            }}
          >
            <View style={styles.settingRowLeft}>
              <Text style={styles.settingIcon}>🔄</Text>
              <Text style={styles.settingRowLabel}>Reset Onboarding</Text>
            </View>
            <Text style={styles.settingRowValue}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity 
          style={styles.signOutRow}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutIcon}>🚪</Text>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    backgroundColor: colors.navy,
    paddingTop: 36,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.navyLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gold,
  },
  avatarText: {
    fontFamily: 'serif',
    fontSize: 26,
    color: colors.gold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '400',
    color: colors.cream,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
  },
  planBadge: {
    backgroundColor: 'rgba(201,168,76,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  planBadgeText: {
    fontSize: 11,
    color: colors.gold,
    fontWeight: '500',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    gap: 10,
  },
  settingsGroup: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingIcon: {
    fontSize: 20,
  },
  settingRowLabel: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  settingRowHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  settingRowValue: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(139,58,58,0.06)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(139,58,58,0.15)',
    padding: 14,
    paddingHorizontal: 16,
  },
  signOutIcon: {
    fontSize: 20,
  },
  signOutText: {
    fontSize: 14,
    color: colors.error,
  },
});
