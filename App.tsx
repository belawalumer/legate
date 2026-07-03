import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { AlertProvider } from './src/components/AppAlert';

export default function App() {
  return (
    <AlertProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </AlertProvider>
  );
}
