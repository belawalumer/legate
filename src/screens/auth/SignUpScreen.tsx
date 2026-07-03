import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signUpWithEmail } from '../../services/auth';
import { colors, borderRadius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function SignUpScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'owner' | 'trusted'>('owner');

  const handleSignUp = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password, fullName);
      Alert.alert('Success', 'Account created! Please check your email to verify your account.');
      navigation.navigate('Login');
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LinearGradient
          colors={['rgba(201,168,76,0.2)', 'transparent']}
          start={{ x: 0.7, y: 0.3 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        />
        <Text style={styles.headerLabel}>Create Your Account</Text>
        <Text style={styles.title}>Welcome to{'\n'}Legate.</Text>
      </View>
      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={[styles.input, email && styles.inputFocused]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {/* User Type Selection */}
        <View style={styles.userTypeContainer}>
          <TouchableOpacity
            style={[
              styles.userTypeOption,
              userType === 'owner' ? styles.userTypeOptionActive : styles.userTypeOptionInactive,
            ]}
            onPress={() => setUserType('owner')}
          >
            <Text style={styles.userTypeIcon}>🔑</Text>
            <Text style={[
              styles.userTypeText,
              userType === 'owner' ? styles.userTypeTextActive : styles.userTypeTextInactive,
            ]}>
              I'm setting up{'\n'}my vault
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.userTypeOption,
              userType === 'trusted' ? styles.userTypeOptionActive : styles.userTypeOptionInactive,
            ]}
            onPress={() => setUserType('trusted')}
          >
            <Text style={styles.userTypeIcon}>🤝</Text>
            <Text style={[
              styles.userTypeText,
              userType === 'trusted' ? styles.userTypeTextActive : styles.userTypeTextInactive,
            ]}>
              I was invited{'\n'}as a trusted person
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleSignUp}
          disabled={loading}
        >
          <View style={styles.buttonContent}>
            <Text style={styles.buttonText}>Create My Vault</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.navy} style={styles.buttonArrow} />
          </View>
        </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Login')}
        style={styles.linkButton}
      >
        <Text style={styles.linkText}>Already have an account? <Text style={styles.linkTextBold}>Sign in</Text></Text>
      </TouchableOpacity>
      </View>
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
    padding: 36,
    paddingTop: 48,
    paddingBottom: 32,
    position: 'relative',
    overflow: 'hidden',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerLabel: {
    fontSize: 11,
    color: 'rgba(201,168,76,0.7)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '400',
    color: colors.cream,
    fontFamily: 'serif',
    lineHeight: 36,
  },
  formContainer: {
    flex: 1,
    padding: 28,
    paddingTop: 24,
    display: 'flex',
    flexDirection: 'column',
  },
  inputContainer: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: 16,
    fontSize: 15,
    backgroundColor: colors.white,
    color: colors.textPrimary,
  },
  inputFocused: {
    borderColor: colors.gold,
    borderWidth: 1.5,
  },
  button: {
    padding: 16,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: colors.gold,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  buttonArrow: {
    marginLeft: 4,
  },
  linkButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  linkText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '400',
  },
  linkTextBold: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  userTypeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 14,
  },
  userTypeOption: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  userTypeOptionActive: {
    borderColor: colors.gold,
    backgroundColor: colors.goldPale,
  },
  userTypeOptionInactive: {
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  userTypeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  userTypeText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  userTypeTextActive: {
    color: colors.navy,
  },
  userTypeTextInactive: {
    color: colors.textSecondary,
  },
});
