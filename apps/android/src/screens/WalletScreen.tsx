/**
 * Wallet screen — generate / import HD wallet, list addresses.
 *
 * The encrypted xprv is stored in SecureStore (Android Keystore-backed).
 * Mnemonic is shown only when explicitly requested.
 */

import * as React from 'react';
import { View, ScrollView, StyleSheet, Alert, TextInput } from 'react-native';
import {
  Card,
  Button,
  Text,
  Title,
  useTheme,
  Divider,
  Dialog,
  Portal,
  TextInput as PaperInput,
  List,
  IconButton,
} from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import {
  RigorHdWallet,
  type DerivedAddress,
  encryptWallet,
  decryptWallet,
  type EncryptedWallet,
  generateMnemonic,
} from '@rigormobile/rigor-core/wallet';

const STORAGE_KEY = 'rigormobile.wallet.v1';

export function WalletScreen() {
  const { colors } = useTheme();
  const [wallet, setWallet] = React.useState<RigorHdWallet | null>(null);
  const [mnemonic, setMnemonic] = React.useState<string | null>(null);
  const [addresses, setAddresses] = React.useState<DerivedAddress[]>([]);
  const [status, setStatus] = React.useState<'none' | 'locked' | 'unlocked'>(
    'none',
  );
  const [showMnemonic, setShowMnemonic] = React.useState(false);
  const [createPwd, setCreatePwd] = React.useState('');
  const [unlockPwd, setUnlockPwd] = React.useState('');
  const [importMn, setImportMn] = React.useState('');
  const [importPwd, setImportPwd] = React.useState('');
  const [dialog, setDialog] = React.useState<null | 'create' | 'import' | 'unlock'>(null);

  React.useEffect(() => {
    (async () => {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) {
        try {
          const enc = JSON.parse(raw) as EncryptedWallet;
          setStatus('locked');
        } catch {
          /* ignore */
        }
      }
    })();
  }, []);

  const persist = async (mn: string, password: string) => {
    const w = RigorHdWallet.fromMnemonic(mn);
    const enc = await encryptWallet(w.exportXprv(), password);
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(enc));
    setWallet(w);
    setMnemonic(mn);
    setAddresses(w.deriveAddressBatch(10));
    setStatus('unlocked');
  };

  const create = async () => {
    if (createPwd.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    const mn = generateMnemonic(256);
    await persist(mn, createPwd);
    setDialog(null);
    setCreatePwd('');
    Alert.alert('Wallet created', 'Save your 24-word mnemonic somewhere safe!');
  };

  const import_ = async () => {
    if (!importMn.trim()) return Alert.alert('Mnemonic required');
    if (importPwd.length < 8) return Alert.alert('Password too short');
    try {
      await persist(importMn.trim(), importPwd);
      setDialog(null);
      setImportMn('');
      setImportPwd('');
    } catch (err) {
      Alert.alert('Import failed', String(err));
    }
  };

  const unlock = async () => {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return;
    try {
      const enc = JSON.parse(raw) as EncryptedWallet;
      const xprv = await decryptWallet(enc, unlockPwd);
      const w = RigorHdWallet.fromSeed(xprv);
      setWallet(w);
      setAddresses(w.deriveAddressBatch(10));
      setStatus('unlocked');
      setDialog(null);
      setUnlockPwd('');
    } catch {
      Alert.alert('Wrong password');
    }
  };

  const wipe = async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    setWallet(null);
    setMnemonic(null);
    setAddresses([]);
    setStatus('none');
  };

  if (status !== 'unlocked' || !wallet) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        <Card style={styles.card}>
          <Card.Title
            title="RigorChain HD Wallet"
            subtitle="BIP32 / BIP44 · Bech32 rg"
          />
          <Card.Content>
            <Text style={{ opacity: 0.7, marginBottom: 12 }}>
              Create a new wallet or import an existing mnemonic. The encrypted
              xprv is stored in Android SecureStore (Keystore-backed).
            </Text>
            <View style={{ gap: 8 }}>
              <Button mode="contained" onPress={() => setDialog('create')} icon="plus">
                Create new wallet
              </Button>
              <Button mode="outlined" onPress={() => setDialog('import')} icon="import">
                Import from mnemonic
              </Button>
              {status === 'locked' && (
                <Button mode="outlined" onPress={() => setDialog('unlock')} icon="lock-open">
                  Unlock existing wallet
                </Button>
              )}
            </View>
          </Card.Content>
        </Card>

        <Portal>
          <Dialog visible={dialog === 'create'} onDismiss={() => setDialog(null)}>
            <Dialog.Title>Create wallet</Dialog.Title>
            <Dialog.Content>
              <PaperInput
                label="New password (min 8 chars)"
                value={createPwd}
                onChangeText={setCreatePwd}
                secureTextEntry
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDialog(null)}>Cancel</Button>
              <Button onPress={create}>Create</Button>
            </Dialog.Actions>
          </Dialog>
          <Dialog visible={dialog === 'import'} onDismiss={() => setDialog(null)}>
            <Dialog.Title>Import wallet</Dialog.Title>
            <Dialog.Content>
              <PaperInput
                label="BIP39 mnemonic"
                value={importMn}
                onChangeText={setImportMn}
                multiline
                numberOfLines={3}
              />
              <PaperInput
                label="New encryption password"
                value={importPwd}
                onChangeText={setImportPwd}
                secureTextEntry
                style={{ marginTop: 8 }}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDialog(null)}>Cancel</Button>
              <Button onPress={import_}>Import</Button>
            </Dialog.Actions>
          </Dialog>
          <Dialog visible={dialog === 'unlock'} onDismiss={() => setDialog(null)}>
            <Dialog.Title>Unlock wallet</Dialog.Title>
            <Dialog.Content>
              <PaperInput
                label="Password"
                value={unlockPwd}
                onChangeText={setUnlockPwd}
                secureTextEntry
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDialog(null)}>Cancel</Button>
              <Button onPress={unlock}>Unlock</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Card style={styles.card}>
        <Card.Title title="Your addresses" subtitle={`First ${addresses.length}`} />
        <Card.Content>
          {addresses.map((a, i) => (
            <View key={a.address}>
              <List.Item
                title={a.address}
                description={a.path}
                left={() => (
                  <Text style={{ paddingTop: 14, opacity: 0.5, fontFamily: 'monospace' }}>
                    {i.toString().padStart(2, '0')}
                  </Text>
                )}
                right={() => (
                  <IconButton
                    icon="content-copy"
                    onPress={async () => {
                      await Clipboard.setStringAsync(a.address);
                      Alert.alert('Copied');
                    }}
                  />
                )}
              />
              <Divider />
            </View>
          ))}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Recovery phrase" subtitle="BIP39 — 24 words" />
        <Card.Content>
          <Button
            mode={showMnemonic ? 'outlined' : 'contained'}
            onPress={() => setShowMnemonic((v) => !v)}
            icon={showMnemonic ? 'eye-off' : 'eye'}
          >
            {showMnemonic ? 'Hide mnemonic' : 'Reveal mnemonic'}
          </Button>
          {showMnemonic && mnemonic && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ opacity: 0.7, marginBottom: 6 }}>
                Anyone with these words owns your funds.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {mnemonic.split(' ').map((w, i) => (
                  <View
                    key={i}
                    style={{
                      borderWidth: 1,
                      borderColor: 'rgba(150,150,150,0.3)',
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      marginRight: 4,
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      <Text style={{ opacity: 0.5 }}>{(i + 1).toString().padStart(2, '0')} </Text>
                      {w}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      <View style={{ gap: 8 }}>
        <Button mode="outlined" onPress={() => { setWallet(null); setMnemonic(null); setAddresses([]); setStatus('locked'); }} icon="lock">
          Lock wallet
        </Button>
        <Button mode="text" onPress={wipe} icon="trash-can" textColor={colors.error}>
          Wipe wallet from device
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 16 },
});
