import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProfileProvider, useProfile } from './src/context/ProfileContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { FavoritesScreen } from './src/screens/FavoritesScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { isOnboardingComplete } from './src/storage/onboardingStorage';

type Screen = 'loading' | 'onboarding' | 'home' | 'scanner' | 'settings' | 'history' | 'favorites';
type ScanMode = 'barcode' | 'photo';

function Root() {
  const { loaded } = useProfile();
  const { isDark, colors } = useTheme();
  const [screen, setScreen] = useState<Screen>('loading');
  const [initialMode, setInitialMode] = useState<ScanMode>('barcode');

  useEffect(() => {
    if (!loaded) return;
    isOnboardingComplete().then((done) => {
      setScreen(done ? 'home' : 'onboarding');
    });
  }, [loaded]);

  if (screen === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator />
      </View>
    );
  }

  const openScanner = (mode: ScanMode) => {
    setInitialMode(mode);
    setScreen('scanner');
  };

  if (screen === 'onboarding') {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <OnboardingScreen onDone={() => setScreen('home')} />
      </>
    );
  }

  if (screen === 'settings') {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SettingsScreen onClose={() => setScreen('home')} />
      </>
    );
  }

  if (screen === 'history') {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <HistoryScreen onBack={() => setScreen('home')} />
      </>
    );
  }

  if (screen === 'favorites') {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <FavoritesScreen onBack={() => setScreen('home')} />
      </>
    );
  }

  if (screen === 'scanner') {
    return (
      <>
        <StatusBar style="light" />
        <ScannerScreen
          initialMode={initialMode}
          onOpenSettings={() => setScreen('settings')}
          onBack={() => setScreen('home')}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <HomeScreen
        onScanBarcode={() => openScanner('barcode')}
        onScanPhoto={() => openScanner('photo')}
        onOpenSettings={() => setScreen('settings')}
        onOpenHistory={() => setScreen('history')}
        onOpenFavorites={() => setScreen('favorites')}
      />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ProfileProvider>
          <Root />
        </ProfileProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
