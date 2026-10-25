# Mining

RigorChain uses a Bitcoin-derived Proof-of-Work with one twist: the hash
function is **SHA3-256** (not SHA-256), and the input is domain-tagged
with the 8-byte ASCII prefix `RGRPOW01`.

## The hash

```typescript
digest = SHA3 - 256("RGRPOW01" || header_80);
```

- `RGRPOW01` is 8 ASCII bytes: `52 47 52 50 4f 57 30 31`
- `header_80` is the standard 80-byte Bitcoin block header
- The 32-byte digest is compared (big-endian, unsigned) against the
  target encoded in the `bits` field. Block is valid iff
  `digest < target`.

Implementation: [`packages/rigor-core/src/mining/kernel.ts`](../packages/rigor-core/src/mining/kernel.ts).

## Header layout

| Offset | Size | Field         | Endian                                 |
| ------ | ---- | ------------- | -------------------------------------- |
| 0      | 4    | version       | int32 LE                               |
| 4      | 32   | prevBlockHash | LE (as returned by `getblocktemplate`) |
| 36     | 32   | merkleRoot    | LE                                     |
| 68     | 4    | timestamp     | uint32 LE                              |
| 72     | 4    | bits          | uint32 LE                              |
| 76     | 4    | nonce         | uint32 LE                              |

Implementation: [`packages/rigor-core/src/protocol/header.ts`](../packages/rigor-core/src/protocol/header.ts).

## Solo mining pipeline

```
┌─────────────────────┐
│ Local RIGOR node    │
│ (RPC :8761)         │
└──────────┬──────────┘
           │ 1. getblocktemplate
           ▼
┌─────────────────────┐         ┌─────────────────────┐
│ rigor-core          │ ◀───── │ Coinbase tx bytes   │
│ templateToJob()     │         │ (canonical, from    │
│                     │         │  template)          │
└──────────┬──────────┘         └─────────────────────┘
           │ 2. Build 80-byte header (nonce=0)
           ▼
┌─────────────────────┐
│ Miner backend       │
│ (WebGPU / OpenCL /  │
│  Worker pool / CPU) │
└──────────┬──────────┘
           │ 3. Iterate nonce, hash, compare to target
           │    On match: emit 'solution' event
           ▼
┌─────────────────────┐
│ rigor-core          │
│ -> submitblock(hex) │
└──────────┬──────────┘
           │ 4. POST / RPC
           ▼
┌─────────────────────┐
│ Local RIGOR node    │
│ validates + accepts │
│ → 128 ORU coinbase  │
└─────────────────────┘
```

## Difficulty & ASERT

RigorChain uses **ASERT** (Absolutely Scheduled Exponentially Rising
Targets), variant `aserti3-2d`:

- Half-life: 43 200 s (12 h)
- Anchor: height 1
- Per-block clamp: ±12.5%

The `bits` field is the standard Bitcoin compact target. Decode with
`decodeCompact(bits)` to get a 32-byte big-endian target. See
[`packages/rigor-core/src/protocol/constants.ts`](../packages/rigor-core/src/protocol/constants.ts).

## Backends

### WebGPU (browser, Chrome 113+)

WGSL compute shader, dispatched in 64-thread workgroups. Each thread
computes one nonce. The shader is a port of `Keccak-f[1600]` (24 rounds,
~25 ops/round). On a discrete GPU (RTX 3060): ~12 MH/s. On integrated
graphics (Intel Xe): ~1.5 MH/s.

Implementation: [`packages/rigor-core/src/mining/webgpu.ts`](../packages/rigor-core/src/mining/webgpu.ts).
WGSL source: same file, `RIGOR_WGSL` constant.

### Worker pool (browser fallback)

Spawns `navigator.hardwareConcurrency - 1` Workers (max 8). Each Worker
gets a 16M-nonce chunk and runs the JS `rigorHash` kernel. On a 2023
laptop (8 cores): ~80 kH/s aggregate.

Implementation: [`packages/rigor-core/src/mining/worker-pool.ts`](../packages/rigor-core/src/mining/worker-pool.ts).

### OpenCL (Android, planned)

A Kotlin native module (`RigorOpenCLModule`) calls into OpenCL via JNI.
The kernel is SPIR-V bytecode (compiled from a `.cl` source via
`clspv`). On Adreno 740: ~3 MH/s. On Mali-G715: ~2 MH/s.

JS bridge: [`apps/android/src/native/opencl.ts`](../apps/android/src/native/opencl.ts).
Kotlin module: TODO (placeholder at `apps/android/src/native/RigorOpenCLModule.kt.ts`).

### CPU single-thread (universal fallback)

Last-resort. 30–80 kH/s. Used by:

- React Native when OpenCL is unavailable
- Node.js (via `worker_threads` — TODO in v0.2)
- The web app when both WebGPU and Worker are unavailable (very rare)

Implementation: [`packages/rigor-core/src/mining/cpu.ts`](../packages/rigor-core/src/mining/cpu.ts).

## Submitting a block

```typescript
import { RigorRpcClient } from "@rigormobile/rigor-core/rpc";

const rpc = new RigorRpcClient({
  url: "http://127.0.0.1:8761",
  username: process.env.RIGOR_RPC_USER,
  password: process.env.RIGOR_RPC_PASS,
});

// header is the 80-byte block header with the winning nonce set
const blockHex = Array.from(header)
  .map((b) => b.toString(16).padStart(2, "0"))
  .join("");

const result = await rpc.submitBlock(blockHex);
// null = success; 'invalid' / 'invalid-cb-found' / etc = rejection
```

The miner hooks this into the `'solution'` event automatically — see
[`apps/web/src/hooks/use-miner.ts`](../apps/web/src/hooks/use-miner.ts) and
[`apps/android/src/services/mining.ts`](../apps/android/src/services/mining.ts).

## Demo mode

If no RPC URL is configured, both the web and Android miners fall back to a
**synthetic block template** with `bits = 0x207fffff` (very easy target).
This lets the user see live hashrate + solutions in the UI without running
a local node. Solutions in demo mode are NOT submitted anywhere.

## Performance tips

- **Web**: pin the tab to a separate window; the browser throttles
  background tabs to ~1 Hz, killing hashrate.
- **Android**: enable "Stay awake while charging" in Developer Options; the
  foreground service keeps the CPU warm but the screen-off policy still
  limits GPU frequency on some devices.
- **Both**: prefer a desktop browser or a phone with active cooling —
  sustained SHA3-256 will heat up the device quickly.
