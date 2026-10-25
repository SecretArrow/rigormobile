/**
 * Merkle-root computation for the RigorChain block header.
 *
 * Bitcoin-compatible double-SHA256 merkle tree with the standard mutation
 * when the transaction count is odd (the last node is duplicated per level).
 *
 * The coinbase transaction hash is the first leaf; subsequent leaves are the
 * witness-stripped txids of the template transactions returned by
 * `getblocktemplate`.
 */

import { sha256 } from '@noble/hashes/sha256';

/** Compute the merkle root from a list of 32-byte little-endian txids. */
export function computeMerkleRoot(txids: Uint8Array[]): Uint8Array {
  if (txids.length === 0) {
    throw new Error('merkle root requires at least one tx (the coinbase)');
  }
  if (txids.length === 1) {
    return txids[0]!.slice();
  }
  let level = txids.map((t) => {
    if (t.length !== 32) throw new RangeError(`txid must be 32 bytes, got ${t.length}`);
    return t.slice() as Uint8Array;
  });
  while (level.length > 1) {
    if (level.length % 2 === 1) {
      // Bitcoin duplicates the last node when the level has an odd count.
      level.push(level[level.length - 1]!.slice());
    }
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(doubleSha256(level[i]!, level[i + 1]!));
    }
    level = next;
  }
  return level[0]!;
}

/** Concatenate two 32-byte hashes and double-SHA256 them (Bitcoin merkle step). */
export function doubleSha256(a: Uint8Array, b: Uint8Array): Uint8Array {
  const buf = new Uint8Array(64);
  buf.set(a, 0);
  buf.set(b, 32);
  return sha256(sha256(buf));
}

/** Hex helper — returns a hex string (lowercase) for the given bytes. */
export function toHex(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i]!.toString(16).padStart(2, '0');
  }
  return s;
}

/** Reverse the byte order of a fixed-size buffer (used for hex display of
 *  little-endian hashes). */
export function reverseBytes(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[bytes.length - 1 - i];
  return out;
}
