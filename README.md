# Nexus Fast Bridge

FastBridge is a single Vite SPA that serves a landing page and route-driven bridge experiences such as `/ethereum`, `/arbitrum`, and `/megaeth`.

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

The production bundle is written to `apps/root/dist`.

## Architecture

- Shared application code: `packages/fast-bridge-app/src/**`
- Chain registry: `packages/fast-bridge-app/src/config/chain-settings.ts`
- Optional RPC registry: `packages/fast-bridge-app/src/config/rpcs.json`
- Route/runtime context: `packages/fast-bridge-app/src/providers/runtime-context.tsx`
- Root Vite configuration: `vite.config.ts`

Chain routes all render the same shared application. Chain identity and behavior come from the active `CHAIN_REGISTRY` entry through `useRuntime()`.

## Documentation

- [Architecture](docs/architecture.md)
- [Adding chains](docs/adding-chains.md)
- [Customization](docs/customization.md)
- [Agent workflow](AGENTS.md)

## Core Rules

- Implement shared behavior once under `packages/fast-bridge-app/src/**`.
- Keep chain differences in `CHAIN_REGISTRY` and `ChainFeatures`.
- Read runtime values through `useRuntime()`; do not import a static per-chain config.
- Do not introduce chain-specific environment variables or wrapper applications.
