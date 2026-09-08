# Intent outcomes and error classification

This document aligns FastBridge error handling with the Nexus Telemetry Contract.

The implementation must keep three separate pieces of information:

1. **Attempt outcome**: what happened to the complete user attempt.
2. **Technical reason**: the stable error category, code, and failing service.
3. **User message**: short product copy shown by FastBridge.

These fields are related, but they are not interchangeable. For example, a quote expiry before the
user commits is `rejected`, while an intent expiry after commitment is `failed`.

## Target event

The SDK should expose enough information for a product to report one terminal event per attempt:

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

The exact public type can change during implementation, but these facts must not be reduced to a
formatted error string.

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

## Required changes

### Backend

1. Keep returning the stable middleware `code`, `subcode`, `errorId`, and structured
   `sourceVerdicts`.
2. Return provider failures as structured objects instead of formatted strings. For example:

   ```json
   {
     "provider": "mayan",
     "code": "AMOUNT_TOO_SMALL",
     "minimumRaw": "404200000000000",
     "tokenSymbol": "ETH"
   }
   ```

3. Record the terminal outcome for attempts that the middleware owns after commitment.
4. Accept and propagate the agreed attempt ID so browser, SDK, middleware, and provider records can
   be correlated.
5. Add the planned client and surface identity headers when that API contract is available.

The backend currently returns structured source verdicts, but `providerReasons` are still strings.
FastBridge must not parse those strings because provider wording can change.

### SDK

1. Create an `attemptId` when the first quote is requested.
2. Reuse it across requotes until that attempt reaches a terminal outcome. A retry after a terminal
   outcome receives a new ID.
3. Track whether the ERC20 or native commitment point has been crossed.
4. Expose one terminal attempt outcome: `completed`, `stopped`, `rejected`, or `failed`.
5. Preserve structured errors in intent step events. The current `IntentEvent` exposes
   `error?: string`, which loses category, code, service, and middleware details.
6. Add stable codes for quote expiry and post-commit intent expiry. FastBridge currently recognizes
   quote expiry from message text.
7. Include outcome, commitment state, error category, code, service, and attempt ID in product
   analytics events, not only operational logs.
8. Preserve structured provider failure codes and values through `getIntentQuoteFailure`.

### FastBridge

1. Consume the SDK's structured terminal outcome instead of inferring it from UI state such as
   `swapStep === "progress"`.
2. Remove the early silent return for user rejection. A pre-commit rejection should close or reset
   the flow without a failure receipt, while still recording `stopped`.
3. Use stable SDK codes for classification. Keep text-pattern matching only as temporary backwards
   compatibility.
4. Emit the same `attemptId` with every relevant product event.
5. Record both observed and product-accountability outcomes for the native second-prompt case.
6. Apply the same outcome logic to swap, bridge/transfer, multi-source, and swap-and-execute flows.
7. Continue showing errors in two layers:
   - short actionable copy for the user;
   - middleware code, subcode, error ID, and provider details under **Technical details**.

FastBridge currently emits its own `deposit_failed` categories and estimates whether execution is
active from the progress screen. This should be replaced by the SDK's commitment and outcome data.

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

1. The canonical public event and field names.
2. Whether middleware or SDK generates the initial attempt ID.
3. How observed outcome and FastBridge accountability outcome are represented together.
4. The structured schema for provider failures.
5. The final client and surface identity headers.

FastBridge should continue to own final user-facing copy. The backend and SDK should expose stable,
structured facts that any product can map to its own wording.
