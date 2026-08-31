# Better Intent status mapping

This document explains how FastBridge showed progress with the old SDK, what Better Intent exposes,
and the mapping used after the migration.

## The FastBridge progress screen

FastBridge keeps a compact progress screen instead of displaying every SDK operation as a separate
row:

1. Approve tokens, when approval is required
2. Process the transfer
3. Receive the destination token
4. Complete the destination app action, for deposit flows only

Legacy SDK operations and Better Intent events are mapped into these rows differently.

## How the old SDK worked

The old SDK returned a detailed execution plan and emitted progress for named operations:

- allowance approval
- `SOURCE_SWAP`
- `BRIDGE_DEPOSIT`
- `BRIDGE_INTENT_SUBMISSION`
- `BRIDGE_FILL`
- `DESTINATION_SWAP`

FastBridge grouped those operations like this:

| Old SDK operation | FastBridge row |
| --- | --- |
| Allowance or source-swap approval | Approve tokens |
| Source swap | Swaps in progress |
| Bridge deposit | Swaps in progress |
| Bridge intent submission | Swaps in progress |
| Bridge fill | Receive token |
| Destination swap | Receive token |

Each old plan operation reported its own progress. FastBridge marked a row as active, complete, or
failed based on the operations assigned to it. FastBridge did not have a separate per-leg model.

## What Better Intent exposes

Better Intent exposes two different kinds of progress.

### Execution steps

These describe SDK or wallet actions:

- `erc20_approval`
- `native_transaction`
- `intent_signature`
- `intent_submission`
- `intent_fulfillment`

Approval and native transaction steps are optional. Signature and submission happen once for the
whole intent.

### Source legs

A leg represents one source used to fund an intent. A single-source intent has one leg. A
multi-source intent can have several legs from different chains or tokens.

Each leg exposes:

- `sourceIndex`
- `status`: `created`, `deposited`, `fulfilled`, or `expired`
- transaction hash
- transaction and provider explorer links
- a provider error, when present

Legs progress independently. For example, one source may be deposited while another source is still
waiting. The overall intent status is only the combined summary.

The API already returned this information from `/better-intent/rff/:id`. The SDK now includes the
normalized `legs` array in every status event and in the final result.

SDK change: https://github.com/availproject/nexus-sdk/commit/23c26f4

The SDK polls both endpoints every two seconds:

- `/better-intent/status/:id` supplies the unified status and substatus;
- `/better-intent/rff/:id` supplies the individual legs, errors, and explorer links.

The deployed v1.8 API can report the unified status as `deposited` after only one source leg
deposits. FastBridge therefore does not use that value to complete the deposit row. It advances
only after every returned leg is `deposited` or `fulfilled`. Middleware v1.9 changes the unified
status to follow the least-advanced leg and also returns structured progress details directly.

## Mapping used now

FastBridge uses execution steps for wallet actions and leg statuses for backend transfer progress.

| Better Intent information | FastBridge behavior |
| --- | --- |
| `erc20_approval` | Show and update Approve tokens |
| `native_transaction` | Keep Process transfer active; show Source transaction failed on failure |
| `intent_signature` | Keep Process transfer active; show Intent signature failed on failure |
| `intent_submission` | Keep Process transfer active; show Intent submission failed on failure |
| Any leg is still `created` | Keep Process transfer active |
| Every leg is `deposited` or `fulfilled` | Complete Process transfer and start Receive token |
| Every leg is `fulfilled` | Complete Receive token |
| A leg expires or reports an error before deposit | Fail Process transfer |
| A leg fails during fulfillment | Fail Receive token |
| Overall intent is `fulfilled` | Complete Receive token as a final safeguard |

`intent_submission` no longer completes the processing row by itself. Submission only means the
middleware accepted the intent. FastBridge waits for the source-leg statuses before advancing.

## UI labels

For Better Intent, the generic swap labels are replaced with transfer labels because a route may be
a bridge, a swap, or both:

| Previous label | Better Intent label |
| --- | --- |
| Approve Swaps | Approve tokens |
| Swap tokens | Deposit source / Deposit sources |
| Swaps in progress | Deposit in progress / Deposits in progress |
| Swaps completed | Deposit completed / Deposits completed |

The old labels remain for legacy SDK events.

## Failure mapping

| Failure | User-facing stage error |
| --- | --- |
| ERC-20 approval | Token approval failed |
| Native source transaction | Source transaction failed |
| Intent signature | Intent signature failed |
| Intent submission | Intent submission failed |
| Source leg before deposit | Source transfer failed |
| Source leg during fulfillment | Transfer fulfillment failed |
| Intent fulfillment step | Intent fulfillment failed |

Detailed API and SDK errors remain available for logging and diagnostics. The progress screen uses a
short stage-specific message.

## Main difference

The old flow advanced using completion events from detailed plan operations. The Better Intent flow
uses:

- step events for actions performed by the user or SDK;
- leg statuses for each source's transfer progress;
- the overall intent status for final completion.

This keeps the compact FastBridge UI while preventing submission from being mistaken for successful
source deposits or fulfillment.

## Per-leg details

The unified progress rows use the least-advanced leg. The deposit row shows a compact summary such
as `1 of 2 deposited`. Selecting that summary expands the source legs inline. Each leg displays:

- the source token and chain;
- its current status, such as waiting, deposited, fulfilled, or failed.

Only the status label is colored: waiting is amber, deposited is blue, fulfilled is green, and
failed or expired is red.

The leg details and the full progress timeline have independent expand/collapse controls. This keeps
the default progress screen compact while still exposing multi-source progress.

Before the first status poll, FastBridge creates one `Waiting for deposit` row for every quoted
source. Backend leg statuses replace those placeholders by `sourceIndex` as polling continues.

## Completion transition

Approval count and source-leg count are independent. For example, a two-leg intent may display
`Approved tokens (1 of 1)` when only one source required a new allowance, followed by `2 of 2
deposited` for the source legs.

When the SDK resolves successfully, FastBridge commits a final fulfilled status for every quoted
source and renders the completed approval, deposit, and receive rows before opening the receipt.
This prevents fast intents from jumping directly from an in-progress row to `Swap Complete`.

The status endpoints return snapshots rather than transition history. If every source moves from
`created` to `fulfilled` between two polls, the UI correctly moves from `0 of N` to `N of N`; it
does not invent an intermediate per-leg sequence that the SDK did not observe.

## Fee mapping

The Better Intent compatibility layer currently maps API fees into the existing FastBridge UI as
follows:

| API field | FastBridge display |
| --- | --- |
| `depositRaw` | Network Fee |
| `protocolRaw` | Protocol Fee |
| `solverRaw` | Solver Fee |
| `fulfillmentRaw` | Not displayed separately; intended to equal protocol + solver |
| `caGasRaw` | Not displayed separately |

The combined Fees (Estimated) value is `depositRaw + protocolRaw + solverRaw`. This keeps the total
equal to the visible fee rows and avoids depending on the currently inconsistent Nexus v2
`fulfillmentRaw` value.

Raw values temporarily use the destination token decimals. This must be updated if the API confirms
a different denomination for any fee field.
