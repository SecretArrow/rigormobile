/**
 * Bech32 / Bech32m encoding for the RigorChain `rg` HRP.
 *
 * RigorChain uses the same SegWit-style addresses as Bitcoin with HRP `rg`.
 * Native SegWit (v0) is Bech32; witness v1+ uses Bech32m.
 *
 * Implementation delegates to `@scure/base` which is audited and works in
 * the browser, Node, and React Native without polyfills.
 */

import { bech32, bech32m } from '@scure/base';
import { BECH32_HRP } from '../protocol/constants';

export interface Bech32Address {
  hrp: string;
  witnessVersion: number;
  program: Uint8Array;
}

/** Encode a witness program into a Bech32(m) `rg…` address. */
export function encodeAddress(program: Uint8Array, witnessVersion = 0): string {
  if (witnessVersion !== 0 && witnessVersion !== 1) {
    throw new RangeError(`unsupported witness version: ${witnessVersion}`);
  }
  if (witnessVersion === 0) {
    if (program.length !== 20 && program.length !== 32) {
      throw new RangeError('v0 program must be 20 (p2wpkh) or 32 (p2wsh) bytes');
    }
    const hrp = BECH32_HRP as `${string}1${string}`;
    return bech32.encode(hrp, [0, ...bech32.toWords(program)]);
  }
  const hrp = BECH32_HRP as `${string}1${string}`;
  return bech32m.encode(hrp, [1, ...bech32m.toWords(program)]);
}

/** Decode a Bech32(m) `rg…` address into its witness program. */
export function decodeAddress(addr: string): Bech32Address {
  // Try Bech32 first (v0), then Bech32m (v1+).
  try {
    const typed = addr as `${string}1${string}`;
    const { prefix, words } = bech32.decode(typed);
    if (prefix !== BECH32_HRP) {
      throw new Error(`unexpected hrp: ${prefix}`);
    }
    const [version, ...rest] = words;
    if (version !== 0) throw new Error(`v${version} not valid for bech32`);
    return {
      hrp: prefix,
      witnessVersion: 0,
      program: bech32.fromWords(rest),
    };
  } catch {
    const typed = addr as `${string}1${string}`;
    const { prefix, words } = bech32m.decode(typed);
    if (prefix !== BECH32_HRP) {
      throw new Error(`unexpected hrp: ${prefix}`);
    }
    const [version, ...rest] = words;
    return {
      hrp: prefix,
      witnessVersion: version,
      program: bech32m.fromWords(rest),
    };
  }
}

/** Validate that a string is a well-formed `rg…` address. */
export function isValidAddress(addr: string): boolean {
  try {
    decodeAddress(addr);
    return true;
  } catch {
    return false;
  }
}
