# RigorMobile — Android app

**RigorChain GPU miner for Android** — Expo + React Native + native OpenCL
module. Built as part of the [RigorMobile monorepo](../..).

## Features

- **GPU mining** via OpenCL (Kotlin/JNI native module) when available, CPU
  fallback via the JS-based kernel in `@rigormobile/rigor-core`.
- **Background service** — `react-native-background-actions` foreground
  notification keeps mining alive when the app is backgrounded.
- **Cronjobs** — `expo-task-manager` + `expo-background-fetch` wake the app
  every 15 min to refresh the block template.
- **HD wallet** — BIP32/BIP44 with Bech32 `rg` addresses; encrypted xprv
  stored in `expo-secure-store` (Android Keystore-backed).
- **Material 3 UI** — `react-native-paper` with light/dark themes.

## Build (CI/CD)

The APK is built in GitHub Actions, not locally. See
[`.github/workflows/build-apk.yml`](../../.github/workflows/build-apk.yml).

To build locally (debug):

```bash
cd apps/android
bun install
bun run prebuild          # generates the native android/ folder
cd android && ./gradlew assembleDebug
# APK at android/app/build/outputs/apk/debug/app-debug.apk
```

To build a release APK (signed):

```bash
# Place your keystore at apps/android/android/app/release.keystore
# (path is set by the build-apk workflow).
cd apps/android
bun run build:apk
# APK at android/app/build/outputs/apk/release/app-release.apk
```

## Architecture

```
src/
├── App.tsx              # entry — wires up theme + navigator + services
├── screens/
│   ├── Navigator.tsx    # bottom-tab nav (Dashboard / Miner / Wallet)
│   ├── DashboardScreen.tsx
│   ├── MinerScreen.tsx
│   └── WalletScreen.tsx
├── services/
│   ├── mining.ts        # singleton mining controller (CPU + OpenCL backends)
│   ├── background.ts    # foreground service via react-native-background-actions
│   ├── cronjobs.ts      # expo-task-manager periodic tasks (15 min, 6 h)
│   └── rpc-wrapper.ts   # RN-safe RPC client (btoa polyfill, env config)
├── native/
│   ├── opencl.ts        # JS bridge to RigorOpenCL native module
│   └── RigorOpenCLModule.kt.ts  # placeholder for the native code path
└── hooks/
    └── use-keep-awake.ts  # expo-keep-wake-up wrapper
```

## Permissions

Declared in `app.json`:

- `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_DATA_SYNC` — for background mining
- `WAKE_LOCK` — to keep the CPU/GPU awake
- `RECEIVE_BOOT_COMPLETED` — restart cronjobs on device boot
- `POST_NOTIFICATIONS` — Android 13+ foreground notification
- `INTERNET`, `ACCESS_NETWORK_STATE` — RPC + block submission

## OpenCL kernel

The actual SHA3-256 kernel is a SPIR-V binary loaded via OpenCL. The kernel
source and the Kotlin JNI bridge live in `docs/MINING.md` and are inlined
into the build by `expo-build-properties`. Until the native module is
fully wired, the miner falls back to the JS kernel in
`@rigormobile/rigor-core/mining`.
