# FastBridge Better Intent integration

## What changed

FastBridge now installs `@avail-project/nexus-core` from
`availproject/nexus-sdk#refactor/use-better-intents` instead of SDK 2.2.4. The lockfile pins the
resolved SDK commit so local and CI tests use the same code.

The SDK branch already contains the Better Intent backend client and execution orchestration. This
FastBridge change wires the application to the SDK's new public response and event models while
preserving the current confirmation and progress UI.

FastBridge configures the SDK with `network: "canary"`. The Better Intent rollout has no supported
mainnet deployment; canary still operates against mainnet chains and therefore requires real assets
and native gas for live execution tests.

## Endpoint wiring

FastBridge calls these through the SDK, not with application-level HTTP requests.

The SDK resolves the canary configuration to
`https://nexus-v2.canary.avail.so/middleware`.

| FastBridge use | SDK method | Better Intent endpoint | Expected result |
| --- | --- | --- | --- |
| Initialize chains | `initialize`, `getSupportedChains` | `/api/v1/better-intent/chains` | Intent-capable chains and their tokens |
| Token catalog | SDK initialization | `/api/v1/better-intent/tokens` | Supported assets across chains |
| Wallet balances | `getBalancesForBridge`, `getBalancesForSwap` | `/api/v1/better-intent/balances/:address` | Flat, usable wallet balances with token and chain identity |
| Quote | `swapWithExactIn`, `swapWithExactOut`, bridge methods | `/api/v1/better-intent/quote` | Quote, fees, allowances, execution plan, and expiry |
| Submit | SDK execution after approval and signature | `/api/v1/better-intent/submit` | Accepted intent ID and initial status |
| Status | SDK execution polling | `/api/v1/better-intent/status/:intentId` | Intent lifecycle status and substatus |
| History | `listIntents` | `/api/v1/better-intent/rffs` and `/rffs-external` | Combined Nexus and external-provider intent summaries |

## FastBridge compatibility layer

The application adapter is
`packages/fast-bridge-app/src/components/nexus/better-intent-compat.ts`.

It performs display compatibility only:

- Maps catalog token `address` to FastBridge's existing `contractAddress` field.
- Groups flat `IntentBalance[]` entries for existing asset selectors while retaining each source
  chain and token address.
- Maps `IntentQuote` into the current confirmation-screen model.
- Maps Better Intent `quote`, `step`, and `status` events into the existing progress UI.
- Adds locally cached USD rates for receive value and estimated price impact. These estimates are
  never sent to the SDK or backend.

Routing, executable amounts, allowances, signing, submission, and polling remain owned by the SDK
and Better Intent backend.

## Important decisions

- Quote review stays explicit through `options.hooks.onIntent`. FastBridge does not rely on the
  SDK's automatic approval fallback.
- Exact-input, exact-output, and `swapAndExecute` use the same nested hook structure.
- Fee components are not blindly added. Observed responses show `caGas` can overlap deposit and
  fulfillment fees, so adding every field would double-count.
- The removed `calculateMaxForSwap` API is replaced only with a conservative display estimate.
  The backend quote remains authoritative.
- History displays the fields guaranteed by the new contract: ID, provider, status, timestamps,
  and explorer URL. Rich source/destination history needs additional backend fields.
- Sponsored gas is out of scope. ERC-20 approvals require the native gas token on the source chain.
- Diagnostic SDK events and detailed middleware/RPC errors are intentionally retained during the
  regression pass.
- The canary Nexus Explorer does not currently index Better Intent Mayan records. For fulfilled
  Mayan intents, FastBridge resolves the source transaction from the Better Intent detail endpoint
  and links to the chain explorer instead of showing the broken Nexus Explorer URL.

## Current validation status

- Catalogs, balances, quotes, history, USD receive display, and progress-event mapping are wired.
- Earlier quote and execution checks accidentally used the SDK's mainnet-named deployment. They are
  useful implementation observations but do not count as canary validation.
- All read and live execution paths below must be rerun after the switch to canary.

## Still to test

Run on canary with a funded wallet, including native gas on every ERC-20 source chain:

- Initialization, catalogs, balances, quotes, and history
- Exact-input and exact-output swaps
- Bridge/transfer flows
- `swapAndExecute`
- Quote refresh and manual source changes
- Approval, signing, submission, polling, success/failure, and history refresh

## Validation

- TypeScript check passes.
- Production build passes and generates all 21 routes.
- Local FastBridge UI and static assets load successfully.
- The full repository checker also scans unchanged legacy scripts under `public/landing-new`, which
  currently contain pre-existing lint errors unrelated to this migration.
