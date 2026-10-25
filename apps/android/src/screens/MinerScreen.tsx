/**
 * Miner screen — start/stop mining + live stats.
 *
 * Wires the foreground service so mining continues when the app is
 * backgrounded.
 */

import * as React from 'react';
import { View, ScrollView, StyleSheet, TextInput, Alert } from 'react-native';
import {
  Card,
  Button,
  Text,
  Title,
  useTheme,
  ActivityIndicator,
  Switch,
  HelperText,
} from 'react-native-paper';
import { miningService, type AndroidMinerState } from '../services/mining';
import {
  startMiningBackground,
  stopMiningBackground,
} from '../services/background';
import { formatHashRate, formatDuration } from '@rigormobile/rigor-core/utils';
import * as SecureStore from 'expo-secure-store';
import { keepAwakeActivate, keepAwakeDeactivate } from '../hooks/use-keep-awake';

export function MinerScreen() {
  const [state, setState] = React.useState<AndroidMinerState>(
    miningService['state'],
  );
  React.useEffect(() => miningService.subscribe(setState), []);
  const { colors } = useTheme();

  const [rpcUrl, setRpcUrl] = React.useState('');
  const [rpcUser, setRpcUser] = React.useState('');
  const [rpcPass, setRpcPass] = React.useState('');
  const [keepAwake, setKeepAwake] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      const url = await SecureStore.getItemAsync('rpc.url');
      const user = await SecureStore.getItemAsync('rpc.user');
      const pass = await SecureStore.getItemAsync('rpc.pass');
      if (url) setRpcUrl(url);
      if (user) setRpcUser(user);
      if (pass) setRpcPass(pass);
    })();
  }, []);

  const start = async () => {
    if (rpcUrl) {
      await SecureStore.setItemAsync('rpc.url', rpcUrl);
      if (rpcUser) await SecureStore.setItemAsync('rpc.user', rpcUser);
      if (rpcPass) await SecureStore.setItemAsync('rpc.pass', rpcPass);
    }
    if (keepAwake) keepAwakeActivate();
    await startMiningBackground();
    await miningService.start(rpcUrl || undefined, rpcUser || undefined, rpcPass || undefined);
  };

  const stop = async () => {
    miningService.stop();
    await stopMiningBackground();
    keepAwakeDeactivate();
  };

  const running = state.status === 'running';
  const starting = state.status === 'starting';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Card style={styles.card}>
        <Card.Title
          title="Hashrate"
          subtitle={`Backend: ${state.backend.toUpperCase()}`}
        />
        <Card.Content>
          <Text style={styles.hrValue}>{formatHashRate(state.hashesPerSecond)}</Text>
          <View style={styles.row}>
            <Text>Hashes</Text>
            <Text style={styles.mono}>{state.hashes.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text>Elapsed</Text>
            <Text style={styles.mono}>{formatDuration(state.elapsedMs)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Solutions</Text>
            <Text style={styles.mono}>{state.solutionsFound}</Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Node connection" subtitle="Leave empty for demo mode" />
        <Card.Content>
          <TextInput
            style={styles.input}
            placeholder="http://192.168.1.10:8761"
            value={rpcUrl}
            onChangeText={setRpcUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="username"
            value={rpcUser}
            onChangeText={setRpcUser}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="password"
            value={rpcPass}
            onChangeText={setRpcPass}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <HelperText type="info">
            Stored in Android SecureStore (encrypted with the OS key).
          </HelperText>
          <View style={styles.row}>
            <Text>Keep screen awake</Text>
            <Switch value={keepAwake} onValueChange={setKeepAwake} />
          </View>
        </Card.Content>
      </Card>

      <View style={styles.buttonRow}>
        <Button
          mode="contained"
          onPress={start}
          disabled={running || starting}
          style={styles.button}
          icon="play"
        >
          {starting ? 'Starting…' : 'Start'}
        </Button>
        <Button
          mode="outlined"
          onPress={stop}
          disabled={!running && !starting}
          style={styles.button}
          icon="stop"
        >
          Stop
        </Button>
      </View>

      {state.errorMessage && (
        <Card style={[styles.card, { borderColor: colors.error }]}>
          <Card.Content>
            <Text style={{ color: colors.error }}>{state.errorMessage}</Text>
          </Card.Content>
        </Card>
      )}

      {starting && (
        <View style={styles.loading}>
          <ActivityIndicator animating />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 16 },
  hrValue: {
    fontSize: 36,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    alignItems: 'center',
  },
  mono: { fontFamily: 'monospace', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 4,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: { flex: 1 },
  loading: { padding: 12, alignItems: 'center' },
});
