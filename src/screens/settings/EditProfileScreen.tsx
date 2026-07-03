import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, borderRadius } from '../../constants/theme';
import {
  getCurrentUser,
  updateFullName,
  isGoogleUser,
  sendProfileChangeOtp,
  verifyProfileChangeOtp,
  updatePassword,
} from '../../services/auth';
import { alert } from '../../components/AppAlert';
import { useUserProfile } from '../../contexts/UserProfileContext';

type PasswordStep = 'form' | 'otp';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { refresh: refreshProfile } = useUserProfile();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [googleUser, setGoogleUser] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStep, setPasswordStep] = useState<PasswordStep>('form');
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const user = await getCurrentUser();
    if (!user) return;
    setEmail(user.email || '');
    setFullName(user.user_metadata?.full_name || '');
    setGoogleUser(isGoogleUser(user));
  };

  const handleSaveName = async () => {
    if (!fullName.trim()) {
      alert('Error', 'Name cannot be empty');
      return;
    }
    setSavingName(true);
    try {
      await updateFullName(fullName.trim());
      await refreshProfile();
      alert('Success', 'Your name has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      alert('Error', error.message || 'Could not update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleRequestPasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      alert('Error', 'Please fill in both password fields');
      return;
    }
    if (newPassword.length < 6) {
      alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Error', 'Passwords do not match');
      return;
    }

    setSendingOtp(true);
    try {
      await sendProfileChangeOtp(email);
      setPasswordStep('otp');
      alert('Check Your Email', `We sent a 6-digit code to ${email}. Enter it below to confirm your new password.`);
    } catch (error: any) {
      alert('Error', error.message || 'Could not send confirmation code');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleConfirmPasswordChange = async () => {
    if (!otpCode) {
      alert('Error', 'Please enter the code from your email');
      return;
    }

    setVerifying(true);
    try {
      await verifyProfileChangeOtp(email, otpCode);
      await updatePassword(newPassword);
      alert('Success', 'Your password has been updated.');
      setNewPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setPasswordStep('form');
    } catch (error: any) {
      alert('Error', error.message || 'Invalid or expired code');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Text style={styles.sectionTitle}>Name</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full name"
            autoCapitalize="words"
          />
          <TouchableOpacity
            style={[styles.button, savingName && styles.buttonDisabled]}
            onPress={handleSaveName}
            disabled={savingName}
          >
            <Text style={styles.buttonText}>{savingName ? 'Saving...' : 'Save Name'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Password</Text>
        {googleUser ? (
          <View style={styles.card}>
            <Text style={styles.googleNotice}>
              You signed in with Google, so your password is managed by your Google account and can't be changed here.
            </Text>
          </View>
        ) : passwordStep === 'form' ? (
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              secureTextEntry
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              secureTextEntry
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.button, sendingOtp && styles.buttonDisabled]}
              onPress={handleRequestPasswordChange}
              disabled={sendingOtp}
            >
              <Text style={styles.buttonText}>{sendingOtp ? 'Sending Code...' : 'Send Confirmation Code'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.otpHint}>Enter the 6-digit code sent to {email}</Text>
            <TextInput
              style={styles.input}
              value={otpCode}
              onChangeText={setOtpCode}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.button, verifying && styles.buttonDisabled]}
              onPress={handleConfirmPasswordChange}
              disabled={verifying}
            >
              <Text style={styles.buttonText}>{verifying ? 'Confirming...' : 'Confirm New Password'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPasswordStep('form')} style={styles.cancelLink}>
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
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
  backBtn: {
    color: colors.gold,
    fontSize: 15,
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: 'serif',
    fontSize: 24,
    fontWeight: '400',
    color: colors.cream,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: 14,
    fontSize: 15,
    backgroundColor: colors.cream,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.navy,
    padding: 14,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  googleNotice: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  otpHint: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cancelLink: {
    alignItems: 'center',
  },
  cancelLinkText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
