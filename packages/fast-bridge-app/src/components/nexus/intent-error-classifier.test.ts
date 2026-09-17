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
