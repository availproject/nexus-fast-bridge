# Intent outcomes and error classification

**Audit status:** reviewed against Better Intent middleware `middleware-v1.10.0-rc.0`, Nexus SDK
branch `refactor/use-better-intents` at `1da9b79`, and FastBridge branch
`codex/use-better-intent-sdk` at `97c101a`.

This document aligns FastBridge error handling with the Nexus Telemetry Contract.

The implementation must keep three separate pieces of information:

1. **Attempt outcome**: what happened to the complete user attempt.
2. **Technical reason**: the stable error category, code, and failing service.
3. **User message**: short product copy shown by FastBridge.

These fields are related, but they are not interchangeable. For example, a quote expiry before the
user commits is `rejected`, while an intent expiry after commitment is `failed`.

## Target event

The SDK should expose enough information for a product to report browser-authoritative pre-commit
outcomes and consume middleware-authoritative post-commit outcomes:

```ts
type IntentAttemptOutcome = "completed" | "stopped" | "rejected" | "failed";

type IntentAttemptResult = {
  attemptId: string;
  outcome: IntentAttemptOutcome;
  committed: boolean;
  reason?: {
    category: ErrorCategory;
    code: string;
    service?: string;
    stepId?: string;
    stepType?: string;
    middlewareCode?: string;
    middlewareSubcode?: string;
    errorId?: string;
    details?: Record<string, unknown>;
  };
};
```

The exact public type still needs agreement. These facts must not be reduced to a formatted error
string, and the SDK/FastBridge must not create a second canonical post-commit outcome when the
middleware has already recorded one.

## Attempt outcomes

| Outcome | Meaning | Included in failure rate |
| --- | --- | --- |
| `completed` | The intent reached its successful terminal state | Yes, as a successful attempt |
| `stopped` | The user voluntarily stopped before commitment | No |
| `rejected` | Nexus refused or could not accept the attempt before commitment | No |
| `failed` | The attempt failed after the user crossed the commitment point | Yes, as a failed attempt |

Failure rate is `failed / (completed + failed)`. `stopped` and `rejected` are excluded.

### Commitment points

| Source type | Commitment point |
| --- | --- |
| ERC20 | The user successfully signs the intent |
| Native token | The native deposit transaction is submitted |

The SDK controls these steps and must determine commitment. FastBridge must not infer commitment
from the currently displayed screen.

### Outcome mapping

| Situation | Before commitment | After commitment |
| --- | --- | --- |
| User rejects or closes a wallet prompt | `stopped` | Normally `failed`; see native exception below |
| Invalid request or unsupported route | `rejected` | Not expected after commitment |
| Insufficient balance or approval gas | `rejected` | `failed` if discovered after commitment |
| No provider accepts the quote | `rejected` | Not expected after commitment |
| Quote expires | `rejected` | Not applicable; the accepted intent has its own lifecycle |
| Wallet, RPC, middleware, or provider error | `rejected` | `failed` |
| Intent expires or fulfillment times out | Not applicable | `failed` |
| Intent is fulfilled | Not applicable | `completed` |

For native-token flows, intent signing happens before the deposit transaction prompt. If the user
rejects that second prompt:

- the observed user outcome is `stopped`, because the native transaction was not submitted;
- FastBridge product accountability records it as `failed`, because the product introduced a
  second prompt after the user had already signed the intent.

Telemetry should retain both values when product-accountability reporting is required instead of
overwriting the observed outcome.

## Technical error reasons

The SDK already defines the following useful categories:

| SDK category | Meaning | Common services |
| --- | --- | --- |
| `user_action` | User rejected a wallet or SDK hook action | `wallet`, `hook` |
| `validation` | Invalid input, unsupported asset, or unmet precondition | None |
| `simulation` | Pre-execution simulation failed | `rpc` |
| `execution` | Wallet or onchain execution failed | `wallet`, `rpc` |
| `backend` | Nexus middleware request or polling failed | `middleware` |
| `external_service` | An external provider failed | Provider name |
| `internal` | Unexpected SDK failure | None |

