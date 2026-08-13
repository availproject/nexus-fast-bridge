# Better Intent SDK migration

## Goal

Run FastBridge against `availproject/nexus-sdk#refactor/use-better-intents` while preserving the
existing review-before-execution UX and progress UI.

## Baseline

- FastBridge `master` uses `@avail-project/nexus-core@2.2.4`.
- No existing FastBridge branch or pull request uses the Better Intent SDK branch.
- The Better Intent SDK replaces local routing with middleware-provided catalogs, balances,
  quotes, execution instructions, submission, status, and history.

## Implementation decisions

### Pin the review branch

FastBridge installs `github:availproject/nexus-sdk#refactor/use-better-intents`. The lockfile pins
the resolved commit so CI and reviewers test the same SDK revision. The exact git-hosted package is
also allowlisted in `pnpm-workspace.yaml` because the SDK builds its distribution during install.

### Keep quote approval explicit

The Better Intent SDK auto-allows a quote when no hook is supplied. FastBridge must always pass its
quote-review callback under `options.hooks.onIntent`. Composite methods must use the same nested
hook shape. This prevents a migration mistake from bypassing FastBridge's confirmation screen.

### Adapt at the Nexus boundary

Better Intent returns flat `IntentBalance[]`, normalized `IntentQuote`, `IntentEvent`, and
`IntentHistoryRecord` models. FastBridge previously consumed aggregated token balances and legacy
plan events. Compatibility conversion belongs next to `NexusProvider` and shared transaction
utilities, not inside visual components and not in chain-specific configuration.

The temporary adapter is `components/nexus/better-intent-compat.ts`. It is an application-side
bridge for FastBridge's existing UI model, not backend logic and not a proposed SDK public API.

### Use the canonical Better Intent event model

FastBridge progress is driven from:

- `quote`, which seeds the ordered plan;
- `step`, which marks `started`, `completed`, or `failed` work;
- `status`, which reports middleware lifecycle state.

The boundary adapter maps `quote` to the existing plan-preview UI and `step` to the existing
plan-progress UI. `status` passes through without creating an extra progress step. This keeps the
current screens functional while making the SDK callback contract canonical at every call site.

### Derive local display balances only

Flat provider balances are grouped by token identity for FastBridge selectors. Human-readable
amounts use each entry's decimals, and the original chain/address identity is retained in the
breakdown. This grouping is display-only. The SDK and middleware remain the source of truth for
route selection and executable amounts.

Only balances marked `usable` are shown. Catalog tokens expose their Better Intent `address` under
FastBridge's existing `contractAddress` UI key, and intent-capable chains populate the legacy
`swapSupported` flag.

### Preserve fee semantics

The compatibility quote uses `fulfillmentRaw` as the legacy bridge total and exposes `caGasRaw`,
`protocolRaw`, and `solverRaw` separately. It does not add `caGasRaw` to the other fee fields because
observed Better Intent responses define CA gas as an aggregate that can overlap deposit and
fulfillment components. `depositRaw` remains visible through Better Intent's normalized quote but
has no faithful slot in the legacy FastBridge fee object.

Better Intent quotes currently expose token amounts but not USD quote values. FastBridge enriches
the display model with locally cached per-symbol USD rates so the confirmation screen can render
the receive value and estimate price impact. These values are presentation estimates only and are
never sent back to the SDK or middleware.

### Do not recreate SDK routing or max-quote logic

`calculateMaxForSwap` was intentionally removed from the Better Intent SDK. FastBridge may derive a
conservative display maximum from usable wallet balances and USD rates, but it must not reconstruct
provider routes or executable quotes. The real quote remains the final validation.

### Use the normalized history contract

History renders the fields currently guaranteed by `IntentHistoryRecord`: intent ID, provider,
status, timestamps, and explorer URL. Legacy destination/source detail is treated as unavailable
until the middleware history contract exposes it.

The SDK's current public `listIntents` wrapper continues to accept `page`; FastBridge follows that
public method rather than calling middleware pagination directly. The history card temporarily
leaves source and destination details empty because the normalized record does not provide them.

### Keep composite hook placement consistent

`swapAndExecute`, exact-input, and exact-output calls pass quote review under `hooks.onIntent`.
Allowance review remains under `hooks.onAllowance` where supported. No execution path in this
migration relies on the SDK's auto-allow fallback.

## Known limitations and follow-ups

- The display-only maximum is based on usable wallet USD value with a safety multiplier. A real
  Better Intent quote remains required before execution.
- Rich history cards need source, destination, and amount fields from the backend history contract.
- The adapter should be removed or reduced after the team decides whether Better Intent's normalized
  response shapes are the final application-facing contract.
- Live wallet regression is still required for exact-input, exact-output, bridge/transfer, and
  swap-and-execute paths. Static validation cannot approve or sign these transactions.
- A `422` is not assumed to be a global minimum amount. The same mainnet endpoint successfully
  quotes 0.1 USDC for an OP-to-Base source-restricted request. FastBridge now prefers the
  middleware's detailed validation message when the SDK exposes it; amount-dependent failures must
  be diagnosed using the rejected route and source set.
- ERC-20 approvals require source-chain native gas. Since sponsored gas is out of scope, zero-gas
  wallets can quote and sign but cannot submit the approval transaction. FastBridge converts that
  RPC failure into an actionable native-gas message rather than presenting a generic swap failure.

## Validation requirements

- `pnpm exec tsc --noEmit -p packages/fast-bridge-app/tsconfig.json`
- `pnpm check`
- `pnpm build`
- Read-only wallet validation for catalogs, balances, quotes, and history
- Live confirmation validation for exact-input, exact-output, bridge/transfer, and composite flows

Sponsored gas is outside the current POC pass/fail scope.
