/**
 * RigorChain PoW hashing kernel.
 *
 *     digest = SHA3-256("RGRPOW01" || header_80)
 *
 * The tag `RGRPOW01` is exactly 8 ASCII bytes, so the input to the hash is
 * 88 bytes total. The 32-byte digest is compared against the target encoded
 * in the `bits` field; if `digest < target`, the block is a valid solution.
 *
 * We use `js-sha3` because it's the fastest pure-JS SHA3 implementation
 * available across browser / worker / Node / React Native. On the web app,
 * the kernel runs inside a WebGPU compute shader when available (see
 * `mining/webgpu.ts`) and falls back to this JS kernel in a Worker pool.
 */

import { sha3_256 } from 'js-sha3';
import { RGR_POW_TAG_BYTES } from '../protocol/constants';
import { decodeCompact, cmpBytes } from '../protocol/constants';
import { HEADER_SIZE } from '../protocol/constants';

/**
 * Compute the RigorChain PoW hash for an 80-byte header.
 *
 * @param header80 80-byte block header (little-endian fields, per RigorChain).
 * @returns 32-byte big-endian digest.
 */
export function rigorHash(header80: Uint8Array): Uint8Array {
  if (header80.length !== HEADER_SIZE) {
    throw new RangeError(`header must be ${HEADER_SIZE} bytes, got ${header80.length}`);
  }
  const buf = new Uint8Array(HEADER_SIZE + RGR_POW_TAG_BYTES.length);
  buf.set(RGR_POW_TAG_BYTES, 0);
  buf.set(header80, RGR_POW_TAG_BYTES.length);
  // js-sha3 returns a hex string; convert to bytes.
  const hex = sha3_256(buf);
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Compute the hash and immediately check if it's a valid solution for the
 * given compact `bits` target. Returns the digest and a `valid` flag.
 */
export function checkHash(
  header80: Uint8Array,
  bits: number,
): { digest: Uint8Array; valid: boolean } {
  const digest = rigorHash(header80);
  const target = decodeCompact(bits);
  // Valid if digest < target (treating both as unsigned big-endian integers).
  const valid = cmpBytes(digest, target) < 0;
  return { digest, valid };
}

/**
 * Convenience: hash and return the digest as a lowercase hex string.
 * Useful for debugging / display in the miner UI.
 */
export function rigorHashHex(header80: Uint8Array): string {
  const bytes = rigorHash(header80);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}
