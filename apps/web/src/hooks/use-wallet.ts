/**
 * Client-side wallet hook — wraps {@link RigorHdWallet} with React state.
 *
 * Holds the (decrypted) wallet in memory only. The encrypted blob is
 * persisted to localStorage so the user can re-unlock on next visit. The
 * hook never auto-re-encrypts; the user must explicitly call `lock()` to
 * clear the in-memory key.
 */

'use client';

import * as React from 'react';
import {
  RigorHdWallet,
  type DerivedAddress,
  encryptWallet,
  decryptWallet,
  type EncryptedWallet,
  generateMnemonic,
} from '@rigormobile/rigor-core/wallet';

const STORAGE_KEY = 'rigormobile.wallet.v1';

export interface WalletState {
  status: 'none' | 'locked' | 'unlocked' | 'creating' | 'error';
  mnemonic?: string;
  wallet?: RigorHdWallet;
  addresses: DerivedAddress[];
  encrypted?: EncryptedWallet;
  errorMessage: string | null;
}

const INITIAL: WalletState = {
  status: 'none',
  addresses: [],
  errorMessage: null,
};

export function useWallet() {
  const [state, setState] = React.useState<WalletState>(INITIAL);

  // On mount: check localStorage for an existing sealed wallet
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const encrypted = JSON.parse(raw) as EncryptedWallet;
        setState({ status: 'locked', encrypted, addresses: [], errorMessage: null });
      }
    } catch (err) {
      console.warn('failed to read wallet from storage', err);
    }
  }, []);

  const createNew = React.useCallback(async (password: string) => {
    setState((prev) => ({ ...prev, status: 'creating' }));
    try {
      const mnemonic = generateMnemonic(256); // 24 words
      const wallet = RigorHdWallet.fromMnemonic(mnemonic);
      const addresses = wallet.deriveAddressBatch(10);
      const encrypted = await encryptWallet(wallet.exportXprv(), password);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
      setState({
        status: 'unlocked',
        mnemonic,
        wallet,
        addresses,
        encrypted,
        errorMessage: null,
      });
      return mnemonic;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err instanceof Error ? err.message : String(err),
      }));
      throw err;
    }
  }, []);

  const importMnemonic = React.useCallback(
    async (mnemonic: string, password: string) => {
      setState((prev) => ({ ...prev, status: 'creating' }));
      try {
        const wallet = RigorHdWallet.fromMnemonic(mnemonic);
        const addresses = wallet.deriveAddressBatch(10);
        const encrypted = await encryptWallet(wallet.exportXprv(), password);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
        setState({
          status: 'unlocked',
          mnemonic,
          wallet,
          addresses,
          encrypted,
          errorMessage: null,
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: err instanceof Error ? err.message : String(err),
        }));
        throw err;
      }
    },
    [],
  );

  const unlock = React.useCallback(async (password: string) => {
    setState((prev) => {
      if (!prev.encrypted) return prev;
      return { ...prev, status: 'creating' };
    });
    try {
      const encrypted = state.encrypted;
      if (!encrypted) throw new Error('no sealed wallet found');
      const xprv = await decryptWallet(encrypted, password);
      const wallet = RigorHdWallet.fromSeed(xprv);
      const addresses = wallet.deriveAddressBatch(10);
      setState({
        status: 'unlocked',
        wallet,
        addresses,
        encrypted,
        errorMessage: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err instanceof Error ? err.message : String(err),
      }));
      throw err;
    }
  }, [state.encrypted]);

  const lock = React.useCallback(() => {
    setState((prev) => ({
      status: prev.encrypted ? 'locked' : 'none',
      encrypted: prev.encrypted,
      addresses: [],
      errorMessage: null,
    }));
  }, []);

  const wipe = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL);
  }, []);

  const deriveMore = React.useCallback((count: number) => {
    setState((prev) => {
      if (!prev.wallet) return prev;
      const start = prev.addresses.length;
      const more = prev.wallet.deriveAddressBatch(count, 0, 0, start);
      return { ...prev, addresses: [...prev.addresses, ...more] };
    });
  }, []);

  return {
    state,
    createNew,
    importMnemonic,
    unlock,
    lock,
    wipe,
    deriveMore,
  };
}
