/**
 * Block-template → MiningJob conversion.
 *
 * `getblocktemplate` returns a JSON object with the standard Bitcoin fields.
 * This module turns it into a fully-formed 80-byte header ready for nonce
 * iteration by the mining kernel.
 */

import { serializeHeader, type BlockHeader } from '../protocol/header';
import { computeMerkleRoot, reverseBytes } from '../protocol/merkle';
import { HEADER_SIZE } from '../protocol/constants';
import { hexToBytes } from '../utils/index';
import type { MiningJob } from './worker';

/** Subset of the JSON returned by `getblocktemplate` that we consume. */
export interface BlockTemplate {
  version: number;
  previousblockhash: string; // hex, big-endian (display order)
  transactions: Array<{ data: string; txid: string; hash?: string }>;
  coinbasetxn?: { data: string; txid?: string; hash?: string };
  coinbasevalue?: number;
  target?: string; // hex, big-endian (rare)
  bits: string; // hex compact target
  curtime: number; // unix seconds
  mutable?: string[];
  noncerange?: string;
  sigoplimit?: number;
  sizelimit?: number;
  height?: number;
  _id?: string;
}

/** Build the 80-byte header from a `getblocktemplate` response. */
export function templateToHeader(tpl: BlockTemplate): {
  header: Uint8Array;
  bits: number;
  merkleRoot: Uint8Array;
} {
  // 1. Coinbase tx (the first tx in the merkle tree)
  const coinbaseTxid = tpl.coinbasetxn?.txid ?? tpl.coinbasetxn?.hash;
  if (!coinbaseTxid) throw new Error('coinbasetxn.txid missing in template');

  // 2. All txids in display hex; convert to little-endian bytes for merkle
  const txids: Uint8Array[] = [
    hexToBytesRev(coinbaseTxid),
    ...(tpl.transactions ?? []).map((tx) => hexToBytesRev(tx.txid ?? tx.hash ?? '')),
  ];

  // 3. Merkle root (little-endian, as it appears in the header)
  const merkleRoot = computeMerkleRoot(txids);

  // 4. previousblockhash is big-endian display hex; reverse to little-endian
  const prevBlock = hexToBytesRev(tpl.previousblockhash);

  // 5. bits is a hex string; parse as a uint32
  const bits = parseInt(tpl.bits, 16) >>> 0;

  // 6. curtime is unix seconds
  const timestamp = tpl.curtime >>> 0;

  const headerObj: BlockHeader = {
    version: tpl.version | 0,
    prevBlockHash: prevBlock,
    merkleRoot,
    timestamp,
    bits,
    nonce: 0,
  };
  const header = serializeHeader(headerObj);
  if (header.length !== HEADER_SIZE) {
    throw new Error(`header size mismatch: ${header.length}`);
  }
  return { header, bits, merkleRoot };
}

/** Convert a `getblocktemplate` response into a ready-to-mine `MiningJob`. */
export function templateToJob(
  tpl: BlockTemplate,
  options: { startNonce?: number; endNonce?: number; jobId?: string } = {},
): MiningJob {
  const { header, bits } = templateToHeader(tpl);
  // Default nonce range: full uint32 space unless the template restricts it.
  let startNonce = options.startNonce ?? 0;
  let endNonce = options.endNonce ?? 0xffff_ffff;
  if (tpl.noncerange) {
    // noncerange is hex, big-endian "00000000ffffffff" style
    const bytes = hexToBytes(tpl.noncerange);
    if (bytes.length === 8) {
      startNonce =
        (bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!;
      endNonce =
        (bytes[4]! << 24) | (bytes[5]! << 16) | (bytes[6]! << 8) | bytes[7]!;
      startNonce = reverseUint32(startNonce);
      endNonce = reverseUint32(endNonce);
    }
  }
  return {
    header,
    bits,
    startNonce,
    endNonce,
    jobId: options.jobId ?? tpl._id,
    refreshTimestampEvery: 0x01000000,
  };
}

/** Convert a hex string and reverse the byte order (Bitcoin display → little-endian). */
export function hexToBytesRev(hex: string): Uint8Array {
  return reverseBytes(hexToBytes(hex));
}

/** Reverse the byte order of a uint32. */
function reverseUint32(x: number): number {
  return (
    (((x & 0xff) << 24) |
      ((x & 0xff00) << 8) |
      ((x & 0xff0000) >>> 8) |
      ((x & 0xff000000) >>> 24)) >>>
    0
  );
}
