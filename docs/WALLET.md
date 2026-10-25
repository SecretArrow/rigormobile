# Wallet

RigorMobile ships an offline-first HD wallet for RigorChain. It uses
BIP32 (hierarchical derivation), BIP39 (mnemonic seed), and BIP44
(derivation paths) with the Bech32 SegWit-style address format HRP `rg`.

## Key derivation

```
m / 44' / 8760' / <account>' / <change> / <index>
         ^^^^
         RIGOR coin type
         (the P2P port — chosen as a memorable, unofficial identifier)
```

- Hardened derivation through account level (BIP44 standard).
- External chain (`change=0`) for receiving addresses.
- Internal chain (`change=1`) for change addresses (TODO in v0.2).

Implementation: [`packages/rigor-core/src/wallet/hd.ts`](../packages/rigor-core/src/wallet/hd.ts).

## Address format

| Type                 | Witness version | Bech32 variant | Length   |
| -------------------- | --------------- | -------------- | -------- |
| p2wpkh (default)     | 0               | Bech32         | 20 bytes |
| p2wsh (multisig)     | 0               | Bech32         | 32 bytes |
| p2tr (Taproot, TODO) | 1               | Bech32m        | 32 bytes |

A typical RigorMobile address looks like:

```
rg1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
```

Implementation: [`packages/rigor-core/src/wallet/bech32.ts`](../packages/rigor-core/src/wallet/bech32.ts).

## Encryption at rest

The BIP32 xprv is encrypted with **AES-256-GCM** under a key derived from
the user's password via **scrypt** (N=2^15, r=8, p=1, dkLen=32, 32-byte
random salt).

```
password ─► scrypt(N=2^15, r=8, p=1, salt) ─► AES-256 key
                                                    │
                                                    ▼
xprv ─► AES-256-GCM(iv=12 random bytes) ─► ciphertext + tag
                                                    │
                                                    ▼
                                          JSON blob in storage
```

- Encryption takes ~250 ms on a 2023 laptop (tunable via N).
- The GCM tag provides authentication — wrong password = clean rejection.
- The salt + iv are stored alongside the ciphertext; only the password is
  required to decrypt.

Storage locations:

| Platform | API                 | Notes                                      |
| -------- | ------------------- | ------------------------------------------ |
| Web      | `localStorage`      | Survives page reloads, scoped to origin    |
| Android  | `expo-secure-store` | Android Keystore-backed, encrypted at rest |

Implementation: [`packages/rigor-core/src/wallet/storage.ts`](../packages/rigor-core/src/wallet/storage.ts).

## Lifecycle

```
┌──────────────┐  createNew()   ┌──────────────┐
│   none       │ ─────────────► │   creating   │
└──────────────┘                └──────┬───────┘
                                       │ generateMnemonic(256)
                                       ▼
                              ┌──────────────┐
                              │   unlocked   │ ◄──┐
                              └──────┬───────┘    │
                                     │ lock()     │ unlock(password)
                                     ▼            │
                              ┌──────────────┐    │
                              │   locked     │ ───┘
                              └──────┬───────┘
                                     │ wipe()
                                     ▼
                              ┌──────────────┐
                              │   none       │
                              └──────────────┘
```

## Send / receive (TODO)

v0.1 only supports **address generation** and **balance lookup** (via
`listunspent` RPC). Sending ORU/RES requires:

1. Selecting UTXOs to spend (knapsack algorithm)
2. Constructing the transaction (version, inputs with witnesses, outputs,
   locktime)
3. Signing each input with the derived private key
4. Broadcasting via `sendrawtransaction` RPC

This is on the v0.2 roadmap. See
[`apps/web/src/hooks/use-wallet.ts`](../apps/web/src/hooks/use-wallet.ts)
for the current API surface.

## Security notes

- **Never** type your mnemonic into a website that isn't this one. The
  mnemonic is shown ONCE at creation, then only on explicit "Reveal".
- The **xpub** is safe to share — it can derive all your addresses but
  cannot sign transactions.
- The **xprv** is never written to disk unencrypted. In memory, it lives
  only while the wallet is unlocked; `lock()` clears it immediately.
- The password is **not** stored anywhere. If you forget it, the wallet
  is unrecoverable without the mnemonic — keep both safe.
- The wallet is **offline** — it never sends keys to any server. RPC
  calls go only to your configured RigorChain node (default
  `127.0.0.1:8761`).

## Backup & restore

To back up:

1. Reveal the 24-word mnemonic (Wallet tab → "Reveal recovery phrase").
2. Write the words down on paper. Number them. Store offline.

To restore on a new device:

1. Wallet tab → Import → paste the 24 words → set a new password.
2. The wallet re-derives the same addresses (BIP32 is deterministic).

To wipe from a device:

1. Wallet tab → "Wipe wallet from this device".
2. The encrypted blob is removed from `localStorage` / `SecureStore`.
   The mnemonic still works on any other device.
