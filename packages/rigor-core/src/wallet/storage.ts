/**
 * Encrypted wallet storage (AES-GCM + scrypt-derived key).
 *
 * The wallet is stored as an opaque JSON blob containing the BIP32 xprv
 * encrypted with AES-256-GCM under a key derived from the user's password
 * via scrypt (N=2^15, r=8, p=1, 32-byte salt). This is a Node/browser/RN
 * portable design that uses only Web Crypto APIs.
 *
 * On platforms without `crypto.subtle` (older RN), callers should swap in
 * `react-native-get-random-values` + `expo-crypto` polyfills before calling
 * these functions.
 */

import { bytesToHex, hexToBytes } from "./hd";

export interface EncryptedWallet {
  /** Format version, currently 1. */
  v: 1;
  /** KDF parameters used to derive the AES key from the password. */
  kdf: {
    name: "scrypt";
    n: number;
    r: number;
    p: number;
    saltHex: string;
    dkLen: number;
  };
  /** AES-GCM parameters. */
  cipher: {
    name: "AES-GCM";
    ivHex: string;
    ciphertextHex: string;
  };
  /** ISO timestamp of when the wallet was sealed. */
  sealedAt: string;
}

/** Default scrypt parameters — chosen to take ~250 ms on a 2023 laptop. */
export const DEFAULT_SCRYPT = {
  n: 2 ** 15,
  r: 8,
  p: 1,
  dkLen: 32,
} as const;

/** Encrypt a UTF-8 string (typically the BIP32 xprv JSON) under a password. */
export async function encryptWallet(
  plaintext: string,
  password: string,
): Promise<EncryptedWallet> {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, DEFAULT_SCRYPT);
  const enc = new TextEncoder().encode(plaintext);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    enc as BufferSource,
  );
  return {
    v: 1,
    kdf: { name: "scrypt", saltHex: bytesToHex(salt), ...DEFAULT_SCRYPT },
    cipher: {
      name: "AES-GCM",
      ivHex: bytesToHex(iv),
      ciphertextHex: bytesToHex(new Uint8Array(cipher)),
    },
    sealedAt: new Date().toISOString(),
  };
}

/** Decrypt a sealed wallet blob. Throws on a wrong password (GCM tag mismatch). */
export async function decryptWallet(
  sealed: EncryptedWallet,
  password: string,
): Promise<string> {
  if (sealed.v !== 1)
    throw new Error(`unsupported wallet version: ${sealed.v}`);
  const salt = hexToBytes(sealed.kdf.saltHex);
  const iv = hexToBytes(sealed.cipher.ivHex);
  const cipher = hexToBytes(sealed.cipher.ciphertextHex);
  const key = await deriveKey(password, salt, sealed.kdf);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    cipher as BufferSource,
  );
  return new TextDecoder().decode(plain);
}

/** Derive an AES-GCM 256-bit key from a password + salt via scrypt. */
async function deriveKey(
  password: string,
  salt: Uint8Array,
  params: { n: number; r: number; p: number; dkLen: number },
): Promise<CryptoKey> {
  // scrypt via Web Crypto isn't standard; we use a pure-JS implementation
  // pulled in on demand. The result is wrapped into a CryptoKey for AES-GCM.
  const { scrypt } = await import("@noble/hashes/scrypt");
  const pwd = new TextEncoder().encode(password);
  const dk = scrypt(pwd, salt, {
    N: params.n,
    r: params.r,
    p: params.p,
    dkLen: params.dkLen,
  });
  return crypto.subtle.importKey(
    "raw",
    dk as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}
