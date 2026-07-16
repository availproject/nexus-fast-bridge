# Adding a Chain

FastBridge uses one SPA and one chain registry. Adding a chain does not require a wrapper application or chain-specific environment file.

## Workflow

1. Add a `ChainSettings` entry to `CHAIN_REGISTRY` in `packages/fast-bridge-app/src/config/chain-settings.ts`.
2. Fill every required `AppConfig` value, including chain ID, RPC, explorer, native currency, branding, metadata, and Nexus destination defaults.
3. Configure `chainFeatures` for supported tokens, limits, and any existing behavior flags.
4. Add an RPC to `packages/fast-bridge-app/src/config/rpcs.json` only when the shared code path reads it from that file.
5. Add local visual assets under `public/` when remote assets are not appropriate.
6. If the chain needs new behavior, follow `docs/customization.md` and implement it once in shared code.

## Validation

```bash
pnpm check
pnpm build
```

Then verify that:

- `/:slug` resolves to the new registry entry.
- The route survives a page refresh.
- Changing destinations updates the route without a notification loop.
- The configured receive token exists on the destination chain.
- Logos and metadata load from production-safe URLs.
- Existing chain routes retain their defaults and feature behavior.

## Avoid

- Creating `apps/<slug>` wrappers.
- Adding `.env.<slug>` files for chain behavior.
- Duplicating shared components for one chain.
- Importing a static `appConfig` instead of using `useRuntime()`.
