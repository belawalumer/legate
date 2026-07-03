import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { AlertProvider } from './src/components/AppAlert';
import { UserProfileProvider } from './src/contexts/UserProfileContext';

export default function App() {
  return (
    <AlertProvider>
      <UserProfileProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </UserProfileProvider>
    </AlertProvider>
  );
}
