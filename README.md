# Nexus Fast Bridge Monorepo

Turbo + pnpm workspace with three apps:
- `apps/monad`
- `apps/megaeth`
- `apps/root` (hosts the static bundles copied from the chain apps)

## Local dev/build
- Put secrets in `.env.<slug>` inside the app dir (or in repo root) — e.g. `apps/monad/.env.monad`, `apps/megaeth/.env.megaeth`.
- `pnpm build` / `pnpm build:all` runs `scripts/prepare-env.mjs <slug>` for each app and copies `.env.<slug>` into `.env.production` and `.env.local` for that app. If `.env.<slug>` is missing, it falls back to environment variables prefixed with `<SLUG>_`.
- `pnpm dev:root` runs the root site; `pnpm dev:all` runs all apps in parallel.

## Vercel env + deploy
- Generate Vercel-ready variables from your `.env.<slug>` files:
  ```bash
  pnpm vercel:env              # prints MONAD_*/MEGAETH_* lines
  pnpm vercel:env -o .env.vercel
  ```
- Add those `<SLUG>_KEY=VALUE` pairs to the Vercel dashboard or pipe them into `vercel env add`.
- Vercel build command: `pnpm build:all`
- Output directory: `apps/root/dist`
- During Vercel builds, `prepare-env.mjs` reads the `<SLUG>_` project env vars and writes `.env.production`/`.env.local` for each chain app (no `.env.<slug>` files exist in Vercel).

## Adding a new chain
1) Add the chain to `chains.config.json` with `slug`, `appDir`, etc.
2) Create `apps/<slug>/.env.<slug>` (or `.env.<slug>` at repo root).
3) Run `pnpm vercel:env` and push the output to Vercel env vars.
4) Deploy (build: `pnpm build:all`, output: `apps/root/dist`).

If you see Monad defaults in another chain’s build, the chain-specific env vars are missing — ensure the `<SLUG>_` vars are set in Vercel or that `.env.<slug>` exists locally.***