The category alone does not determine the attempt outcome. Outcome also depends on whether the
commitment point was crossed.

## FastBridge user-message buckets

FastBridge keeps its own UI buckets so product copy can remain simple:

| UI bucket | How it is detected | Example user message |
| --- | --- | --- |
| User rejected | SDK `user_action`, wallet code `4001`, or a legacy rejection code | Transaction cancelled. |
| Quote expired | Stable SDK quote-expiry code | This quote expired. Request a new quote and try again. |
| Quote or provider | `getIntentQuoteFailure(error)` returns a failure | Message based on the quote failure subcode |
| Insufficient funds | `INSUFFICIENT_BALANCE` or `INSUFFICIENT_APPROVAL_GAS` | Explain which balance is missing |
| Wallet or network | SDK execution error from `wallet` or `rpc` | Check the network and native gas balance, then retry. |
| Invalid request | SDK `validation` category | Show safe, actionable validation guidance |
| SDK internal | SDK `internal` category | Something went wrong in the Nexus SDK. Please try again. |
| Unknown | No recognized structured category or code | Transaction failed. Please try again. |

These buckets control display only. They must not be sent as the canonical telemetry outcome.

### Quote failure messages

| Middleware subcode | User message summary |
| --- | --- |
| `NO_ROUTABLE_SOURCE` | The selected sources cannot be used for this route |
| `INTENT_REFUSED` | No provider can complete the selected route and amount |
| `PROVIDER_UNAVAILABLE` | Providers are temporarily unavailable |
| `NO_PROVIDERS_ENABLED` | No provider is enabled for the route |
| `INSUFFICIENT_BALANCE` | The wallet does not have enough balance |
| `INSUFFICIENT_APPROVAL_GAS` | More native gas is required for token approval |
| `SAME_CHAIN_GAS_DROP_UNSUPPORTED` | The route cannot provide the requested destination gas |
| `QUOTE_PRICE_UNAVAILABLE` | A reliable route price is unavailable |
| `QUOTE_PRICE_OUTLIER` | The quote failed the safe-price check |

## Current implementation status

### Backend and API

The middleware currently returns:

- stable top-level middleware `code`, `subcode`, and `errorId` values;
- structured `sourceVerdicts` describing whether each source was routable, unroutable, or unused;
- provider-specific failures in `providerReasons` as formatted strings.

For example, an amount-dependent provider refusal currently reaches the SDK as:

```json
{
  "code": "QUOTE_UNAVAILABLE",
  "subcode": "INTENT_REFUSED",
  "sourceVerdicts": [{ "tokenSymbol": "USDC", "state": "unused" }],
  "providerReasons": ["mayan: AMOUNT_TOO_SMALL: Amount too small (min ~1 USDC)"]
}
```

This is enough to classify the request as a quote-provider rejection. It is not enough to safely
produce provider-specific UI copy such as “Minimum amount is 1 USDC,” because FastBridge would
have to parse wording owned by the provider or middleware.

### SDK

The Better Intent SDK branch now:

- preserves middleware quote failures through `getIntentQuoteFailure(error)`;
- exposes stable Nexus error `category`, `code`, and `context.service` on thrown errors;
- exposes structured `errorDetails` on failed intent step events while retaining legacy
  `error?: string` compatibility;
- exposes `committed: boolean` on every intent step event;
- marks ERC20 intents committed after successful intent signing;
- marks native intents committed when the native transaction is submitted, before receipt
  confirmation;
- exposes per-leg lifecycle status on status events.

The SDK does **not** yet expose a canonical attempt ID or terminal attempt outcome. Quote expiry and
post-commit intent expiry also use generic backend errors rather than dedicated stable codes.

### FastBridge

FastBridge now:

- classifies middleware quote subcodes into user-facing buckets;
- uses structured SDK categories and wallet/RPC service fields for non-quote errors;
- keeps legacy message matching as a compatibility fallback;
- shows short user copy first and raw middleware identifiers/details under **Technical details**;
- disables the action button for a terminal, non-retryable provider quote error;
- consumes the SDK's `committed` flag instead of treating the progress screen as proof that the
  intent was committed;
