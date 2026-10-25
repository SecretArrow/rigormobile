/**
 * App entry point for the RigorMobile Android miner.
 *
 * Wires up the navigation, background-mining service, and cronjobs
 * (WorkManager periodic tasks). The native OpenCL module is loaded lazily
 * the first time the user starts mining with the "GPU" backend selected.
 */

import 'react-native-get-random-values';
import * as React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, DefaultTheme, DarkTheme } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { AppNavigator } from './src/screens/Navigator';
import { initBackgroundService } from './src/services/background';
import { initCronjobs } from './src/services/cronjobs';

export default function App() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  React.useEffect(() => {
    // Start the foreground service keeper + WorkManager cronjobs on mount.
    initBackgroundService();
    initCronjobs();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <StatusBar style="auto" />
          <AppNavigator />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
