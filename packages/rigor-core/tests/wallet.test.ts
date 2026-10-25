import { describe, it, expect } from 'vitest';
import { RigorHdWallet, RIGOR_COIN_TYPE, generateMnemonic } from '../src/wallet/index.js';
import { encodeAddress, decodeAddress, isValidAddress } from '../src/wallet/bech32.js';

describe('bech32 rg addresses', () => {
  it('encodes and decodes a 20-byte p2wpkh program', () => {
    const program = new Uint8Array(20).fill(0x42);
    const addr = encodeAddress(program, 0);
    expect(addr.startsWith('rg1')).toBe(true);
    const decoded = decodeAddress(addr);
    expect(decoded.witnessVersion).toBe(0);
    expect(Array.from(decoded.program)).toEqual(Array.from(program));
  });

  it('rejects non-rg HRPs', () => {
    expect(isValidAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe(false);
  });

  it('accepts a real generated address', () => {
    const mnemonic = generateMnemonic(128);
    const w = RigorHdWallet.fromMnemonic(mnemonic);
    const a = w.deriveAddress(0, 0, 0);
    expect(isValidAddress(a.address)).toBe(true);
  });
});

describe('RigorHdWallet derivation', () => {
  it('derives the same address from the same mnemonic', () => {
    const mnemonic =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const w1 = RigorHdWallet.fromMnemonic(mnemonic);
    const w2 = RigorHdWallet.fromMnemonic(mnemonic);
    const a1 = w1.deriveAddress(0, 0, 0);
    const a2 = w2.deriveAddress(0, 0, 0);
    expect(a1.address).toBe(a2.address);
    expect(a1.path).toBe(`m/44'/${RIGOR_COIN_TYPE}'/0'/0/0`);
  });

  it('derives different addresses for different indices', () => {
    const mnemonic = generateMnemonic(128);
    const w = RigorHdWallet.fromMnemonic(mnemonic);
    const a0 = w.deriveAddress(0, 0, 0);
    const a1 = w.deriveAddress(0, 0, 1);
    expect(a0.address).not.toBe(a1.address);
  });

  it('exports an xprv and an xpub', () => {
    const mnemonic = generateMnemonic(128);
    const w = RigorHdWallet.fromMnemonic(mnemonic);
    expect(w.exportXprv()).toMatch(/^xprv/);
    expect(w.exportXpub()).toMatch(/^xpub/);
  });
});
