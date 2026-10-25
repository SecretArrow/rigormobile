/**
 * Lightweight navigator — three tabs (Dashboard / Miner / Wallet) using
 * react-native-paper + a custom tab bar. No navigation library needed for
 * an MVP; we keep it dependency-light.
 */

import * as React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { BottomNavigation, useTheme } from 'react-native-paper';
import { DashboardScreen } from './DashboardScreen';
import { MinerScreen } from './MinerScreen';
import { WalletScreen } from './WalletScreen';

type Route = 'dashboard' | 'miner' | 'wallet';

export function AppNavigator() {
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState<
    Array<{ key: Route; title: string; icon: string; color: string }>
  >([
    { key: 'dashboard', title: 'Home', icon: 'view-dashboard', color: '#10b981' },
    { key: 'miner', title: 'Miner', icon: 'cpu-64-bit', color: '#f59e0b' },
    { key: 'wallet', title: 'Wallet', icon: 'wallet', color: '#8b5cf6' },
  ]);

  const renderScene = ({ route }: { route: { key: Route } }) => {
    switch (route.key) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'miner':
        return <MinerScreen />;
      case 'wallet':
        return <WalletScreen />;
    }
  };

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
      shifting
      sceneAnimationEnabled
    />
  );
}
