import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { signInWithEmail, signInWithGoogle } from '../../services/auth';
import { colors, borderRadius } from '../../constants/theme';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import { alert } from '../../components/AppAlert';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email, password);
      // Navigation will happen automatically via useAuth hook
    } catch (error: any) {
      alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Navigation will happen automatically via useAuth hook
    } catch (error: any) {
      alert('Google Sign-In Failed', error.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Legate</Text>
      <Text style={styles.subtitle}>Your legacy, protected</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleEmailLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('ForgotPassword')}
        style={styles.forgotPasswordButton}
      >
        <Text style={styles.linkText}>Forgot password?</Text>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <GoogleSignInButton onPress={handleGoogleLogin} loading={googleLoading} style={styles.googleButtonSpacing} />

      <TouchableOpacity
        onPress={() => (navigation as any).navigate('SignUp')}
        style={styles.linkButton}
      >
        <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text></Text>
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
    fontSize: 52,
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 8,
    color: colors.gold,
    letterSpacing: 4,
    fontFamily: 'serif',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 48,
    color: 'rgba(201,168,76,0.6)',
    letterSpacing: 3,
    textTransform: 'uppercase',
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
    padding: 16,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: colors.navy,
  },
  buttonText: {
    color: colors.cream,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginBottom: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  googleButtonSpacing: {
    marginBottom: 12,
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
