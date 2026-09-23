# Fast Bridge Intent integration review

Date: 2026-09-22

This note records the authorized Intent changes, the performance pass, and the investigation-only findings. Validation in this document is local repository validation; it does not claim a deployed canary or mainnet verification.

## Implemented

### 1. Regular swaps now use real exact-output execution

The regular swap branch in `packages/fast-bridge-app/src/components/nexus-one/nexus-one.tsx` now calls `nexusSDK.swapWithExactOut`. It sends the destination chain, destination token, destination `toAmountRaw`, and source token references only. It no longer converts a predictive source estimate into `amountRaw` values and then calls `swapWithExactIn`.

Deposit, send, and custom-recipient paths continue to use their existing exact-output execution paths. Arc native USDC continues to be represented as the zero address in SDK payloads.

### 2. Balance aggregation uses chain and contract identity

`normalizeIntentBalances` now groups balances by `chainId` and canonical token address. The native-token alias `0xeeee...eeee` is normalized to the zero address before grouping. Symbol and decimals remain display metadata and are no longer used as the balance identity. Decimal arithmetic is used when combining balances and USD values, avoiding precision loss from JavaScript `Number` conversion.

A regression test covers same-symbol/same-decimal contracts on the same and different chains.

### 4 and 9. Intent status no longer uses an app-side middleware lookup

The app-side RFF lookup was removed as part of the unified SDK integration. The SDK now owns Intent creation and lifecycle status, so Fast Bridge no longer constructs either the obsolete `/api/v1/better-intent/rff/:id` route or the replacement middleware route. This removes the previous risk of selecting the wrong environment or reporting a successful Intent as failed because of an app-side status request.

### 5. Performance pass

The pass targeted confirmed high-cost work without changing the bridge behavior:

- Removed the eager SDK `getTokens({ limit: 1000 })` catalog fetch during Nexus provider startup. Chain metadata and balance data still load at startup; the token catalog is obtained by the asset-selector flows that need it.
- Removed the unconditional receive-token preload on the initial bridge mount. Receive-token loading is now triggered when the swap asset-selection step opens, while selected-token metadata refresh remains available after a destination token is chosen.
- Deferred expensive token filtering and sorting with `useDeferredValue`, memoized merged catalogs, visible rows, selected USD totals, and chain-filter results, and cached search scores instead of recomputing them inside sort comparators.
- Reduced the initial asset row batch and increment size so the first drawer render mounts less work.
- Used `startTransition` when mounting heavy asset-selector drawer content so the opening animation can commit before the large selector render.
- Removed high-volume SDK event and debug logging from hot swap paths.

### 7. Explorer links in the relay/normal flow

Explorer resolution now reads source transaction and destination/protocol explorer URLs from SDK Intent status legs, source transaction records, swap transaction hashes, execute transaction URLs, and SDK progress events. History and progress state retain source and destination URLs separately, with a final transaction link chosen from the destination/protocol transaction when possible.

External-provider Intents are not assigned a Nexus Intent Explorer link unless the SDK actually returns one for that Intent. This preserves the distinction between a provider transaction link and a Nexus-indexed RFF link.

### 3. Intent execution and explorer data use the SDK path

The direct middleware RFF lookup was removed from the app. Intent execution remains SDK-owned, and explorer links are now derived from SDK result fields (`intentExplorerUrl`, source transaction records, swap transaction hashes, and execute transaction URLs) plus SDK progress events. Chain explorer URLs are built from SDK transaction hashes when the SDK provides a hash but not a fully formed URL.

Relay and LI.FI currency requests remain separate catalog-discovery integrations; they do not execute or query Intent lifecycle state.

## Implemented after follow-up investigation

### 6. Route-catalog state no longer locks every option after transient failures

Source and destination route-catalog requests now use generation guards so an older response cannot overwrite a newer selection. Failed requests preserve the last successful catalog instead of replacing it with `[]`, which was interpreted by the selectors as “every token is forbidden.” A successful empty catalog remains restrictive, so genuinely unsupported routes stay disabled.

### 8. Arc native and Relay-standard USDC are represented separately

Arc’s standard USDC representation, `0x3600000000000000000000000000000000000000`, is now allowed as the canonical Relay-supported token. Unknown Arc ERC-20 USDC contracts remain filtered. Relay-origin token metadata is retained and passed into route support checks when the SDK catalog has chain-level Relay support but omits the token entry. Native Arc USDC remains the zero-address token and is no longer confused with the ERC-20 representation.

The selector regression coverage now verifies native Arc USDC, Relay-standard Arc USDC, unknown Arc ERC-20 filtering, and provider-tagged route support.

## Remaining investigation and solution plan

### 6. Further route-catalog hardening

The selector lock-up was fixed as described above. The original issue was caused by the route effects storing an empty catalog when a request failed; an empty catalog disabled every option. The following follow-up items can harden the behavior further.

This explains why the issue is intermittent: it depends on route request timing and whether the route request fails or returns before the next selection state is applied. It is not evidence that every token is genuinely unsupported.

Recommended solution:

1. Add a monotonically increasing request generation to source/destination route-catalog effects and ignore stale responses.
2. Track `loading`, `ready`, and `error` separately; do not replace the last valid catalog with `[]` on a transient request failure.
3. Disable or show a loading state while a new catalog is pending, rather than marking every asset forbidden.
4. Clear a selected token only after a successful route response explicitly excludes that exact chain/address pair.
5. Prefer SDK token-level availability APIs for the selector where available; the current route helper is primarily chain-level.
6. Add regression tests for rapid destination/source/amount changes, failed requests, stale responses, and valid empty route responses.

### 8. Further Arc route validation

The Arc availability inconsistency was fixed as described above. The original issue was caused by treating Relay’s standard Arc USDC representation as an excluded token and by losing the Relay provider identity while merging token catalogs. The following follow-up items can expand route coverage.

Recommended solution:

1. Capture the exact Arc USDC chain/address/provider tuples returned by Relay and the Nexus canary catalog; do not infer compatibility from symbol alone.
2. Represent native Arc USDC and Relay’s supported Arc token as distinct chain/address identities, with provider capability attached to each.
3. Replace the chain-only Arc special cases with provider-aware token availability for quote and selector filtering.
4. Revisit the ERC-20 exclusion only after confirming the canonical address and transfer semantics from Relay and Nexus.
5. Add a route matrix covering Arc native USDC and Relay Arc USDC to/from supported USDC assets, including quote failure recovery.

## Validation record

- Focused Ultracite check: passed for the changed TypeScript/TSX files.
- The full `pnpm check` wrapper did not return a result in this environment; the equivalent targeted local Ultracite check passed.
- Focused compatibility regression suite: 11/11 tests passed using Node's TypeScript test runner.
- Focused token-selection regression suite: 18/18 tests passed after bundling the extensionless test imports for Node.
- Vite production bundle: passed (`vite build`). Rollup emitted existing large-chunk and dependency annotation warnings.
- `git diff --check`: passed.
- The repository aggregate `pnpm test:feedback` runner remains blocked by pre-existing harness problems: its SDK event-mapper guard rejects the installed SDK shape, and one test imports the missing `src/components/common/hooks/use-nexus-error` file.
- Full `tsc -p packages/fast-bridge-app/tsconfig.json --noEmit` remains blocked by existing repository type errors across unrelated components and SDK compatibility shims; the production bundle still succeeds.
- Route HTML generation completed, but the local environment reported a Vite WebSocket `EPERM` bind and unavailable Sanity DNS while generating content. Those are local environment limits, not deployment validation.
