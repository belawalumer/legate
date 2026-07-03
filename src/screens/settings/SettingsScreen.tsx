import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Image, Modal } from 'react-native';
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
  getAutoLockSeconds,
  setAutoLockSeconds,
  AUTO_LOCK_OPTIONS,
} from '../../services/appSettings';
import { alert } from '../../components/AppAlert';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function SettingIcon({ name }: { name: React.ComponentProps<typeof Ionicons>['name'] }) {
  return <Ionicons name={name} size={20} color={colors.gold} />;
}

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [autoLockSeconds, setAutoLockSecondsState] = useState(60);
  const [showAutoLockPicker, setShowAutoLockPicker] = useState(false);

  useEffect(() => {
    loadUserProfile();
    getBiometricLockEnabled().then(setBiometricEnabledState);
    getNotificationsEnabled().then(setNotificationsEnabledState);
    getAutoLockSeconds().then(setAutoLockSecondsState);
  }, []);

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      const available = await isBiometricAvailable();
      if (!available) {
        alert(
          'Biometrics Not Available',
          'Set up Face ID, Touch ID, or a device PIN in your phone settings to enable this.'
        );
        return;
      }
    }
    setBiometricEnabledState(value);
    await setBiometricLockEnabled(value);
  };

  const handleSelectAutoLock = async (seconds: number) => {
    setAutoLockSecondsState(seconds);
    setShowAutoLockPicker(false);
    await setAutoLockSeconds(seconds);
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

      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

      if (data) {
        setUserProfile({
          ...data,
          email: user.email || data.email,
          avatarUrl,
        });
      } else {
        // Fallback to auth user data
        setUserProfile({
          full_name: user.user_metadata?.full_name || 'User',
          email: user.email || '',
          avatarUrl,
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
          avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
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
    alert(
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
              alert('Error', error.message);
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
            {userProfile?.avatarUrl ? (
              <Image source={{ uri: userProfile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {userProfile?.full_name ? getInitials(userProfile.full_name) : 'U'}
              </Text>
            )}
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
              <SettingIcon name="finger-print-outline" />
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

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowAutoLockPicker(true)}
          >
            <View style={[styles.settingRowLeft, styles.settingRowLeftFlex]}>
              <SettingIcon name="time-outline" />
              <View style={styles.settingRowTextFlex}>
                <Text style={styles.settingRowLabel}>Auto-lock</Text>
                <Text style={styles.settingRowHint} numberOfLines={2}>
                  Lock after inactivity for this time
                </Text>
              </View>
            </View>
            <View style={styles.settingRowValueSpaced}>
              <Text style={styles.settingRowValue}>
                {AUTO_LOCK_OPTIONS.find((o) => o.seconds === autoLockSeconds)?.shortLabel || `${autoLockSeconds}s`} ›
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <SettingIcon name="notifications-outline" />
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
              <SettingIcon name="lock-open-outline" />
              <Text style={styles.settingRowLabel}>Vault Unlock Requests</Text>
            </View>
            <Text style={styles.settingRowValue}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('Checklist')}
          >
            <View style={styles.settingRowLeft}>
              <SettingIcon name="checkmark-circle-outline" />
              <Text style={styles.settingRowLabel}>Estate Checklist</Text>
            </View>
            <Text style={styles.settingRowValue}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('Subscriptions')}
          >
            <View style={styles.settingRowLeft}>
              <SettingIcon name="repeat-outline" />
              <Text style={styles.settingRowLabel}>Subscriptions</Text>
            </View>
            <Text style={styles.settingRowValue}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Account Settings */}
        <View style={styles.settingsGroup}>
          <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('Paywall')}>
            <View style={styles.settingRowLeft}>
              <SettingIcon name="diamond-outline" />
              <Text style={styles.settingRowLabel}>Upgrade Plan</Text>
            </View>
            <Text style={styles.settingRowValue}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <SettingIcon name="shield-checkmark-outline" />
              <Text style={styles.settingRowLabel}>Privacy Policy</Text>
            </View>
            <Text style={styles.settingRowValue}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <SettingIcon name="document-text-outline" />
              <Text style={styles.settingRowLabel}>Terms of Service</Text>
            </View>
            <Text style={styles.settingRowValue}>›</Text>
          </TouchableOpacity>

          {/* Developer Option - Reset Onboarding */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={async () => {
              alert(
                'Reset Onboarding',
                'This will show the onboarding screen again on next app launch. Continue?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    onPress: async () => {
                      await AsyncStorage.removeItem('hasSeenOnboarding');
                      alert('Success', 'Onboarding will show on next app restart');
                    },
                  },
                ]
              );
            }}
          >
            <View style={styles.settingRowLeft}>
              <SettingIcon name="refresh-outline" />
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
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Auto-lock Picker Modal */}
      <Modal
        visible={showAutoLockPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAutoLockPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerModalOverlay}
          activeOpacity={1}
          onPress={() => setShowAutoLockPicker(false)}
        >
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Auto-lock</Text>
            {AUTO_LOCK_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.seconds}
                style={[
                  styles.pickerOption,
                  autoLockSeconds === option.seconds && styles.pickerOptionSelected,
                ]}
                onPress={() => handleSelectAutoLock(option.seconds)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    autoLockSeconds === option.seconds && styles.pickerOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {autoLockSeconds === option.seconds && (
                  <Text style={styles.pickerCheckmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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
  settingRowLeftFlex: {
    flex: 1,
    marginRight: 12,
  },
  settingRowTextFlex: {
    flex: 1,
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
    flexShrink: 0,
  },
  settingRowValueSpaced: {
    height: 31,
    justifyContent: 'center',
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
  signOutText: {
    fontSize: 14,
    color: colors.error,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalContent: {
    backgroundColor: colors.cream,
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  pickerModalTitle: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '400',
    color: colors.navy,
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerOption: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerOptionSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.gold,
  },
  pickerOptionText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  pickerOptionTextSelected: {
    color: colors.gold,
    fontWeight: '500',
  },
  pickerCheckmark: {
    fontSize: 18,
    color: colors.gold,
    fontWeight: 'bold',
  },
});
