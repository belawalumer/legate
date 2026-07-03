import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, borderRadius } from '../../constants/theme';
import { updatePassword } from '../../services/auth';
import { alert } from '../../components/AppAlert';

export default function SetNewPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      alert('Error', 'Please fill in both fields');
      return;
    }
    if (password.length < 6) {
      alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      alert('Success', 'Your password has been updated.');
      onDone();
    } catch (error: any) {
      alert('Error', error.message || 'Could not update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set New Password</Text>
      <Text style={styles.subtitle}>Choose a new password for your account</Text>

      <TextInput
        style={styles.input}
        placeholder="New Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm New Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Updating...' : 'Update Password'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 30,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 8,
    color: colors.navy,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 32,
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 16,
    fontSize: 15,
    backgroundColor: colors.white,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.navy,
    padding: 16,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
