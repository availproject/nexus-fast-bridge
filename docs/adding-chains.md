# Adding a New Chain

This guide is the current process for adding a chain route to the single Fast Bridge SPA.

## Registry Path

Add the chain in `packages/fast-bridge-app/src/config/chain-settings.ts`.

1. Create a new `CHAIN_REGISTRY` entry keyed by the route slug.
2. Fill `appConfig`:
   - chain ID, name, native currency, RPC URL, explorer URL
   - chain logo/icon/background assets
   - title, description, SEO metadata
   - Nexus network, supported chain ID, and primary token
3. Fill `chainFeatures`:
   - `slug`
   - `analyticsFastBridgeKey`
   - token support and max amount settings
   - any route-specific UI or behavior flags
4. Add or reference the RPC in `packages/fast-bridge-app/src/config/rpcs.json` only if the route uses that shared RPC file.
5. Run validation and smoke test the route.

## Choosing Tokens

Set route defaults in `appConfig.nexusPrimaryToken` and token lists in `chainFeatures.supportedTokens`.

When a behavior needs more than a token list, add a `ChainFeatures` field instead of branching directly on the slug in shared code.

## Adding Chain-Specific Behavior

1. Extend `ChainFeatures` in `packages/fast-bridge-app/src/types/runtime.ts`.
2. Add a fallback in `defaultChainFeatures`.
3. Consume the flag from `useRuntime()` inside shared code.
4. Set the exact value in each relevant `CHAIN_REGISTRY` entry.

## Validation Before Merge

```bash
pnpm check
pnpm build
pnpm dev
```

Then smoke test the route in the browser:

```text
http://localhost:5173/<slug>
```

Check at least:

- The route resolves and metadata/theme updates.
- The bridge/swap UI selects the expected destination chain and token.
- Changing the receive chain updates the URL slug when that behavior applies.
- Existing routes still load with their expected defaults.

## Common Pitfalls

- Adding chain-specific behavior outside `CHAIN_REGISTRY` or `ChainFeatures`.
- Using environment variables for route behavior.
- Importing static config instead of `useRuntime()`.
- Forgetting to add fallback defaults in `defaultChainFeatures`.
- Assuming old `apps/<slug>` source wrappers are part of the active workflow.
