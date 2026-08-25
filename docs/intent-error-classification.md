# Intent error classification

FastBridge converts SDK and middleware errors into a short message for the user. The original error
code, provider reasons, and error ID remain available under **Technical details** while the Better
Intent integration is being tested.

## Mapping

| Bucket | How it is detected | User message |
| --- | --- | --- |
| User rejected | SDK `user_action` category, wallet code `4001`, or legacy rejection codes | Transaction cancelled. |
| Quote expired | The SDK expiry error | This quote expired. Request a new quote and try again. |
| Quote or provider | `getIntentQuoteFailure(error)` returns a failure | A message based on the quote failure subcode |
| Insufficient funds | `INSUFFICIENT_BALANCE` or `INSUFFICIENT_APPROVAL_GAS` | Explains whether token balance or native approval gas is missing |
| Wallet or network | SDK `execution` category, or `wallet`/`rpc` service | Check the network and native gas balance, then retry |
| Invalid request | SDK `validation` category | Shows the validation message when it is safe and useful |
| SDK internal | SDK `internal` category | Something went wrong in the Nexus SDK. Please try again. |
| Unknown | No known category or code | Transaction failed. Please try again. |

### Quote failure messages

| SDK subcode | User message summary |
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

## Display behavior

FastBridge displays the result in two layers:

1. A short, actionable message for the user.
2. Technical details containing the middleware code, subcode, provider reasons, and error ID.

The technical section is useful during the regression pass. It can be moved into a collapsible
section before production release.

## API changes requested

Provider failures need structured details. For example, Mayan currently returns
`AMOUNT_TOO_SMALL` and its minimum inside a text string. The API should ideally return:

```json
{
  "provider": "mayan",
  "code": "AMOUNT_TOO_SMALL",
  "minimumRaw": "404200000000000",
  "tokenSymbol": "ETH"
}
```

FastBridge should not parse provider message strings because their wording can change.

## SDK changes requested

- Add a stable quote-expired error code. The current SDK error says `expired before submission`, so
  FastBridge must temporarily recognize it from the message.
- Keep provider reason codes and values typed when exposing `getIntentQuoteFailure`.
- Preserve the existing SDK error categories and codes. FastBridge uses them instead of matching
  general error text.

The SDK should expose stable facts and categories. Final product wording remains in FastBridge so
other applications can use copy suited to their own UI.
