import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyIntentError,
  formatClassifiedIntentError,
} from "./intent-error-classifier.ts";

test("classifies structured SDK wallet errors without parsing the message", () => {
  const result = classifyIntentError({
    category: "execution",
    code: "execution/exec_tx_send_failed",
    message: "opaque failure",
    service: "wallet",
  });

  assert.equal(result.bucket, "wallet_network");
  assert.equal(result.retryable, true);
});

test("classifies structured SDK user-action errors", () => {
  const result = classifyIntentError({
    category: "user_action",
    code: "user_action/user_denied_intent",
    message: "opaque failure",
    service: "wallet",
  });

  assert.equal(result.bucket, "user_rejected");
  assert.equal(result.message, "Transaction cancelled.");
});

test("keeps technical details out of the user-facing error message", () => {
  const message = formatClassifiedIntentError({
    bucket: "quote_provider",
    message: "No provider can complete this route.",
    retryable: false,
    technicalDetails: "Middleware code: QUOTE_UNAVAILABLE",
  });

  assert.equal(message, "No provider can complete this route.");
});

test("classifies quote failure with VALUE_ABOVE_CEILING and includes maxValueUsd", () => {
  const result = classifyIntentError({
    details: {
      intentQuoteFailure: {
        subcode: "VALUE_ABOVE_CEILING",
        retryable: false,
        sourceVerdicts: [],
        providerReasons: [],
        details: { maxValueUsd: 500 },
      },
    },
  });

  assert.equal(result.bucket, "quote_provider");
  assert.equal(result.retryable, false);
  assert.equal(
    result.message,
    "The swap value exceeds the provider limit of $500. Reduce the swap value."
  );
});

test("classifies quote failure with INPUT_BELOW_DEPOSIT_FEE", () => {
  const result = classifyIntentError({
    details: {
      intentQuoteFailure: {
        subcode: "INPUT_BELOW_DEPOSIT_FEE",
        retryable: false,
        sourceVerdicts: [],
        providerReasons: [],
        details: {},
      },
    },
  });

  assert.equal(result.bucket, "quote_provider");
  assert.equal(result.retryable, false);
  assert.equal(
    result.message,
    "The source amount is too low to cover the deposit fee. Increase the source amount."
  );
});

test("classifies quote failure with NO_ROUTE_TO_DESTINATION", () => {
  const result = classifyIntentError({
    details: {
      intentQuoteFailure: {
        subcode: "NO_ROUTE_TO_DESTINATION",
        retryable: false,
        sourceVerdicts: [
          {
            tokenSymbol: "ETH",
            state: "unroutable",
            reason: "DESTINATION_NOT_SERVED",
          },
        ],
        providerReasons: [],
        details: {},
      },
    },
  });

  assert.equal(result.bucket, "quote_provider");
  assert.equal(result.retryable, false);
  assert.equal(
    result.message,
    "No route is available to this destination with the allowed providers. Choose another destination supported by the allowed providers."
  );
  assert.ok(result.technicalDetails?.includes("DESTINATION_NOT_SERVED"));
});
