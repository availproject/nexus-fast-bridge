# Adding a New Chain

This guide is the canonical process for creating and shipping a new chain app.

## Fast Path (Recommended)

```bash
pnpm chain:add <slug> --name "Chain Name"
```

Example:

```bash
pnpm chain:add sonic --name "Sonic"
```

### Useful options

- `--description "..."`
- `--base-path "/sonic/"`
- `--primary "#hex"`
- `--secondary "#hex"`
- `--logo-url "https://..."`
- `--icon-url "https://..."`
- `--template monad`

## What the Scaffold Command Does

- Clones `apps/<template>` to `apps/<slug>`.
- Updates app package name to `@fastbridge/<slug>`.
- Sets `dev`/`build` scripts to call `prepare-env` with your slug.
- Sets Vite default base path in `apps/<slug>/vite.config.ts`.
- Applies default text branding updates in `apps/<slug>/get-config.ts`.
- Creates/renames env file to `apps/<slug>/.env.<slug>`.
- Appends and sorts entry in `chains.config.json`.
- Runs `pnpm chains:sync`.

## Post-Scaffold Checklist

1. Update env values in `apps/<slug>/.env.<slug>`.
Important keys include chain IDs, RPC URLs, explorer URL, colors, token defaults, and metadata.

2. Tune behavior flags in `apps/<slug>/src/runtime.ts`.
Use this for chain-specific UX/logic differences.

3. Add or update chain assets in `apps/<slug>/public`.

4. Smoke test locally:

```bash
pnpm --filter @fastbridge/<slug> dev
pnpm --filter @fastbridge/<slug> build
pnpm dev:all
```

5. Export deployment env:

```bash
pnpm vercel:env
```

Then sync the generated `<SLUG>_...` vars into your deployment provider.

## Manual Path (When Not Using `chain:add`)

If you edit chain list or app folders manually, always run:

```bash
pnpm chains:sync
```

This updates:
- `apps/root/package.json` workspace devDependencies for all chain apps.
- `turbo.json` `globalEnv` based on `.env.<slug>` keys.

## Validation Before Merge

- `chains.config.json` has correct `slug`, `basePath`, `appDir`.
- `apps/<slug>/vite.config.ts` base path matches chain `basePath`.
- `apps/<slug>/src/runtime.ts` exports valid `appConfig` and `chainFeatures`.
- Root landing shows chain card correctly (`apps/root/src/chains.ts` reads `chains.config.json`).
- `pnpm build:all` succeeds and chain bundle appears in `apps/root/public/<slug>`.

## Common Pitfalls

- Missing prefixed env vars in CI/deploy causes fallback defaults in `get-config.ts`.
- Inconsistent `basePath` causes asset loading issues.
- Adding new env keys without running `pnpm chains:sync` causes stale turbo env tracking.
