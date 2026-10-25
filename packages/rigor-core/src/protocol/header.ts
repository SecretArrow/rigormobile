/**
 * Block-header encoding/decoding helpers for the RigorChain 80-byte header.
 *
 * Layout (Bitcoin-compatible, all little-endian):
 *   offset 0  | 4  | version          (int32)
 *   offset 4  | 32 | prevBlockHash    (little-endian, as returned by `getblocktemplate`)
 *   offset 36 | 32 | merkleRoot       (little-endian, derived from coinbase+tx)
 *   offset 68 | 4  | timestamp        (uint32, unix seconds)
 *   offset 72 | 4  | bits             (uint32, compact target)
 *   offset 76 | 4  | nonce            (uint32, iterated by the miner)
 */

import { HEADER_SIZE } from "./constants";

/** Parsed view of a RigorChain 80-byte block header. */
export interface BlockHeader {
  version: number;
  prevBlockHash: Uint8Array; // 32 bytes, little-endian
  merkleRoot: Uint8Array; // 32 bytes, little-endian
  timestamp: number; // uint32 unix seconds
  bits: number; // uint32 compact target
  nonce: number; // uint32
}

/** Strict 80-byte header serialization. */
export function serializeHeader(h: BlockHeader): Uint8Array {
  if (h.prevBlockHash.length !== 32) {
    throw new RangeError(
      `prevBlockHash must be 32 bytes, got ${h.prevBlockHash.length}`,
    );
  }
  if (h.merkleRoot.length !== 32) {
    throw new RangeError(
      `merkleRoot must be 32 bytes, got ${h.merkleRoot.length}`,
    );
  }
  const out = new Uint8Array(HEADER_SIZE);
  const dv = new DataView(out.buffer);
  dv.setInt32(0, h.version | 0, true);
  out.set(h.prevBlockHash, 4);
  out.set(h.merkleRoot, 36);
  dv.setUint32(68, h.timestamp >>> 0, true);
  dv.setUint32(72, h.bits >>> 0, true);
  dv.setUint32(76, h.nonce >>> 0, true);
  return out;
}

/** Reverse of {@link serializeHeader}. */
export function deserializeHeader(bytes: Uint8Array): BlockHeader {
  if (bytes.length !== HEADER_SIZE) {
    throw new RangeError(
      `header must be ${HEADER_SIZE} bytes, got ${bytes.length}`,
    );
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    version: dv.getInt32(0, true),
    prevBlockHash: bytes.slice(4, 36),
    merkleRoot: bytes.slice(36, 68),
    timestamp: dv.getUint32(68, true),
    bits: dv.getUint32(72, true),
    nonce: dv.getUint32(76, true),
  };
}

/** Read/write a single header field by offset — used by miners to mutate the
 *  nonce field without rebuilding the whole header each iteration. */
export function setNonce(headerBytes: Uint8Array, nonce: number): void {
  if (headerBytes.length !== HEADER_SIZE) {
    throw new RangeError(`header must be ${HEADER_SIZE} bytes`);
  }
  const dv = new DataView(
    headerBytes.buffer,
    headerBytes.byteOffset,
    headerBytes.byteLength,
  );
  dv.setUint32(76, nonce >>> 0, true);
}

/** Same as {@link setNonce} but for the timestamp field — used when a miner
 *  refreshes the time mid-search. */
export function setTimestamp(headerBytes: Uint8Array, timestamp: number): void {
  if (headerBytes.length !== HEADER_SIZE) {
    throw new RangeError(`header must be ${HEADER_SIZE} bytes`);
  }
  const dv = new DataView(
    headerBytes.buffer,
    headerBytes.byteOffset,
    headerBytes.byteLength,
  );
  dv.setUint32(68, timestamp >>> 0, true);
}
