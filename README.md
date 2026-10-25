# RigorMobile — Monorepo

[![CI](https://github.com/SecretArrow/rigormobile/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/SecretArrow/rigormobile/actions/workflows/ci.yml)
[![E2E](https://github.com/SecretArrow/rigormobile/actions/workflows/e2e.yml/badge.svg?branch=main)](https://github.com/SecretArrow/rigormobile/actions/workflows/e2e.yml)
[![Build APK](https://github.com/SecretArrow/rigormobile/actions/workflows/build-apk.yml/badge.svg?branch=main)](https://github.com/SecretArrow/rigormobile/actions/workflows/build-apk.yml)
[![Auto-fix](https://github.com/SecretArrow/rigormobile/actions/workflows/auto-fix.yml/badge.svg?branch=main)](https://github.com/SecretArrow/rigormobile/actions/workflows/auto-fix.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**RigorChain** Web Miner + Web Wallet + Android GPU Miner APK. Built as a single
monorepo with shared core, three CI/CD pipelines (lint+unit / e2e / APK build),
auto-fix on push, and a fully redesigned modern UI/UX.

RigorChain is a Proof-of-Work UTXO chain with the mining hash:

```
digest = SHA3-256("RGRPOW01" || header_80)
```

- **Consensus**: ASERT (aserti3-2d), 10-minute blocks, 128 ORU per block
- **Magic**: `ce f1 db fa` · **P2P**: 8760 · **RPC**: 8761 · **Bech32 HRP**: `rg`
- **Solo mining**: `getblocktemplate` → coinbase → nonce search → `submitblock`

## Repository layout

```
rigormobile/
├── apps/
│   ├── web/                 # Next.js 16 web miner + wallet (TypeScript, Tailwind 4, shadcn/ui)
│   └── android/             # React Native (Expo) Android GPU miner APK
├── packages/
│   └── rigor-core/          # Shared: SHA3-256 mining kernel, RPC client, bech32, HD wallet
├── .github/workflows/       # CI/CD: ci.yml, e2e.yml, auto-fix.yml, build-apk.yml, release.yml
├── docs/                    # Architecture, mining, wallet docs
└── package.json             # Bun workspace root + Turbo pipeline
```

## Quick start (local dev)

```bash
bun install
bun run dev          # starts Next.js on http://localhost:3000
```

Open the app, pick the **Miner** tab to start hashing, or the **Wallet** tab to
generate a `rg1…` address and inspect your balance.

## CI/CD pipelines

| Workflow        | Trigger                | Purpose                                                         |
| --------------- | ---------------------- | --------------------------------------------------------------- |
| `ci.yml`        | push, PR               | Bun cache, typecheck, ESLint, Prettier check, Vitest unit tests |
| `e2e.yml`       | push to main, PR       | Playwright end-to-end against a prod Next.js build              |
| `auto-fix.yml`  | push to main           | Auto-commit `prettier --write` + `eslint --fix` fixes           |
| `build-apk.yml` | push to main, tag `v*` | Expo prebuild → Gradle assemble Release APK → upload artifact   |
| `release.yml`   | tag `v*`               | Cross-link: attach APK to GitHub Release                        |

All pipelines cache aggressively (Bun store, Turbo remote cache, Gradle +
`~/.gradle/caches`, Android SDK). Average cold-build time ≈ 6–9 min; warm
incremental runs ≈ 1–3 min.

## Mining architecture

The web miner uses **WebGPU** when available (Chrome 113+, Edge 113+) and falls
back to a **Web Worker pool** (CPU SHA3-256 via `js-sha3`) when not. The
Android app uses a native **OpenCL** kernel for SHA3-256 with a CPU fallback
via a React Native Worker thread. Both call the same `@rigormobile/rigor-core`
kernel so block-template parsing, target comparison, and submit logic are
identical across platforms.

See [`docs/MINING.md`](docs/MINING.md) for the full pipeline.

## Wallet

The wallet is a BIP32/BIP44 HD wallet with the RigorChain Bech32 HRP `rg`. It
constructs UTXO-based transactions, supports both ORU and RES asset types, and
exports/imports via BIP39 mnemonic. Private keys never leave the device.

See [`docs/WALLET.md`](docs/WALLET.md) for the key-derivation and signing flow.

## Background mining & cronjobs

- **Web**: a Service Worker keeps a low-power share submission loop alive
  across tab closes; cronjobs (`Periodic Background Sync`) wake the miner
  every 30 min to refresh the block template.
- **Android**: a `WorkManager` Periodic Workload (15 min minimum interval,
  configurable) drives mining even when the app is closed; a foreground
  service keeps the GPU/CPU hot while the user is actively mining.

## Security

- **Never** commit `.env`, `*.key`, `mnemonic*.txt`, or `keystore*.jks`.
- The CI uses `${{ secrets.* }}` for all credentials — no plaintext tokens in
  the repo. If you ever leak a token, rotate it immediately on
  https://github.com/settings/tokens.
- The wallet stores the encrypted xprz at rest; the password is the only thing
  that unlocks it. There is no server-side key storage.

## License

MIT — see [LICENSE](LICENSE).
