import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DeathVerificationScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unlock Vault</Text>
      <Text style={styles.subtitle}>
        Submit death certificate to unlock vault access
      </Text>
      {/* TODO: Implement death verification */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
});
