import { describe, it, expect } from 'vitest';
import { rigorHash, rigorHashHex, checkHash } from '../src/mining/kernel.js';
import { serializeHeader, deserializeHeader, setNonce } from '../src/protocol/header.js';

describe('rigorHash kernel', () => {
  it('produces a 32-byte digest', () => {
    const header = new Uint8Array(80);
    const digest = rigorHash(header);
    expect(digest.length).toBe(32);
  });

  it('produces the same hex as the byte digest', () => {
    const header = new Uint8Array(80);
    header[0] = 0x42;
    const bytes = rigorHash(header);
    const hex = rigorHashHex(header);
    expect(hex.length).toBe(64);
    let expected = '';
    for (let i = 0; i < bytes.length; i++) {
      expected += bytes[i]!.toString(16).padStart(2, '0');
    }
    expect(hex).toBe(expected);
  });

  it('is deterministic — same header → same digest', () => {
    const header = new Uint8Array(80);
    for (let i = 0; i < 80; i++) header[i] = (i * 7) & 0xff;
    const d1 = rigorHash(header);
    const d2 = rigorHash(header.slice());
    expect(Array.from(d1)).toEqual(Array.from(d2));
  });

  it('changes when the nonce changes', () => {
    const header = new Uint8Array(80);
    for (let i = 0; i < 80; i++) header[i] = (i * 7) & 0xff;
    const d1 = rigorHash(header);
    setNonce(header, 1);
    const d2 = rigorHash(header);
    expect(Array.from(d1)).not.toEqual(Array.from(d2));
  });
});

describe('checkHash with easy target', () => {
  it('detects a valid solution against a low-difficulty target', () => {
    const header = new Uint8Array(80);
    // bits = 0x207fffff → target = 0x7fffff000…0 (very easy)
    const bits = 0x207fffff;
    // Brute-force a small nonce space until we find a valid one (the target
    // is so permissive that nonce 0..1000 should find many).
    let found = false;
    for (let n = 0; n < 1000 && !found; n++) {
      setNonce(header, n);
      const { valid } = checkHash(header, bits);
      if (valid) found = true;
    }
    expect(found).toBe(true);
  });

  it('rejects everything against an impossible target', () => {
    const header = new Uint8Array(80);
    const bits = 0x01000000; // exponent=1, target=0 — nothing can satisfy
    for (let n = 0; n < 100; n++) {
      setNonce(header, n);
      const { valid } = checkHash(header, bits);
      expect(valid).toBe(false);
    }
  });
});

describe('header serialization round trip', () => {
  it('serializes and parses back identically', () => {
    const original = {
      version: 0x20000000,
      prevBlockHash: new Uint8Array(32).fill(0xab),
      merkleRoot: new Uint8Array(32).fill(0xcd),
      timestamp: 1_700_000_000,
      bits: 0x1d00ffff,
      nonce: 0x12345678,
    };
    const bytes = serializeHeader(original);
    expect(bytes.length).toBe(80);
    const parsed = deserializeHeader(bytes);
    expect(parsed.version).toBe(original.version);
    expect(parsed.timestamp).toBe(original.timestamp);
    expect(parsed.bits).toBe(original.bits);
    expect(parsed.nonce).toBe(original.nonce);
    expect(Array.from(parsed.prevBlockHash)).toEqual(Array.from(original.prevBlockHash));
    expect(Array.from(parsed.merkleRoot)).toEqual(Array.from(original.merkleRoot));
  });
});
