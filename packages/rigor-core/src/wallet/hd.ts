/**
 * BIP32 HD wallet + BIP44 derivation path for RigorChain.
 *
 * RigorChain is Bitcoin-derived so we reuse the Bitcoin path with a custom
 * coin type. Following BIP44 conventions, the path is:
 *
 *     m / 44' / <coin_type>' / <account>' / <change> / <address_index>
 *
 * For RigorChain mainnet we register coin type 8760 (the P2P port) as a
 * memorable, unofficial identifier. Apps that prefer to reuse Bitcoin's
 * coin type 0' can pass it explicitly to {@link deriveRigorAddress}.
 */

import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import { sha256 } from "@noble/hashes/sha256";
import { ripemd160 } from "@noble/hashes/legacy";
import { encodeAddress, decodeAddress } from "./bech32";

/** BIP44 coin type used for RigorChain mainnet. */
export const RIGOR_COIN_TYPE = 8760;

/** BIP44 account-level derivation path for RigorChain. */
export function rigorDerivationPath(
  account = 0,
  change = 0,
  index = 0,
): string {
  return `m/44'/${RIGOR_COIN_TYPE}'/${account}'/${change}/${index}`;
}

/** An derived address book entry. */
export interface DerivedAddress {
  /** Bech32 `rg…` address. */
  address: string;
  /** BIP44 derivation path. */
  path: string;
  /** Compressed public key (33 bytes) as hex. */
  pubKeyHex: string;
  /** Witness program (20-byte hash160 of the pub key). */
  program: Uint8Array;
  /** Index in the address chain. */
  index: number;
  /** Internal (change) vs external. */
  change: number;
}

/**
 * HD wallet for RigorChain. Construct from a mnemonic (BIP39) or from a raw
 * BIP32 xprv/xpub. The wallet is offline-only — no RPC calls are made here.
 */
export class RigorHdWallet {
  private root: HDKey;
  readonly mnemonic?: string;

  constructor(root: HDKey, mnemonic?: string) {
    this.root = root;
    this.mnemonic = mnemonic;
  }

  /** Create a wallet from a BIP39 mnemonic. */
  static fromMnemonic(mnemonic: string): RigorHdWallet {
    const seed = mnemonicToSeedSync(mnemonic);
    const root = HDKey.fromMasterSeed(seed);
    return new RigorHdWallet(root, mnemonic);
  }

  /** Create a wallet from a hex-encoded master seed. */
  static fromSeed(seedHex: string): RigorHdWallet {
    const seed =
      seedHex.length % 2 === 0
        ? hexToBytes(seedHex)
        : new TextEncoder().encode(seedHex);
    return new RigorHdWallet(HDKey.fromMasterSeed(seed));
  }

  /** Derive the account-level xprv/xpub for a given account index. */
  deriveAccount(account = 0): HDKey {
    return this.root.derive(`m/44'/${RIGOR_COIN_TYPE}'/${account}'`) as HDKey;
  }

  /** Derive a single SegWit v0 (p2wpkh) address. */
  deriveAddress(account = 0, change = 0, index = 0): DerivedAddress {
    const path = rigorDerivationPath(account, change, index);
    const child = this.root.derive(path);
    if (!child?.publicKey) {
      throw new Error(`derivation failed at ${path}`);
    }
    const program = hash160(child.publicKey);
    const address = encodeAddress(program, 0);
    return {
      address,
      path,
      pubKeyHex: bytesToHex(child.publicKey),
      program,
      index,
      change,
    };
  }

  /** Derive a batch of N external addresses (change=0). */
  deriveAddressBatch(
    count: number,
    account = 0,
    change = 0,
    startIndex = 0,
  ): DerivedAddress[] {
    const out: DerivedAddress[] = [];
    for (let i = 0; i < count; i++) {
      out.push(this.deriveAddress(account, change, startIndex + i));
    }
    return out;
  }

  /** Sign a 32-byte message digest with the key at the given path. Returns
   *  a 64-byte compact recoverable signature (r||s, no recovery flag for
   *  now — RigorChain doesn't need it). */
  async signDigest(path: string, digest: Uint8Array): Promise<Uint8Array> {
    const child = this.root.derive(path);
    if (!child?.privateKey) {
      throw new Error(`no private key at path ${path}`);
    }
    // Lazy import to avoid pulling secp256k1 into bundles that don't sign.
    const { secp256k1 } = await import("@noble/curves/secp256k1");
    const sig = secp256k1.sign(digest, child.privateKey);
    return sig.toCompactRawBytes();
  }

  /** Verify a signature against a public key + digest. */
  static async verify(
    pubKey: Uint8Array,
    digest: Uint8Array,
    signature: Uint8Array,
  ): Promise<boolean> {
    const { secp256k1 } = await import("@noble/curves/secp256k1");
    return secp256k1.verify(signature, digest, pubKey);
  }

  /** Export the wallet as an extended private key (BIP32 xprv). */
  exportXprv(): string {
    return this.root.privateExtendedKey ?? "";
  }

  /** Export the wallet as an extended public key (BIP32 xpub). Safe to share. */
  exportXpub(): string {
    return this.root.publicExtendedKey ?? "";
  }

  /** Decode a `rg…` address into its witness program (no key lookup). */
  static decodeAddress(addr: string) {
    return decodeAddress(addr);
  }
}

/** Compute the Bitcoin hash160 = RIPEMD160(SHA256(pubkey)) of a public key. */
export function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data));
}

/** Hex-encode a Uint8Array (lowercase). */
export function bytesToHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i]!.toString(16).padStart(2, "0");
  }
  return s;
}

/** Hex-decode a string into a Uint8Array. */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error(`odd-length hex: ${hex}`);
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