- returns a pre-commit wallet cancellation to preview and removes its pending local-history entry;
- shows the failure flow for errors received after commitment;
- keeps structured step errors available through the Better Intent compatibility adapter.

For `QUOTE_UNAVAILABLE / INTENT_REFUSED`, the current user-facing message is intentionally generic:

> No provider can complete this route with the selected assets and amount. Try another amount,
> asset, or network.

The technical section still shows `sourceVerdicts` and `providerReasons` for debugging.

## Remaining work

### Backend

1. Return provider failures as structured objects instead of formatted strings. For example:

   ```json
   {
     "provider": "mayan",
     "code": "AMOUNT_TOO_SMALL",
     "minimumRaw": "404200000000000",
     "tokenSymbol": "ETH"
   }
   ```

2. At the first quote request, accept a caller-supplied attempt ID or generate one when absent, then
   return it to the caller. The current per-request `x-request-id` behavior is prior art, but is not
   yet a persisted attempt that spans quote, submit, and destination delivery.
3. Accept and propagate that same attempt ID through requotes, submission, status, and terminal
   processing so browser, SDK, middleware, and provider records can be correlated.
4. Record `completed` and `failed` after commitment, where middleware and protocol are authoritative.
5. Implement the settled identity-header contract: `x-nexus-client-id` and `x-nexus-surface` must be
   present on Better Intent requests. The client ID is accepted as declared until its registry
   exists; unrecognized surfaces are mapped to `other` for bounded telemetry.
6. Persist the client ID with the RFF as required by the telemetry contract.

The backend currently returns structured source verdicts, but `providerReasons` are still strings.
FastBridge must not parse those strings because provider wording can change.

### SDK

1. Supply an attempt ID on the first quote request or capture the one generated and returned by the
   middleware. Do not substitute the SDK's current operation ID, which has a different lifecycle.
2. Reuse the attempt ID across requotes and later middleware calls until that attempt reaches a
   terminal outcome. A retry after a terminal outcome receives a new ID.
3. Expose the browser-authoritative pre-commit outcome and relay post-commit middleware status with
   the same attempt ID. Do not emit a competing canonical post-commit result.
4. Add stable codes for quote expiry and post-commit intent expiry. FastBridge currently recognizes
   quote expiry from message text.
5. Include outcome, commitment state, service, and attempt ID in product analytics events, not only
   operational logs. Add `error.code` only after the shared Reason taxonomy is approved; the
   telemetry contract explicitly says not to populate it with ad hoc product-event values.
6. Preserve the backend's future structured provider failure codes and values through
   `getIntentQuoteFailure`.
7. Rebase or merge the Better Intent branch with current SDK `main` and rerun the complete SDK
   regression suite. The audited Better Intent branch does not currently contain the newer v2.3.0
   mainline history.

### FastBridge

1. Consume a future SDK canonical terminal outcome. Commitment is now SDK-driven, but FastBridge
   still owns terminal local-history and product-analytics decisions.
2. Record `stopped` for pre-commit user cancellation. The UI and local-history behavior are fixed,
   but the canonical analytics outcome contract is not implemented.
3. Use stable SDK codes for quote and intent expiry. Keep text-pattern matching only as temporary backwards
   compatibility.
4. Emit the same `attemptId` with every relevant product event.
5. Record both observed and product-accountability outcomes for the native second-prompt case.
6. Apply the same outcome logic to swap, bridge/transfer, multi-source, and swap-and-execute flows.
7. Continue showing errors in two layers:
   - short actionable copy for the user;
   - middleware code, subcode, error ID, and provider details under **Technical details**.

8. Rebase the branch onto current FastBridge `master`, resolve the six missing mainline commits, and
   rerun the production build and manual flow matrix before merge.

FastBridge still emits its own `deposit_failed` categories. Commitment is no longer inferred from
the displayed screen, but canonical attempt outcome and correlation remain future work.

## Release readiness audit

The current error-classification behavior is internally consistent, but the branch should not be
treated as ready to deploy until these integration items are resolved:

