import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, borderRadius } from '../../constants/theme';
import { sendPasswordResetEmail } from '../../services/auth';
import { alert } from '../../components/AppAlert';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendReset = async () => {
    if (!email) {
      alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(email);
      alert(
        'Check Your Email',
        'If an account exists for this email, a password reset link has been sent.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      alert('Error', error.message || 'Could not send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Enter your email and we'll send you a link to reset your password
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSendReset}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkButton}>
        <Text style={styles.linkText}>Back to <Text style={styles.linkTextBold}>Sign In</Text></Text>
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
    lineHeight: 19,
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
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '400',
  },
  linkTextBold: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
});
