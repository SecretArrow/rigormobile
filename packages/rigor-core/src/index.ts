/**
 * @rigormobile/rigor-core
 * Shared core for RigorChain mining, RPC, wallet and protocol logic.
 *
 * RigorChain is a Bitcoin-derived PoW chain. Its mining hash is:
 *
 *     digest = SHA3-256("RGRPOW01" || header_80)
 *
 * (see https://github.com/rigorchain/rigorchain — mainnet v0.2).
 * The 8-byte ASCII tag `RGRPOW01` is prepended to the 80-byte block header
 * before SHA3-256 hashing, then the resulting 32-byte digest is compared
 * against the target encoded in the `bits` field (ASERT, aserti3-2d).
 *
 * This package is platform-agnostic — it runs unchanged in:
 *   - Next.js (Node 20+) server + client
 *   - React Native / Expo (Android, iOS)
 *   - The browser (incl. Web Workers / Service Workers)
 *
 * Everything is tree-shakeable; consumers should import from the
 * sub-paths (`@rigormobile/rigor-core/mining`, `…/rpc`, `…/wallet`,
 * `…/protocol`, `…/utils`) to keep bundle size minimal in the browser.
 */

export * from './protocol/index';
export * from './mining/index';
export * from './rpc/index';
export * from './wallet/index';
export { formatHashRate, formatDuration, formatOru, delay, hasKey, randomHex } from './utils/index';
