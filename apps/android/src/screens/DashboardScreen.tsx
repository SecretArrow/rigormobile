/**
 * Dashboard screen — overview of network + mining state.
 */

import * as React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Text, useTheme, Divider } from 'react-native-paper';
import { miningService, type AndroidMinerState } from '../services/mining';
import {
  CHAIN_NAME,
  P2P_PORT,
  RPC_PORT,
  BECH32_HRP,
  RGR_POW_TAG,
  HEADER_SIZE,
  ORU_BLOCK_SUBSIDY,
  TARGET_BLOCK_TIME,
} from '@rigormobile/rigor-core/protocol';
import { formatHashRate, formatDuration } from '@rigormobile/rigor-core/utils';

export function DashboardScreen() {
  const [state, setState] = React.useState<AndroidMinerState>(
    miningService['state'],
  );
  React.useEffect(() => miningService.subscribe(setState), []);
  const { colors } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Card style={styles.card}>
        <Card.Title title="Network" subtitle="RigorChain mainnet v0.2" />
        <Card.Content>
          <KV label="Chain" value={CHAIN_NAME} />
          <KV label="Magic" value="ce f1 db fa" />
          <KV label="P2P port" value={String(P2P_PORT)} />
          <KV label="RPC port" value={String(RPC_PORT)} />
          <KV label="Bech32 HRP" value={BECH32_HRP} />
          <KV label="PoW tag" value={RGR_POW_TAG} />
          <KV label="Header" value={`${HEADER_SIZE} bytes`} />
          <KV label="Block time" value={`${TARGET_BLOCK_TIME / 60} min`} />
          <KV label="Subsidy" value={`${ORU_BLOCK_SUBSIDY} ORU / block`} />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Mining engine" subtitle={state.backend.toUpperCase()} />
        <Card.Content>
          <View style={styles.row}>
            <Text style={{ color: colors.onSurfaceVariant }}>Status</Text>
            <Text style={{ color: colors.primary }}>{state.status}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ color: colors.onSurfaceVariant }}>Hashrate</Text>
            <Text style={styles.mono}>{formatHashRate(state.hashesPerSecond)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ color: colors.onSurfaceVariant }}>Hashes</Text>
            <Text style={styles.mono}>{state.hashes.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ color: colors.onSurfaceVariant }}>Elapsed</Text>
            <Text style={styles.mono}>{formatDuration(state.elapsedMs)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ color: colors.onSurfaceVariant }}>Solutions</Text>
            <Text style={styles.mono}>{state.solutionsFound}</Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.row}>
            <Text style={{ color: colors.onSurfaceVariant }}>Block height</Text>
            <Text style={styles.mono}>{state.blockHeight ?? '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ color: colors.onSurfaceVariant }}>Bits</Text>
            <Text style={styles.mono}>{state.bits ?? '—'}</Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  divider: { marginVertical: 8 },
  mono: { fontFamily: 'monospace', fontWeight: '600' },
});

function KV({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={{ opacity: 0.7 }}>{label}</Text>
      <Text style={styles.mono}>{value}</Text>
    </View>
  );
}
