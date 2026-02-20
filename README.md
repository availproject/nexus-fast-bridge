# Nexus Fast Bridge Monorepo

Fast Bridge is a Turborepo + pnpm monorepo with:
- Chain apps (`apps/<chain>`) that are thin wrappers.
- A shared app package (`packages/fast-bridge-app`) that contains almost all UI/logic.
- A root landing app (`apps/root`) that links to chain deployments and serves built chain bundles.

## Quick Start

```bash
pnpm install
pnpm dev:all
```

Useful commands:

```bash
pnpm dev:root
pnpm build:all
pnpm chain:add <slug> --name "Chain Name"
pnpm chains:sync
pnpm vercel:env
```

## Documentation Map

- Architecture: `docs/architecture.md`
- Add a chain: `docs/adding-chains.md`
- Chain customization and feature flags: `docs/customization.md`
- Agent workflow rules for this repo: `AGENTS.md`

## Common Workflows

### Add a new chain

```bash
pnpm chain:add sonic --name "Sonic"
```

Then:
1. Fill `apps/sonic/.env.sonic`.
2. Adjust `apps/sonic/src/runtime.ts` feature flags.
3. Run `pnpm --filter @fastbridge/sonic dev`.
4. Run `pnpm vercel:env` and sync prefixed env vars in deployment.

### Ship a shared bug fix once

Edit shared code in `packages/fast-bridge-app/src/**`.
All chain wrappers pick it up automatically through Vite aliasing.

### Add chain-specific behavior

Use `apps/<slug>/src/runtime.ts` (`chainFeatures`) first.
If needed, add a new flag in `packages/fast-bridge-app/src/types/runtime.ts` and consume it in shared code.

## Notes

- If you add new env keys in `.env.<slug>`, run `pnpm chains:sync` so `turbo.json` tracks them.
- If runtime image URLs are relative (for example `/logo.svg`), route them through `withBasePath(...)` in shared code.
- If shared files move, keep Tailwind source scanning updated in `packages/fast-bridge-app/src/index.css`.
