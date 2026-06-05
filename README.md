# Nexus Fast Bridge

Fast Bridge is a single Vite SPA backed by shared runtime configuration.

- Shared app logic lives in `packages/fast-bridge-app/src/**`.
- Chain settings live in `packages/fast-bridge-app/src/config/chain-settings.ts`.
- Chain routes such as `/megaeth`, `/ethereum`, and `/arbitrum` are selected at runtime by `RuntimeProvider`.
- Chain-specific differences should be expressed through `appConfig` and `chainFeatures`, then consumed through `useRuntime()`.

## Quick Start

```bash
pnpm install
pnpm dev
```

Useful commands:

```bash
pnpm build
pnpm preview
pnpm check
pnpm fix
```

## Documentation Map

- Architecture: `docs/architecture.md`
- Add a chain: `docs/adding-chains.md`
- Chain customization and feature flags: `docs/customization.md`
- Agent workflow rules for this repo: `AGENTS.md`

## Common Workflows

### Add a new chain

1. Add a new `CHAIN_REGISTRY` entry in `packages/fast-bridge-app/src/config/chain-settings.ts`.
2. Add the RPC URL in the registry or `packages/fast-bridge-app/src/config/rpcs.json` if that file is used.
3. Set `appConfig` metadata, route branding, Nexus network/chain values, and the chain's `chainFeatures`.
4. Run `pnpm check` and `pnpm build`.
5. Smoke test the route with `pnpm dev`, for example `http://localhost:5173/sonic`.

### Ship a shared bug fix once

Edit shared code in `packages/fast-bridge-app/src/**`.
All chain routes use the same shared app and runtime context, so fixes should not be copied into per-chain wrappers.

### Add chain-specific behavior

1. Extend `ChainFeatures` in `packages/fast-bridge-app/src/types/runtime.ts`.
2. Add a fallback in `defaultChainFeatures`.
3. Consume the flag in shared code with `useRuntime()`.
4. Configure exact values in `CHAIN_REGISTRY`.

## Notes

- Do not add chain-specific behavior through environment variables.
- Do not import static runtime config in shared components; use `useRuntime()`.
- Existing `apps/**` folders are not the active source model for new chain work.
- Keep generated or registry-imported UI changes scoped, and validate with `pnpm check` plus `pnpm build`.
