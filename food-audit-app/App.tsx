import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProfileProvider, useProfile } from './src/context/ProfileContext';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

type Screen = 'scanner' | 'settings';

function Root() {
  const { loaded } = useProfile();
  const [screen, setScreen] = useState<Screen>('scanner');

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return screen === 'scanner' ? (
    <>
      <StatusBar style="light" />
      <ScannerScreen onOpenSettings={() => setScreen('settings')} />
    </>
  ) : (
    <>
      <StatusBar style="dark" />
      <SettingsScreen onClose={() => setScreen('scanner')} />
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
