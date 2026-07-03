import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ChecklistScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Estate Checklist</Text>
      <Text style={styles.subtitle}>
        Auto-generated tasks based on your vault contents
      </Text>
      {/* TODO: Implement checklist */}
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
