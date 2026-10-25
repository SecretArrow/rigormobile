# Architecture

RigorMobile is a **monorepo** for building RigorChain mining & wallet apps
across web and Android. It uses **Bun workspaces** + **Turborepo** for
parallel task execution and aggressive caching.

## Repository layout

```
rigormobile/
├── apps/
│   ├── web/                 # Next.js 16 web app (miner + wallet)
│   ├── android/             # Expo + React Native Android miner
├── packages/
│   └── rigor-core/          # Shared: SHA3-256 kernel, RPC, wallet, protocol
├── .github/workflows/       # ci.yml, e2e.yml, auto-fix.yml, build-apk.yml, release.yml
└── docs/                    # this folder
```

## Platform-agnostic core

`@rigormobile/rigor-core` is the heart of the project. It is **pure
TypeScript** with **no platform-specific imports** — no `node:fs`, no
`window`, no `react-native`. It runs unchanged in:

| Environment             | Backend               | Hashrate (typical)        |
| ----------------------- | --------------------- | ------------------------- |
| Browser (Chrome 113+)   | WebGPU compute shader | 5–50 MH/s on discrete GPU |
| Browser (fallback)      | Web Worker pool       | 50–200 kH/s               |
| React Native (Android)  | Native OpenCL (TODO)  | 1–10 MH/s on Adreno/Mali  |
| React Native (fallback) | JS single-thread      | 30–80 kH/s                |
| Node 20+                | Worker threads (TODO) | 100–300 kH/s              |

The mining kernel itself is **identical** across all platforms:

```typescript
digest = SHA3 - 256("RGRPOW01" || header_80);
// Block is valid if digest < target(bits)
```

See [`MINING.md`](./MINING.md) for the full pipeline.

## Why Bun + Turbo (not pnpm + Nx)?

- **Bun** is the fastest JS runtime for CI: install + test in one tool, no
  separate package manager. Lockfile is `bun.lock`.
- **Turborepo** adds content-hash task caching across CI runs. With
  `--remote-cache` (configured via `TURBO_TOKEN`), warm CI runs drop to
  ~30 seconds.
- **Nx** is heavier and overlaps with Turbo for our use case.

## CI/CD strategy

| Workflow        | When                   | What                                       | Avg time  |
| --------------- | ---------------------- | ------------------------------------------ | --------- |
| `ci.yml`        | every push/PR          | bun install + lint + typecheck + unit      | 1.5–3 min |
| `e2e.yml`       | push to main, PRs      | Playwright against prod Next build         | 2–5 min   |
| `auto-fix.yml`  | push to main           | prettier + eslint --fix, commit if changed | 0.5–1 min |
| `build-apk.yml` | push to main, tag `v*` | Expo prebuild + Gradle assembleRelease     | 3–9 min   |
| `release.yml`   | tag `v*`               | cross-link APK to GitHub Release           | 10 s      |

Total wall-clock time for a `git push` to main: ~3 min (CI + auto-fix run in
parallel; APK build kicks off separately). The user never waits on local
builds — the **only** local command they run is `git push`.

## Background process & cronjobs

### Web (Service Worker + Periodic Background Sync)

The web app ships a Service Worker (registered via `next-pwa`-style
config — TODO in v0.2) that:

1. Keeps the mining Worker pool alive across tab closures (the SW wakes the
   worker every 30 s).
2. Listens for `periodicsync` events with tag `refresh-block-template`,
   fired by the browser every 8 hours (Chrome default min interval) — calls
   the RigorChain RPC `getblocktemplate` to refresh the cached template.

### Android (Foreground Service + WorkManager)

- **Foreground service** (`react-native-background-actions`) shows a
  persistent notification while mining is active, keeping the JS thread
  alive in the background.
- **WorkManager periodic tasks** (`expo-task-manager` +
  `expo-background-fetch`) run on a 15-min minimum interval:
  - `refresh-block-template` — refresh the cached block template
  - `purge-old-sessions` — prune mining session logs older than 30 days
- Both tasks survive app kills and run on device boot
  (`startOnBoot: true`).

## Security model

- **Wallet** = BIP32 xprv encrypted with AES-256-GCM under a
  scrypt-derived key (N=2^15, r=8, p=1). Stored in:
  - Web: `localStorage` (encrypted blob only — never the raw xprv)
  - Android: `expo-secure-store` (Android Keystore-backed)
- **Mnemonic** is shown once at creation, then only on explicit user action.
- **RPC credentials** (web) are kept in memory only; on Android they live
  in `expo-secure-store`.
- **No server-side key storage**. The Next.js API routes only serve
  public network info (`/api`) and proxy RPC calls (TODO in v0.2) — they
  never see the user's keys.

## Threat model & known limitations

- **Browser mining is not profitable** — it's a demo / educational tool.
  Real mining requires the Android app (or a desktop build, TODO).
- **OpenCL on Android** is best-effort: not all devices ship a usable
  OpenCL driver. The miner falls back to the JS CPU kernel silently.
- **No Stratum pool support yet** — only solo mining via
  `getblocktemplate`/`submitblock`. Pool support is on the v0.3 roadmap.
- **No SPV / light client** — the wallet relies on a trusted RPC node for
  balance lookups (`listunspent`). Running your own node is strongly
  recommended.
