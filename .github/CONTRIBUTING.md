# RigorMobile — contribution guide

Thanks for considering a contribution! This is a small project so the rules
are short.

## Quick start

```bash
git clone https://github.com/SecretArrow/rigormobile.git
cd rigormobile
bun install
bun run dev          # web app on http://localhost:3000
```

## Branching

- `main` is always green (CI passes, APK builds).
- Branch from `main`, name it `<type>/<short-desc>`:
  - `feat/wallet-send-tx`
  - `fix/miner-stuck-on-stop`
  - `docs/architecture-typo`
- Squash-merge PRs into `main`.

## Commit message convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

- `type`: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `perf`
- `scope`: `web`, `android`, `core`, `ci`, `docs` (optional)
- Subject: imperative, lowercase, ≤72 chars

Examples:

```
feat(core): add OpenCL kernel for SHA3-256
fix(web): stop miner when navigating away from /miner
docs(mining): clarify ASERT half-life constant
ci: cache Gradle deps for build-apk workflow
```

## CI requirements

All PRs must pass:

1. **`ci.yml`** — lint, typecheck, unit tests
2. **`e2e.yml`** — Playwright smoke tests (only on PRs touching `apps/web`)
3. **`build-apk.yml`** — APK build (only on PRs touching `apps/android` or `packages/rigor-core`)

The `auto-fix.yml` workflow runs on `main` after merge — it auto-commits
Prettier + ESLint fixes. **Do not** fight the auto-fixer; if it reformats
your code, accept the formatting.

## Adding a new RigorChain RPC method

1. Add the method to `RigorRpcClient` in
   `packages/rigor-core/src/rpc/client.ts`.
2. Add a unit test in `packages/rigor-core/tests/rpc.test.ts` (mock
   `fetchImpl`).
3. Wire it into the UI (web: `apps/web/src/hooks/use-miner.ts`, android:
   `apps/android/src/services/mining.ts`).
4. Document the method in `docs/MINING.md` if it affects the mining flow.

## Adding a new shadcn/ui component

```bash
cd apps/web
bunx shadcn@latest add <component>
```

The CLI writes to `src/components/ui/`. Don't edit those files directly —
they're overwritten on `bunx shadcn@latest add --overwrite`.

## Security disclosures

Found a vulnerability? **Do not** open a public issue. Email
`security@secretarrow.io` with a description and repro. We'll respond
within 72 hours.