| Check | Current result | Required action |
| --- | --- | --- |
| SDK typecheck, lint, dependency boundaries | Pass | None |
| SDK tests | 187 passing | Rerun after mainline integration |
| FastBridge focused compatibility/error tests | Pass | Add browser tests for wallet cancellation and quote refusal |
| FastBridge production build | Pass | Rerun after branch integration |
| FastBridge repository-wide lint | Fails with 347 errors and 15 warnings across the existing repository | Establish/fix the baseline before using repository-wide lint as a release gate; changed error files pass focused checks |
| FastBridge versus current `master` | Branch is 6 commits behind | Rebase or merge current `master` |
| Better Intent SDK versus current SDK `main` | Better Intent branch does not include v2.3.0 mainline history | Integrate main and resolve behavior/type conflicts |
| FastBridge PR #72 | Contains Relay/provider-display/Scroll-removal work not present on this branch | Combine PR #72 with this branch's unsupported-token and structured-outcome fixes |
| Structured provider failures | Not available | Backend change required only for precise provider-specific copy |
| Canonical attempt outcome and ID | Not available | Cross-layer API/SDK/telemetry contract required |

Structured provider failures are **not a blocker** for generic production-safe error handling. They
are a blocker only for safely displaying exact provider facts such as a minimum amount without
parsing unstable text.

## Before and after

### User rejects the initial intent signature

**Before:** FastBridge silently returns, and the attempt may not be counted.

**After:** The UI closes or returns to preview, while telemetry records:

```json
{
  "outcome": "stopped",
  "committed": false,
  "reason": {
    "category": "user_action",
    "code": "user_action/intent_signature_denied",
    "service": "wallet"
  }
}
```

### Provider refuses a small quote

**Before:** FastBridge shows a generic route error and receives provider-specific information inside
a text string.

**After:** The backend returns a structured provider reason, the SDK preserves it, FastBridge can
show a precise minimum-amount message, and telemetry records `rejected` because the user had not
committed.

### Intent expires during fulfillment

**Before:** The SDK emits a formatted step-error string and FastBridge infers failure from being on
the progress screen.

**After:** The SDK knows commitment was crossed, emits a structured fulfillment-expired reason, and
records `failed`. FastBridge displays a retry or recovery message without reclassifying the outcome.

### Successful intent

**Before:** FastBridge displays success, but there is no shared attempt-outcome contract across all
layers.

**After:** The SDK and middleware correlate the same attempt ID and emit exactly one terminal
`completed` outcome.

## Validation plan

Test each flow with captured SDK events and product analytics:

1. Successful ERC20 intent.
2. Successful native intent.
3. User rejects allowance approval.
4. User rejects the ERC20 intent signature.
5. User signs a native intent but rejects the native deposit transaction.
6. Unsupported route or token.
7. Insufficient token balance.
8. Insufficient native gas for approval.
9. Provider refusal such as `AMOUNT_TOO_SMALL`.
10. Provider outage or middleware 5xx.
11. Quote expires before submission.
12. Intent expires or times out after commitment.
13. Multi-source intent where one leg fails.

For every case verify:

- one attempt ID is retained from first quote to terminal outcome;
- exactly one terminal outcome is emitted;
- commitment state is correct;
- the technical category, code, service, step, and middleware error ID are preserved;
- the UI shows short copy and keeps technical details available;
- `stopped` and `rejected` are excluded from the failure-rate denominator.

## Open contract decisions

The Nexus Telemetry Contract defines outcomes and commitment points, but the final cross-service
reason-bucket taxonomy is still being defined. Before implementation is finalized, confirm:

1. The canonical SDK public attempt-outcome event shape. The telemetry attribute keys were merged
   in nexus-v2 PR #630, but the telemetry document still marks the reason taxonomy as draft.
2. The approved cross-service Reason taxonomy for product-event `error.code` values.
3. How observed outcome and FastBridge accountability outcome are represented together.
4. The structured schema for provider failures.
5. The allocated FastBridge client ID and the declared surface value the SDK must send.

FastBridge should continue to own final user-facing copy. The backend and SDK should expose stable,
structured facts that any product can map to its own wording.
