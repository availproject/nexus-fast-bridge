# Chain Customization

Chain differences are expressed through the runtime registry while all behavior remains in the shared application.

## Choose the Smallest Configuration Layer

### AppConfig

Use `AppConfig` in `packages/fast-bridge-app/src/config/chain-settings.ts` for identity and presentation:

- chain ID, RPC, explorer, and native currency
- names, logos, colors, backgrounds, and metadata
- preferred Nexus destination chain and token

### ChainFeatures

Use `ChainFeatures` for behavior differences:

- supported tokens and amount limits
- wallet initialization timing
- token or chain logo overrides
- fee and amount presentation
- optional promotional or support UI
- post-bridge wallet actions

The contract and safe defaults live in `packages/fast-bridge-app/src/types/runtime.ts`.

## Adding a New Behavior Flag

1. Add an optional field to `ChainFeatures`.
2. Add a safe fallback to `defaultChainFeatures`.
3. Consume the flag in shared code through `useRuntime()`.
4. Set the value in only the registry entries that differ.
5. Run `pnpm check` and `pnpm build`.

Example:

```tsx
const { chainFeatures } = useRuntime();

return chainFeatures.showExperimentalNotice ? <ExperimentalNotice /> : null;
```

## Decision Rules

- Shared behavior with different values: add registry data.
- A small chain-specific behavior difference: add a feature flag.
- Several related differences: group them under one coherent feature shape or shared strategy.
- Never fork a shared component into a chain directory or store chain behavior in environment variables.

## Runtime Assets

Use root-safe public paths or stable remote URLs. If an asset path is derived at runtime, keep it compatible with the root-hosted SPA and verify it in the production build.
