import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProfileProvider, useProfile } from './src/context/ProfileContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

type Screen = 'home' | 'scanner' | 'settings';
type ScanMode = 'barcode' | 'photo';

function Root() {
  const { loaded } = useProfile();
  const [screen, setScreen] = useState<Screen>('home');
  const [initialMode, setInitialMode] = useState<ScanMode>('barcode');

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const openScanner = (mode: ScanMode) => {
    setInitialMode(mode);
    setScreen('scanner');
  };

  if (screen === 'settings') {
    return (
      <>
        <StatusBar style="dark" />
        <SettingsScreen onClose={() => setScreen('home')} />
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
      <StatusBar style="dark" />
      <HomeScreen
        onScanBarcode={() => openScanner('barcode')}
        onScanPhoto={() => openScanner('photo')}
        onOpenSettings={() => setScreen('settings')}
      />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <Root />
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
