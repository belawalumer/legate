import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, borderRadius } from '../../constants/theme';
import { authenticateWithBiometrics } from '../../services/auth';

export default function AppLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    attemptUnlock();
  }, []);

  const attemptUnlock = async () => {
    setAuthenticating(true);
    const success = await authenticateWithBiometrics();
    setAuthenticating(false);
    if (success) onUnlock();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Legate</Text>
      <Text style={styles.tagline}>Your legacy, protected</Text>

      {authenticating ? (
        <ActivityIndicator color={colors.gold} style={styles.spinner} />
      ) : (
        <TouchableOpacity style={styles.unlockButton} onPress={attemptUnlock}>
          <Text style={styles.unlockButtonText}>Unlock</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    fontFamily: 'serif',
    fontSize: 44,
    fontWeight: '300',
    color: colors.gold,
    letterSpacing: 3,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(201,168,76,0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 48,
  },
  spinner: {
    marginTop: 8,
  },
  unlockButton: {
    backgroundColor: colors.gold,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 36,
  },
  unlockButtonText: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '600',
  },
});
