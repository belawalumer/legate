import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../constants/theme';
import SplashScreen from '../screens/splash/SplashScreen';
import AppLockScreen from '../screens/auth/AppLockScreen';
import { getBiometricLockEnabled, getAutoLockSeconds } from '../services/appSettings';
import { isBiometricAvailable } from '../services/auth';

// Screens (we'll create these)
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import HomeScreen from '../screens/home/HomeScreen';
import VaultScreen from '../screens/vault/VaultScreen';
import VaultItemDetailScreen from '../screens/vault/VaultItemDetailScreen';
import AddVaultItemScreen from '../screens/vault/AddVaultItemScreen';
import CategoryItemsScreen from '../screens/vault/CategoryItemsScreen';
import ChecklistScreen from '../screens/estate/ChecklistScreen';
import DocumentsScreen from '../screens/estate/DocumentsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import TrustedPersonsScreen from '../screens/settings/TrustedPersonsScreen';
import DeathVerificationScreen from '../screens/estate/DeathVerificationScreen';
import HeirWorkspaceScreen from '../screens/workspace/HeirWorkspaceScreen';
import SubscriptionTrackerScreen from '../screens/workspace/SubscriptionTrackerScreen';
import PaywallScreen from '../screens/settings/PaywallScreen';
import LegalDocumentScreen, { LegalDocumentContent } from '../screens/settings/LegalDocumentScreen';

