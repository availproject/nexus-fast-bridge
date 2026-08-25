# Better Intent status mapping

FastBridge keeps its existing progress screen for this migration. Better Intent steps are now mapped
explicitly to those existing stages instead of relying only on their position in the plan.

## What the old SDK emitted

The old SDK exposed operational steps such as allowance approval, source swap, bridge deposit,
intent submission, bridge fill, and destination swap.

FastBridge grouped them into:

1. Approve tokens
2. Swaps in progress
3. Receive token
4. Final app action for deposit flows

## What Better Intent emits

Better Intent returns these plan steps:

- `erc20_approval`, when an ERC-20 approval is required
- `native_transaction`, when a native source deposit is required
- `intent_signature`
- `intent_submission`
- `intent_fulfillment`

Approval and native transaction steps are optional, so FastBridge should not infer their meaning
from their position in the plan.

## Mapping used now

| Better Intent step | Existing FastBridge stage | Failure label |
| --- | --- | --- |
| `erc20_approval` | Approve tokens | Token approval failed |
| `native_transaction` | Swaps in progress | Source transaction failed |
| `intent_signature` | Swaps in progress | Intent signature failed |
| `intent_submission` | Swaps in progress | Intent submission failed |
| `intent_fulfillment` | Receive token | Intent fulfillment failed |

The mapping is applied to preview, progress, completion, and failure events. Existing old-SDK step
handling remains in place for compatibility.

## What changed in the implementation

- `erc20_approval` is recognized as an approval, including failed approvals.
- Every Better Intent step maps to a named FastBridge stage.
- Better Intent failures mark the correct row as failed.
- Failure receipts use the actual failed Better Intent step instead of a generic swap failure.
- The existing UI stages and labels remain unchanged for now.

## Product decision needed

The current label **Swaps in progress** is not always accurate. Better Intent uses the same intent
flow for bridges and swaps, and some routes contain no token swap.

Recommended simplified stages:

1. Approve token, only when required
2. Confirm transaction, for native transaction or intent signature
3. Processing transfer, for submission and provider processing
4. Receive token, for fulfillment

Questions to confirm:

- Should FastBridge keep three compact stages or expose signature and submission separately?
- Should **Swaps in progress** become **Processing transfer** or **Processing transaction**?
- Should a user-rejected signature appear as a failed stage or return quietly to the form?
- For fulfillment failure, should the UI mention refund behavior only when the API explicitly says a
  refund has started?

No API change is required for the current mapping. The SDK already exposes typed plan steps and
step states. If more detailed fulfillment progress is wanted later, the API/SDK would need richer
substatus events rather than only `started`, `completed`, and `failed`.
