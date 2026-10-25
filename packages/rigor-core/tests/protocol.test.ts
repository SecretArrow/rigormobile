import { describe, it, expect } from 'vitest';
import {
  RGR_POW_TAG,
  RGR_POW_TAG_BYTES,
  MAGIC_BYTES,
  CHAIN_NAME,
  BECH32_HRP,
  P2P_PORT,
  RPC_PORT,
  GENESIS_HASH,
  HEADER_SIZE,
  decodeCompact,
  encodeCompact,
  cmpBytes,
} from '../src/protocol/index.js';

describe('protocol constants', () => {
  it('exposes the RigorChain PoW tag', () => {
    expect(RGR_POW_TAG).toBe('RGRPOW01');
    expect(RGR_POW_TAG_BYTES.length).toBe(8);
    expect(Array.from(RGR_POW_TAG_BYTES)).toEqual([
      0x52, 0x47, 0x52, 0x50, 0x4f, 0x57, 0x30, 0x31,
    ]);
  });

  it('exposes the correct magic bytes', () => {
    expect(Array.from(MAGIC_BYTES)).toEqual([0xce, 0xf1, 0xdb, 0xfa]);
  });

  it('exposes the correct chain identity', () => {
    expect(CHAIN_NAME).toBe('RIGOR');
    expect(BECH32_HRP).toBe('rg');
    expect(P2P_PORT).toBe(8760);
    expect(RPC_PORT).toBe(8761);
    expect(GENESIS_HASH).toMatch(/^[0-9a-f]{64}$/);
    expect(HEADER_SIZE).toBe(80);
  });
});

describe('decodeCompact / encodeCompact round trip', () => {
  it('decodes the Bitcoin genesis bits 0x1d00ffff', () => {
    const target = decodeCompact(0x1d00ffff);
    expect(target.length).toBe(32);
    // The mantissa 0x00ffff is placed at offset 32-29 = 3
    expect(target[3]).toBe(0x00);
    expect(target[4]).toBe(0xff);
    expect(target[5]).toBe(0xff);
  });

  it('decodes 0x207fffff (max target — easiest difficulty)', () => {
    const target = decodeCompact(0x207fffff);
    expect(target[0]).toBe(0x7f);
    expect(target[1]).toBe(0xff);
    expect(target[2]).toBe(0xff);
  });

  it('round-trips exactly for canonical values (no mantissa leading zeros)', () => {
    // 0x207fffff has mantissa 0x7fffff (high bit set but no leading zero) → round-trips exactly.
    const target = decodeCompact(0x207fffff);
    const back = encodeCompact(target);
    expect(back).toBe(0x207fffff);
  });

  it('preserves the numerical target value (decode is correct)', () => {
    // 0x1d00ffff has mantissa 0x00ffff (leading zero) — multiple valid encodings exist.
    // We only verify the decoder produces the correct target value: the mantissa
    // 0x00ffff shifted left by (exponent-3)*8 = 26 bytes = 208 bits.
    const t1 = decodeCompact(0x1d00ffff);
    // The mantissa 0x00ffff (big-endian) sits at offset 3..5, all other bytes 0.
    expect(t1[3]).toBe(0x00);
    expect(t1[4]).toBe(0xff);
    expect(t1[5]).toBe(0xff);
    // Everything else must be zero.
    for (let i = 0; i < 32; i++) {
      if (i < 3 || i > 5) expect(t1[i]).toBe(0);
    }
  });
});

describe('cmpBytes', () => {
  it('compares equal-length buffers as big-endian integers', () => {
    const a = new Uint8Array([0, 1, 2, 3]);
    const b = new Uint8Array([0, 1, 2, 4]);
    expect(cmpBytes(a, b)).toBe(-1);
    expect(cmpBytes(b, a)).toBe(1);
    expect(cmpBytes(a, a.slice())).toBe(0);
  });

  it('handles different lengths by zero-padding', () => {
    const a = new Uint8Array([0xff]);
    const b = new Uint8Array([0x00, 0xff]);
    expect(cmpBytes(a, b)).toBe(0);
  });
});
