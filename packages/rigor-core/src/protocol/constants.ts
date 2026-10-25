/**
 * RigorChain protocol constants & helpers.
 *
 * Source: https://github.com/rigorchain/rigorchain (mainnet v0.2)
 *
 * The chain is a Bitcoin-derived UTXO chain with the following key params:
 *   - Chain name:           RIGOR
 *   - PoW hash:             SHA3-256("RGRPOW01" || header_80)
 *   - Consensus:            ASERT (aserti3-2d), 12h half-life
 *   - Block time:           10 minutes (target)
 *   - Block subsidy:        128 ORU per block (2^7)
 *   - Magic bytes:          ce f1 db fa
 *   - P2P port:             8760
 *   - RPC port:             8761
 *   - Bech32 HRP:           rg
 *   - Mainnet genesis hash: e2ce92cfef740f92e8cc84a8541d8e760c776c668afd9b61740b3a4315241468
 */

/** ASCII tag prepended to the 80-byte header before SHA3-256 hashing. */
export const RGR_POW_TAG = 'RGRPOW01';

/** Raw 8-byte UTF-8 encoding of {@link RGR_POW_TAG}. */
export const RGR_POW_TAG_BYTES = new Uint8Array(
  Array.from(RGR_POW_TAG).map((c) => c.charCodeAt(0)),
);

/** RigorChain mainnet network magic (P2P message header prefix). */
export const MAGIC_BYTES = new Uint8Array([0xce, 0xf1, 0xdb, 0xfa]);

/** Chain identifier used in RPC `getblockchaininfo`. */
export const CHAIN_NAME = 'RIGOR';

/** Mainnet Bech32 Human-Readable Part (HRP) for SegWit-style addresses. */
export const BECH32_HRP = 'rg';

/** Default P2P port (peer-to-peer block/tx relay). */
export const P2P_PORT = 8760;

/** Default RPC port (JSON-RPC over HTTP, used by `getblocktemplate` etc.). */
export const RPC_PORT = 8761;

/** Mainnet genesis block hash (little-endian hex as returned by RPC). */
export const GENESIS_HASH =
  'e2ce92cfef740f92e8cc84a8541d8e760c776c668afd9b61740b3a4315241468';

/** Block header size in bytes (Bitcoin-compatible: 80). */
export const HEADER_SIZE = 80;

/** Target block interval in seconds (10 minutes). */
export const TARGET_BLOCK_TIME = 600;

/** ORU coinbase subsidy per block (2^7 = 128 ORU). */
export const ORU_BLOCK_SUBSIDY = 1 << 7; // 128

/** Initial RES destruction cost in ORU (2^10 = 1024 ORU per RES at init). */
export const RES_INITIAL_COST = 1 << 10; // 1024

/** Convergence scale parameter (2^25). */
export const CONVERGENCE_SCALE = 1 << 25; // 33 554 432

/** Theoretical maximum RES supply (2^22 = 4 194 304 RES). */
export const RES_MAX_SUPPLY = 1 << 22; // 4 194 304

/** ASERT half-life in seconds (12 hours, mainnet). */
export const ASERT_HALF_LIFE_SECONDS = 43_200;

/** ASERT anchor height (height 1 = first post-genesis block). */
export const ASERT_ANCHOR_HEIGHT = 1;

/** ASERT refinement: aserti3-2d uses 2^(-2) (i.e. /4) for the second-order term. */
export const ASERT_DECAY_BITS = 2;

/**
 * The 4-byte `bits` field encodes a Bitcoin-style compact target. Decode it
 * to a 32-byte big-endian target suitable for comparing against the PoW hash.
 *
 * Compact format (Bitcoin): the first byte is the exponent (number of bytes
 * in the target, including the 3-byte mantissa), the remaining 3 bytes are
 * the mantissa. Negative sign bit is supported but unused on mainnet.
 *
 * @param bits Compact target as a 32-bit unsigned integer.
 * @returns 32-byte big-endian target.
 */
export function decodeCompact(bits: number): Uint8Array {
  if (!Number.isInteger(bits) || bits < 0 || bits > 0xffffffff) {
    throw new RangeError(`bits must be a uint32, got ${bits}`);
  }
  const exponent = bits >>> 24;
  const isNegative = (bits & 0x0080_0000) !== 0;
  const mantissa = bits & 0x007f_ffff;

  const size = 32; // output is always 32 bytes (256-bit target)
  const out = new Uint8Array(size);

  if (exponent <= 3) {
    // mantissa is shifted right within the first 3 bytes (big-endian)
    const shift = 8 * (3 - exponent);
    const v = mantissa >>> shift;
    // Place the value big-endian at offset (size - exponent)
    const off = size - exponent;
    out[off] = (v >>> 16) & 0xff;
    if (exponent >= 2) out[off + 1] = (v >>> 8) & 0xff;
    if (exponent >= 1) out[off + 2] = v & 0xff;
  } else {
    // mantissa is placed at byte offset (size - exponent), big-endian
    const offset = size - exponent;
    if (offset >= 0) {
      out[offset] = (mantissa >>> 16) & 0xff;
      out[offset + 1] = (mantissa >>> 8) & 0xff;
      out[offset + 2] = mantissa & 0xff;
    } else {
      // exponent > 32 — the target would overflow uint256, treat as max
      out.fill(0xff);
      return out;
    }
  }

  if (isNegative) {
    // Real Bitcoin respects the sign bit; RigorChain doesn't produce negative
    // targets, but we clear it for safety by leaving the high bit unchanged.
  }
  return out;
}

/**
 * Encode a 32-byte big-endian target back to the Bitcoin-style compact form.
 * Mirrors `decodeCompact` for round-trip testing.
 */
export function encodeCompact(target: Uint8Array): number {
  if (target.length !== 32) {
    throw new RangeError(`target must be 32 bytes, got ${target.length}`);
  }
  let size = target.length;
  while (size > 0 && target[target.length - size] === 0) size--;

  if (size === 0) return 0;

  let mantissa: number;
  let exponent: number;
  if (size <= 3) {
    mantissa = 0;
    for (let i = 0; i < size; i++) {
      mantissa |= target[target.length - size + i] << (8 * (size - 1 - i));
    }
    exponent = size;
  } else {
    // Take the top 3 bytes of the most-significant non-zero portion
    const base = target.length - size;
    mantissa =
      (target[base] << 16) |
      (target[base + 1] << 8) |
      target[base + 2];
    exponent = size;
  }

  // Set sign bit if mantissa high bit is set (negative interpretation).
  if ((mantissa & 0x0080_0000) !== 0) {
    mantissa |= 0x0080_0000;
  }
  return (exponent << 24) | (mantissa & 0x007f_ffff);
}

/**
 * Strictly compare two big-endian byte arrays as unsigned integers.
 * Returns -1 if a < b, 0 if a == b, 1 if a > b.
 */
export function cmpBytes(a: Uint8Array, b: Uint8Array): -1 | 0 | 1 {
  if (a.length !== b.length) {
    // Right-pad shorter with zeros for the comparison.
    const len = Math.max(a.length, b.length);
    const pa = new Uint8Array(len);
    pa.set(a, len - a.length);
    const pb = new Uint8Array(len);
    pb.set(b, len - b.length);
    for (let i = 0; i < len; i++) {
      if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
    }
    return 0;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}