export type RootStackParamList = {
  Auth: { screen?: 'Login' | 'SignUp' } | undefined;
  Main: undefined;
  Onboarding: undefined;
  VaultItemDetail: { itemId: string; vaultOwnerId?: string };
  AddVaultItem: { category?: string; itemId?: string };
  CategoryItems: { category: string; vaultOwnerId?: string; vaultOwnerName?: string };
  DeathVerification: undefined;
  Checklist: { vaultOwnerId?: string; vaultOwnerName?: string } | undefined;
  TrustedPersons: { vaultOwnerId?: string; vaultOwnerName?: string } | undefined;
  WorkspaceVault: { vaultOwnerId: string; vaultOwnerName: string };
  WorkspaceDocuments: { vaultOwnerId: string; vaultOwnerName: string };
  Subscriptions: { vaultOwnerId?: string; vaultOwnerName?: string } | undefined;
  HeirWorkspace: { vaultOwnerId: string };
  Paywall: undefined;
  LegalDocument: { content: LegalDocumentContent };
  Login: undefined;
  SignUp: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Vault: undefined;
  Trusted: undefined;
  Documents: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.navy,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.cream,
        headerTitleStyle: {
          fontWeight: '400',
          fontSize: 22,
          fontFamily: 'serif',
        },
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 20,
          paddingTop: 10,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '400',
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof MaterialCommunityIcons.glyphMap;
          let iconColor = focused ? colors.navy : colors.textMuted;

          if (route.name === 'Home') {
            iconName = focused ? 'home-variant' : 'home-variant-outline';
          } else if (route.name === 'Vault') {
            iconName = focused ? 'lock' : 'lock-outline';
          } else if (route.name === 'Trusted') {
            iconName = focused ? 'account-group' : 'account-group-outline';
          } else if (route.name === 'Documents') {
            iconName = focused ? 'folder' : 'folder-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'cog' : 'cog-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          return (
            <View style={{ alignItems: 'center' }}>
              <MaterialCommunityIcons 
                name={iconName} 
                size={22} 
                color={iconColor} 
              />
              {focused && (
                <View style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.gold,
                  marginTop: 4,
                }} />
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Home', headerShown: false }}
      />
      <Tab.Screen 
        name="Vault" 
        component={VaultScreen}
        options={{ title: 'Your Vault', headerShown: false }}
      />
      <Tab.Screen 
        name="Trusted" 
        component={TrustedPersonsScreen}
        options={{ title: 'Trusted', headerShown: false }}
      />
      <Tab.Screen 
        name="Documents" 
        component={DocumentsScreen}
        options={{ title: 'Documents', headerShown: false }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings', headerShown: false }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [splashDone, setSplashDone] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [locked, setLocked] = useState(false);
  const appState = useRef(AppState.currentState);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    // Check if user has seen onboarding
    AsyncStorage.getItem('hasSeenOnboarding').then((value) => {
      setHasSeenOnboarding(value === 'true');
    });

    // Show splash for at least 2 seconds
    const timer = setTimeout(() => {
      setSplashDone(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user) return;

    const checkLockOnLaunch = async () => {
      const enabled = await getBiometricLockEnabled();
      const available = enabled && (await isBiometricAvailable());
      if (available) setLocked(true);
    };
    checkLockOnLaunch();

    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      const goingToBackground =
        appState.current === 'active' && nextState.match(/inactive|background/);
      const cameFromBackground =
        appState.current.match(/inactive|background/) && nextState === 'active';
      appState.current = nextState;

      if (goingToBackground) {
        backgroundedAt.current = Date.now();
        return;
      }

      if (cameFromBackground) {
        const enabled = await getBiometricLockEnabled();
        const available = enabled && (await isBiometricAvailable());
        if (!available) {
          backgroundedAt.current = null;
          return;
        }

        const autoLockSeconds = await getAutoLockSeconds();
        const elapsedMs = backgroundedAt.current ? Date.now() - backgroundedAt.current : Infinity;
        backgroundedAt.current = null;

        if (elapsedMs >= autoLockSeconds * 1000) {
          setLocked(true);
        }
      }
    });

    return () => subscription.remove();
  }, [user]);

  // Show splash screen until both splash delay and auth loading are complete
  if (!splashDone || loading || hasSeenOnboarding === null) {
    return <SplashScreen />;
  }

  if (user && locked) {
    return <AppLockScreen onUnlock={() => setLocked(false)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName={
          user 
            ? 'Main' 
            : !hasSeenOnboarding 
              ? 'Onboarding' 
              : 'Auth'
        }
      >
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="VaultItemDetail" 
              component={VaultItemDetailScreen}
              options={{ 
                headerShown: true, 
                title: 'Vault Item',
                headerStyle: {
                  backgroundColor: colors.navy,
                },
                headerTintColor: colors.cream,
                headerTitleStyle: {
                  fontFamily: 'serif',
                  fontWeight: '400',
                },
              }}
            />
            <Stack.Screen 
              name="AddVaultItem" 
              component={AddVaultItemScreen}
              options={{ 
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="CategoryItems" 
              component={CategoryItemsScreen}
              options={{ 
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="DeathVerification" 
              component={DeathVerificationScreen}
              options={{ 
                headerShown: true, 
                title: 'Unlock Vault',
                headerStyle: {
                  backgroundColor: colors.navy,
                },
                headerTintColor: colors.cream,
                headerTitleStyle: {
                  fontFamily: 'serif',
                  fontWeight: '400',
                },
              }}
            />
            <Stack.Screen
              name="Checklist"
              component={ChecklistScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="TrustedPersons"
              component={TrustedPersonsScreen}
              options={{
                headerShown: true,
                title: 'Trusted Persons',
                headerStyle: {
                  backgroundColor: colors.navy,
                },
                headerTintColor: colors.cream,
                headerTitleStyle: {
                  fontFamily: 'serif',
                  fontWeight: '400',
                },
              }}
            />
            <Stack.Screen
              name="WorkspaceVault"
              component={VaultScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="WorkspaceDocuments"
              component={DocumentsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Subscriptions"
              component={SubscriptionTrackerScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="HeirWorkspace"
              component={HeirWorkspaceScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Paywall"
              component={PaywallScreen}
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name="LegalDocument"
              component={LegalDocumentScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen 
              name="Onboarding" 
              component={OnboardingScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="Auth" component={AuthStack} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AuthStack({ route }: any) {
  // Get the initial screen from route params if provided
  const initialScreen = route?.params?.screen || 'Login';
  
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName={initialScreen}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
