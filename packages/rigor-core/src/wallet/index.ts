export * from "./bech32";
export * from "./hd";
export * from "./storage";

import { generateMnemonic as _generateMnemonic } from "@scure/bip39";
import { wordlist as englishWordlist } from "@scure/bip39/wordlists/english";

/**
 * Generate a BIP39 mnemonic with the English wordlist pre-loaded.
 *
 * `@scure/bip39` requires the wordlist to be passed explicitly; this wrapper
 * makes the call site one-liner-clean. Pass `strength` in bits (128 = 12
 * words, 256 = 24 words).
 */
export function generateMnemonic(strength: 128 | 256 = 256): string {
  return _generateMnemonic(englishWordlist, strength);
}
